import { HttpParams, type HttpParameterCodec } from '@angular/common/http';
import type { FilterOp, RoomQuery } from '../../surfaces/ux-rooms/data/rooms.models';

const codec: HttpParameterCodec = {
  encodeKey: encodeURIComponent,
  encodeValue: encodeURIComponent,
  decodeKey: decodeURIComponent,
  decodeValue: decodeURIComponent,
};

interface FilterQuery {
  filters?: { field: string; op: FilterOp; value: string | number | boolean }[];
  sort?: { field: string; dir: 'asc' | 'desc' };
  page?: number;
  size?: number;
}

export function toHttpParams(query: RoomQuery): HttpParams {
  return encodeFilterQuery(query);
}

export function encodeFilterQuery(query: FilterQuery): HttpParams {
  let params = new HttpParams({ encoder: codec });

  for (const { field, op, value } of query.filters ?? []) {
    if (
      (field === 'capacity' && op === 'like') ||
      ((field === 'active' || field === 'present') && op !== 'eq' && op !== 'neq') ||
      (field === 'resourceIds' && op !== 'eq')
    ) {
      throw new Error(`Operador "${op}" inválido para o filtro "${field}".`);
    }

    const text = String(value);
    const term = op === 'like' && !text.includes('%') ? `%${text}%` : text;
    params = params.append(field, op === 'eq' ? term : `{${op}}${term}`);
  }

  if (query.sort) params = params.set('sort', `${query.sort.field},${query.sort.dir}`);
  if (query.page !== undefined) params = params.set('page', query.page);
  if (query.size !== undefined) params = params.set('size', query.size);
  return params;
}
