import { describe, expect, it, vi } from 'vitest';
import type { ClassSummary, Room } from './rooms.models';
import { capacityLabel, currentTermLabel, featureCodePattern } from './rooms.utils';

describe('rótulos e códigos de salas', () => {
  it('usa o primeiro semestre recebido do BFF', () => {
    const classSummary: ClassSummary = {
      id: '1',
      code: 'T1',
      label: 'Turma 1',
      status: 'ACTIVE',
      modality: 'PRESENCIAL',
      startDate: '2026-08-01',
      endDate: '2026-12-01',
      year: 2026,
      semester: 2,
      seats: 40,
      courseId: '1',
      professorId: null,
      roomId: '1',
      enabled: true,
    };
    expect(currentTermLabel([classSummary, { ...classSummary, year: 2027 }])).toBe('2026/2');
  });

  it('calcula a virada de semestre no fuso de São Paulo', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-08-01T02:59:59Z'));
      expect(currentTermLabel([])).toBe('2026/1');
      vi.setSystemTime(new Date('2026-08-01T03:00:00Z'));
      expect(currentTermLabel([])).toBe('2026/2');
    } finally {
      vi.useRealTimers();
    }
  });

  it('formata capacidade e valida código de característica', () => {
    const room: Room = {
      id: '1',
      code: 'LAB1',
      name: 'Laboratório',
      building: 'A',
      capacity: 40,
      active: true,
      enabled: true,
      resourceIds: [],
    };
    expect(capacityLabel(room)).toBe('40 lugares');
    expect(capacityLabel({ ...room, capacity: null })).toBe('Capacidade não informada');
    expect(featureCodePattern.test('RAMPA_2')).toBe(true);
    expect(featureCodePattern.test('2RAMPA')).toBe(false);
    expect(featureCodePattern.test('rampa')).toBe(false);
  });
});
