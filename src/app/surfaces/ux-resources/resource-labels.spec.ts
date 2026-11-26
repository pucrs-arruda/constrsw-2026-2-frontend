import {
  FAIXA_START,
  RESOURCE_TYPE_LABELS,
  activeReservationCount,
  faixaLabel,
  reservationDateLabel,
  resourceStatusLabel,
  resourceTypeLabel,
} from './resource-labels';

describe('resource labels', () => {
  it('has a pt-BR label for every ResourceType in the grupo06 contract', () => {
    expect(Object.keys(RESOURCE_TYPE_LABELS).sort()).toEqual(
      [
        'ADAPTER',
        'CABLE',
        'CAMERA',
        'COMPUTER',
        'DISPLAY',
        'HEALTH_KIT',
        'MICROPHONE',
        'NOTEBOOK',
        'PROJECTOR',
      ].sort(),
    );
    expect(resourceTypeLabel('PROJECTOR')).toBe('Projetor');
    expect(resourceTypeLabel('HEALTH_KIT')).toBe('Kit de saúde');
  });

  it('falls back to the raw value for an unknown type', () => {
    expect(resourceTypeLabel('TABLET')).toBe('TABLET');
  });

  it('labels the active flag as Ativo / Inativo', () => {
    expect(resourceStatusLabel(true)).toBe('Ativo');
    expect(resourceStatusLabel(false)).toBe('Inativo');
  });

  it('covers the canonical faixas A–E, F–N, P (no O)', () => {
    expect(Object.keys(FAIXA_START).join('')).toBe('ABCDEFGHIJKLMNP');
    expect(faixaLabel('A')).toBe('Faixa A (08:00)');
    expect(faixaLabel('P')).toBe('Faixa P (21:45)');
    expect(faixaLabel('Z')).toBe('Faixa Z');
  });

  it('formats a reservation date without timezone shift', () => {
    expect(reservationDateLabel('2026-12-01')).toBe('01/12/2026');
    expect(reservationDateLabel('garbage')).toBe('garbage');
  });

  it('counts only ACTIVE reservations', () => {
    expect(
      activeReservationCount([
        { status: 'ACTIVE' },
        { status: 'CANCELLED' },
        { status: 'ACTIVE' },
      ]),
    ).toBe(2);
    expect(activeReservationCount(undefined)).toBe(0);
  });
});
