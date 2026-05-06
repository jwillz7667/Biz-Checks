import { createHash, randomBytes } from 'node:crypto';

import { DomainError } from '@biz-checks/domain';
import argon2 from 'argon2';

import type { LoginInput, RegisterInput } from './schemas.js';
import type { AppConfig } from '../../shared/config.js';
import type { PrismaClient, User, UserRole } from '@prisma/client';

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

interface JwtSigner {
  sign: (payload: { sub: string; email: string }) => string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  user: {
    id: string;
    email: string;
    fullName: string;
    organizations: { id: string; name: string; role: UserRole }[];
  };
}

export class AuthService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly jwt: JwtSigner,
    private readonly config: AppConfig,
  ) {}

  async register(input: RegisterInput, ctx: { ip?: string; ua?: string }): Promise<AuthSession> {
    const passwordHash = await argon2.hash(input.password, ARGON2_OPTIONS);

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { email: input.email.toLowerCase() } });
      if (existing) throw new DomainError('CONFLICT', 'Email already in use');

      const user = await tx.user.create({
        data: {
          email: input.email.toLowerCase(),
          passwordHash,
          fullName: input.fullName,
        },
      });
      const org = await tx.organization.create({
        data: {
          name: input.organizationName,
          slug: slugify(input.organizationName, randomBytes(3).toString('hex')),
        },
      });
      await tx.organizationMember.create({
        data: { organizationId: org.id, userId: user.id, role: 'OWNER' },
      });
      await tx.auditLog.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          action: 'CREATE',
          resourceType: 'Organization',
          resourceId: org.id,
          metadata: { name: org.name },
          ipAddress: ctx.ip ?? null,
          userAgent: ctx.ua ?? null,
        },
      });

      return this.buildSession(user, ctx, tx);
    });
  }

  async login(input: LoginInput, ctx: { ip?: string; ua?: string }): Promise<AuthSession> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (!user || !(await argon2.verify(user.passwordHash, input.password))) {
      throw new DomainError('UNAUTHORIZED', 'Invalid email or password');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    return this.buildSession(user, ctx);
  }

  async refresh(rawToken: string, ctx: { ip?: string; ua?: string }): Promise<AuthSession> {
    const tokenHash = sha256(rawToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      // Rotation safety: if the token doesn't exist or is revoked, but the family
      // exists, treat this as a replay and revoke the entire family.
      if (stored?.familyId) {
        await this.prisma.refreshToken.updateMany({
          where: { familyId: stored.familyId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      throw new DomainError('UNAUTHORIZED', 'Invalid or expired refresh token');
    }

    // Rotate: revoke old, mint new in same family.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    return this.buildSession(stored.user, ctx, undefined, stored.familyId);
  }

  async logout(rawToken: string): Promise<void> {
    const tokenHash = sha256(rawToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async buildSession(
    user: User,
    ctx: { ip?: string; ua?: string },
    tx?: Parameters<PrismaClient['$transaction']>[0] extends (
      tx: infer T,
    ) => unknown
      ? T
      : never,
    familyId?: string,
  ): Promise<AuthSession> {
    const client = (tx ?? this.prisma) as PrismaClient;
    const memberships = await client.organizationMember.findMany({
      where: { userId: user.id },
      include: { organization: true },
    });

    const accessToken = this.jwt.sign({ sub: user.id, email: user.email });
    const expiresAt = new Date(Date.now() + this.config.jwtAccessTtlSeconds * 1000);

    const refreshRaw = randomBytes(48).toString('base64url');
    await client.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refreshRaw),
        familyId: familyId ?? randomBytes(16).toString('hex'),
        expiresAt: new Date(Date.now() + this.config.jwtRefreshTtlSeconds * 1000),
        ipAddress: ctx.ip ?? null,
        userAgent: ctx.ua ?? null,
      },
    });

    return {
      accessToken,
      refreshToken: refreshRaw,
      expiresAt,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        organizations: memberships.map((m) => ({
          id: m.organization.id,
          name: m.organization.name,
          role: m.role,
        })),
      },
    };
  }
}

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

function slugify(name: string, salt: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
  return `${base || 'org'}-${salt}`;
}
