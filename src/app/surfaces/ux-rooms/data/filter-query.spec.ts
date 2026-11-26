import { describe, expect, it } from 'vitest';
import type { RoomFilter } from './rooms.models';
import { toHttpParams } from './filter-query';

describe('toHttpParams', () => {
  it('codifica operadores, curingas e ordenação', () => {
    const params = toHttpParams({
      filters: [
        { field: 'capacity', op: 'gteq', value: 40 },
        { field: 'name', op: 'like', value: 'lab' },
        { field: 'active', op: 'eq', value: false },
        { field: 'code', op: 'like', value: 'A%' },
      ],
      sort: { field: 'capacity', dir: 'desc' },
      page: 0,
      size: 20,
    });
    expect(params.toString()).toBe(
      'capacity=%7Bgteq%7D40&name=%7Blike%7D%25lab%25&active=false&code=%7Blike%7DA%25&sort=capacity%2Cdesc&page=0&size=20',
    );
  });

  it('omite parâmetros ausentes', () => {
    expect(toHttpParams({}).toString()).toBe('');
  });

  const invalid: RoomFilter[] = [
    { field: 'capacity', op: 'like', value: 40 },
    { field: 'active', op: 'gteq', value: true },
    { field: 'resourceIds', op: 'neq', value: 'recurso' },
  ];
  it.each(invalid)('recusa $op em $field', (filter) => {
    expect(() => toHttpParams({ filters: [filter] })).toThrow('inválido');
  });
});
