import { ErrorCode } from '../enums/error-code.enum';
import { ErrorResponseDto } from '../interfaces/error-response.interface';

export const buildErrorResponse = (
  code: ErrorCode,
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
