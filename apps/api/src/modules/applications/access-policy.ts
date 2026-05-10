import { Application, UserRole } from '@prisma/client';

import { ApplicationActor } from './interfaces/application-actor.interface';

export const canViewApplication = (actor: ApplicationActor, application: Application): boolean => {
  if (actor.role === UserRole.ADMIN) {
    return true;
  }

  if (actor.role === UserRole.APPLICANT) {
    return application.applicantId === actor.id;
  }

  if (actor.role === UserRole.REVIEWER) {
    return application.reviewerId === actor.id || application.state === 'SUBMITTED';
  }

  if (actor.role === UserRole.APPROVER) {
    return (
      application.state === 'RECOMMENDED_FOR_APPROVAL' ||
      application.state === 'RECOMMENDED_FOR_REJECTION' ||
      application.approverId === actor.id
    );
  }

  return false;
};

export const canEditDraft = (actor: ApplicationActor, application: Application): boolean => {
  return (
    actor.role === UserRole.APPLICANT &&
    application.applicantId === actor.id &&
    application.state === 'DRAFT'
  );
};
