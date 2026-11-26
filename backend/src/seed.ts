// Seed the database from the backend's own seed data
// (./seedData.ts) — the same hotels, demo users, rooms,
// guests, bookings, invoices, tasks, staff, messages, notifications,
// expenses, automations and activity logs the frontend used to ship with.
//
// Idempotent: every row is upserted on its unique key, so running the
// seed twice does not duplicate anything.
//
// Demo users get their password from SEED_DEMO_PASSWORD (REQUIRED — the
// seed exits with an error when it is unset) and it is stored as a
// bcrypt hash, never plaintext. No password value appears in any file.
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { initialCounters, mockData } from './seedData.js';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const demoPassword = process.env.SEED_DEMO_PASSWORD;
  if (!demoPassword) {
    console.error(
      'SEED_DEMO_PASSWORD is not set. Refusing to seed without a demo password.\n' +
        'Set it in backend/.env (or the environment) and run the seed again.',
    );
    process.exit(1);
  }
  const passwordHash = await bcrypt.hash(demoPassword, 10);

  // --- Hotels -------------------------------------------------------------
  for (const hotel of mockData.hotels) {
    await prisma.hotel.upsert({
      where: { id: hotel.id },
      update: {
        name: hotel.name,
        code: hotel.code,
        access_code: hotel.access_code,
        location: hotel.location,
        logo_url: hotel.logo_url,
        owner_name: hotel.owner_name,
      },
      create: {
        id: hotel.id,
        name: hotel.name,
        code: hotel.code,
        access_code: hotel.access_code,
        location: hotel.location,
        logo_url: hotel.logo_url,
        owner_name: hotel.owner_name,
        created_at: new Date(hotel.created_at),
      },
    });
    await prisma.hotelSettings.upsert({
      where: { hotel_id: hotel.id },
      update: {},
      create: { hotel_id: hotel.id, currency: 'USD', tax_rate: 0.1 },
    });
  }

  // --- Demo users (bcrypt hash of SEED_DEMO_PASSWORD) ----------------------
  for (const user of mockData.testUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        password_hash: passwordHash,
        full_name: user.full_name,
        role: user.role,
        hotel_id: user.hotel_id ?? null,
      },
      create: {
        id: user.id,
        email: user.email,
        password_hash: passwordHash,
        full_name: user.full_name,
        role: user.role,
        hotel_id: user.hotel_id ?? null,
      },
    });
  }

  // --- Rooms ---------------------------------------------------------------
  for (const room of mockData.rooms) {
    await prisma.room.upsert({
      where: { id: room.id },
      update: {
        number: room.number,
        type: room.type,
        floor: room.floor,
        status: room.status,
        price_per_night: room.price_per_night,
        capacity: room.capacity,
        amenities: room.amenities,
      },
      create: {
        id: room.id,
        hotel_id: room.hotel_id,
        number: room.number,
        type: room.type,
        floor: room.floor,
        status: room.status,
        price_per_night: room.price_per_night,
        capacity: room.capacity,
        amenities: room.amenities,
        created_at: new Date(room.created_at),
      },
    });
  }

  // --- Guests --------------------------------------------------------------
  for (const guest of mockData.guests) {
    await prisma.guest.upsert({
      where: { id: guest.id },
      update: {
        name: guest.name,
        email: guest.email,
        phone: guest.phone,
        nationality: guest.nationality ?? null,
        id_number: guest.id_number ?? null,
        notes: guest.notes,
        tags: guest.tags,
        total_stays: guest.total_stays,
        total_spent: guest.total_spent,
        last_stay_at: guest.last_stay_at ? new Date(guest.last_stay_at) : null,
      },
      create: {
        id: guest.id,
        hotel_id: guest.hotel_id,
        name: guest.name,
        email: guest.email,
        phone: guest.phone,
        nationality: guest.nationality ?? null,
        id_number: guest.id_number ?? null,
        notes: guest.notes,
        tags: guest.tags,
        total_stays: guest.total_stays,
        total_spent: guest.total_spent,
        last_stay_at: guest.last_stay_at ? new Date(guest.last_stay_at) : null,
        created_at: new Date(guest.created_at),
      },
    });
  }

  // --- Staff ---------------------------------------------------------------
  for (const member of mockData.staff) {
    await prisma.staffMember.upsert({
      where: { id: member.id },
      update: {
        user_id: member.user_id,
        full_name: member.full_name,
        email: member.email,
        phone: member.phone,
        role: member.role,
        status: member.status,
        shift: member.shift ?? null,
        hire_date: member.hire_date ? new Date(member.hire_date) : null,
      },
      create: {
        id: member.id,
        hotel_id: member.hotel_id,
        user_id: member.user_id,
        full_name: member.full_name,
        email: member.email,
        phone: member.phone,
        role: member.role,
        status: member.status,
        shift: member.shift ?? null,
        hire_date: member.hire_date ? new Date(member.hire_date) : null,
        created_at: new Date(member.created_at),
      },
    });
  }

  // --- Bookings ------------------------------------------------------------
  for (const booking of mockData.bookings) {
    await prisma.booking.upsert({
      where: { booking_number: booking.booking_number },
      update: {
        guest_id: booking.guest_id,
        room_id: booking.room_id,
        guest_type: booking.guest_type,
        check_in: new Date(booking.check_in),
        check_out: new Date(booking.check_out),
        status: booking.status,
        nights: booking.nights,
        total_amount: booking.total_amount,
        notes: booking.notes,
        payment_status: booking.payment_status,
        deposit_amount: booking.deposit_amount,
        created_by: booking.created_by,
      },
      create: {
        id: booking.id,
        hotel_id: booking.hotel_id,
        booking_number: booking.booking_number,
        guest_id: booking.guest_id,
        room_id: booking.room_id,
        guest_type: booking.guest_type,
        check_in: new Date(booking.check_in),
        check_out: new Date(booking.check_out),
        status: booking.status,
        nights: booking.nights,
        total_amount: booking.total_amount,
        notes: booking.notes,
        payment_status: booking.payment_status,
        deposit_amount: booking.deposit_amount,
        created_by: booking.created_by,
        created_at: new Date(booking.created_at),
        updated_at: new Date(booking.updated_at),
      },
    });
  }

  // --- Invoices (+ line items) ---------------------------------------------
  for (const invoice of mockData.invoices) {
    const created = await prisma.invoice.upsert({
      where: { invoice_number: invoice.invoice_number },
      update: {
        guest_id: invoice.guest_id,
        booking_id: invoice.booking_id,
        amount: invoice.amount,
        tax: invoice.tax,
        total: invoice.total,
        amount_paid: invoice.amount_paid,
        status: invoice.status,
        due_date: invoice.due_date ? new Date(invoice.due_date) : null,
        paid_date: invoice.paid_date ? new Date(invoice.paid_date) : null,
        payment_method: invoice.payment_method ?? null,
        notes: invoice.notes ?? null,
      },
      create: {
        id: invoice.id,
        hotel_id: invoice.hotel_id,
        invoice_number: invoice.invoice_number,
        guest_id: invoice.guest_id,
        booking_id: invoice.booking_id,
        amount: invoice.amount,
        tax: invoice.tax,
        total: invoice.total,
        amount_paid: invoice.amount_paid,
        status: invoice.status,
        due_date: invoice.due_date ? new Date(invoice.due_date) : null,
        paid_date: invoice.paid_date ? new Date(invoice.paid_date) : null,
        payment_method: invoice.payment_method ?? null,
        notes: invoice.notes ?? null,
        created_at: new Date(invoice.created_at),
      },
    });
    await prisma.invoiceLineItem.deleteMany({
      where: { invoice_id: created.id },
    });
    for (const item of invoice.line_items) {
      await prisma.invoiceLineItem.create({
        data: {
          invoice_id: created.id,
          description: item.description,
          amount: item.amount,
          quantity: item.quantity,
          type: item.type,
        },
      });
    }
  }

  // --- Housekeeping tasks ---------------------------------------------------
  for (const task of mockData.housekeepingTasks) {
    await prisma.housekeepingTask.upsert({
      where: { task_number: task.task_number },
      update: {
        room_id: task.room_id,
        booking_id: task.booking_id ?? null,
        type: task.type,
        status: task.status,
        priority: task.priority,
        description: task.description,
        assigned_to: task.assigned_to,
        due_at: task.due_at ? new Date(task.due_at) : null,
        automation_triggered: task.automation_triggered ?? false,
        notes: task.notes ?? null,
        started_at: task.started_at ? new Date(task.started_at) : null,
        completed_at: task.completed_at ? new Date(task.completed_at) : null,
      },
      create: {
        id: task.id,
        hotel_id: task.hotel_id,
        task_number: task.task_number,
        room_id: task.room_id,
        booking_id: task.booking_id ?? null,
        type: task.type,
        status: task.status,
        priority: task.priority,
        description: task.description,
        assigned_to: task.assigned_to,
        due_at: task.due_at ? new Date(task.due_at) : null,
        automation_triggered: task.automation_triggered ?? false,
        notes: task.notes ?? null,
        started_at: task.started_at ? new Date(task.started_at) : null,
        completed_at: task.completed_at ? new Date(task.completed_at) : null,
        created_at: new Date(task.created_at),
        updated_at: new Date(task.updated_at),
      },
    });
  }

  // --- Messages --------------------------------------------------------------
  for (const message of mockData.messages) {
    await prisma.message.upsert({
      where: { id: message.id },
      update: {
        guest_name: message.guest_name,
        guest_email: message.guest_email,
        guest_phone: message.guest_phone,
        subject: message.subject,
        message: message.message,
        direction: message.direction,
        channel: message.channel,
        status: message.status,
        priority: message.priority,
        assigned_to: message.assigned_to ?? null,
      },
      create: {
        id: message.id,
        hotel_id: message.hotel_id,
        guest_id: message.guest_id,
        guest_name: message.guest_name,
        guest_email: message.guest_email,
        guest_phone: message.guest_phone,
        subject: message.subject,
        message: message.message,
        direction: message.direction,
        channel: message.channel,
        status: message.status,
        priority: message.priority,
        assigned_to: message.assigned_to ?? null,
        created_at: new Date(message.created_at),
        updated_at: message.updated_at
          ? new Date(message.updated_at)
          : new Date(message.created_at),
      },
    });
  }

  // --- Notifications ---------------------------------------------------------
  for (const notification of mockData.notifications) {
    await prisma.notification.upsert({
      where: { id: notification.id },
      update: {
        user_id: notification.user_id ?? null,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link: notification.link ?? null,
        is_read: notification.is_read,
      },
      create: {
        id: notification.id,
        hotel_id: notification.hotel_id,
        user_id: notification.user_id ?? null,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link: notification.link ?? null,
        is_read: notification.is_read,
        created_at: new Date(notification.created_at),
      },
    });
  }

  // --- Expenses --------------------------------------------------------------
  for (const expense of mockData.expenses) {
    await prisma.expense.upsert({
      where: { id: expense.id },
      update: {
        amount: expense.amount,
        category: expense.category,
        description: expense.description,
        date: new Date(expense.date),
        vendor: expense.vendor,
        created_by: expense.created_by,
      },
      create: {
        id: expense.id,
        hotel_id: expense.hotel_id,
        amount: expense.amount,
        category: expense.category,
        description: expense.description,
        date: new Date(expense.date),
        vendor: expense.vendor,
        created_by: expense.created_by,
        created_at: new Date(expense.created_at),
      },
    });
  }

  // --- Automations -----------------------------------------------------------
  for (const automation of mockData.automations) {
    await prisma.automation.upsert({
      where: { id: automation.id },
      update: {
        name: automation.name,
        description: automation.description,
        trigger: automation.trigger,
        action: automation.action,
        enabled: automation.enabled,
        config: automation.config
          ? JSON.parse(JSON.stringify(automation.config))
          : undefined,
        execution_count: automation.execution_count,
        last_triggered_at: automation.last_triggered_at
          ? new Date(automation.last_triggered_at)
          : null,
      },
      create: {
        id: automation.id,
        hotel_id: automation.hotel_id,
        name: automation.name,
        description: automation.description,
        trigger: automation.trigger,
        action: automation.action,
        enabled: automation.enabled,
        config: automation.config
          ? JSON.parse(JSON.stringify(automation.config))
          : undefined,
        execution_count: automation.execution_count,
        last_triggered_at: automation.last_triggered_at
          ? new Date(automation.last_triggered_at)
          : null,
        created_at: new Date(automation.created_at),
      },
    });
  }

  // --- Activity logs ---------------------------------------------------------
  for (const log of mockData.activityLogs) {
    await prisma.activityLog.upsert({
      where: { id: log.id },
      update: {
        user_id: log.user_id ?? null,
        user_name: log.user_name,
        action: log.action,
        details: log.details,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
      },
      create: {
        id: log.id,
        hotel_id: log.hotel_id,
        user_id: log.user_id ?? null,
        user_name: log.user_name,
        action: log.action,
        details: log.details,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        created_at: new Date(log.created_at),
      },
    });
  }

  // --- Counters: continue the existing number sequences ----------------------
  // Hotel-001 continues from the highest seed numbers (BK-0005, INV-0002,
  // TSK-0003); every other hotel starts at 0.
  const counters: Record<string, { booking: number; invoice: number; task: number }> = {};
  for (const hotel of mockData.hotels) {
    counters[hotel.id] =
      hotel.id === 'hotel-001'
        ? { ...initialCounters }
        : { booking: 0, invoice: 0, task: 0 };
  }
  for (const [hotelId, kinds] of Object.entries(counters)) {
    for (const [kind, value] of Object.entries(kinds)) {
      await prisma.counter.upsert({
        where: { hotel_id_kind: { hotel_id: hotelId, kind } },
        update: { value },
        create: { hotel_id: hotelId, kind, value },
      });
    }
  }

  const counts = await Promise.all([
    prisma.hotel.count(),
    prisma.user.count(),
    prisma.room.count(),
    prisma.guest.count(),
    prisma.booking.count(),
    prisma.invoice.count(),
    prisma.housekeepingTask.count(),
    prisma.staffMember.count(),
    prisma.message.count(),
    prisma.notification.count(),
    prisma.expense.count(),
    prisma.automation.count(),
    prisma.activityLog.count(),
  ]);
  console.log(
    'Seed complete: ' +
      [
        `${counts[0]} hotels`,
        `${counts[1]} users`,
        `${counts[2]} rooms`,
        `${counts[3]} guests`,
        `${counts[4]} bookings`,
        `${counts[5]} invoices`,
        `${counts[6]} tasks`,
        `${counts[7]} staff`,
        `${counts[8]} messages`,
        `${counts[9]} notifications`,
        `${counts[10]} expenses`,
        `${counts[11]} automations`,
        `${counts[12]} activity logs`,
      ].join(', '),
  );
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
