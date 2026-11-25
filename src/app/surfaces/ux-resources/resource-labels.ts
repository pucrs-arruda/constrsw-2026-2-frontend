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

/** Falls back to the raw value so an enum added upstream still renders. */
export function resourceTypeLabel(type: string): string {
  return RESOURCE_TYPE_LABELS[type as ResourceType] ?? type;
}

export function resourceStatusLabel(active: boolean): string {
  return active ? 'Ativo' : 'Inativo';
}
