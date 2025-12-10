import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin, createErrorResponse, createSuccessResponse } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { users, adminAuditLogs } from '@/lib/db/schema';
import { eq, ilike } from 'drizzle-orm';
import { hash } from 'bcryptjs';
import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'atendente', 'superadmin']),
  companyId: z.string().uuid().optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(3).optional(),
  email: z.string().email().optional(),
  role: z.enum(['admin', 'atendente', 'superadmin']).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return createErrorResponse(auth.error, auth.status);

  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '10');
  const offset = parseInt(searchParams.get('offset') || '0');
  const search = searchParams.get('search') || '';

  try {
    const allUsers = search 
      ? await db.select().from(users).where(ilike(users.email, `%${search}%`))
      : await db.select().from(users);
    
    const paginatedUsers = allUsers.slice(offset, offset + limit);
    
    // Log action
    if (auth.data) {
      await db.insert(adminAuditLogs).values({
        userId: auth.data.id,
        action: 'get_users',
        resource: 'users',
        resourceId: null,
        metadata: { limit, offset, search },
      });
    }

    return createSuccessResponse({
      users: paginatedUsers.map(u => ({
        id: u?.id,
        name: u?.name,
        email: u?.email,
        role: u?.role,
        companyId: u?.companyId,
        createdAt: u?.createdAt,
      })),
      total: allUsers.length,
    });
  } catch (error: any) {
    return createErrorResponse(error.message || 'Error', 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return createErrorResponse(auth.error, auth.status);

  try {
    const body = await request.json();
    const data = createUserSchema.parse(body);

    // Check if user already exists
    const existing = await db.select().from(users).where(eq(users.email, data.email.toLowerCase())).limit(1);
    if (existing.length > 0) {
      return createErrorResponse('User already exists', 400);
    }

    const hashedPassword = await hash(data.password, 10);
    const newUser = await db.insert(users).values({
      name: data.name,
      email: data.email.toLowerCase(),
      password: hashedPassword,
      role: data.role,
      companyId: data.companyId || null,
    }).returning();

    // Log action
    if (auth.data) {
      await db.insert(adminAuditLogs).values({
        userId: auth.data.id,
        action: 'create_user',
        resource: 'users',
        resourceId: newUser[0].id,
        metadata: { email: data.email, role: data.role },
      });
    }

    return createSuccessResponse({
      id: newUser?.[0]?.id,
      name: newUser?.[0]?.name,
      email: newUser?.[0]?.email,
      role: newUser?.[0]?.role,
      companyId: newUser?.[0]?.companyId,
    }, 201);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(JSON.stringify(error.errors), 400);
    }
    return createErrorResponse(error.message || 'Error', 500);
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return createErrorResponse(auth.error, auth.status);

  try {
    const body = await request.json();
    const { userId, ...updateData } = body;
    
    if (!userId) {
      return createErrorResponse('userId is required', 400);
    }

    const validated = updateUserSchema.parse(updateData);
    const updated = await db.update(users).set(validated).where(eq(users.id, userId)).returning();

    if (updated.length === 0) {
      return createErrorResponse('User not found', 404);
    }

    // Log action
    if (auth.data) {
      await db.insert(adminAuditLogs).values({
        userId: auth.data.id,
        action: 'update_user',
        resource: 'users',
        resourceId: userId,
        metadata: validated,
      });
    }

    return createSuccessResponse({
      id: updated?.[0]?.id,
      name: updated?.[0]?.name,
      email: updated?.[0]?.email,
      role: updated?.[0]?.role,
      companyId: updated?.[0]?.companyId,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(JSON.stringify(error.errors), 400);
    }
    return createErrorResponse(error.message || 'Error', 500);
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return createErrorResponse(auth.error, auth.status);

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return createErrorResponse('userId is required', 400);
    }

    if (auth.data && userId === auth.data.id) {
      return createErrorResponse('Cannot delete your own account', 400);
    }

    const deleted = await db.delete(users).where(eq(users.id, userId)).returning();

    if (deleted.length === 0) {
      return createErrorResponse('User not found', 404);
    }

    // Log action
    if (auth.data) {
      await db.insert(adminAuditLogs).values({
        userId: auth.data.id,
        action: 'delete_user',
        resource: 'users',
        resourceId: userId,
        metadata: { email: deleted[0].email },
      });
    }

    return createSuccessResponse({ success: true, id: userId });
  } catch (error: any) {
    return createErrorResponse(error.message || 'Error', 500);
  }
}
