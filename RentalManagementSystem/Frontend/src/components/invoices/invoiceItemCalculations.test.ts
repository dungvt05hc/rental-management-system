import { describe, it, expect } from 'vitest';
import type { InvoiceItem } from '../../types';
import {
  calculateItemTotals,
  calculateInvoiceItemsTotals,
  roundToCents,
} from './invoiceItemCalculations';

/**
 * These are the numbers the invoice form posts to the backend, so they have to
 * match InvoiceItem.CalculateTotals() on the server. Where the two disagree the
 * test says so and TEST-FINDINGS.md explains why.
 */

function item(overrides: Partial<InvoiceItem> = {}): InvoiceItem {
  return {
    itemCode: 'TEST',
    itemName: 'Test item',
    description: '',
    quantity: 1,
    unitOfMeasure: 'pcs',
    unitPrice: 0,
    discountPercent: 0,
    discountAmount: 0,
    taxPercent: 0,
    taxAmount: 0,
    lineTotal: 0,
    lineTotalWithTax: 0,
    lineNumber: 1,
    category: '',
    notes: '',
    ...overrides,
  };
}

describe('calculateItemTotals', () => {
  it('multiplies quantity by unit price', () => {
    const result = calculateItemTotals(item({ quantity: 3, unitPrice: 10 }));

    expect(result.lineTotal).toBe(30);
    expect(result.lineTotalWithTax).toBe(30);
    expect(result.discountAmount).toBe(0);
    expect(result.taxAmount).toBe(0);
  });

  it('derives the discount amount from the discount percent', () => {
    const result = calculateItemTotals(item({ quantity: 2, unitPrice: 100, discountPercent: 10 }));

    expect(result.discountAmount).toBe(20);
    expect(result.lineTotal).toBe(180);
  });

  it('taxes the discounted total, not the gross line', () => {
    const result = calculateItemTotals(
      item({ quantity: 2, unitPrice: 100, discountPercent: 10, taxPercent: 10 })
    );

    expect(result.lineTotal).toBe(180);
    expect(result.taxAmount).toBe(18);
    expect(result.lineTotalWithTax).toBe(198);
  });

  it('keeps an explicit discount amount when no percent is given', () => {
    const result = calculateItemTotals(item({ quantity: 1, unitPrice: 100, discountAmount: 15 }));

    expect(result.discountAmount).toBe(15);
    expect(result.lineTotal).toBe(85);
  });

  it('lets the discount percent override an explicit discount amount', () => {
    // The backend resolves this collision the other way round (the amount wins).
    // See TEST-FINDINGS.md #4.
    const result = calculateItemTotals(
      item({ quantity: 1, unitPrice: 100, discountPercent: 50, discountAmount: 10 })
    );

    expect(result.discountAmount).toBe(50);
    expect(result.lineTotal).toBe(50);
  });

  it('is idempotent, so re-editing a row does not compound the discount', () => {
    const once = calculateItemTotals(
      item({ quantity: 2, unitPrice: 100, discountPercent: 10, taxPercent: 10 })
    );
    const twice = calculateItemTotals(once);

    expect(twice).toEqual(once);
  });

  it('does not mutate the item it is given', () => {
    const original = item({ quantity: 2, unitPrice: 100, discountPercent: 10 });
    calculateItemTotals(original);

    expect(original.discountAmount).toBe(0);
    expect(original.lineTotal).toBe(0);
  });

  // --- Boundaries ---------------------------------------------------------

  it('produces a zero line for zero quantity', () => {
    const result = calculateItemTotals(
      item({ quantity: 0, unitPrice: 250, discountPercent: 10, taxPercent: 10 })
    );

    expect(result.discountAmount).toBe(0);
    expect(result.lineTotal).toBe(0);
    expect(result.taxAmount).toBe(0);
    expect(result.lineTotalWithTax).toBe(0);
  });

  it('produces a zero line for zero unit price', () => {
    const result = calculateItemTotals(item({ quantity: 5, unitPrice: 0, taxPercent: 10 }));

    expect(result.lineTotalWithTax).toBe(0);
  });

  it('charges nothing, and taxes nothing, at a 100% discount', () => {
    const result = calculateItemTotals(
      item({ quantity: 4, unitPrice: 125, discountPercent: 100, taxPercent: 10 })
    );

    expect(result.discountAmount).toBe(500);
    expect(result.lineTotal).toBe(0);
    expect(result.taxAmount).toBe(0);
    expect(result.lineTotalWithTax).toBe(0);
  });

  it('goes negative when an explicit discount exceeds the line', () => {
    // Nothing clamps this; recorded so a future clamp is a deliberate change.
    const result = calculateItemTotals(item({ quantity: 1, unitPrice: 100, discountAmount: 150 }));

    expect(result.lineTotal).toBe(-50);
  });

  it('absorbs binary floating-point error, matching the backend decimal', () => {
    // 3 x 0.1 is 0.30000000000000004 in raw JavaScript arithmetic.
    const result = calculateItemTotals(item({ quantity: 3, unitPrice: 0.1 }));

    expect(result.lineTotal).toBe(0.3);
  });

  it('rounds a sub-cent line to cents, the way the backend stores it', () => {
    const result = calculateItemTotals(item({ quantity: 0.5, unitPrice: 20.01 }));

    expect(result.lineTotal).toBe(10.01);
    expect(result.lineTotalWithTax).toBe(10.01);
  });

  it('rounds sub-cent tax to cents', () => {
    const result = calculateItemTotals(item({ quantity: 1, unitPrice: 33.33, taxPercent: 10 }));

    expect(result.taxAmount).toBe(3.33);
    expect(result.lineTotalWithTax).toBe(36.66);
  });
});

describe('roundToCents', () => {
  it('rounds halves away from zero, matching PostgreSQL and the backend', () => {
    // The reason this cannot be Math.round(x * 100) / 100: 1.005 * 100 is
    // 100.49999999999999, which would round the wrong way.
    expect(roundToCents(1.005)).toBe(1.01);
    expect(roundToCents(10.005)).toBe(10.01);
    expect(roundToCents(0.025)).toBe(0.03);
    expect(roundToCents(-1.005)).toBe(-1.01);
  });

  it('leaves amounts that are already in cents alone', () => {
    expect(roundToCents(0)).toBe(0);
    expect(roundToCents(12.34)).toBe(12.34);
    expect(roundToCents(-99.99)).toBe(-99.99);
    expect(roundToCents(1000000)).toBe(1000000);
  });

  it('rounds a negative amount away to a plain zero, not -0', () => {
    expect(Object.is(roundToCents(-0.001), 0)).toBe(true);
  });

  it('passes non-finite values straight through', () => {
    expect(roundToCents(NaN)).toBeNaN();
    expect(roundToCents(Infinity)).toBe(Infinity);
  });
});

describe('calculateInvoiceItemsTotals', () => {
  it('returns zeroes for an empty invoice', () => {
    expect(calculateInvoiceItemsTotals([])).toEqual({
      subtotal: 0,
      discount: 0,
      afterDiscount: 0,
      tax: 0,
      total: 0,
    });
  });

  it('adds up the calculated lines', () => {
    const items = [
      calculateItemTotals(
        item({ quantity: 2, unitPrice: 100, discountPercent: 10, taxPercent: 10, lineNumber: 1 })
      ),
      calculateItemTotals(item({ quantity: 1, unitPrice: 100, taxPercent: 5, lineNumber: 2 })),
    ];

    const totals = calculateInvoiceItemsTotals(items);

    expect(totals.subtotal).toBe(300);
    expect(totals.discount).toBe(20);
    expect(totals.afterDiscount).toBe(280);
    expect(totals.tax).toBe(23);
    expect(totals.total).toBe(303);
  });

  it('keeps the footer arithmetic self-consistent', () => {
    const items = [
      calculateItemTotals(
        item({ quantity: 3, unitPrice: 33.5, discountPercent: 15, taxPercent: 8, lineNumber: 1 })
      ),
      calculateItemTotals(item({ quantity: 1.5, unitPrice: 20, taxPercent: 0, lineNumber: 2 })),
    ];

    const totals = calculateInvoiceItemsTotals(items);

    expect(totals.afterDiscount).toBeCloseTo(totals.subtotal - totals.discount, 10);
    expect(totals.total).toBeCloseTo(totals.afterDiscount + totals.tax, 10);
  });

  it('sums raw line values, so uncalculated rows are counted as zero', () => {
    // A row that never went through calculateItemTotals contributes its stored
    // (zero) totals even though it has a quantity and a price.
    const totals = calculateInvoiceItemsTotals([item({ quantity: 2, unitPrice: 50 })]);

    expect(totals.subtotal).toBe(100);
    expect(totals.total).toBe(0);
  });
});
