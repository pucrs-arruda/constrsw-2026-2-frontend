import { HttpClient, HttpErrorResponse, type HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, map, of, switchMap, throwError, type Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { BffClient, BffRequestError } from '../../../shared/http';
import { AuthSession } from '../../../shell/auth-session';
import type { ApiError } from './api-error';
import { toApiError } from './error-parser';
import { encodeFilterQuery, toHttpParams } from './filter-query';
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

/** Converte o erro do `BffClient` (ou do `HttpClient`) no `ApiError` da superfície. */
function apiFailure(error: unknown): Observable<never> {
  if (error instanceof BffRequestError) return throwError(() => toApiError(error.http));
  if (error instanceof HttpErrorResponse) return throwError(() => toApiError(error));
  return throwError(() => error);
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
  private readonly bff = inject(BffClient);
  /**
   * `HttpClient` direto só nas duas listas: o `BffClient` do kit devolve apenas o corpo, e a
   * paginação precisa do header `X-Total-Count`.
   */
  private readonly http = inject(HttpClient);
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);
  /** `environment.bffBaseUrl` já é o prefixo same-origin do BFF (`/api`); as rotas são `/v1/...`. */
  private readonly path = '/v1/rooms';
  private readonly baseUrl = `${environment.bffBaseUrl.replace(/\/$/, '')}${this.path}`;

  /**
   * O access token do oauth dura 10 min e o Bearer fica só em memória. Num 401 tenta renovar uma
   * vez pelo cookie de refresh e repete a chamada; se a renovação falha (ou o 401 persiste), a
   * sessão local é descartada e o usuário volta ao login, como pede o SPEC (sessão expirada →
   * UX-LOGIN).
   */
  private authed<T>(call: () => Observable<T>): Observable<T> {
    return call().pipe(
      catchError((error: unknown) => {
        if ((error as ApiError)?.status !== 401) return throwError(() => error);
        return this.session.refresh().pipe(
          map(() => true),
          catchError(() => of(false)),
          switchMap((renewed) =>
            renewed
              ? call().pipe(
                  catchError((retryError: unknown) =>
                    (retryError as ApiError)?.status === 401
                      ? this.expire(retryError)
                      : throwError(() => retryError),
                  ),
                )
              : this.expire(error),
          ),
        );
      }),
    );
  }

  private expire(error: unknown): Observable<never> {
    this.session.clear();
    void this.router.navigateByUrl('/login');
    return throwError(() => error);
  }

  list(query: RoomQuery): Observable<Page<RoomView>> {
    return this.authed(() =>
      this.http
        .get<RoomView[]>(this.baseUrl, {
          params: toHttpParams(query),
          observe: 'response',
        })
        .pipe(
          map(toPage),
          catchError((err: HttpErrorResponse) =>
            isNotFound(err) ? of({ items: [], total: 0 }) : apiFailure(err),
          ),
        ),
    );
  }

  get(id: string): Observable<RoomView> {
    return this.authed(() =>
      this.bff.get<RoomView>(this.roomPath(id)).pipe(catchError(apiFailure)),
    );
  }

  create(body: RoomCreate): Observable<Room> {
    return this.authed(() =>
      this.bff.post<Room>(this.path, definedFields(body)).pipe(catchError(apiFailure)),
    );
  }

  update(id: string, body: RoomUpdate): Observable<Room> {
    return this.authed(() =>
      this.bff.put<Room>(this.roomPath(id), body).pipe(catchError(apiFailure)),
    );
  }

  patch(id: string, body: RoomPatch): Observable<Room> {
    requirePatch(body);
    return this.authed(() =>
      this.bff.patch<Room>(this.roomPath(id), body).pipe(catchError(apiFailure)),
    );
  }

  remove(id: string): Observable<void> {
    return this.authed(() =>
      this.bff.delete<void>(this.roomPath(id)).pipe(
        map(() => undefined),
        catchError(apiFailure),
      ),
    );
  }

  listFeatures(roomId: string, query?: FeatureQuery): Observable<Page<AccessibilityFeature>> {
    return this.authed(() =>
      this.http
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
        ),
    );
  }

  getFeature(roomId: string, featureId: string): Observable<AccessibilityFeature> {
    return this.authed(() =>
      this.bff
        .get<AccessibilityFeature>(this.featurePath(roomId, featureId))
        .pipe(catchError(apiFailure)),
    );
  }

  createFeature(roomId: string, body: FeatureCreate): Observable<AccessibilityFeature> {
    return this.authed(() =>
      this.bff
        .post<AccessibilityFeature>(this.featuresPath(roomId), definedFields(body))
        .pipe(catchError(apiFailure)),
    );
  }

  updateFeature(
    roomId: string,
    featureId: string,
    body: FeatureUpdate,
  ): Observable<AccessibilityFeature> {
    return this.authed(() =>
      this.bff
        .put<AccessibilityFeature>(this.featurePath(roomId, featureId), body)
        .pipe(catchError(apiFailure)),
    );
  }

  patchFeature(
    roomId: string,
    featureId: string,
    body: FeaturePatch,
  ): Observable<AccessibilityFeature> {
    requirePatch(body);
    return this.authed(() =>
      this.bff
        .patch<AccessibilityFeature>(this.featurePath(roomId, featureId), body)
        .pipe(catchError(apiFailure)),
    );
  }

  removeFeature(roomId: string, featureId: string): Observable<void> {
    return this.authed(() =>
      this.bff.delete<void>(this.featurePath(roomId, featureId)).pipe(
        map(() => undefined),
        catchError(apiFailure),
      ),
    );
  }

  private roomPath(id: string): string {
    return `${this.path}/${encodeURIComponent(id)}`;
  }

  private roomUrl(id: string): string {
    return `${this.baseUrl}/${encodeURIComponent(id)}`;
  }

  private featuresPath(roomId: string): string {
    return `${this.roomPath(roomId)}/accessibility-features`;
  }

  private featurePath(roomId: string, featureId: string): string {
    return `${this.featuresPath(roomId)}/${encodeURIComponent(featureId)}`;
  }

  private featuresUrl(roomId: string): string {
    return `${this.roomUrl(roomId)}/accessibility-features`;
  }
}
