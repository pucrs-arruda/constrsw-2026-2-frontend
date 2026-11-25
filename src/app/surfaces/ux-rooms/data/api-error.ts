export type ApiErrorKind =
  | 'composition-unavailable'
  | 'domain'
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'conflict'
  | 'validation'
  | 'network'
  | 'unknown';

export interface ApiError {
  kind: ApiErrorKind;
  status: number;
  code?: string;
  message: string;
  raw?: unknown;
}
