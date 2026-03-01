// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.30;

import { InvariantSplitFactory } from "../src/InvariantSplitFactory.sol";

interface Vm {
    function ffi(
        string[] calldata
    ) external returns (bytes memory);
    function envAddress(
        string calldata name
    ) external returns (address);
    function startBroadcast() external;
    function stopBroadcast() external;
    function toString(
        address account
    ) external pure returns (string memory);
    function toString(
        bytes32 value
    ) external pure returns (string memory);
}

abstract contract ScriptBase {
    Vm internal constant VM = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
}

contract DeployInvariantSplit is ScriptBase {
    bytes32 internal constant SYSTEM_ID = keccak256("InvariantSplit");
    bytes32 internal constant PROFILE_CORE = keccak256("core");
    bytes32 internal constant PROFILE_OBSERVED = keccak256("observed");

    error UnsupportedProfile(string profileName);

    function run(
        address factoryHint,
        string memory profileName
    )
        external
        returns (
            address factoryDeployment,
            address huffDeployment,
            address solidityDeployment,
            bytes32 configHash,
            bytes32 profileHash
        )
    {
        InvariantSplitFactory.Recipients memory recipients =
            InvariantSplitFactory.Recipients({
                recipientA: payable(VM.envAddress("RECIPIENT_A")),
                recipientB: payable(VM.envAddress("RECIPIENT_B")),
                recipientC: payable(VM.envAddress("RECIPIENT_C"))
            });

        profileHash = _profileHash(profileName);
        configHash = _configHash(profileHash, recipients);

        bytes memory huffCreationCode = _compileHuff(profileHash, configHash, recipients);

        VM.startBroadcast();

        if (factoryHint == address(0)) {
            factoryDeployment = address(new InvariantSplitFactory());
        } else {
            factoryDeployment = factoryHint;
        }

        InvariantSplitFactory factory = InvariantSplitFactory(factoryDeployment);
        (solidityDeployment,,,,) = factory.deploySolidity(profileHash, recipients);
        (huffDeployment,,,,) = factory.deployHuff(profileHash, recipients, huffCreationCode);

        VM.stopBroadcast();
    }

    function _compileHuff(
        bytes32 profileHash,
        bytes32 configHash,
        InvariantSplitFactory.Recipients memory recipients
    ) internal returns (bytes memory creationCode) {
        bool observedProfile = profileHash == PROFILE_OBSERVED;
        string[] memory command = new string[](observedProfile ? 10 : 8);
        command[0] = "/usr/bin/env";
        command[1] = "NODE_NO_WARNINGS=1";
        command[2] = "node";
        command[3] = "scripts/compile-huff.mjs";

        if (observedProfile) {
            command[4] = "--config-hash";
            command[5] = VM.toString(configHash);
            command[6] = "src/InvariantSplitObserved.huff";
            command[7] = VM.toString(recipients.recipientA);
            command[8] = VM.toString(recipients.recipientB);
            command[9] = VM.toString(recipients.recipientC);
        } else {
            command[4] = "src/InvariantSplit.huff";
            command[5] = VM.toString(recipients.recipientA);
            command[6] = VM.toString(recipients.recipientB);
            command[7] = VM.toString(recipients.recipientC);
        }

        creationCode = VM.ffi(command);
    }

    function _configHash(
        bytes32 profileHash,
        InvariantSplitFactory.Recipients memory recipients
    ) internal view returns (bytes32) {
        return keccak256(
            abi.encode(
                SYSTEM_ID,
                uint256(1),
                block.chainid,
                profileHash,
                recipients.recipientA,
                recipients.recipientB,
                recipients.recipientC,
                uint256(5000),
                uint256(3000),
                uint256(2000)
            )
        );
    }

    function _profileHash(
        string memory profileName
    ) internal pure returns (bytes32) {
        bytes32 profileHash = keccak256(bytes(profileName));

        if (profileHash != PROFILE_CORE && profileHash != PROFILE_OBSERVED) {
            revert UnsupportedProfile(profileName);
        }

        return profileHash;
    }
}
