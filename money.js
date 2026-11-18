/* Isian nominal diberi titik pemisah ribuan saat diketik: 1500000 -> 1.500.000 */
import { thousands } from './utils.js';

export function formatMoneyInput(input) {
  const digits = input.value.replace(/\D/g, '');
  input.value = digits ? thousands(digits) : '';
}
