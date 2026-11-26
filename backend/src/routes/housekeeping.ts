import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/errors.js';
import { asyncHandler, ok, parseBody } from '../lib/http.js';
import { taskCreateSchema, taskUpdateSchema } from '../validation/schemas.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import {
  assertInScope,
  requireRole,
  resolveScope,
  resolveWriteHotel,
} from '../middleware/rbac.js';
import { serializeTask } from '../lib/serialize.js';
import { logActivity } from '../services/activity.js';
import { nextNumber } from '../services/counters.js';

export const housekeepingRouter = Router();

/** GET /api/housekeeping (?status=, ?assigned_to=) */
housekeepingRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { hotelId } = resolveScope(req as AuthRequest);
    const where: Record<string, unknown> = {};
    if (hotelId) where.hotel_id = hotelId;
    if (typeof req.query.status === 'string') where.status = req.query.status;
    if (typeof req.query.assigned_to === 'string') {
      where.assigned_to = req.query.assigned_to;
    }
    const tasks = await prisma.housekeepingTask.findMany({
      where,
      include: { room: true, assignee: true },
      orderBy: { created_at: 'asc' },
    });
    ok(
      res,
      tasks.map((t) =>
        serializeTask(
          t as unknown as Record<string, unknown> & {
            room?: { id: string; number: string; type: string } | null;
            assignee?: { id: string; full_name: string } | null;
          },
        ),
      ),
    );
  }),
);

/** POST /api/housekeeping — manager / owner / super_admin. */
housekeepingRouter.post(
  '/',
  requireRole('manager', 'owner', 'super_admin'),
  asyncHandler(async (req, res) => {
    const user = requireAuth(req as AuthRequest);
    const body = parseBody(taskCreateSchema, req.body);
    const hotelId = resolveWriteHotel(req as AuthRequest, body.hotel_id);
    const room = await prisma.room.findUnique({ where: { id: body.room_id } });
    if (!room || room.hotel_id !== hotelId) {
      throw new ApiError(404, 'Room not found');
    }
    const task = await prisma.housekeepingTask.create({
      data: {
        hotel_id: hotelId,
        task_number: await nextNumber(prisma, hotelId, 'task'),
        room_id: body.room_id,
        booking_id: body.booking_id ?? null,
        type: body.type,
        status: body.status ?? 'pending',
        priority: body.priority ?? 'medium',
        description: body.description,
        assigned_to: body.assigned_to ?? null,
        due_at: body.due_at ? new Date(body.due_at) : null,
        notes: body.notes ?? null,
      },
    });
    await logActivity(prisma, {
      hotel_id: hotelId,
      user_id: user.id,
      user_name: user.full_name,
      action: 'task_created',
      details: `Created task ${task.task_number}: ${task.description}`,
      entity_type: 'housekeeping_task',
      entity_id: task.id,
    });
    ok(res, task, 201);
  }),
);

/** GET /api/housekeeping/:id */
housekeepingRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const task = await prisma.housekeepingTask.findUnique({
      where: { id: req.params.id },
      include: { room: true, assignee: true },
    });
    if (!task) throw new ApiError(404, 'Task not found');
    assertInScope(req as AuthRequest, task.hotel_id);
    ok(
      res,
      serializeTask(
        task as unknown as Record<string, unknown> & {
          room?: { id: string; number: string; type: string } | null;
          assignee?: { id: string; full_name: string } | null;
        },
      ),
    );
  }),
);

/**
 * PATCH /api/housekeeping/:id — any hotel role may update status /
 * assignee / notes (housekeeping staff work their own queue). Status
 * transitions stamp started_at / completed_at; completing a task frees a
 * dirty room back to available.
 */
housekeepingRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = requireAuth(req as AuthRequest);
    const body = parseBody(taskUpdateSchema, req.body);
    const task = await prisma.housekeepingTask.findUnique({
      where: { id: req.params.id },
    });
    if (!task) throw new ApiError(404, 'Task not found');
    assertInScope(req as AuthRequest, task.hotel_id);

    const data: Record<string, unknown> = { ...body };
    if (body.status === 'in_progress' && !task.started_at) {
      data.started_at = new Date();
    }
    if (body.status === 'completed' && !task.completed_at) {
      data.completed_at = new Date();
    }
    if (body.due_at !== undefined) {
      data.due_at = body.due_at ? new Date(body.due_at) : null;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.housekeepingTask.update({
        where: { id: task.id },
        data,
      });
      if (body.status === 'completed') {
        const room = await tx.room.findUnique({ where: { id: task.room_id } });
        if (room && room.status === 'dirty') {
          await tx.room.update({
            where: { id: room.id },
            data: { status: 'available' },
          });
        }
      }
      await logActivity(tx, {
        hotel_id: task.hotel_id,
        user_id: user.id,
        user_name: user.full_name,
        action: 'task_updated',
        details: `Updated task ${next.task_number} (status: ${next.status})`,
        entity_type: 'housekeeping_task',
        entity_id: next.id,
      });
      return next;
    });
    ok(res, updated);
  }),
);

/** DELETE /api/housekeeping/:id — manager / owner / super_admin. */
housekeepingRouter.delete(
  '/:id',
  requireRole('manager', 'owner', 'super_admin'),
  asyncHandler(async (req, res) => {
    const user = requireAuth(req as AuthRequest);
    const task = await prisma.housekeepingTask.findUnique({
      where: { id: req.params.id },
    });
    if (!task) throw new ApiError(404, 'Task not found');
    assertInScope(req as AuthRequest, task.hotel_id);
    await prisma.housekeepingTask.delete({ where: { id: task.id } });
    await logActivity(prisma, {
      hotel_id: task.hotel_id,
      user_id: user.id,
      user_name: user.full_name,
      action: 'task_deleted',
      details: `Deleted task ${task.task_number}`,
      entity_type: 'housekeeping_task',
      entity_id: task.id,
    });
    ok(res, { id: task.id });
  }),
);
