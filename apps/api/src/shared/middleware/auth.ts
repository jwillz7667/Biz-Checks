import { DomainError } from '@biz-checks/domain';
import fp from 'fastify-plugin';

import type { UserRole } from '@prisma/client';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';


export interface AuthenticatedUser {
  readonly userId: string;
  readonly email: string;
  readonly memberships: readonly { organizationId: string; role: UserRole }[];
}

declare module 'fastify' {
  interface FastifyRequest {
    /**
     * Resolved authenticated user — set by `requireAuth`. Distinct from
     * the @fastify/jwt-managed `req.user` which only carries the raw
     * JWT payload.
     */
    auth?: AuthenticatedUser;
    /** Selected active organization for the request (set by tenant middleware). */
    organizationId?: string;
    /** Role within the active org (set by tenant middleware). */
    role?: UserRole;
  }

  interface FastifyInstance {
    requireAuth: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (
      ...roles: readonly UserRole[]
    ) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; email: string };
    user: { sub: string; email: string };
  }
}

export const authPlugin = fp(async (app: FastifyInstance) => {
  const requireAuth = async (req: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    try {
      await req.jwtVerify();
    } catch {
      throw new DomainError('UNAUTHORIZED', 'Authentication required');
    }
    const decoded = req.user;
    const user = await app.prisma.user.findUnique({
      where: { id: decoded.sub },
      include: { memberships: true },
    });
    if (!user) {
      throw new DomainError('UNAUTHORIZED', 'User no longer exists');
    }
    req.auth = {
      userId: user.id,
      email: user.email,
      memberships: user.memberships.map((m) => ({
        organizationId: m.organizationId,
        role: m.role,
      })),
    };
  };

  const requireRole = (...roles: readonly UserRole[]) => {
    return async (req: FastifyRequest, _reply: FastifyReply): Promise<void> => {
      if (!req.role) throw new DomainError('FORBIDDEN', 'Tenant context missing');
      if (!roles.includes(req.role)) {
        throw new DomainError('FORBIDDEN', `Requires one of: ${roles.join(', ')}`);
      }
    };
  };

  app.decorate('requireAuth', requireAuth);
  app.decorate('requireRole', requireRole);
});
