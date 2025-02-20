// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IMbitTokenSale {
    struct Batch {
        uint256 hardCap; // wei
        uint256 start;
        uint256 end;
    }

    struct BatchVestingPlan {
        uint8 percentageDecimals;
        uint256 tge;
        uint256 tgePercentage;
        uint256 basis;
        uint256 cliff;
        uint256 duration;
    }

    enum BatchStatus {
        INACTIVE,
        ACTIVE
    }

    event SetBatch(uint256 indexed batchId, uint256 hardCap, uint256 start, uint256 end);
    event SetBatchVestingPlan(
        uint256 indexed batchId,
        uint8 percentageDecimals,
        uint256 tge,
        uint256 tgePercentage,
        uint256 basis,
        uint256 cliff,
        uint256 duration
    );
    event SetBatchPrice(uint256 indexed batchId, address paymentToken, uint256 price);
    event SetBatchStatus(uint256 indexed batchId, BatchStatus status);
    event Purchase(uint256 indexed batchId, address user, address paymentToken, uint256 paymentAmount, uint256 amount);
    event SetGovernance(address governance);
    event SetOperator(address operator, bool state);
    event SetSaleToken(address token);
    event SetRecipient(address recipient);
}
