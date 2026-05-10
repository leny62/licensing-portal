import { ErrorCode } from '../enums/error-code.enum';

export interface ErrorDetail {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  correlationId: string;
}

export interface ErrorResponseDto {
  error: ErrorDetail;
}
