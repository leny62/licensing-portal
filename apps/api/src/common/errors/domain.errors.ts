export type ErrorCode =
  | 'ILLEGAL_TRANSITION'
  | 'VERSION_CONFLICT'
  | 'SEPARATION_OF_DUTIES'
  | 'MFA_REQUIRED'
  | 'MFA_INVALID'
  | 'MFA_REUSE'
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_LOCKED'
  | 'INACTIVE_ACCOUNT'
  | 'REFRESH_TOKEN_REUSE'
  | 'RESOURCE_NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

export abstract class DomainError extends Error {
  abstract readonly code: ErrorCode;
  abstract readonly httpStatus: number;

  // exactOptionalPropertyTypes: use T|undefined rather than optional ? to allow explicit undefined assignment
  readonly details: Record<string, unknown> | undefined;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
  }
}

export class IllegalTransitionError extends DomainError {
  readonly code = 'ILLEGAL_TRANSITION' as const;
  readonly httpStatus = 409;
}

export class VersionConflictError extends DomainError {
  readonly code = 'VERSION_CONFLICT' as const;
  readonly httpStatus = 409;

  constructor(applicationId?: string) {
    super(
      'Concurrent modification detected — please retry.',
      applicationId !== undefined ? { applicationId } : undefined,
    );
  }
}

export class SeparationOfDutiesError extends DomainError {
  readonly code = 'SEPARATION_OF_DUTIES' as const;
  readonly httpStatus = 403;
}

export class MfaRequiredError extends DomainError {
  readonly code = 'MFA_REQUIRED' as const;
  readonly httpStatus = 401;

  constructor() {
    super('MFA challenge required to complete login.');
  }
}

export class MfaInvalidError extends DomainError {
  readonly code = 'MFA_INVALID' as const;
  readonly httpStatus = 401;
}

export class MfaReuseError extends DomainError {
  readonly code = 'MFA_REUSE' as const;
  readonly httpStatus = 401;

  constructor() {
    super('TOTP code has already been used. Wait for the next window.');
  }
}

export class InvalidCredentialsError extends DomainError {
  readonly code = 'INVALID_CREDENTIALS' as const;
  readonly httpStatus = 401;

  constructor() {
    super('Invalid email or password.');
  }
}

export class AccountLockedError extends DomainError {
  readonly code = 'ACCOUNT_LOCKED' as const;
  readonly httpStatus = 401;
}

export class InactiveAccountError extends DomainError {
  readonly code = 'INACTIVE_ACCOUNT' as const;
  readonly httpStatus = 403;

  constructor() {
    super('Account has been deactivated.');
  }
}

export class RefreshTokenReuseError extends DomainError {
  readonly code = 'REFRESH_TOKEN_REUSE' as const;
  readonly httpStatus = 401;

  constructor() {
    super('Refresh token reuse detected. All sessions have been revoked.');
  }
}

export class ResourceNotFoundError extends DomainError {
  readonly code = 'RESOURCE_NOT_FOUND' as const;
  readonly httpStatus = 404;
}

export class ConflictError extends DomainError {
  readonly code = 'CONFLICT' as const;
  readonly httpStatus = 409;
}
