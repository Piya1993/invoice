import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import Decimal from 'decimal.js';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility for handling currency amounts (stored as integers in smallest unit)
export const formatCurrency = (amountInSmallestUnit: number | Decimal, currency: string = 'PKR', locale: string = 'en-PK') => {
  const amount = new Decimal(amountInSmallestUnit).dividedBy(100); // Assuming 100 paisas = 1 Rupee
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount.toNumber());
};

export const toSmallestUnit = (amount: number | string): number => {
  return new Decimal(amount).times(100).toNumber(); // Convert to smallest unit (e.g., paisas)
};

export const fromSmallestUnit = (amountInSmallestUnit: number): number => {
  return new Decimal(amountInSmallestUnit).dividedBy(100).toNumber(); // Convert from smallest unit
};