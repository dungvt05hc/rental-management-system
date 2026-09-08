import { describe, it, expect } from 'vitest';
import { formatCurrency, formatPercentage, calculatePagination } from './index';

// Intl tách phần số và ký hiệu tiền tệ bằng non-breaking space (U+00A0).
const NBSP = ' ';

describe('formatCurrency', () => {
  it('formats a plain amount as Vietnamese dong', () => {
    expect(formatCurrency(1000000)).toBe(`1.000.000${NBSP}₫`);
  });

  it('groups thousands with dots', () => {
    expect(formatCurrency(1234567)).toBe(`1.234.567${NBSP}₫`);
  });

  it('has no decimal part — VND is a zero-decimal currency', () => {
    expect(formatCurrency(0)).toBe(`0${NBSP}₫`);
    expect(formatCurrency(5)).toBe(`5${NBSP}₫`);
  });

  it('rounds fractional amounts to whole dong', () => {
    expect(formatCurrency(1234.5)).toBe(`1.235${NBSP}₫`);
    expect(formatCurrency(1234.4)).toBe(`1.234${NBSP}₫`);
  });

  it('marks negative amounts with a leading minus', () => {
    expect(formatCurrency(-99999)).toBe(`-99.999${NBSP}₫`);
  });

  it('honours a different currency, still in Vietnamese locale', () => {
    expect(formatCurrency(1234.5, 'USD')).toBe(`1.234,50${NBSP}US$`);
    expect(formatCurrency(1234.5, 'EUR')).toBe(`1.234,50${NBSP}€`);
  });

  it('renders a non-numeric amount as NaN rather than throwing', () => {
    // Documents current behaviour: nothing guards the input, so a missing amount
    // reaches the UI as "NaN ₫".
    expect(formatCurrency(NaN)).toBe(`NaN${NBSP}₫`);
  });
});

describe('formatPercentage', () => {
  it('appends a percent sign at one decimal by default', () => {
    expect(formatPercentage(12.345)).toBe('12.3%');
  });

  it('honours the requested number of decimals', () => {
    expect(formatPercentage(12.345, 2)).toBe('12.35%');
    expect(formatPercentage(12.345, 0)).toBe('12%');
  });

  it('pads a whole number out to the requested decimals', () => {
    expect(formatPercentage(50)).toBe('50.0%');
  });

  it('formats zero and negatives', () => {
    expect(formatPercentage(0)).toBe('0.0%');
    // toFixed rounds the stored double, and -5.55 is stored just below the half.
    expect(formatPercentage(-5.55)).toBe('-5.5%');
  });

  it('falls back to 0.0% for missing or non-numeric input', () => {
    expect(formatPercentage(NaN)).toBe('0.0%');
    expect(formatPercentage(undefined as unknown as number)).toBe('0.0%');
    expect(formatPercentage(null as unknown as number)).toBe('0.0%');
  });

  it('does not apply the fallback to a real zero-ish value', () => {
    expect(formatPercentage(0.04)).toBe('0.0%');
    expect(formatPercentage(0.04, 2)).toBe('0.04%');
  });
});

describe('calculatePagination', () => {
  it('describes the first page of several', () => {
    expect(calculatePagination(1, 10, 95)).toEqual({
      totalPages: 10,
      hasNextPage: true,
      hasPreviousPage: false,
      startIndex: 1,
      endIndex: 10,
      isFirstPage: true,
      isLastPage: false,
    });
  });

  it('describes a middle page', () => {
    expect(calculatePagination(5, 10, 95)).toEqual({
      totalPages: 10,
      hasNextPage: true,
      hasPreviousPage: true,
      startIndex: 41,
      endIndex: 50,
      isFirstPage: false,
      isLastPage: false,
    });
  });

  it('clamps the last page to the row count', () => {
    const result = calculatePagination(10, 10, 95);

    expect(result.startIndex).toBe(91);
    expect(result.endIndex).toBe(95);
    expect(result.hasNextPage).toBe(false);
    expect(result.isLastPage).toBe(true);
  });

  it('handles a single full page', () => {
    expect(calculatePagination(1, 10, 10)).toEqual({
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
      startIndex: 1,
      endIndex: 10,
      isFirstPage: true,
      isLastPage: true,
    });
  });

  it('rounds a partial page up', () => {
    expect(calculatePagination(1, 10, 1).totalPages).toBe(1);
    expect(calculatePagination(1, 10, 11).totalPages).toBe(2);
  });

  it('reports no next page when there are no rows', () => {
    const result = calculatePagination(1, 10, 0);

    expect(result.totalPages).toBe(0);
    expect(result.hasNextPage).toBe(false);
    expect(result.hasPreviousPage).toBe(false);
    // An empty result set renders as "1-0 of 0", and page 1 is not "the last
    // page" because there are no pages. See TEST-FINDINGS.md #6.
    expect(result.startIndex).toBe(1);
    expect(result.endIndex).toBe(0);
    expect(result.isLastPage).toBe(false);
  });

  it('reports no next page past the end', () => {
    const result = calculatePagination(11, 10, 95);

    expect(result.hasNextPage).toBe(false);
    expect(result.endIndex).toBe(95);
  });
});
