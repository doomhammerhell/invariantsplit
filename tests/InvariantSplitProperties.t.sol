// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.30;

import { InvariantSplitFactory } from "../src/InvariantSplitFactory.sol";
import { TestBase } from "./TestBase.sol";

contract InvariantSplitPropertiesTest is TestBase {
    InvariantSplitFactory internal factory;

    function setUp() public {
        factory = deployFactory();
    }

    function test_factory_predicts_and_reuses_core_deployments() public {
        InvariantSplitFactory.Recipients memory recipients = InvariantSplitFactory.Recipients({
            recipientA: payable(address(0x7101)),
            recipientB: payable(address(0x7102)),
            recipientC: payable(address(0x7103))
        });
        bytes memory huffCreationCode = _compileHuff(
            "src/InvariantSplit.huff",
            recipients.recipientA,
            recipients.recipientB,
            recipients.recipientC,
            bytes32(0)
        );

        (address predictedSolidity,,,) =
            factory.predictSolidityAddress(factory.PROFILE_CORE(), recipients);
        (address predictedHuff,,,) =
            factory.predictHuffAddress(factory.PROFILE_CORE(), recipients, huffCreationCode);

        (address solidityDeployment,,,, bool solidityReused) =
            factory.deploySolidity(factory.PROFILE_CORE(), recipients);
        (address huffDeployment,,,, bool huffReused) =
            factory.deployHuff(factory.PROFILE_CORE(), recipients, huffCreationCode);

        assertEq(predictedSolidity, solidityDeployment, "predicted solidity address mismatch");
        assertEq(predictedHuff, huffDeployment, "predicted huff address mismatch");
        assertTrue(!solidityReused, "first solidity deployment should not be marked reused");
        assertTrue(!huffReused, "first huff deployment should not be marked reused");

        (address redeployedSolidity,,,, bool secondSolidityReused) =
            factory.deploySolidity(factory.PROFILE_CORE(), recipients);
        (address redeployedHuff,,,, bool secondHuffReused) =
            factory.deployHuff(factory.PROFILE_CORE(), recipients, huffCreationCode);

        assertEq(redeployedSolidity, solidityDeployment, "solidity deployment should be idempotent");
        assertEq(redeployedHuff, huffDeployment, "huff deployment should be idempotent");
        assertTrue(secondSolidityReused, "second solidity deployment should be marked reused");
        assertTrue(secondHuffReused, "second huff deployment should be marked reused");
    }

    function test_fuzz_config_hash_changes_with_recipients(
        address a,
        address b,
        address c
    ) public {
        a = _boundRecipient(a, address(0x7201));
        b = _boundRecipient(b, address(0x7202));
        c = _boundRecipient(c, address(0x7203));

        InvariantSplitFactory.Recipients memory recipients = InvariantSplitFactory.Recipients({
            recipientA: payable(a), recipientB: payable(b), recipientC: payable(c)
        });
        bytes32 configHash = factory.configHash(factory.PROFILE_CORE(), recipients);
        bytes32 observedConfigHash = factory.configHash(factory.PROFILE_OBSERVED(), recipients);

        assertTrue(configHash != bytes32(0), "core config hash should be non-zero");
        assertTrue(observedConfigHash != bytes32(0), "observed config hash should be non-zero");
        assertTrue(configHash != observedConfigHash, "profile should influence config hash");
    }

    function _boundRecipient(
        address value,
        address fallbackValue
    ) internal pure returns (address) {
        if (value == address(0)) {
            return fallbackValue;
        }

        return value;
    }
}
