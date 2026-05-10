import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { FastifyRequest } from 'fastify';

import { PrismaService } from '../../../infra/prisma/prisma.service';
import { ApplicationAction } from '../../applications/enums/application-action.enum';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

const REVIEWER_AUDIT_ACTIONS = [
  ApplicationAction.Claim,
  ApplicationAction.Assign,
  ApplicationAction.RecommendApproval,
  ApplicationAction.RecommendRejection,
];

@Injectable()
export class SeparationOfDutiesGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<FastifyRequest & { user?: AuthenticatedUser; params?: Record<string, string> }>();
    const applicationId = request.params?.id;

    if (request.user === undefined || applicationId === undefined) {
      throw new ForbiddenException('Access denied.');
    }

    const priorReviewerAction = await this.prisma.applicationAudit.findFirst({
      where: {
        applicationId,
        actorId: request.user.id,
        action: { in: REVIEWER_AUDIT_ACTIONS },
      },
    });

    if (priorReviewerAction !== null) {
      throw new ForbiddenException('Reviewer cannot decide their own recommendation.');
    }

    return true;
  }
}
