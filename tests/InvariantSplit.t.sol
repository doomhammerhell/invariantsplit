// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.30;

import { IInvariantSplit } from "../src/IInvariantSplit.sol";
import { SplitSolidity } from "../src/SplitSolidity.sol";
import { TestBase, RejectEther } from "./TestBase.sol";

contract InvariantSplitTest is TestBase {
    event GasSnapshot(string label, uint256 gasUsed);

    address internal constant CALLER = address(0xC011A1);

    address payable internal constant SOL_A = payable(address(0x1001));
    address payable internal constant SOL_B = payable(address(0x1002));
    address payable internal constant SOL_C = payable(address(0x1003));

    address payable internal constant HUFF_A = payable(address(0x2001));
    address payable internal constant HUFF_B = payable(address(0x2002));
    address payable internal constant HUFF_C = payable(address(0x2003));

    SplitSolidity internal solidityTarget;
    IInvariantSplit internal huffTarget;

    function setUp() public {
        solidityTarget = deploySolidityCore(SOL_A, SOL_B, SOL_C);
        huffTarget = deployHuffCore(HUFF_A, HUFF_B, HUFF_C);
    }

    function test_selector_distribution_matches_formula_for_solidity() public {
        _assertSelectorDistribution(address(solidityTarget), SOL_A, SOL_B, SOL_C, 1 ether + 17);
    }

    function test_selector_distribution_matches_formula_for_huff() public {
        _assertSelectorDistribution(address(huffTarget), HUFF_A, HUFF_B, HUFF_C, 1 ether + 17);
    }

    function test_receive_distribution_matches_formula_for_solidity() public {
        _assertReceiveDistribution(address(solidityTarget), SOL_A, SOL_B, SOL_C, 0.75 ether + 9);
    }

    function test_receive_distribution_matches_formula_for_huff() public {
        _assertReceiveDistribution(address(huffTarget), HUFF_A, HUFF_B, HUFF_C, 0.75 ether + 9);
    }

    function test_fuzz_selector_conserves_value_for_solidity(
        uint96 amount
    ) public {
        _assertSelectorDistribution(address(solidityTarget), SOL_A, SOL_B, SOL_C, uint256(amount));
    }

    function test_fuzz_selector_conserves_value_for_huff(
        uint96 amount
    ) public {
        _assertSelectorDistribution(address(huffTarget), HUFF_A, HUFF_B, HUFF_C, uint256(amount));
    }

    function test_dust_is_absorbed_by_last_recipient() public {
        _assertSelectorDistribution(address(solidityTarget), SOL_A, SOL_B, SOL_C, 1);
        _assertSelectorDistribution(address(huffTarget), HUFF_A, HUFF_B, HUFF_C, 1);
    }

    function test_unknown_selector_reverts_for_both() public {
        VM.deal(CALLER, 2 ether);

        VM.prank(CALLER);
        (bool solidityOk,) = address(solidityTarget).call{ value: 1 ether }(hex"deadbeef");
        assertTrue(!solidityOk, "solidity should reject unknown selector");

        VM.prank(CALLER);
        (bool huffOk,) = address(huffTarget).call{ value: 1 ether }(hex"deadbeef");
        assertTrue(!huffOk, "huff should reject unknown selector");
    }

    function test_atomic_revert_when_solidity_recipient_rejects() public {
        RejectEther rejector = new RejectEther();
        SplitSolidity target = deploySolidityCore(
            payable(address(rejector)), payable(address(0x3002)), payable(address(0x3003))
        );

        VM.deal(CALLER, 1 ether);
        VM.prank(CALLER);
        VM.expectRevert();
        target.distribute{ value: 1 ether }();

        assertEq(address(rejector).balance, 0, "rejector should not receive funds");
        assertEq(address(0x3002).balance, 0, "recipient B should not receive funds");
        assertEq(address(0x3003).balance, 0, "recipient C should not receive funds");
        assertEq(address(target).balance, 0, "solidity target should not retain ETH");
    }

    function test_atomic_revert_when_huff_recipient_rejects() public {
        RejectEther rejector = new RejectEther();
        IInvariantSplit target = deployHuffCore(address(rejector), address(0x4002), address(0x4003));

        VM.deal(CALLER, 1 ether);
        VM.prank(CALLER);
        VM.expectRevert();
        target.distribute{ value: 1 ether }();

        assertEq(address(rejector).balance, 0, "rejector should not receive funds");
        assertEq(address(0x4002).balance, 0, "recipient B should not receive funds");
        assertEq(address(0x4003).balance, 0, "recipient C should not receive funds");
        assertEq(address(target).balance, 0, "huff target should not retain ETH");
    }

    function test_distribution_does_not_mutate_storage() public {
        bytes32[6] memory soliditySlotsBefore = _snapshotSlots(address(solidityTarget));
        bytes32[6] memory huffSlotsBefore = _snapshotSlots(address(huffTarget));

        _assertSelectorDistribution(address(solidityTarget), SOL_A, SOL_B, SOL_C, 3 ether);
        _assertSelectorDistribution(address(huffTarget), HUFF_A, HUFF_B, HUFF_C, 3 ether);

        _assertSlotsEqual(address(solidityTarget), soliditySlotsBefore);
        _assertSlotsEqual(address(huffTarget), huffSlotsBefore);
    }

    function test_gas_selector_huff_is_lower_than_solidity() public {
        uint256 amount = 1 ether;
        uint256 solidityGas = _measureSelectorGas(
            address(
                deploySolidityCore(
                    payable(address(0x5101)), payable(address(0x5102)), payable(address(0x5103))
                )
            ),
            amount
        );
        uint256 huffGas = _measureSelectorGas(
            address(deployHuffCore(address(0x5201), address(0x5202), address(0x5203))), amount
        );

        emit GasSnapshot("SplitSolidity.distribute()", solidityGas);
        emit GasSnapshot("InvariantSplit.distribute()", huffGas);

        assertTrue(huffGas < solidityGas, "huff should use less gas than solidity");
    }

    function _assertSelectorDistribution(
        address target,
        address payable recipientA,
        address payable recipientB,
        address payable recipientC,
        uint256 amount
    ) internal {
        _assertDistribution(target, recipientA, recipientB, recipientC, amount, true);
    }

    function _assertReceiveDistribution(
        address target,
        address payable recipientA,
        address payable recipientB,
        address payable recipientC,
        uint256 amount
    ) internal {
        _assertDistribution(target, recipientA, recipientB, recipientC, amount, false);
    }

    function _assertDistribution(
        address target,
        address payable recipientA,
        address payable recipientB,
        address payable recipientC,
        uint256 amount,
        bool useSelector
    ) internal {
        uint256 balanceA = recipientA.balance;
        uint256 balanceB = recipientB.balance;
        uint256 balanceC = recipientC.balance;

        VM.deal(CALLER, amount);
        VM.prank(CALLER);

        bool ok;
        bytes memory data;

        if (useSelector) {
            (ok, data) = target.call{ value: amount }(
                abi.encodeWithSelector(IInvariantSplit.distribute.selector)
            );
        } else {
            (ok, data) = target.call{ value: amount }("");
        }

        assertTrue(ok, "distribution call failed");
        assertEq(data.length, 0, "distribution should not return data");

        uint256 expectedShareA = shareA(amount);
        uint256 expectedShareB = shareB(amount);
        uint256 expectedShareC = amount - expectedShareA - expectedShareB;

        assertEq(recipientA.balance - balanceA, expectedShareA, "recipient A share mismatch");
        assertEq(recipientB.balance - balanceB, expectedShareB, "recipient B share mismatch");
        assertEq(recipientC.balance - balanceC, expectedShareC, "recipient C share mismatch");
        assertEq(address(target).balance, 0, "target should not retain ETH");
    }

    function _measureSelectorGas(
        address target,
        uint256 amount
    ) internal returns (uint256 gasUsed) {
        VM.deal(CALLER, amount);
        VM.prank(CALLER);

        uint256 gasBefore = gasleft();
        (bool ok,) = target.call{ value: amount }(
            abi.encodeWithSelector(IInvariantSplit.distribute.selector)
        );
        gasUsed = gasBefore - gasleft();

        assertTrue(ok, "gas benchmark call failed");
    }

    function _snapshotSlots(
        address target
    ) internal view returns (bytes32[6] memory slotsSnapshot) {
        for (uint256 i; i < 6;) {
            slotsSnapshot[i] = VM.load(target, bytes32(i));

            unchecked {
                ++i;
            }
        }
    }

    function _assertSlotsEqual(
        address target,
        bytes32[6] memory expectedSlots
    ) internal view {
        for (uint256 i; i < 6;) {
            assertEq(VM.load(target, bytes32(i)), expectedSlots[i], "storage slot mutated");

            unchecked {
                ++i;
            }
        }
    }
}
