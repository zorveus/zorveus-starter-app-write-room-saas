import { formatDecimalString, isValidDecimalString } from '@zorveus/sdk';
// Round only for display when requested. Keep decimal values out of Number.
export function quantity(value: string | null | undefined, fractionDigits?: number): string {
  if (value == null || !isValidDecimalString(value)) return 'Unavailable';
  const fraction = value.split('.')[1]?.replace(/0+$/, '') ?? '';
  return formatDecimalString(value, fractionDigits ?? fraction.length);
}
export function date(value: string | null | undefined): string {
  if (!value || Number.isNaN(Date.parse(value))) return 'Unavailable';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}
