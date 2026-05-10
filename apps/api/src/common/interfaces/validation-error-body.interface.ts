export interface ValidationErrorBody {
  message: string | string[];
  statusCode: number;
  error?: string;
}
