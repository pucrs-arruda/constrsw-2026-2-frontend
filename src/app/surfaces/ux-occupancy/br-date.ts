import { Injectable } from '@angular/core';
import { MatDateFormats, NativeDateAdapter } from '@angular/material/core';

const BR_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Monta a data local; `null` quando dia/mês não existem (ex.: 31/02). */
function localDate(year: number, month: number, day: number): Date | null {
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
}

/** `YYYY-MM-DD` → Date local, ou `null` se inválida. */
export function parseIsoDate(value: string | null | undefined): Date | null {
  const match = ISO_DATE.exec(value ?? '');
  return match ? localDate(Number(match[1]), Number(match[2]), Number(match[3])) : null;
}

/** Date local → `YYYY-MM-DD` (formato do contrato). */
export function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Date local → `dd/mm/aaaa`. */
export function toBrDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/** Hoje (data civil) no fuso America/Sao_Paulo. */
export function todayInSaoPaulo(now: Date = new Date()): Date {
  const iso = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return parseIsoDate(iso) ?? now;
}

/** Datepicker em pt-BR: digita e mostra `dd/mm/aaaa`. */
@Injectable()
export class BrDateAdapter extends NativeDateAdapter {
  override parse(value: unknown): Date | null {
    if (typeof value === 'string') {
      const match = BR_DATE.exec(value.trim());
      return match ? localDate(Number(match[3]), Number(match[2]), Number(match[1])) : null;
    }
    return super.parse(value);
  }

  override format(date: Date, displayFormat: object | string): string {
    return displayFormat === 'dd/mm/aaaa'
      ? toBrDate(date)
      : super.format(date, displayFormat as object);
  }
}

export const BR_DATE_FORMATS: MatDateFormats = {
  parse: { dateInput: 'dd/mm/aaaa' },
  display: {
    dateInput: 'dd/mm/aaaa',
    monthYearLabel: { year: 'numeric', month: 'short' },
    dateA11yLabel: { year: 'numeric', month: 'long', day: 'numeric' },
    monthYearA11yLabel: { year: 'numeric', month: 'long' },
  },
};
