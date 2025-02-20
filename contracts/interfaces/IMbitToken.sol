// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC20Metadata} from '@openzeppelin/contracts/interfaces/IERC20Metadata.sol';

interface IMbitToken is IERC20Metadata {
    struct VestingInfo {
        uint256 tge;
        uint256 totalAmount;
        uint256 tgeAmount;
        uint256 basis;
        uint256 cliff;
        uint256 duration;
        address beneficiary;
    }

    event AddVestingPlan(
        uint256 tge,
        uint256 totalAmount,
        uint256 tgeAmount,
        uint256 basis,
        uint256 cliff,
        uint256 duration,
        address beneficiary
    );

    function mintWithVestingPlans(VestingInfo[] memory vestingPlans) external;

    function mintWithVestingPlan(VestingInfo memory vestingPlan) external;

    function transferWithVestingPlan(VestingInfo memory vestingPlan) external returns (bool);

    function lockedBalanceOf(address account) external view returns (uint256);

    function transferableBalanceOf(address account) external view returns (uint256);
}
