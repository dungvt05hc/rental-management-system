import type { InvoiceItem } from '../../types';

/**
 * Money maths for invoice line items.
 *
 * Extracted from InvoiceItemsTable so the arithmetic can be tested without
 * rendering the table. These numbers are what the form posts to the backend, so
 * they have to agree with InvoiceItem.CalculateTotals() on the server.
 */

/**
 * Running totals shown in the table footer.
 */
export interface InvoiceItemsTotals {
  /** Quantity x unit price across all lines, before any discount. */
  subtotal: number;
  /** Total discounted away. */
  discount: number;
  /** Subtotal after discounts, before tax. */
  afterDiscount: number;
  /** Total tax. */
  tax: number;
  /** What the invoice charges for these lines. */
  total: number;
}

/**
 * Rounds to two decimals, halves away from zero — matching
 * InvoiceItem.CalculateTotals() on the server and the way PostgreSQL rounds into
 * a decimal(18,2) column.
 *
 * Goes through the exponent notation rather than `Math.round(x * 100) / 100`
 * because multiplying by 100 first reintroduces the binary error it is meant to
 * absorb: 1.005 * 100 is 100.49999999999999, which rounds down to 1.00.
 */
export function roundToCents(value: number): number {
  if (!Number.isFinite(value)) return value;

  const sign = value < 0 ? -1 : 1;
  const magnitude = Math.abs(value);

  // Shifting through the string form only works while the number stays out of
  // exponent notation, which covers every realistic amount; anything beyond that
  // falls back to plain arithmetic.
  const shifted = Number(`${magnitude}e+2`);
  const unshifted = Number.isFinite(shifted) ? Number(`${Math.round(shifted)}e-2`) : NaN;
  const rounded = Number.isFinite(unshifted) ? unshifted : Math.round(magnitude * 100) / 100;

  // `+ 0` so a rounded-away negative comes back as 0 rather than -0.
  return sign * rounded + 0;
}

/**
 * Returns a copy of the item with its discount, tax and line totals filled in
 * from quantity, unit price, discount percent and tax percent.
 *
 * Each figure is rounded to cents as it is produced, so the totals shown here are
 * the same ones the backend recalculates and stores.
 */
export function calculateItemTotals(item: InvoiceItem): InvoiceItem {
  const subtotal = item.quantity * item.unitPrice;

  // Calculate discount
  let discountAmount = item.discountAmount;
  if (item.discountPercent > 0) {
    discountAmount = roundToCents((subtotal * item.discountPercent) / 100);
  }

  // Calculate line total before tax
  const lineTotal = roundToCents(subtotal - discountAmount);

  // Calculate tax
  const taxAmount = roundToCents((lineTotal * item.taxPercent) / 100);

  // Calculate line total with tax
  const lineTotalWithTax = roundToCents(lineTotal + taxAmount);

  return {
    ...item,
    discountAmount,
    taxAmount,
    lineTotal,
    lineTotalWithTax,
  };
}

/**
 * Adds up the already-calculated lines for the table footer.
 */
export function calculateInvoiceItemsTotals(items: InvoiceItem[]): InvoiceItemsTotals {
  return items.reduce<InvoiceItemsTotals>(
    (acc, item) => ({
      subtotal: acc.subtotal + item.quantity * item.unitPrice,
      discount: acc.discount + item.discountAmount,
      afterDiscount: acc.afterDiscount + item.lineTotal,
      tax: acc.tax + item.taxAmount,
      total: acc.total + item.lineTotalWithTax,
    }),
    { subtotal: 0, discount: 0, afterDiscount: 0, tax: 0, total: 0 }
  );
}
