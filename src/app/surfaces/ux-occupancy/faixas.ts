/**
 * Códigos canônicos de faixa do domínio reservations (mesmos do CHECK `faixa_id` do serviço).
 * Não há endpoint de faixas; a SPA usa só os códigos, sem time picker livre (UX-DR13).
 */
export const FAIXAS = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'P',
] as const;

export type FaixaId = (typeof FAIXAS)[number];

export function isFaixaId(value: unknown): value is FaixaId {
  return typeof value === 'string' && (FAIXAS as readonly string[]).includes(value);
}
