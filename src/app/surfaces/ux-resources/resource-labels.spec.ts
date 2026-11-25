import {
  RESOURCE_TYPE_LABELS,
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
});
