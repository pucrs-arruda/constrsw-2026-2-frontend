import { HttpErrorResponse } from '@angular/common/http';

/** Locked institutional banner copies (do not change without renegotiation). */
export const BFF_BANNER_MESSAGES = {
  identity: 'Identidade indisponível.',
  composition: 'Serviço de composição indisponível.',
  refusal: 'Não foi possível concluir a operação. Tente novamente.',
} as const;

/**
 * Which outage banner to show for 503 / 502 / 504 / status 0.
 *
 * - `composition` (default for BFF data calls): T3 / domain composition unavailable —
 *   callers must NOT fall back to client-side joins across OpenAPIs.
 * - `identity`: identity-scoped failure (prefer IdentityApi / oauth paths; rare for BffClient).
 */
export type BffOutageService = 'composition' | 'identity';

export type BffErrorKind =
  | 'unauthorized'
  | 'identity'
  | 'composition'
  | 'refusal'
  | 'unknown';

export type AlertBannerKind = 'refusal' | 'identity' | 'composition';

export interface BffMappedError {
  kind: BffErrorKind;
  /** Banner kind for {@link AlertBanner}; null when caller should clear session only. */
  bannerKind: AlertBannerKind | null;
  message: string;
  status: number;
}

export interface MapBffHttpErrorOptions {
  /**
   * Outage classification for 503/502/504/0.
   * Defaults to `composition` for BFF data calls (T3 copy; no client join).
   */
  service?: BffOutageService;
  /** Institutional refusal copy when status is not 401/outage (optional). */
  refusalMessage?: string;
}

const OUTAGE_STATUSES = new Set([0, 502, 503, 504]);

/** pt-BR labels for OpenAPI employee Problem.code (institutional, not raw enum). */
const PROBLEM_CODE_LABELS: Readonly<Record<string, string>> = {
  validation: 'validação',
  unauthorized: 'não autenticado',
  forbidden: 'proibido',
  'not-found': 'não encontrado',
  conflict: 'conflito',
  internal: 'erro interno',
};

/** Duck-typed body from {@link HttpErrorResponse} or BffRequestError-like wrappers. */
function resolveProblemBody(err: unknown): unknown {
  let raw: unknown = null;
  if (err instanceof HttpErrorResponse) {
    raw = err.error;
  } else if (err && typeof err === 'object' && 'http' in err) {
    const http = (err as { http: unknown }).http;
    if (http instanceof HttpErrorResponse) {
      raw = http.error;
    }
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) {
      return null;
    }
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return null;
    }
  }
  return raw;
}

/**
 * Prefer RFC 7807-ish problem+json `detail`, then `title`.
 * When `code` is present, appends a pt-BR label (e.g. `(conflito)`) if not already in text.
 */
export function formatBffProblemMessage(
  err: HttpErrorResponse | { http: HttpErrorResponse } | unknown,
): string | null {
  const body = resolveProblemBody(err);
  if (!body || typeof body !== 'object') {
    return null;
  }

  const problem = body as {
    detail?: unknown;
    title?: unknown;
    code?: unknown;
  };

  let base: string | null = null;
  if (typeof problem.detail === 'string' && problem.detail.trim().length > 0) {
    base = problem.detail.trim();
  } else if (
    typeof problem.title === 'string' &&
    problem.title.trim().length > 0
  ) {
    base = problem.title.trim();
  }

  if (!base) {
    return null;
  }

  const codeRaw =
    typeof problem.code === 'string'
      ? problem.code.trim()
      : problem.code != null
        ? String(problem.code).trim()
        : '';
  if (!codeRaw) {
    return base;
  }

  const label = PROBLEM_CODE_LABELS[codeRaw] ?? codeRaw;
  const baseLower = base.toLowerCase();
  if (
    baseLower.includes(codeRaw.toLowerCase()) ||
    baseLower.includes(label.toLowerCase())
  ) {
    return base;
  }
  return `${base} (${label})`;
}

/**
 * Maps an HttpErrorResponse from BFF (or BFF-proxied) calls to institutional banners.
 * Does not perform retries or client-side composition fallbacks.
 */
export function mapBffHttpError(
  err: HttpErrorResponse,
  options: MapBffHttpErrorOptions = {},
): BffMappedError {
  const status = err.status;
  const service: BffOutageService = options.service ?? 'composition';

  if (status === 401) {
    const refusal =
      options.refusalMessage?.trim() ||
      'Não foi possível concluir a operação. Faça login novamente.';
    return {
      kind: 'unauthorized',
      bannerKind: 'refusal',
      message: refusal,
      status,
    };
  }

  if (OUTAGE_STATUSES.has(status)) {
    if (service === 'identity') {
      return {
        kind: 'identity',
        bannerKind: 'identity',
        message: BFF_BANNER_MESSAGES.identity,
        status,
      };
    }
    return {
      kind: 'composition',
      bannerKind: 'composition',
      message: BFF_BANNER_MESSAGES.composition,
      status,
    };
  }

  return {
    kind: 'refusal',
    bannerKind: 'refusal',
    message:
      options.refusalMessage?.trim() ||
      formatBffProblemMessage(err) ||
      BFF_BANNER_MESSAGES.refusal,
    status,
  };
}
