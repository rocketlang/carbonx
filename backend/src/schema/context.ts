import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
}

export interface GraphQLContext {
  prisma: typeof prisma;
  user: AuthUser | null;
  request: FastifyRequest;
  orgFilter: () => { organizationId?: string };
  orgId: () => string;
}

export async function buildContext(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<GraphQLContext> {
  let user: AuthUser | null = null;

  try {
    user = await request.jwtVerify<AuthUser>();
  } catch {
    // Anonymous access — resolvers must check ctx.user if auth required
  }

  return {
    prisma,
    user,
    request,
    orgFilter: () =>
      user?.organizationId ? { organizationId: user.organizationId } : {},
    orgId: () => {
      if (!user?.organizationId) throw new Error('Authentication required');
      return user.organizationId;
    },
  };
}
