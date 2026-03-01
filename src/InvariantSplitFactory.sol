// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.30;

import { SplitSolidity } from "./SplitSolidity.sol";
import { SplitSolidityObserved } from "./SplitSolidityObserved.sol";

contract InvariantSplitFactory {
    uint256 public constant VERSION = 1;
    uint256 public constant WEIGHT_A = 5000;
    uint256 public constant WEIGHT_B = 3000;
    uint256 public constant WEIGHT_C = 2000;

    bytes32 public constant SYSTEM_ID = keccak256("InvariantSplit");
    bytes32 public constant PROFILE_CORE = keccak256("core");
    bytes32 public constant PROFILE_OBSERVED = keccak256("observed");

    bytes32 public constant ARTIFACT_SOLIDITY_CORE = keccak256("SplitSolidity");
    bytes32 public constant ARTIFACT_SOLIDITY_OBSERVED = keccak256("SplitSolidityObserved");
    bytes32 public constant ARTIFACT_HUFF_CORE = keccak256("InvariantSplit");
    bytes32 public constant ARTIFACT_HUFF_OBSERVED = keccak256("InvariantSplitObserved");

    struct Recipients {
        address payable recipientA;
        address payable recipientB;
        address payable recipientC;
    }

    error ZeroRecipient();
    error UnsupportedProfile(bytes32 profile);
    error DeploymentFailed(bytes32 artifactId, bytes32 salt);

    event SplitDeployed(
        bytes32 indexed configHash,
        bytes32 indexed artifactId,
        address indexed deployed,
        bytes32 salt,
        bytes32 runtimeHash,
        uint256 runtimeSize,
        bool reused,
        address recipientA,
        address recipientB,
        address recipientC
    );

    function configHash(
        bytes32 profile,
        Recipients memory recipients
    ) public view returns (bytes32) {
        _validateRecipients(recipients);
        _validateProfile(profile);

        return keccak256(
            abi.encode(
                SYSTEM_ID,
                VERSION,
                block.chainid,
                profile,
                recipients.recipientA,
                recipients.recipientB,
                recipients.recipientC,
                WEIGHT_A,
                WEIGHT_B,
                WEIGHT_C
            )
        );
    }

    function saltFor(
        bytes32 configHash_,
        bytes32 artifactId
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(configHash_, artifactId));
    }

    function solidityArtifactId(
        bytes32 profile
    ) public pure returns (bytes32) {
        if (profile == PROFILE_CORE) {
            return ARTIFACT_SOLIDITY_CORE;
        }

        if (profile == PROFILE_OBSERVED) {
            return ARTIFACT_SOLIDITY_OBSERVED;
        }

        revert UnsupportedProfile(profile);
    }

    function huffArtifactId(
        bytes32 profile
    ) public pure returns (bytes32) {
        if (profile == PROFILE_CORE) {
            return ARTIFACT_HUFF_CORE;
        }

        if (profile == PROFILE_OBSERVED) {
            return ARTIFACT_HUFF_OBSERVED;
        }

        revert UnsupportedProfile(profile);
    }

    function predictSolidityAddress(
        bytes32 profile,
        Recipients memory recipients
    )
        external
        view
        returns (address predicted, bytes32 configHash_, bytes32 salt, bytes32 artifactId)
    {
        configHash_ = configHash(profile, recipients);
        artifactId = solidityArtifactId(profile);
        salt = saltFor(configHash_, artifactId);
        predicted = _predictAddress(
            salt, keccak256(_solidityCreationCode(profile, recipients, configHash_))
        );
    }

    function predictHuffAddress(
        bytes32 profile,
        Recipients memory recipients,
        bytes memory creationCode
    )
        external
        view
        returns (address predicted, bytes32 configHash_, bytes32 salt, bytes32 artifactId)
    {
        configHash_ = configHash(profile, recipients);
        artifactId = huffArtifactId(profile);
        salt = saltFor(configHash_, artifactId);
        predicted = _predictAddress(salt, keccak256(creationCode));
    }

    function deploySolidity(
        bytes32 profile,
        Recipients memory recipients
    )
        external
        returns (
            address deployed,
            bytes32 configHash_,
            bytes32 salt,
            bytes32 artifactId,
            bool reused
        )
    {
        configHash_ = configHash(profile, recipients);
        artifactId = solidityArtifactId(profile);
        salt = saltFor(configHash_, artifactId);

        bytes memory creationCode = _solidityCreationCode(profile, recipients, configHash_);
        deployed = _predictAddress(salt, keccak256(creationCode));
        reused = deployed.code.length != 0;

        if (!reused) {
            assembly {
                deployed := create2(0, add(creationCode, 0x20), mload(creationCode), salt)
            }

            if (deployed == address(0)) {
                revert DeploymentFailed(artifactId, salt);
            }
        }

        _emitDeployment(configHash_, artifactId, deployed, salt, reused, recipients);
    }

    function deployHuff(
        bytes32 profile,
        Recipients memory recipients,
        bytes memory creationCode
    )
        external
        returns (
            address deployed,
            bytes32 configHash_,
            bytes32 salt,
            bytes32 artifactId,
            bool reused
        )
    {
        configHash_ = configHash(profile, recipients);
        artifactId = huffArtifactId(profile);
        salt = saltFor(configHash_, artifactId);

        deployed = _predictAddress(salt, keccak256(creationCode));
        reused = deployed.code.length != 0;

        if (!reused) {
            assembly {
                deployed := create2(0, add(creationCode, 0x20), mload(creationCode), salt)
            }

            if (deployed == address(0)) {
                revert DeploymentFailed(artifactId, salt);
            }
        }

        _emitDeployment(configHash_, artifactId, deployed, salt, reused, recipients);
    }

    function _solidityCreationCode(
        bytes32 profile,
        Recipients memory recipients,
        bytes32 configHash_
    ) internal pure returns (bytes memory) {
        if (profile == PROFILE_CORE) {
            return abi.encodePacked(
                type(SplitSolidity).creationCode,
                abi.encode(recipients.recipientA, recipients.recipientB, recipients.recipientC)
            );
        }

        if (profile == PROFILE_OBSERVED) {
            return abi.encodePacked(
                type(SplitSolidityObserved).creationCode,
                abi.encode(
                    recipients.recipientA, recipients.recipientB, recipients.recipientC, configHash_
                )
            );
        }

        revert UnsupportedProfile(profile);
    }

    function _predictAddress(
        bytes32 salt,
        bytes32 initCodeHash
    ) internal view returns (address) {
        return address(
            uint160(
                uint256(
                    keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, initCodeHash))
                )
            )
        );
    }

    function _emitDeployment(
        bytes32 configHash_,
        bytes32 artifactId,
        address deployed,
        bytes32 salt,
        bool reused,
        Recipients memory recipients
    ) internal {
        bytes32 runtimeHash;

        assembly {
            runtimeHash := extcodehash(deployed)
        }

        emit SplitDeployed(
            configHash_,
            artifactId,
            deployed,
            salt,
            runtimeHash,
            deployed.code.length,
            reused,
            recipients.recipientA,
            recipients.recipientB,
            recipients.recipientC
        );
    }

    function _validateProfile(
        bytes32 profile
    ) internal pure {
        if (profile != PROFILE_CORE && profile != PROFILE_OBSERVED) {
            revert UnsupportedProfile(profile);
        }
    }

    function _validateRecipients(
        Recipients memory recipients
    ) internal pure {
        if (
            recipients.recipientA == address(0) || recipients.recipientB == address(0)
                || recipients.recipientC == address(0)
        ) {
            revert ZeroRecipient();
        }
    }
}
