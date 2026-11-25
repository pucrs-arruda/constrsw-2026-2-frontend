import { HttpClient, HttpErrorResponse, type HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, map, of, throwError, type Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { toApiError } from '../../../shared/http/error-parser';
import { encodeFilterQuery, toHttpParams } from '../../../shared/http/filter-query';
import type {
  AccessibilityFeature,
  FeatureCreate,
  FeaturePatch,
  FeatureUpdate,
  FilterOp,
  Page,
  Room,
  RoomCreate,
  RoomPatch,
  RoomQuery,
  RoomUpdate,
  RoomView,
} from './rooms.models';

type FeatureQuery = {
  filters?: { field: 'code' | 'description' | 'present'; op: FilterOp; value: string | boolean }[];
  sort?: { field: 'code' | 'description' | 'present'; dir: 'asc' | 'desc' };
  page?: number;
  size?: number;
};

function toPage<T>(response: HttpResponse<T[]>): Page<T> {
  const items = response.body ?? [];
  const count = response.headers.get('X-Total-Count');
  return { items, total: count === null ? items.length : Number(count) };
}

function isNotFound(error: HttpErrorResponse): boolean {
  return error.status === 404;
}

function apiFailure(error: HttpErrorResponse): Observable<never> {
  return throwError(() => toApiError(error));
}

function definedFields(body: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined));
}

function requirePatch(body: object): void {
  if (!Object.values(body).some((value) => value !== undefined)) {
    throw new Error('Informe ao menos um campo para alterar.');
  }
}

@Injectable({ providedIn: 'root' })
export class RoomsApiService {
  private readonly http = inject(HttpClient);
  /** `environment.bffBaseUrl` já é o prefixo same-origin do BFF (`/api`); as rotas são `/v1/...`. */
  private readonly baseUrl = `${environment.bffBaseUrl.replace(/\/$/, '')}/v1/rooms`;

  list(query: RoomQuery): Observable<Page<RoomView>> {
    return this.http
      .get<RoomView[]>(this.baseUrl, {
        params: toHttpParams(query),
        observe: 'response',
      })
      .pipe(
        map(toPage),
        catchError((err: HttpErrorResponse) =>
          isNotFound(err) ? of({ items: [], total: 0 }) : apiFailure(err),
        ),
      );
  }

  get(id: string): Observable<RoomView> {
    return this.http.get<RoomView>(this.roomUrl(id)).pipe(catchError(apiFailure));
  }

  create(body: RoomCreate): Observable<Room> {
    return this.http.post<Room>(this.baseUrl, definedFields(body)).pipe(catchError(apiFailure));
  }

  update(id: string, body: RoomUpdate): Observable<Room> {
    return this.http.put<Room>(this.roomUrl(id), body).pipe(catchError(apiFailure));
  }

  patch(id: string, body: RoomPatch): Observable<Room> {
    requirePatch(body);
    return this.http.patch<Room>(this.roomUrl(id), body).pipe(catchError(apiFailure));
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(this.roomUrl(id)).pipe(
      map(() => undefined),
      catchError(apiFailure),
    );
  }

  listFeatures(roomId: string, query?: FeatureQuery): Observable<Page<AccessibilityFeature>> {
    return this.http
      .get<AccessibilityFeature[]>(this.featuresUrl(roomId), {
        params: encodeFilterQuery(query ?? {}),
        observe: 'response',
      })
      .pipe(
        map(toPage),
        catchError((err: HttpErrorResponse) => {
          if (!isNotFound(err)) return apiFailure(err);
          return this.get(roomId).pipe(map(() => ({ items: [], total: 0 })));
        }),
      );
  }

  getFeature(roomId: string, featureId: string): Observable<AccessibilityFeature> {
    return this.http
      .get<AccessibilityFeature>(this.featureUrl(roomId, featureId))
      .pipe(catchError(apiFailure));
  }

  createFeature(roomId: string, body: FeatureCreate): Observable<AccessibilityFeature> {
    return this.http
      .post<AccessibilityFeature>(this.featuresUrl(roomId), definedFields(body))
      .pipe(catchError(apiFailure));
  }

  updateFeature(
    roomId: string,
    featureId: string,
    body: FeatureUpdate,
  ): Observable<AccessibilityFeature> {
    return this.http
      .put<AccessibilityFeature>(this.featureUrl(roomId, featureId), body)
      .pipe(catchError(apiFailure));
  }

  patchFeature(
    roomId: string,
    featureId: string,
    body: FeaturePatch,
  ): Observable<AccessibilityFeature> {
    requirePatch(body);
    return this.http
      .patch<AccessibilityFeature>(this.featureUrl(roomId, featureId), body)
      .pipe(catchError(apiFailure));
  }

  removeFeature(roomId: string, featureId: string): Observable<void> {
    return this.http.delete<void>(this.featureUrl(roomId, featureId)).pipe(
      map(() => undefined),
      catchError(apiFailure),
    );
  }

  private roomUrl(id: string): string {
    return `${this.baseUrl}/${encodeURIComponent(id)}`;
  }

  private featuresUrl(roomId: string): string {
    return `${this.roomUrl(roomId)}/accessibility-features`;
  }

  private featureUrl(roomId: string, featureId: string): string {
    return `${this.featuresUrl(roomId)}/${encodeURIComponent(featureId)}`;
  }
}
