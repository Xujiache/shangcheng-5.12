export interface ApiEnvelope<T> {
  code: number;
  data: T;
  message?: string;
  msg?: string;
  traceId?: string;
  timestamp?: string;
}

export interface EmptyResult {
  ok: boolean;
}

