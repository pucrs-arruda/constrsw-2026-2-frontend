import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BffMappedError,
  MapBffHttpErrorOptions,
  mapBffHttpError,
} from './bff-error';

export class BffRequestError extends Error {
  readonly mapped: BffMappedError;
  readonly http: HttpErrorResponse;

  constructor(mapped: BffMappedError, http: HttpErrorResponse) {
    super(mapped.message);
    this.name = 'BffRequestError';
    this.mapped = mapped;
    this.http = http;
  }
}

export interface BffRequestOptions extends MapBffHttpErrorOptions {
  params?: HttpParams | Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;
}

/**
 * Thin HttpClient wrapper for same-origin BFF (`environment.bffBaseUrl`).
 * Does not replace IdentityApi / oauth session flows.
 * Bearer is attached by the existing interceptor for this base URL.
 */
@Injectable({ providedIn: 'root' })
export class BffClient {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.bffBaseUrl.replace(/\/$/, '');

  get<T>(path: string, options: BffRequestOptions = {}): Observable<T> {
    return this.http
      .get<T>(this.url(path), { params: options.params })
      .pipe(catchError((err) => this.rethrow(err, options)));
  }

  post<T>(path: string, body: unknown, options: BffRequestOptions = {}): Observable<T> {
    return this.http
      .post<T>(this.url(path), body, { params: options.params })
      .pipe(catchError((err) => this.rethrow(err, options)));
  }

  put<T>(path: string, body: unknown, options: BffRequestOptions = {}): Observable<T> {
    return this.http
      .put<T>(this.url(path), body, { params: options.params })
      .pipe(catchError((err) => this.rethrow(err, options)));
  }

  patch<T>(path: string, body: unknown, options: BffRequestOptions = {}): Observable<T> {
    return this.http
      .patch<T>(this.url(path), body, { params: options.params })
      .pipe(catchError((err) => this.rethrow(err, options)));
  }

  delete<T>(path: string, options: BffRequestOptions = {}): Observable<T> {
    return this.http
      .delete<T>(this.url(path), { params: options.params })
      .pipe(catchError((err) => this.rethrow(err, options)));
  }

  private url(path: string): string {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}${normalized}`;
  }

  private rethrow(
    err: unknown,
    options: MapBffHttpErrorOptions,
  ): Observable<never> {
    if (err instanceof HttpErrorResponse) {
      const mapped = mapBffHttpError(err, options);
      return throwError(() => new BffRequestError(mapped, err));
    }
    const synthetic = new HttpErrorResponse({
      status: 0,
      statusText: 'Unknown Error',
      error: err,
    });
    const mapped = mapBffHttpError(synthetic, options);
    return throwError(() => new BffRequestError(mapped, synthetic));
  }
}
