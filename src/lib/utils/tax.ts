/**
 * Sri Lankan Tax Calculator (VAT & SSCL)
 *
 * SSCL (Social Security Contribution Levy) is 2.5%
 * VAT (Value Added Tax) is 18%
 * 
 * IMPORTANT: In Sri Lanka, VAT is often calculated ON TOP OF the SSCL-inclusive amount.
 */

export const TAX_RATES = {
  SSCL: 0.025, // 2.5%
  VAT: 0.18,   // 18%
};

export interface TaxCalculation {
  baseAmount: number;
  ssclAmount: number;
  vatAmount: number;
  totalAmount: number;
}

/**
 * Calculates taxes when prices are EXCLUSIVE of tax (Tax is added on top)
 * Base -> Base + SSCL -> (Base + SSCL) + VAT
 */
export function calculateExclusiveTaxes(baseAmount: number): TaxCalculation {
  const ssclAmount = baseAmount * TAX_RATES.SSCL;
  const amountWithSscl = baseAmount + ssclAmount;
  const vatAmount = amountWithSscl * TAX_RATES.VAT;
  
  return {
    baseAmount,
    ssclAmount: Number(ssclAmount.toFixed(2)),
    vatAmount: Number(vatAmount.toFixed(2)),
    totalAmount: Number((baseAmount + ssclAmount + vatAmount).toFixed(2))
  };
}

/**
 * Calculates taxes when the given price is INCLUSIVE of all taxes.
 * Extracts the Base, SSCL, and VAT from the total amount.
 */
export function calculateInclusiveTaxes(totalAmount: number): TaxCalculation {
  // If Total = Base + (Base * 0.025) + ((Base + Base * 0.025) * 0.18)
  // Total = Base * (1 + 0.025) * (1 + 0.18)
  // Total = Base * 1.025 * 1.18 = Base * 1.2095
  
  const baseAmount = totalAmount / (1.025 * 1.18);
  const ssclAmount = baseAmount * TAX_RATES.SSCL;
  const vatAmount = (baseAmount + ssclAmount) * TAX_RATES.VAT;

  return {
    baseAmount: Number(baseAmount.toFixed(2)),
    ssclAmount: Number(ssclAmount.toFixed(2)),
    vatAmount: Number(vatAmount.toFixed(2)),
    totalAmount
  };
}
