import { builder } from '../builder.js';
import type { AuthUser } from '../context.js';
import { verifyPassword, hashPassword } from '../../lib/crypto.js';

// ─── Output types ────────────────────────────────────────────────────────────

const AuthUserRef = builder.objectRef<AuthUser>('AuthUserType');
AuthUserRef.implement({
  description: 'Authenticated user info embedded in JWT',
  fields: (t) => ({
    id:             t.exposeString('id'),
    email:          t.exposeString('email'),
    name:           t.exposeString('name'),
    role:           t.exposeString('role'),
    organizationId: t.exposeString('organizationId'),
  }),
});

interface AuthPayload { token: string; user: AuthUser }
const AuthPayloadRef = builder.objectRef<AuthPayload>('AuthPayload');
AuthPayloadRef.implement({
  fields: (t) => ({
    token: t.exposeString('token'),
    user:  t.field({ type: AuthUserRef, resolve: (p) => p.user }),
  }),
});

// ─── me query ────────────────────────────────────────────────────────────────

builder.queryField('me', (t) =>
  t.field({
    type: AuthUserRef,
    nullable: true,
    description: 'Return the currently authenticated user, or null',
    resolve: (_root, _args, ctx) => ctx.user,
  }),
);

// ─── login mutation ──────────────────────────────────────────────────────────

builder.mutationField('login', (t) =>
  t.field({
    type: AuthPayloadRef,
    description: 'Sign in with email + password, returns JWT',
    args: {
      email:    t.arg.string({ required: true }),
      password: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const user = await ctx.prisma.user.findUnique({
        where: { email: args.email.toLowerCase().trim() },
      });

      const valid = user ? verifyPassword(args.password, user.passwordHash) : false;
      if (!user || !valid) throw new Error('Invalid email or password');

      const payload: AuthUser = {
        id:             user.id,
        email:          user.email,
        name:           user.name,
        role:           user.role,
        organizationId: user.organizationId,
      };

      const token = (ctx.request.server as any).jwt.sign(payload, { expiresIn: '30d' });
      return { token, user: payload };
    },
  }),
);

// ─── register mutation ───────────────────────────────────────────────────────

builder.mutationField('register', (t) =>
  t.field({
    type: AuthPayloadRef,
    description: 'Create a new organization + admin user, returns JWT',
    args: {
      email:    t.arg.string({ required: true }),
      name:     t.arg.string({ required: true }),
      password: t.arg.string({ required: true }),
      orgName:  t.arg.string({ required: true }),
      orgCode:  t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const existing = await ctx.prisma.user.findUnique({
        where: { email: args.email.toLowerCase().trim() },
      });
      if (existing) throw new Error('Email already registered');

      const org = await ctx.prisma.organization.create({
        data: {
          name: args.orgName.trim(),
          code: args.orgCode.toUpperCase().trim(),
          type: 'shipowner',
        },
      });

      const user = await ctx.prisma.user.create({
        data: {
          email:          args.email.toLowerCase().trim(),
          name:           args.name.trim(),
          passwordHash:   hashPassword(args.password),
          role:           'admin',
          organizationId: org.id,
        },
      });

      const payload: AuthUser = {
        id:             user.id,
        email:          user.email,
        name:           user.name,
        role:           user.role,
        organizationId: user.organizationId,
      };

      const token = (ctx.request.server as any).jwt.sign(payload, { expiresIn: '30d' });
      return { token, user: payload };
    },
  }),
);

// ─── changePassword mutation ─────────────────────────────────────────────────

builder.mutationField('changePassword', (t) =>
  t.field({
    type: 'Boolean',
    description: 'Change the current user\'s password',
    args: {
      currentPassword: t.arg.string({ required: true }),
      newPassword:     t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const userId = ctx.user?.id;
      if (!userId) throw new Error('Authentication required');

      const user = await ctx.prisma.user.findUniqueOrThrow({ where: { id: userId } });
      if (!verifyPassword(args.currentPassword, user.passwordHash)) {
        throw new Error('Current password is incorrect');
      }
      if (args.newPassword.length < 8) throw new Error('Password must be at least 8 characters');

      await ctx.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: hashPassword(args.newPassword) },
      });
      return true;
    },
  }),
);
