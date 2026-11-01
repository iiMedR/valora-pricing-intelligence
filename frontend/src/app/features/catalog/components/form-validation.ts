import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
export const moneyPattern = /^(0|[1-9]\d{0,14})(\.\d{1,4})?$/;
export const requiredText: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' && control.value.trim().length ? null : { required: true };
export function decimalUnits(value: string): bigint | null {
  if (!moneyPattern.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 10000n + BigInt(fraction.padEnd(4, '0'));
}
export const positiveMoney: ValidatorFn = (control) => {
  const value = decimalUnits(String(control.value));
  return value !== null && value > 0n ? null : { positiveMoney: true };
};
export const priceBounds: ValidatorFn = (control) => {
  const min = decimalUnits(String(control.get('minPrice')?.value));
  const current = decimalUnits(String(control.get('currentPrice')?.value));
  const max = decimalUnits(String(control.get('maxPrice')?.value));
  return min !== null && current !== null && max !== null && (min > current || current > max)
    ? { priceBounds: true }
    : null;
};
