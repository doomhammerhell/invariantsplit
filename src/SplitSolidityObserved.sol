// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.30;

import { SplitSolidity } from "./SplitSolidity.sol";

contract SplitSolidityObserved is SplitSolidity {
    event SplitExecuted(
        bytes32 indexed configHash, uint256 value, uint256 shareA, uint256 shareB, uint256 shareC
    );

    bytes32 public immutable configHash;

    constructor(
        address payable recipientA_,
        address payable recipientB_,
        address payable recipientC_,
        bytes32 configHash_
    ) SplitSolidity(recipientA_, recipientB_, recipientC_) {
        configHash = configHash_;
    }

    function _afterDistribution(
        uint256 value,
        uint256 shareA,
        uint256 shareB,
        uint256 shareC
    ) internal override {
        emit SplitExecuted(configHash, value, shareA, shareB, shareC);
    }
}
