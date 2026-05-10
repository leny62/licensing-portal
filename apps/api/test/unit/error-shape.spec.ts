import { buildErrorResponse } from '../../src/common/dto/error-response.dto';
import { ErrorCode } from '../../src/common/enums/error-code.enum';
import {
  IllegalTransitionError,
  VersionConflictError,
  SeparationOfDutiesError,
  MfaRequiredError,
  InvalidCredentialsError,
  ResourceNotFoundError,
} from '../../src/common/errors/domain.errors';

describe('error envelope shape', () => {
  it('buildErrorResponse produces the required envelope structure', () => {
    const result = buildErrorResponse(ErrorCode.ValidationError, 'Something failed.', 'corr-123');

    expect(result).toEqual({
      error: {
        code: ErrorCode.ValidationError,
        message: 'Something failed.',
        correlationId: 'corr-123',
      },
    });
  });

  it('buildErrorResponse includes details when provided', () => {
    const result = buildErrorResponse(ErrorCode.ValidationError, 'msg', 'corr-1', {
      from: 'A',
      to: 'B',
    });

    expect(result.error.details).toEqual({ from: 'A', to: 'B' });
  });

  it('buildErrorResponse omits details key when details is empty', () => {
    const result = buildErrorResponse(ErrorCode.ValidationError, 'y', 'z', {});

    expect(result.error).not.toHaveProperty('details');
  });
});

describe('DomainError subclasses', () => {
  it('IllegalTransitionError has code ILLEGAL_TRANSITION and status 409', () => {
    const err = new IllegalTransitionError('Bad transition', { from: 'A', to: 'B' });

    expect(err.code).toBe(ErrorCode.IllegalTransition);
    expect(err.httpStatus).toBe(409);
    expect(err.message).toBe('Bad transition');
    expect(err.details).toEqual({ from: 'A', to: 'B' });
    expect(err).toBeInstanceOf(Error);
  });

  it('VersionConflictError has code VERSION_CONFLICT and status 409', () => {
    const err = new VersionConflictError('app-uuid');

    expect(err.code).toBe(ErrorCode.VersionConflict);
    expect(err.httpStatus).toBe(409);
    expect(err.details).toEqual({ applicationId: 'app-uuid' });
  });

  it('SeparationOfDutiesError has code SEPARATION_OF_DUTIES and status 403', () => {
    const err = new SeparationOfDutiesError('Actor already reviewed this application.');

    expect(err.code).toBe(ErrorCode.SeparationOfDuties);
    expect(err.httpStatus).toBe(403);
  });

  it('MfaRequiredError has code MFA_REQUIRED and status 401', () => {
    const err = new MfaRequiredError();

    expect(err.code).toBe(ErrorCode.MfaRequired);
    expect(err.httpStatus).toBe(401);
  });

  it('InvalidCredentialsError has code INVALID_CREDENTIALS and status 401', () => {
    const err = new InvalidCredentialsError();

    expect(err.code).toBe(ErrorCode.InvalidCredentials);
    expect(err.httpStatus).toBe(401);
  });

  it('ResourceNotFoundError has code RESOURCE_NOT_FOUND and status 404', () => {
    const err = new ResourceNotFoundError('Application not found.');

    expect(err.code).toBe(ErrorCode.ResourceNotFound);
    expect(err.httpStatus).toBe(404);
  });
});
