import { ErrorCode } from '../enums/error-code.enum';

export abstract class DomainError extends Error {
  abstract readonly code: ErrorCode;
  abstract readonly httpStatus: number;

  readonly details: Record<string, unknown> | undefined;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
  }
}

export class IllegalTransitionError extends DomainError {
  readonly code = ErrorCode.IllegalTransition;
  readonly httpStatus = 409;
}

export class VersionConflictError extends DomainError {
  readonly code = ErrorCode.VersionConflict;
  readonly httpStatus = 409;

  constructor(applicationId?: string) {
    super(
      'Concurrent modification detected — please retry.',
      applicationId !== undefined ? { applicationId } : undefined,
    );
  }
}

export class SeparationOfDutiesError extends DomainError {
  readonly code = ErrorCode.SeparationOfDuties;
  readonly httpStatus = 403;
}

export class MfaRequiredError extends DomainError {
  readonly code = ErrorCode.MfaRequired;
  readonly httpStatus = 401;

  constructor() {
    super('MFA challenge required to complete login.');
  }
}

export class MfaInvalidError extends DomainError {
  readonly code = ErrorCode.MfaInvalid;
  readonly httpStatus = 401;
}

export class MfaReuseError extends DomainError {
  readonly code = ErrorCode.MfaReuse;
  readonly httpStatus = 401;

  constructor() {
    super('TOTP code has already been used. Wait for the next window.');
  }
}

export class InvalidCredentialsError extends DomainError {
  readonly code = ErrorCode.InvalidCredentials;
  readonly httpStatus = 401;

  constructor() {
    super('Invalid email or password.');
  }
}

export class AccountLockedError extends DomainError {
  readonly code = ErrorCode.AccountLocked;
  readonly httpStatus = 401;
}

export class InactiveAccountError extends DomainError {
  readonly code = ErrorCode.InactiveAccount;
  readonly httpStatus = 403;

  constructor() {
    super('Account has been deactivated.');
  }
}

export class RefreshTokenReuseError extends DomainError {
  readonly code = ErrorCode.RefreshTokenReuse;
  readonly httpStatus = 401;

  constructor() {
    super('Refresh token reuse detected. All sessions have been revoked.');
  }
}

export class ResourceNotFoundError extends DomainError {
  readonly code = ErrorCode.ResourceNotFound;
  readonly httpStatus = 404;
}

export class ConflictError extends DomainError {
  readonly code = ErrorCode.Conflict;
  readonly httpStatus = 409;
}

export class MigrationRequiredError extends DomainError {
  readonly code = ErrorCode.MigrationRequired;
  readonly httpStatus = 503;
}
