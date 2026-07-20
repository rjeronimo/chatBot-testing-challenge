export interface HealthResponse {
  status: string;
}

export interface ChatSuccessResponse {
  reply: string;
  latencyMs: number;
}

export interface ErrorResponse {
  error: string;
}