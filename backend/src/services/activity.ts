import type { DbClient } from './counters.js';

export interface ActivityInput {
  hotel_id: string;
  user_id?: string | null;
  user_name?: string | null;
  action: string;
  details: string;
  entity_type: string;
  entity_id?: string | null;
}

/** Write an ActivityLog row (the audit trail every mutation feeds). */
export async function logActivity(db: DbClient, input: ActivityInput) {
  return db.activityLog.create({
    data: {
      hotel_id: input.hotel_id,
      user_id: input.user_id ?? null,
      user_name: input.user_name ?? null,
      action: input.action,
      details: input.details,
      entity_type: input.entity_type,
      entity_id: input.entity_id ?? null,
    },
  });
}
