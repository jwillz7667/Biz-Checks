import { DomainError } from '@biz-checks/domain';
import fp from 'fastify-plugin';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    requireTenant: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

/**
 * Resolve the active organization for the request from the
 * `x-organization-id` header. The header must reference an org the user
 * is a member of — otherwise FORBIDDEN.
 */
export const tenantPlugin = fp(async (app: FastifyInstance) => {
  const requireTenant = async (req: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (!req.auth) {
      throw new DomainError('UNAUTHORIZED', 'Authentication required');
    }
    const orgId = req.headers['x-organization-id'];
    if (typeof orgId !== 'string' || orgId.length === 0) {
      throw new DomainError('FORBIDDEN', 'Missing x-organization-id header');
    }
    const membership = req.auth.memberships.find((m) => m.organizationId === orgId);
    if (!membership) {
      throw new DomainError('FORBIDDEN', 'Not a member of this organization');
    }
    req.organizationId = membership.organizationId;
    req.role = membership.role;
  };
  app.decorate('requireTenant', requireTenant);
});
