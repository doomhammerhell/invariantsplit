// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.30;

import { IInvariantSplit } from "./IInvariantSplit.sol";

contract SplitSolidity is IInvariantSplit {
    uint256 internal constant BASIS_POINTS = 10_000;

    address payable[3] internal recipients;
    uint256[3] internal weights;

    error InvalidCall();
    error TransferFailed();
    error ZeroRecipient();

    constructor(
        address payable recipientA_,
        address payable recipientB_,
        address payable recipientC_
    ) {
        if (recipientA_ == address(0) || recipientB_ == address(0) || recipientC_ == address(0)) {
            revert ZeroRecipient();
        }

        recipients[0] = recipientA_;
        recipients[1] = recipientB_;
        recipients[2] = recipientC_;

        weights[0] = 5000;
        weights[1] = 3000;
        weights[2] = 2000;
    }

    receive() external payable {
        _distribute();
    }

    fallback() external payable {
        revert InvalidCall();
    }

    function distribute() external payable {
        _distribute();
    }

    function _distribute() internal virtual {
        uint256 value = msg.value;

        if (value == 0) {
            return;
        }

        uint256 shareA = value * weights[0] / BASIS_POINTS;
        uint256 shareB = value * weights[1] / BASIS_POINTS;
        uint256 shareC = value - shareA - shareB;

        _send(recipients[0], shareA);
        _send(recipients[1], shareB);
        _send(recipients[2], shareC);
        _afterDistribution(value, shareA, shareB, shareC);
    }

    function _send(
        address payable recipient,
        uint256 amount
    ) private {
        (bool ok,) = recipient.call{ value: amount }("");

        if (!ok) {
            revert TransferFailed();
        }
    }

    function _afterDistribution(
        uint256 value,
        uint256 shareA,
        uint256 shareB,
        uint256 shareC
    ) internal virtual { }
}
