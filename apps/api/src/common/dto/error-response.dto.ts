export interface ErrorDetail {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  correlationId: string;
}

export interface ErrorResponseDto {
  error: ErrorDetail;
}

export const buildErrorResponse = (
  code: string,
  message: string,
  correlationId: string,
  details?: Record<string, unknown>,
): ErrorResponseDto => ({
  error: {
    code,
    message,
    ...(details !== undefined && Object.keys(details).length > 0 ? { details } : {}),
    correlationId,
  },
});
