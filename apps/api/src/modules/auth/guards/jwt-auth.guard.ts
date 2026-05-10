import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FastifyRequest } from 'fastify';

import { PrismaService } from '../../../infra/prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/auth-metadata.keys';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { TokenService } from '../tokens/token.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic === true) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<FastifyRequest & { user?: AuthenticatedUser }>();
    const authorization = request.headers.authorization;

    if (authorization === undefined || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token.');
    }

    const payload = this.tokenService.verify(authorization.slice('Bearer '.length), 'access');
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });

    if (user === null || !user.isActive) {
      throw new UnauthorizedException('Invalid authenticated user.');
    }

    request.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    return true;
  }
}
