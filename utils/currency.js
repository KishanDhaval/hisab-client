/**
 * Currency utility — shared between frontend and backend.
 * All monetary values are stored as integers (paise/cents).
 */

/**
 * Convert a decimal amount (rupees) to integer (paise).
 * e.g. 99.95 → 9995
 */
export const toPaise = (amount) => {
  return Math.round(Number(amount) * 100);
};

/**
 * Convert an integer amount (paise) to decimal (rupees).
 * e.g. 9995 → 99.95
 */
export const toRupees = (paise) => {
  return Number((paise / 100).toFixed(2));
};

/**
 * Safely multiply quantity × price (paise) using integer arithmetic.
 * Avoids floating-point precision issues.
 */
export const safeMultiply = (quantity, pricePaise) => {
  // Convert quantity to integer math: qty * 1000 * price / 1000
  const qtyInt = Math.round(Number(quantity) * 1000);
  return Math.round((qtyInt * Number(pricePaise)) / 1000);
};

/**
 * Format paise to a display string.
 * e.g. 9995 → "₹99.95"
 */
export const formatCurrency = (paise) => {
  const rupees = toRupees(paise);
  return `₹${rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Format a compact currency (no decimals for round amounts).
 * e.g. 10000 → "₹100", 9995 → "₹99.95"
 */
export const formatCurrencyCompact = (paise) => {
  const rupees = toRupees(paise);
  if (rupees % 1 === 0) {
    return `₹${rupees.toLocaleString('en-IN')}`;
  }
  return formatCurrency(paise);
};

/**
 * Sum an array of paise values safely.
 */
export const sumPaise = (values) => {
  return values.reduce((sum, val) => sum + Math.round(Number(val)), 0);
};
