# Test findings

Bugs the test suite found in existing logic. The three real ones are **fixed**; each
is now guarded by the test that originally proved it, and those tests run on every
CI build rather than being skipped.

| # | Where | Severity | Status | Guarded by |
|---|-------|----------|--------|------------|
| 1 | `PaymentService` — concurrent payments | **Critical** | Fixed | `PaymentServiceTests.CreatePayment_ConcurrentlyOnOneInvoice_CannotCollectMoreThanIsOwed` |
| 2 | `InvoiceService.CreateInvoiceAsync` — total | High | Fixed | `InvoiceTotalTests.UpdateInvoice_TouchingOnlyNotes_LeavesTheTotalAlone`, `…ThenUpdateWithNoItemChange_ComputesTheSameTotal` |
| 3 | `InvoiceItem.CalculateTotals` — rounding | Medium | Fixed | `InvoiceTotalTests.CreateInvoice_WithSubCentLineAmounts_TotalStillMatchesTheStoredLines` + 4 unit tests |
| 4 | Frontend/backend discount rules disagree | Medium | Open — needs a decision | passing tests on both sides |
| 5 | Frontend money maths used binary floats | Low | Fixed as part of #3 | `roundToCents` tests |
| 6 | `calculatePagination` with zero rows | Low | Open — harmless | passing test |

---

## 1. Concurrent payments on one invoice lost money — FIXED

**Was:** `CreatePaymentAsync` read the invoice, checked the amount against
`RemainingBalance`, then wrote `PaidAmount` back as an absolute value, with no lock,
no transaction spanning the read and the write, and no concurrency token. Overlapping
requests all read the same balance, all passed the check, and the last write won.

Measured with ten concurrent 600 payments against a 1,000 invoice (5 runs out of 5):
all ten were accepted, ten payment rows totalling **6,000** were written, and the
invoice recorded `PaidAmount = 600` / `RemainingBalance = 400`. 5,400 existed only in
the payments table.

**Fix:** the check and the write now happen in one transaction with the invoice row
locked, following the pattern `InvoiceService` already used for invoice numbers —
`CreateExecutionStrategy` (required, since the connection is configured with
`EnableRetryOnFailure`), an explicit transaction, and a `SELECT … FOR UPDATE` read
through the new `LockInvoiceAsync` helper. Concurrent callers queue on the lock, so
the second one sees the balance the first one left.

Applied to all three methods that move money — `CreatePaymentAsync`,
`UpdatePaymentAsync` and `DeletePaymentAsync` — since they shared the shape. No schema
change was needed, so there is no migration to apply.

The same test that failed 5/5 before now passes 5/5.

## 2. An unrelated edit silently raised an invoice total — FIXED

**Was:** create and update disagreed about invoice-level `AdditionalCharges` and
`Discount` once an invoice had line items.

- `CreateInvoiceAsync`: `TotalAmount = lineItemsTotal` — charges and discount stored
  but excluded.
- `UpdateInvoiceAsync`: `TotalAmount = lineItemsTotal + AdditionalCharges - Discount`.

An invoice created with 150 of line items and `AdditionalCharges = 50` was committed
at **150**; editing only its `Notes` afterwards recomputed it to **200**.

**Fix:** create now uses update's expression. Which of the two rules was correct is
settled by the frontend, not by taste — `InvoiceFormPage.calculateTotal()` previews
`itemsTotal + additionalCharges - discount` to the user before they submit, so the
create path was the side contradicting what the form promised. Line items still
replace the room rent as the basis; the invoice-level charges and discount apply on
top, in both paths.

This also fixes `AdditionalCharges` being silently ignored at creation whenever line
items were supplied.

## 3. Invoice total drifted from its own line items — FIXED

**Was:** `Quantity` is `decimal(18,3)` and `UnitPrice` is `decimal(18,2)`, so a line
can compute past two decimals. `CalculateTotals` did not round, and the invoice total
was summed from the unrounded values — PostgreSQL then rounded each column
independently on write, making the total "sum then round" while the lines were "round
then sum". Three lines of `0.5 x 20.01` stored as `10.01` each (adding to **30.03**)
under a total of **30.02**, and `RemainingBalance` followed the total, so the invoice
could not be settled to zero by paying the line amounts.

**Fix:** `CalculateTotals` rounds each figure to cents as it produces it, with
`MidpointRounding.AwayFromZero` — matching how PostgreSQL rounds into a
`decimal(18,2)` column, and deliberately not `Math.Round`'s banker's-rounding default.
Lines are now equal to what the database stores, so summing them gives the same total
the database holds.

The frontend was rounded to match (see #5), so the figure previewed in the form is the
one that gets stored.

## 4. Frontend and backend resolve a discount collision differently — OPEN

When an item carries **both** a `discountPercent` and a non-zero `discountAmount`:

- backend (`InvoiceItem.CalculateTotals`): `if (DiscountPercent > 0 && DiscountAmount
  == 0)` — the **amount wins**, the percent is ignored.
- frontend (`calculateItemTotals`): `if (item.discountPercent > 0)` — the **percent
  wins**, overwriting the amount.

Left as-is, because unlike #1–#3 this one is not reachable today: the UI always
recalculates the amount from the percent before posting, so the two agree in practice.
It becomes real the moment anything else posts an invoice item — an import, a script,
or a future "enter the discount in money" field.

Both behaviours are pinned by passing tests
(`CalculateTotals_WhenBothDiscountPercentAndAmountAreGiven_TheAmountWins` and `lets
the discount percent override an explicit discount amount`), so whichever rule you
settle on, the other side's test fails loudly. **Tell me which one you want and it is
a two-line change.**

## 5. Frontend money maths used binary floating point — FIXED

`calculateItemTotals` worked in JavaScript numbers, so `3 x 0.1` came to
`0.30000000000000004` where the backend's `decimal` gave exactly `0.3`.

**Fix:** a `roundToCents` helper applied at each step, mirroring the backend. It
rounds through the number's string form (`` `${x}e+2` ``) rather than `Math.round(x *
100) / 100`, because multiplying by 100 first reintroduces exactly the binary error
being corrected — `1.005 * 100` is `100.49999999999999`, which rounds the wrong way.

Two other things were cleaned up while doing this:

- **`InvoiceItemsTable.tsx` is dead code** — nothing in the app imports it. The live
  invoice form is `InvoiceFormPage.tsx`, which carried its own duplicate copy of the
  same arithmetic. Both now call the shared `invoiceItemCalculations.ts`, so the fix
  actually reaches users. Worth deleting `InvoiceItemsTable.tsx` if it is genuinely
  unused — I left it alone as that is outside this task.
- The form's footer "Subtotal" line reads `afterDiscount` from the shared helper,
  which is the figure it was always showing (`sum(lineTotal)`); the helper's
  `subtotal` is the gross, before discounts.

## 6. `calculatePagination` reports `isLastPage: false` on an empty result — OPEN

With `totalCount = 0`: `totalPages` is `0`, so `isLastPage` (`page === totalPages`) is
`false` on page 1, and the range renders as "1–0 of 0". Nothing breaks — `hasNextPage`
is correctly `false`, so paging controls behave — so this is left as documented
behaviour rather than changed. Also note `pageSize = 0` yields `totalPages: Infinity`;
nothing guards it.

---

## Not a bug, but worth knowing

`InvoiceService.MarkInvoiceAsPaidAsync` sets `PaidAmount = TotalAmount` and
`RemainingBalance = 0` without writing any `Payment` row. That is presumably
deliberate (an override for cash settled outside the system), but it means the
payments table and the invoice can legitimately disagree, so payment-total
reconciliation cannot assume they match.
