import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BffClient } from '../../shared/http';
import type { FaixaId } from './faixas';

/** Item de `GET /api/v1/reservations/ocupacao` (OpenAPI OcupacaoItem): um recurso de reserva ACTIVE. */
export interface OcupacaoItem {
  reservationId: string;
  professorId: string;
  lessonId: string;
  resourceId: string;
}

export interface OcupacaoQuery {
  /** `YYYY-MM-DD`. */
  data: string;
  faixaId: FaixaId;
}

@Injectable({ providedIn: 'root' })
export class OccupancyApi {
  private readonly bff = inject(BffClient);

  /** GET `/api/v1/reservations/ocupacao?data=&faixaId=` (os dois obrigatórios). */
  list(query: OcupacaoQuery): Observable<OcupacaoItem[]> {
    return this.bff.get<OcupacaoItem[]>('/v1/reservations/ocupacao', {
      params: { data: query.data, faixaId: query.faixaId },
    });
  }
}
