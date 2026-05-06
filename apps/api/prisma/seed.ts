import { randomBytes } from 'node:crypto';

import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

import { buildEncryptor } from '../src/infrastructure/encryption.js';
import { Stocks, buildSecurityCheckObjects } from '@biz-checks/check-engine';

/**
 * Idempotent seed for local development. Creates a single demo organization,
 * an OWNER user, two bank accounts, and three published check templates.
 *
 * Run: pnpm --filter @biz-checks/api db:seed
 */
async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const encryptionKeyBase64 =
      process.env['ENCRYPTION_KEY'] ?? randomBytes(32).toString('base64');
    const key = Buffer.from(encryptionKeyBase64, 'base64');
    if (key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must decode to 32 bytes');
    }
    const encryptor = buildEncryptor(key, 1);

    const org = await prisma.organization.upsert({
      where: { slug: 'demo' },
      create: { slug: 'demo', name: 'Demo Organization' },
      update: {},
    });

    const passwordHash = await argon2.hash('demo-password-12345', {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
    const user = await prisma.user.upsert({
      where: { email: 'owner@demo.test' },
      create: {
        email: 'owner@demo.test',
        passwordHash,
        fullName: 'Demo Owner',
      },
      update: {},
    });

    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: { organizationId: org.id, userId: user.id },
      },
      create: { organizationId: org.id, userId: user.id, role: 'OWNER' },
      update: { role: 'OWNER' },
    });

    // Two demo accounts: 121000248 = Wells Fargo SF; 026009593 = Bank of America NY.
    const wellsAccountNumber = '0001234567890';
    const wellsCipher = encryptor.encrypt(wellsAccountNumber);
    const wells = await prisma.bankAccount.upsert({
      where: { id: `seed-wells-${org.id}`.slice(0, 30) },
      create: {
        id: `seed-wells-${org.id}`.slice(0, 30),
        organizationId: org.id,
        nickname: 'Operating',
        bankName: 'Wells Fargo Bank, N.A.',
        bankAddress: '420 Montgomery Street, San Francisco, CA 94104',
        routingNumber: '121000248',
        accountNumberCipher: wellsCipher,
        accountNumberLast4: wellsAccountNumber.slice(-4),
        encryptionKeyVersion: encryptor.keyVersion,
        payerName: 'Demo Co.',
        payerAddress: '123 Main St, Anywhere, USA',
        payerPhone: '(555) 123-4567',
        nextCheckNumber: 1001,
        status: 'ACTIVE',
      },
      update: {},
    });

    const boaAccountNumber = '0009876543210';
    const boaCipher = encryptor.encrypt(boaAccountNumber);
    await prisma.bankAccount.upsert({
      where: { id: `seed-boa-${org.id}`.slice(0, 30) },
      create: {
        id: `seed-boa-${org.id}`.slice(0, 30),
        organizationId: org.id,
        nickname: 'Payroll',
        bankName: 'Bank of America, N.A.',
        bankAddress: '100 N. Tryon St, Charlotte, NC 28202',
        routingNumber: '026009593',
        accountNumberCipher: boaCipher,
        accountNumberLast4: boaAccountNumber.slice(-4),
        encryptionKeyVersion: encryptor.keyVersion,
        payerName: 'Demo Co. Payroll',
        payerAddress: '123 Main St, Anywhere, USA',
        nextCheckNumber: 5001,
        status: 'ACTIVE',
      },
      update: {},
    });

    // Templates — three default stocks with the canonical ANSI X9.100 layout
    // plus the full CPSA security feature suite (microprint, pantograph,
    // padlock legend, stale-date, amount protection, two-signature notice).
    const stocksToSeed: Array<{ stockKey: string; name: string; description: string }> = [
      {
        stockKey: 'business-3up',
        name: '3-Up Business Check (Security)',
        description:
          'ANSI X9.100-160 / CPSA secure layout — microprint, pantograph, padlock legend.',
      },
      {
        stockKey: 'voucher-top',
        name: 'Voucher Check Top (Security)',
        description: 'Voucher-style top check with full CPSA security feature suite.',
      },
      {
        stockKey: 'voucher-middle',
        name: 'Voucher Check Middle (Security)',
        description: 'Middle-position voucher check with full CPSA security feature suite.',
      },
    ];

    for (const { stockKey, name, description } of stocksToSeed) {
      const stock = Stocks[stockKey];
      if (!stock) continue;
      const document = {
        stock,
        objects: buildSecurityCheckObjects(),
        labelFields: [
          { name: 'CompanyName', kind: 'constant' as const, value: 'Demo Co.' },
          { name: 'Payee', kind: 'constant' as const, value: '' },
          { name: 'Amount', kind: 'constant' as const, value: '0.00' },
          { name: 'AmountWords', kind: 'constant' as const, value: '' },
          { name: 'Memo', kind: 'constant' as const, value: '' },
          {
            name: 'SerialNumber',
            kind: 'incrementing' as const,
            next: 1001,
            step: 1,
            pad: 0,
          },
        ],
        background: '#ffffff',
      };
      const templateId = `seed-tpl-${stockKey}-${org.id}`.slice(0, 30);
      await prisma.checkTemplate.upsert({
        where: { id: templateId },
        create: {
          id: templateId,
          organizationId: org.id,
          bankAccountId: wells.id,
          name,
          description,
          version: 1,
          isPublished: true,
          document,
          createdById: user.id,
          updatedById: user.id,
          versions: {
            create: { version: 1, document, createdById: user.id },
          },
        },
        update: {
          name,
          description,
          isPublished: true,
          document,
          updatedById: user.id,
        },
      });
    }

    console.log(`Seeded organization "${org.slug}" with ${stocksToSeed.length} templates.`);
    console.log(`Login: owner@demo.test / demo-password-12345`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
