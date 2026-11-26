import type {
  OccurrencePriority,
  OccurrenceStatus,
  OccurrenceType,
  ResourceType,
} from './resources-api';

/** pt-BR labels for grupo06 enums. The API never shows raw enum values to the user. */
export const RESOURCE_TYPE_LABELS: Readonly<Record<ResourceType, string>> = {
  PROJECTOR: 'Projetor',
  HEALTH_KIT: 'Kit de saúde',
  COMPUTER: 'Computador',
  NOTEBOOK: 'Notebook',
  CAMERA: 'Câmera',
  MICROPHONE: 'Microfone',
  DISPLAY: 'Monitor',
  CABLE: 'Cabo',
  ADAPTER: 'Adaptador',
};

export const OCCURRENCE_TYPE_LABELS: Readonly<Record<OccurrenceType, string>> = {
  MALFUNCTION: 'Defeito',
  DAMAGE: 'Dano',
  MISSING: 'Extravio',
  OTHER: 'Outro',
};

export const OCCURRENCE_PRIORITY_LABELS: Readonly<
  Record<OccurrencePriority, string>
> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
};

export const OCCURRENCE_STATUS_LABELS: Readonly<
  Record<OccurrenceStatus, string>
> = {
  OPEN: 'Aberta',
  RESOLVED: 'Resolvida',
};

export const RESERVATION_STATUS_LABELS: Readonly<Record<string, string>> = {
  ACTIVE: 'Ativa',
  CANCELLED: 'Cancelada',
};

/** Faixa start times (PRD addendum canon, same table the BFF composition uses). */
export const FAIXA_START: Readonly<Record<string, string>> = {
  A: '08:00',
  B: '08:45',
  C: '09:45',
  D: '10:30',
  E: '11:30',
  F: '14:00',
  G: '14:45',
  H: '15:45',
  I: '16:30',
  J: '17:30',
  K: '18:15',
  L: '19:15',
  M: '20:00',
  N: '21:00',
  P: '21:45',
};

/** "A" → "Faixa A (08:00)"; unknown ids render as "Faixa X". */
export function faixaLabel(faixaId: string): string {
  const start = FAIXA_START[faixaId];
  return start ? `Faixa ${faixaId} (${start})` : `Faixa ${faixaId}`;
}

/** `YYYY-MM-DD` → `DD/MM/YYYY` without going through Date (no timezone shift). */
export function reservationDateLabel(data: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data ?? '');
  return match ? `${match[3]}/${match[2]}/${match[1]}` : (data ?? '');
}

/** Falls back to the raw value so an enum added upstream still renders. */
export function resourceTypeLabel(type: string): string {
  return RESOURCE_TYPE_LABELS[type as ResourceType] ?? type;
}

export function resourceStatusLabel(active: boolean): string {
  return active ? 'Ativo' : 'Inativo';
}

/** Cancelled reservations don't hold the resource, so counters only count ACTIVE. */
export function activeReservationCount(
  reservations: readonly { status: string }[] | undefined,
): number {
  return (reservations ?? []).filter((r) => r.status === 'ACTIVE').length;
}
