// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import {ERC20Pausable} from '@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol';
import {AccessControlEnumerable} from '@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol';
import {ERC20Permit} from '@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol';
import {EnumerableSet} from '@openzeppelin/contracts/utils/structs/EnumerableSet.sol';
import {IMbitToken} from './interfaces/IMbitToken.sol';

contract MbitToken is IMbitToken, ERC20, AccessControlEnumerable, ERC20Permit {
    using EnumerableSet for EnumerableSet.UintSet;

    bytes32 public constant MANAGER_ROLE = keccak256('MANAGER_ROLE');

    // Constant that defines the maximum supply of tokens
    uint256 public constant MAX_SUPPLY = 316_988_658 * 10 ** 18;
    VestingInfo[] public vestingInfo;
    mapping(address => EnumerableSet.UintSet) private _beneficiaryIndexes;

    constructor(
        string memory tokenName,
        string memory tokenSymbol
    ) ERC20(tokenName, tokenSymbol) ERC20Permit('MbitToken') {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MANAGER_ROLE, msg.sender);
    }

    function mint(address to, uint256 amount) public onlyRole(MANAGER_ROLE) {
        require(totalSupply() + amount <= MAX_SUPPLY, 'Cannot mint more than max supply');
        _mint(to, amount);
    }

    function mintWithVestingPlans(VestingInfo[] memory vestingPlans) public onlyRole(MANAGER_ROLE) {
        for (uint256 i = 0; i < vestingPlans.length; i++) {
            VestingInfo memory vestingPlan = vestingPlans[i];
            require(totalSupply() + vestingPlan.totalAmount <= MAX_SUPPLY, 'Cannot mint more than max supply');
            _validateVestingPlan(vestingPlan);
            _mint(vestingPlan.beneficiary, vestingPlan.totalAmount);
            _addVestingPlan(vestingPlan);
        }
    }

    function mintWithVestingPlan(VestingInfo memory vestingPlan) public onlyRole(MANAGER_ROLE) {
        require(totalSupply() + vestingPlan.totalAmount <= MAX_SUPPLY, 'Cannot mint more than max supply');
        _validateVestingPlan(vestingPlan);
        _mint(vestingPlan.beneficiary, vestingPlan.totalAmount);
        _addVestingPlan(vestingPlan);
    }

    function transferWithVestingPlan(VestingInfo memory vestingPlan) public onlyRole(MANAGER_ROLE) returns (bool) {
        _validateVestingPlan(vestingPlan);
        _transfer(msg.sender, vestingPlan.beneficiary, vestingPlan.totalAmount);
        _addVestingPlan(vestingPlan);
        return true;
    }

    function indexesOfBeneficiary(address beneficiary) public view returns (uint256[] memory) {
        return _beneficiaryIndexes[beneficiary].values();
    }

    function lockedBalanceOf(address account) public view returns (uint256 amount) {
        for (uint256 i = 0; i < _beneficiaryIndexes[account].length(); i++) {
            uint256 addressIndex = _beneficiaryIndexes[account].at(i);
            amount += _lockedAmount(addressIndex);
        }
    }

    function transferableBalanceOf(address account) public view returns (uint256) {
        return balanceOf(account) - lockedBalanceOf(account);
    }

    // The following functions are overrides required by Solidity.
    function _update(address from, address to, uint256 value) internal override(ERC20) {
        super._update(from, to, value);
        require(balanceOf(from) >= lockedBalanceOf(from), 'Token locked');
    }

    function _addVestingPlan(VestingInfo memory vestingPlan) private returns (uint256) {
        VestingInfo storage info = vestingInfo.push();
        info.tge = vestingPlan.tge;
        info.totalAmount = vestingPlan.totalAmount;
        info.tgeAmount = vestingPlan.tgeAmount;
        info.basis = vestingPlan.basis;
        info.cliff = vestingPlan.cliff;
        info.duration = vestingPlan.duration;
        info.beneficiary = vestingPlan.beneficiary;

        uint256 index = vestingInfo.length - 1;
        require(_beneficiaryIndexes[info.beneficiary].add(index), 'Duplicated index');
        emit AddVestingPlan(
            vestingPlan.tge,
            vestingPlan.totalAmount,
            vestingPlan.tgeAmount,
            vestingPlan.basis,
            vestingPlan.cliff,
            vestingPlan.duration,
            vestingPlan.beneficiary
        );
        return index;
    }

    function _validateVestingPlan(VestingInfo memory vestingPlan) private pure {
        require(vestingPlan.tge > 0, 'Invalid tge');
        require(vestingPlan.totalAmount >= vestingPlan.tgeAmount, 'Bad args');
        require(vestingPlan.tge + vestingPlan.cliff + vestingPlan.duration <= type(uint256).max, 'Out of range');
        require(vestingPlan.beneficiary != address(0), 'Invalid beneficiary');
    }

    function _lockedAmount(uint256 index) private view returns (uint256) {
        VestingInfo storage info = vestingInfo[index];
        if (info.totalAmount == 0) {
            return 0;
        }

        return info.totalAmount - _vestedAmount(index);
    }

    function _vestedAmount(uint256 index) private view returns (uint256) {
        VestingInfo storage info = vestingInfo[index];

        if (block.timestamp < info.tge) {
            return 0;
        }

        uint256 elapsedTime = block.timestamp - info.tge;
        if (elapsedTime < info.cliff) {
            return info.tgeAmount;
        }

        if (elapsedTime >= info.cliff + info.duration) {
            return info.totalAmount;
        }

        uint256 releaseMilestones = (elapsedTime - info.cliff) / info.basis + 1;
        uint256 totalReleaseMilestones = (info.duration + info.basis - 1) / info.basis + 1;

        if (releaseMilestones >= totalReleaseMilestones) {
            return info.totalAmount;
        }

        // _totalReleaseMilestones > 1
        uint256 linearVestingAmount = info.totalAmount - info.tgeAmount;
        return (linearVestingAmount / totalReleaseMilestones) * releaseMilestones + info.tgeAmount;
    }
}
