// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {SafeERC20} from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {ReentrancyGuard} from '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import {EnumerableSet} from '@openzeppelin/contracts/utils/structs/EnumerableSet.sol';
import {IMbitTokenSale} from './interfaces/IMbitTokenSale.sol';
import {IMbitToken} from './interfaces/IMbitToken.sol';

contract MbitTokenSale is IMbitTokenSale, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.AddressSet;

    address public constant bnb = 0x000000000000000000000000000000000000dEaD; // Use dead address to represent native token

    address public governance;
    mapping(address => bool) public isOperator;
    bool public paused;

    address public saleToken;
    address public recipient;
    mapping(uint256 batchId => Batch) public batchInfo;
    mapping(uint256 batchId => BatchVestingPlan) public batchVestingPlan;
    mapping(uint256 batchId => mapping(address paymentToken => uint256)) public batchPrice; // wei per token
    mapping(uint256 batchId => BatchStatus) public batchStatus;

    mapping(uint256 batchId => uint256) public soldAmountOfBatch;
    uint256 public soldAmount;
    mapping(uint256 batchId => mapping(address user => uint256)) public userAmountOfBatch;
    mapping(address user => uint256) public userAmount;
    EnumerableSet.AddressSet private _users;

    modifier onlyGovernance() {
        require(msg.sender == governance, 'Only governance');
        _;
    }

    modifier onlyGovernanceOrOperator() {
        require(msg.sender == governance || isOperator[msg.sender]);
        _;
    }

    modifier whenNotPaused() {
        require(!paused, 'Paused');
        _;
    }

    constructor(address _saleToken, address _recipient) {
        _setGovernance(msg.sender);
        _setSaleToken(_saleToken);
        _setRecipient(_recipient);
    }

    function purchase(
        uint256 batchId,
        address paymentToken,
        uint256 paymentAmount
    ) external payable whenNotPaused nonReentrant {
        require(batchStatus[batchId] == BatchStatus.ACTIVE);
        Batch storage batch = batchInfo[batchId];
        require(block.timestamp >= batch.start, 'The sale have not started yet');
        require(batch.end == 0 || block.timestamp < batch.end, 'The sale ended');

        uint256 price = batchPrice[batchId][paymentToken];
        require(price > 0, 'Invalid payment');
        uint256 receiveAmount = (paymentAmount * 10 ** IMbitToken(saleToken).decimals()) / price;
        require(soldAmountOfBatch[batchId] + receiveAmount <= batch.hardCap, 'Hard cap reached');

        _users.add(msg.sender);
        soldAmount += receiveAmount;
        soldAmountOfBatch[batchId] += receiveAmount;
        userAmountOfBatch[batchId][msg.sender] += receiveAmount;
        userAmount[msg.sender] += receiveAmount;

        // Collect fund
        uint256 refundValue = msg.value;
        if (paymentToken != bnb) {
            IERC20(paymentToken).safeTransferFrom(msg.sender, recipient, paymentAmount);
        } else {
            require(msg.value >= paymentAmount, 'Insuffient payment');
            (bool success, ) = address(recipient).call{value: paymentAmount}(new bytes(0));
            require(success, 'Recipient cannot receive bnb');
            refundValue -= paymentAmount;
        }
        if (refundValue > 0) {
            (bool success, ) = address(msg.sender).call{value: refundValue}(new bytes(0));
            require(success, 'Cannot refund bnb');
        }

        // Distribute tokens with vesting plan
        BatchVestingPlan storage _batchVestingPlan = batchVestingPlan[batchId];
        IMbitToken.VestingInfo memory userVestingPlan;
        userVestingPlan.totalAmount = receiveAmount;
        userVestingPlan.tge = _batchVestingPlan.tge;
        userVestingPlan.tgeAmount =
            (receiveAmount * _batchVestingPlan.tgePercentage) /
            (100 * 10 ** _batchVestingPlan.percentageDecimals);
        userVestingPlan.basis = _batchVestingPlan.basis;
        userVestingPlan.cliff = _batchVestingPlan.cliff;
        userVestingPlan.duration = _batchVestingPlan.duration;
        userVestingPlan.beneficiary = msg.sender;
        IMbitToken(saleToken).mintWithVestingPlan(userVestingPlan);

        emit Purchase(batchId, msg.sender, paymentToken, paymentAmount, receiveAmount);
    }

    function setGovernance(address _governance) external onlyGovernance {
        _setGovernance(_governance);
    }

    function setOperator(address operator, bool state) external onlyGovernance {
        if (isOperator[operator] != state) {
            isOperator[operator] = state;
            emit SetOperator(operator, state);
        }
    }

    function setPause(bool state) external onlyGovernanceOrOperator {
        paused = state;
    }

    function withdraw(address token, address _recipient, uint256 amount) external onlyGovernance {
        if (token == bnb) {
            (bool success, ) = address(_recipient).call{value: amount}(new bytes(0));
            require(success, 'Insufficient bnb');
        } else {
            IERC20(token).safeTransfer(_recipient, amount);
        }
    }

    function setBatch(uint256 batchId, Batch memory batch) external onlyGovernance {
        _setBatch(batchId, batch);
    }

    function setBatchVestingPlan(uint256 batchId, BatchVestingPlan memory vestingPlan) external onlyGovernance {
        _setBatchVestingPlan(batchId, vestingPlan);
    }

    function setBatchPrice(uint256 batchId, address paymentToken, uint256 price) external onlyGovernance {
        _setBatchPrice(batchId, paymentToken, price);
    }

    function setBatchStatus(uint256 batchId, BatchStatus status) external onlyGovernance {
        _setBatchStatus(batchId, status);
    }

    function setSaleToken(address _saleToken) external onlyGovernance {
        _setSaleToken(_saleToken);
    }

    function setRecipient(address _recipient) external onlyGovernance {
        _setRecipient(_recipient);
    }

    function users() public view returns (address[] memory) {
        return _users.values();
    }

    function usersAt(uint256 index) public view returns (address) {
        return _users.at(index);
    }

    function usersLength() public view returns (uint256) {
        return _users.length();
    }

    function usersContains(address user) public view returns (bool) {
        return _users.contains(user);
    }

    function _setGovernance(address _governance) private {
        governance = _governance;
        emit SetGovernance(governance);
    }

    function _setSaleToken(address _saleToken) private {
        saleToken = _saleToken;
        emit SetSaleToken(_saleToken);
    }

    function _setRecipient(address _recipient) private {
        recipient = _recipient;
        emit SetRecipient(_recipient);
    }

    function _setBatch(uint256 batchId, Batch memory batch) private {
        batchInfo[batchId] = batch;
        emit SetBatch(batchId, batch.hardCap, batch.start, batch.end);
    }

    function _setBatchVestingPlan(uint256 batchId, BatchVestingPlan memory vestingPlan) private {
        batchVestingPlan[batchId] = vestingPlan;
        emit SetBatchVestingPlan(
            batchId,
            vestingPlan.percentageDecimals,
            vestingPlan.tge,
            vestingPlan.tgePercentage,
            vestingPlan.basis,
            vestingPlan.cliff,
            vestingPlan.duration
        );
    }

    function _setBatchPrice(uint256 batchId, address paymentToken, uint256 price) private {
        batchPrice[batchId][paymentToken] = price;
        emit SetBatchPrice(batchId, paymentToken, price);
    }

    function _setBatchStatus(uint256 batchId, BatchStatus status) private {
        batchStatus[batchId] = status;
        emit SetBatchStatus(batchId, status);
    }
}
