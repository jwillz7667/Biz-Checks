import { z } from 'zod';

import { LoginSchema, RefreshSchema, RegisterSchema, SessionResponseSchema } from './schemas.js';
import { AuthService } from './service.js';

import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  const service = new AuthService(
    app.prisma,
    { sign: (payload) => app.jwt.sign(payload) },
    app.config,
  );

  app.post('/register', {
    schema: {
      body: RegisterSchema,
      response: { 201: SessionResponseSchema },
    },
    handler: async (req, reply) => {
      const session = await service.register(req.body, {
        ip: req.ip,
        ua: req.headers['user-agent'] ?? undefined,
      });
      return reply.code(201).send(toSessionResponse(session));
    },
  });

  app.post('/login', {
    schema: {
      body: LoginSchema,
      response: { 200: SessionResponseSchema },
    },
    handler: async (req) => {
      const session = await service.login(req.body, {
        ip: req.ip,
        ua: req.headers['user-agent'] ?? undefined,
      });
      return toSessionResponse(session);
    },
  });

  app.post('/refresh', {
    schema: {
      body: RefreshSchema,
      response: { 200: SessionResponseSchema },
    },
    handler: async (req) => {
      const session = await service.refresh(req.body.refreshToken, {
        ip: req.ip,
        ua: req.headers['user-agent'] ?? undefined,
      });
      return toSessionResponse(session);
    },
  });

  app.post('/logout', {
    schema: {
      body: RefreshSchema,
      response: { 204: z.null() },
    },
    handler: async (req, reply) => {
      await service.logout(req.body.refreshToken);
      return reply.code(204).send(null);
    },
  });

  app.get('/me', {
    preHandler: [app.requireAuth],
    schema: {
      response: {
        200: z.object({
          id: z.string(),
          email: z.string().email(),
          memberships: z.array(
            z.object({
              organizationId: z.string(),
              role: z.enum(['OWNER', 'ADMIN', 'DESIGNER', 'PRINTER', 'VIEWER']),
            }),
          ),
        }),
      },
    },
    handler: async (req) => {
      if (!req.auth) throw new Error('unauthenticated');
      return {
        id: req.auth.userId,
        email: req.auth.email,
        memberships: req.auth.memberships.map((m) => ({
          organizationId: m.organizationId,
          role: m.role,
        })),
      };
    },
  });
};

function toSessionResponse(s: Awaited<ReturnType<AuthService['login']>>): {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: typeof s.user;
} {
  return {
    accessToken: s.accessToken,
    refreshToken: s.refreshToken,
    expiresAt: s.expiresAt.toISOString(),
    user: s.user,
  };
}
