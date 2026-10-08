import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const demoUserEmail = "amit.rawat@mr3.demo";
const priorities = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
const statuses = ["PLANNED", "COMPLETED", "MISSED", "CANCELLED"] as const;

const planSchema = z.object({
  doctorId: z.string().uuid(),
  plannedFor: z.string().datetime({ offset: true }),
  priority: z.enum(priorities).default("NORMAL"),
  objective: z.string().trim().max(500).default(""),
  notes: z.string().trim().max(5000).default("")
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const doctorId = searchParams.get("doctorId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const plans = await prisma.plan.findMany({
    where: {
      user: { email: demoUserEmail },
      ...(doctorId ? { doctorId } : {}),
      ...(status && statuses.includes(status as typeof statuses[number]) ? { status } : {}),
      ...(from || to ? {
        plannedFor: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {})
        }
      } : {})
    },
    include: {
      doctor: { select: { id: true, name: true, clinic: true, location: true, score: true, potential: true, specialty: { select: { name: true } } } }
    },
    orderBy: [{ plannedFor: "asc" }],
    take: 100
  });

  return NextResponse.json({
    plans: plans.map((plan) => ({
      id: plan.id,
      doctorId: plan.doctorId,
      doctorName: plan.doctor.name,
      clinic: plan.doctor.clinic,
      location: plan.doctor.location,
      specialty: plan.doctor.specialty?.name ?? "—",
      score: plan.doctor.score,
      potential: plan.doctor.potential,
      plannedFor: plan.plannedFor.toISOString(),
      priority: plan.priority,
      objective: plan.objective,
      status: plan.status,
      notes: plan.notes
    }))
  });
}

export async function POST(request: NextRequest) {
  const parsed = planSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid plan", details: parsed.error.flatten() }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: demoUserEmail } });
  if (!user || !user.isActive) return NextResponse.json({ error: "Active user not configured" }, { status: 500 });

  const plannedFor = new Date(parsed.data.plannedFor);
  if (Number.isNaN(plannedFor.getTime())) return NextResponse.json({ error: "Invalid planned date" }, { status: 400 });
  if (plannedFor.getTime() < Date.now() - 60_000) return NextResponse.json({ error: "Plan time must be in the future" }, { status: 400 });

  const doctor = await prisma.doctor.findFirst({
    where: { id: parsed.data.doctorId, isActive: true },
    select: { id: true, name: true }
  });
  if (!doctor) return NextResponse.json({ error: "Doctor not found" }, { status: 404 });

  const existing = await prisma.plan.findFirst({
    where: { userId: user.id, doctorId: doctor.id, plannedFor }
  });
  if (existing) return NextResponse.json({ error: "This doctor is already planned for that exact time", planId: existing.id }, { status: 409 });

  const plan = await prisma.$transaction(async (tx) => {
    const created = await tx.plan.create({
      data: {
        userId: user.id,
        doctorId: doctor.id,
        plannedFor,
        priority: parsed.data.priority,
        objective: parsed.data.objective,
        notes: parsed.data.notes
      }
    });
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "CREATE",
        entityType: "PLAN",
        entityId: created.id,
        metadata: { doctorId: doctor.id, plannedFor: plannedFor.toISOString(), priority: created.priority }
      }
    });
    return created;
  });

  return NextResponse.json({
    id: plan.id,
    doctorId: doctor.id,
    doctorName: doctor.name,
    plannedFor: plan.plannedFor.toISOString(),
    priority: plan.priority,
    objective: plan.objective,
    status: plan.status,
    notes: plan.notes
  }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const schema = z.object({ id: z.string().uuid(), status: z.enum(statuses), notes: z.string().trim().max(5000).optional() });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid plan update" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: demoUserEmail } });
  if (!user) return NextResponse.json({ error: "Active user not configured" }, { status: 500 });

  const existing = await prisma.plan.findFirst({ where: { id: parsed.data.id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  const plan = await prisma.$transaction(async (tx) => {
    const updated = await tx.plan.update({
      where: { id: existing.id },
      data: { status: parsed.data.status, ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}) }
    });
    await tx.auditLog.create({
      data: { userId: user.id, action: "UPDATE", entityType: "PLAN", entityId: updated.id, metadata: { status: updated.status } }
    });
    return updated;
  });

  return NextResponse.json({ id: plan.id, status: plan.status, notes: plan.notes });
}
