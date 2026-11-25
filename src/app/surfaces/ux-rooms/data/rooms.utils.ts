import type { ClassSummary, Room } from './rooms.models';

const saoPauloDate = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: 'numeric',
});

export function currentTermLabel(classes: ClassSummary[]): string {
  const firstClass = classes[0];
  if (firstClass) return `${firstClass.year}/${firstClass.semester}`;

  const parts = saoPauloDate.formatToParts(new Date());
  const year = parts.find(({ type }) => type === 'year')?.value;
  const month = parts.find(({ type }) => type === 'month')?.value;
  return `${year}/${Number(month) < 8 ? 1 : 2}`;
}

export function capacityLabel(room: Room): string {
  return room.capacity === null ? 'Capacidade não informada' : `${room.capacity} lugares`;
}

/**
 * Andar da sala, lido do número da sala no próprio código.
 *
 * O contrato de `rooms` **não tem** campo de andar: tem `code`, `building` e `capacity`. O mockup
 * (frames 12 e 13) pede a coluna, e nos exemplos dele o andar é o começo do número da sala —
 * `B201` no 2º, `A105` no 1º. É a mesma convenção dos códigos reais (`32/405` no 4º andar).
 *
 * Então a coluna é **derivada**, não um dado novo: pega o último grupo de dígitos do código e tira
 * os dois últimos, que são o número da sala no andar. Código fora do padrão devolve `null`, e a
 * tela mostra um traço em vez de chutar.
 */
export function floorOf(room: Room): number | null {
  const digits = room.code.match(/\d+(?!.*\d)/)?.[0];
  if (!digits || digits.length < 3) {
    return null;
  }
  const floor = Number(digits.slice(0, -2));
  return Number.isFinite(floor) ? floor : null;
}

export function floorLabel(room: Room): string {
  const floor = floorOf(room);
  return floor === null ? '—' : String(floor);
}

export const featureCodePattern = /^[A-Z][A-Z0-9_]*$/;
