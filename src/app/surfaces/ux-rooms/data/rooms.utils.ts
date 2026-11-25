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

export const featureCodePattern = /^[A-Z][A-Z0-9_]*$/;
