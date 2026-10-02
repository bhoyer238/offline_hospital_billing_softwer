/**
 * Money utilities - all amounts stored as INTEGER paise (₹1 = 100 paise)
 * This avoids floating-point errors entirely.
 */

/** Convert paise to rupees display string */
export function formatCurrency(paise: number, symbol = '₹'): string {
  const rupees = paise / 100;
  return `${symbol}${rupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Convert rupees (from UI input) to paise for DB storage */
export function rupeesToPaise(rupees: number | string): number {
  const val = typeof rupees === 'string' ? parseFloat(rupees) || 0 : rupees;
  return Math.round(val * 100);
}

/** Convert paise to rupees for display */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/** 
 * Number to Indian words 
 * Example: 25000 paise → "Twenty Five Thousand Only"
 */
const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n: number): string {
  if (n < 20) return ones[n];
  return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
}

function threeDigits(n: number): string {
  if (n >= 100) {
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + twoDigits(n % 100) : '');
  }
  return twoDigits(n);
}

export function numberToWords(paise: number): string {
  const rupees = Math.floor(paise / 100);
  const paiseRemainder = paise % 100;

  if (rupees === 0 && paiseRemainder === 0) return 'Zero Only';

  let result = '';
  
  if (rupees > 0) {
    const crore = Math.floor(rupees / 10000000);
    const lakh = Math.floor((rupees % 10000000) / 100000);
    const thousand = Math.floor((rupees % 100000) / 1000);
    const remainder = rupees % 1000;

    if (crore > 0) result += threeDigits(crore) + ' Crore ';
    if (lakh > 0) result += threeDigits(lakh) + ' Lakh ';
    if (thousand > 0) result += threeDigits(thousand) + ' Thousand ';
    if (remainder > 0) result += threeDigits(remainder);

    result = result.trim() + ' Rupees';
  }

  if (paiseRemainder > 0) {
    if (rupees > 0) result += ' And ';
    result += twoDigits(paiseRemainder) + ' Paise';
  }

  return result.trim() + ' Only';
}

/** Calculate discount amount from percent */
export function calculateDiscount(subtotal: number, discountPercent: number): number {
  return Math.round((subtotal * discountPercent) / 100);
}

/** Calculate tax */
export function calculateTax(amount: number, taxRate: number): number {
  return Math.round((amount * taxRate) / 100);
}
