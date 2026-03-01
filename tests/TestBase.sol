// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.30;

import { IInvariantSplit } from "../src/IInvariantSplit.sol";
import { InvariantSplitFactory } from "../src/InvariantSplitFactory.sol";
import { SplitSolidity } from "../src/SplitSolidity.sol";
import { SplitSolidityObserved } from "../src/SplitSolidityObserved.sol";

interface Vm {
    function ffi(
        string[] calldata
    ) external returns (bytes memory);
    function toString(
        address account
    ) external pure returns (string memory);
    function toString(
        bytes32 value
    ) external pure returns (string memory);
    function deal(
        address account,
        uint256 newBalance
    ) external;
    function prank(
        address sender
    ) external;
    function expectRevert() external;
    function load(
        address target,
        bytes32 slot
    ) external view returns (bytes32);
}

abstract contract TestBase {
    Vm internal constant VM = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    error AssertionFailed(string message);
    error AssertionEqUint(string message, uint256 left, uint256 right);
    error AssertionEqBytes32(string message, bytes32 left, bytes32 right);
    error AssertionEqAddress(string message, address left, address right);

    function assertTrue(
        bool condition,
        string memory message
    ) internal pure {
        if (!condition) {
            revert AssertionFailed(message);
        }
    }

    function assertEq(
        uint256 left,
        uint256 right,
        string memory message
    ) internal pure {
        if (left != right) {
            revert AssertionEqUint(message, left, right);
        }
    }

    function assertEq(
        bytes32 left,
        bytes32 right,
        string memory message
    ) internal pure {
        if (left != right) {
            revert AssertionEqBytes32(message, left, right);
        }
    }

    function assertEq(
        address left,
        address right,
        string memory message
    ) internal pure {
        if (left != right) {
            revert AssertionEqAddress(message, left, right);
        }
    }

    function deployFactory() internal returns (InvariantSplitFactory) {
        return new InvariantSplitFactory();
    }

    function deploySolidityCore(
        address payable recipientA,
        address payable recipientB,
        address payable recipientC
    ) internal returns (SplitSolidity) {
        return new SplitSolidity(recipientA, recipientB, recipientC);
    }

    function deploySolidityObserved(
        address payable recipientA,
        address payable recipientB,
        address payable recipientC,
        bytes32 configHash
    ) internal returns (SplitSolidityObserved) {
        return new SplitSolidityObserved(recipientA, recipientB, recipientC, configHash);
    }

    function deployHuffCore(
        address recipientA,
        address recipientB,
        address recipientC
    ) internal returns (IInvariantSplit) {
        return IInvariantSplit(
            deployRaw(
                _compileHuff(
                    "src/InvariantSplit.huff", recipientA, recipientB, recipientC, bytes32(0)
                )
            )
        );
    }

    function deployHuffObserved(
        address recipientA,
        address recipientB,
        address recipientC,
        bytes32 configHash
    ) internal returns (IInvariantSplit) {
        return IInvariantSplit(
            deployRaw(
                _compileHuff(
                    "src/InvariantSplitObserved.huff",
                    recipientA,
                    recipientB,
                    recipientC,
                    configHash
                )
            )
        );
    }

    function deployRaw(
        bytes memory creationCode
    ) internal returns (address deployedAddress) {
        assembly {
            deployedAddress := create(0, add(creationCode, 0x20), mload(creationCode))
        }

        assertTrue(deployedAddress != address(0), "deployment failed");
    }

    function _compileHuff(
        string memory source,
        address recipientA,
        address recipientB,
        address recipientC,
        bytes32 configHash
    ) internal returns (bytes memory creationCode) {
        string[] memory command = new string[](configHash == bytes32(0) ? 8 : 10);
        command[0] = "/usr/bin/env";
        command[1] = "NODE_NO_WARNINGS=1";
        command[2] = "node";
        command[3] = "scripts/compile-huff.mjs";

        if (configHash != bytes32(0)) {
            command[4] = "--config-hash";
            command[5] = VM.toString(configHash);
            command[6] = source;
            command[7] = VM.toString(recipientA);
            command[8] = VM.toString(recipientB);
            command[9] = VM.toString(recipientC);
        } else {
            command[4] = source;
            command[5] = VM.toString(recipientA);
            command[6] = VM.toString(recipientB);
            command[7] = VM.toString(recipientC);
        }

        return VM.ffi(command);
    }

    function shareA(
        uint256 amount
    ) internal pure returns (uint256) {
        return amount * 5000 / 10_000;
    }

    function shareB(
        uint256 amount
    ) internal pure returns (uint256) {
        return amount * 3000 / 10_000;
    }
}

contract RejectEther {
    receive() external payable {
        revert("reject");
    }
}
