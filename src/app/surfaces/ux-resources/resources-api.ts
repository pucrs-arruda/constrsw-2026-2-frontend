import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BffClient } from '../../shared/http';

/** grupo06 ResourceType — descriptive only; `active` is the reservation gate. */
export type ResourceType =
  | 'PROJECTOR'
  | 'HEALTH_KIT'
  | 'COMPUTER'
  | 'NOTEBOOK'
  | 'CAMERA'
  | 'MICROPHONE'
  | 'DISPLAY'
  | 'CABLE'
  | 'ADAPTER';

export type OccurrenceType = 'MALFUNCTION' | 'DAMAGE' | 'MISSING' | 'OTHER';
export type OccurrencePriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type OccurrenceStatus = 'OPEN' | 'RESOLVED';

/** grupo03 Reservation, embedded by the BFF as future `reservations[]` (T3). */
export interface FutureReservation {
  id: string;
  professorId: string;
  lessonId: string;
  data: string;
  faixaId: string;
  purpose?: string;
  resourceIds: string[];
  status: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Occurrence {
  id: string;
  resourceId: string;
  description: string;
  type: OccurrenceType;
  priority: OccurrencePriority;
  status: OccurrenceStatus;
  resolution: string | null;
  reportedBy: string;
  resolvedBy: string | null;
  createdAt: string;
  resolvedAt: string | null;
  updatedAt: string;
}

/**
 * Item of `GET /api/v1/resources` as the resources BFF composes it:
 * domain Resource + `openOccurrenceCount` + future `reservations`.
 */
export interface ResourceView {
  id: string;
  code: string;
  name: string;
  type: ResourceType;
  active: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  openOccurrenceCount: number;
  reservations: FutureReservation[];
}

/** `GET /api/v1/resources/{id}` — ResourceView plus the aggregate's `occurrences`. */
export interface ResourceAggregateView extends ResourceView {
  occurrences: Occurrence[];
}

/** grupo06 ResourceCreate — `code` is trimmed and uppercased by the service. */
export interface ResourceCreate {
  code: string;
  name: string;
  type: ResourceType;
  active?: boolean;
  tags?: string[];
}

/** grupo06 ResourcePatch — `code` is immutable; send only changed fields (minProperties 1). */
export interface ResourcePatch {
  name?: string;
  type?: ResourceType;
  active?: boolean;
  tags?: string[];
}

/** Write responses are the plain domain Resource: the BFF never adds `reservations` on writes. */
export type ResourceRead = Omit<
  ResourceView,
  'openOccurrenceCount' | 'reservations'
> &
  Partial<Pick<ResourceView, 'openOccurrenceCount' | 'reservations'>>;

@Injectable({ providedIn: 'root' })
export class ResourcesApi {
  private readonly bff = inject(BffClient);

  /** GET `/api/v1/resources` — composed list (503 when reservations can't be read). */
  list(): Observable<ResourceView[]> {
    return this.bff.get<ResourceView[]>('/v1/resources');
  }

  /** GET `/api/v1/resources/{id}` — composed aggregate with occurrences. */
  getById(id: string): Observable<ResourceAggregateView> {
    return this.bff.get<ResourceAggregateView>(
      `/v1/resources/${encodeURIComponent(id)}`,
    );
  }

  /** POST `/api/v1/resources` → 201 + Location. 409 on duplicate code, 422 on invalid body. */
  create(body: ResourceCreate): Observable<ResourceRead> {
    return this.bff.post<ResourceRead>('/v1/resources', body);
  }

  /** PATCH `/api/v1/resources/{id}` — partial update (name, type, active, tags). */
  patch(id: string, body: ResourcePatch): Observable<ResourceRead> {
    return this.bff.patch<ResourceRead>(
      `/v1/resources/${encodeURIComponent(id)}`,
      body,
    );
  }
}
