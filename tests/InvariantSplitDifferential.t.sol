// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.30;

import { IInvariantSplit } from "../src/IInvariantSplit.sol";
import { InvariantSplitFactory } from "../src/InvariantSplitFactory.sol";
import { SplitSolidity } from "../src/SplitSolidity.sol";
import { SplitSolidityObserved } from "../src/SplitSolidityObserved.sol";
import { TestBase, RejectEther } from "./TestBase.sol";

contract InvariantSplitDifferentialTest is TestBase {
    address internal constant CALLER = address(0xBEEFCAFE);

    address payable internal constant RECIPIENT_A = payable(address(0x6101));
    address payable internal constant RECIPIENT_B = payable(address(0x6102));
    address payable internal constant RECIPIENT_C = payable(address(0x6103));

    InvariantSplitFactory internal factory;
    SplitSolidity internal solidityCore;
    SplitSolidityObserved internal solidityObserved;
    IInvariantSplit internal huffCore;
    IInvariantSplit internal huffObserved;

    function setUp() public {
        factory = deployFactory();

        InvariantSplitFactory.Recipients memory recipients = InvariantSplitFactory.Recipients({
            recipientA: RECIPIENT_A, recipientB: RECIPIENT_B, recipientC: RECIPIENT_C
        });

        bytes32 observedConfigHash = factory.configHash(factory.PROFILE_OBSERVED(), recipients);

        solidityCore = deploySolidityCore(RECIPIENT_A, RECIPIENT_B, RECIPIENT_C);
        solidityObserved =
            deploySolidityObserved(RECIPIENT_A, RECIPIENT_B, RECIPIENT_C, observedConfigHash);
        huffCore = deployHuffCore(RECIPIENT_A, RECIPIENT_B, RECIPIENT_C);
        huffObserved = deployHuffObserved(RECIPIENT_A, RECIPIENT_B, RECIPIENT_C, observedConfigHash);
    }

    function test_fuzz_all_profiles_match_expected_distribution(
        uint96 amount
    ) public {
        uint256 value = uint256(amount);

        _assertDistribution(address(solidityCore), value, true);
        _assertDistribution(address(huffCore), value, true);
        _assertDistribution(address(solidityObserved), value, true);
        _assertDistribution(address(huffObserved), value, true);

        _assertDistribution(address(solidityCore), value, false);
        _assertDistribution(address(huffCore), value, false);
        _assertDistribution(address(solidityObserved), value, false);
        _assertDistribution(address(huffObserved), value, false);
    }

    function test_revert_semantics_match_for_rejecting_recipient() public {
        RejectEther rejector = new RejectEther();
        InvariantSplitFactory.Recipients memory recipients = InvariantSplitFactory.Recipients({
            recipientA: payable(address(rejector)),
            recipientB: payable(address(0x6202)),
            recipientC: payable(address(0x6203))
        });
        bytes32 observedConfigHash = factory.configHash(factory.PROFILE_OBSERVED(), recipients);

        SplitSolidity rejectingSolidity =
            deploySolidityCore(recipients.recipientA, recipients.recipientB, recipients.recipientC);
        SplitSolidityObserved rejectingSolidityObserved = deploySolidityObserved(
            recipients.recipientA, recipients.recipientB, recipients.recipientC, observedConfigHash
        );
        IInvariantSplit rejectingHuff =
            deployHuffCore(recipients.recipientA, recipients.recipientB, recipients.recipientC);
        IInvariantSplit rejectingHuffObserved = deployHuffObserved(
            recipients.recipientA, recipients.recipientB, recipients.recipientC, observedConfigHash
        );

        _assertRejects(address(rejectingSolidity));
        _assertRejects(address(rejectingSolidityObserved));
        _assertRejects(address(rejectingHuff));
        _assertRejects(address(rejectingHuffObserved));
    }

    function _assertRejects(
        address target
    ) internal {
        VM.deal(CALLER, 1 ether);
        VM.prank(CALLER);
        (bool ok,) = target.call{ value: 1 ether }(
            abi.encodeWithSelector(IInvariantSplit.distribute.selector)
        );
        assertTrue(!ok, "target should revert when a recipient rejects ETH");
        assertEq(address(target).balance, 0, "target should not retain ETH after revert");
    }

    function _assertDistribution(
        address target,
        uint256 amount,
        bool useSelector
    ) internal {
        uint256 balanceA = RECIPIENT_A.balance;
        uint256 balanceB = RECIPIENT_B.balance;
        uint256 balanceC = RECIPIENT_C.balance;

        VM.deal(CALLER, amount);
        VM.prank(CALLER);

        (bool ok,) = useSelector
            ? target.call{ value: amount }(
                abi.encodeWithSelector(IInvariantSplit.distribute.selector)
            )
            : target.call{ value: amount }("");

        assertTrue(ok, "distribution call failed");

        uint256 expectedA = shareA(amount);
        uint256 expectedB = shareB(amount);
        uint256 expectedC = amount - expectedA - expectedB;

        assertEq(RECIPIENT_A.balance - balanceA, expectedA, "recipient A delta mismatch");
        assertEq(RECIPIENT_B.balance - balanceB, expectedB, "recipient B delta mismatch");
        assertEq(RECIPIENT_C.balance - balanceC, expectedC, "recipient C delta mismatch");
    }
}
