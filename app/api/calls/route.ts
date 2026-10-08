import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth-user";

const callSchema = z.object({
  doctorId: z.string().uuid(),
  productId: z.string().uuid().optional().nullable(),
  outcome: z.string().trim().min(1).max(500),
  notes: z.string().trim().max(5000).optional().default(""),
  status: z.enum(["PLANNED", "COMPLETED", "MISSED", "CANCELLED"]).default("COMPLETED")
});


export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doctorId = new URL(request.url).searchParams.get("doctorId");

  const calls = await prisma.call.findMany({
    where: doctorId ? { doctorId, userId: user.id } : { userId: user.id },
    include: {
      doctor: { select: { name: true } },
      product: { select: { name: true } }
    },
    orderBy: { calledAt: "desc" },
    take: 50
  });

  return NextResponse.json(calls.map((call) => ({
    id: call.id,
    doctorId: call.doctorId,
    doctorName: call.doctor.name,
    productName: call.product?.name ?? null,
    status: call.status,
    outcome: call.outcome,
    notes: call.notes,
    calledAt: call.calledAt
  })));
}

export async function POST(request: NextRequest) {
  const parsed = callSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid call log", details: parsed.error.flatten() }, { status: 400 });
  }

  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doctor = await prisma.doctor.findFirst({
    where: { id: parsed.data.doctorId, isActive: true },
    select: { id: true, name: true }
  });
  if (!doctor) return NextResponse.json({ error: "Doctor not found" }, { status: 404 });

  if (parsed.data.productId) {
    const product = await prisma.product.findFirst({
      where: { id: parsed.data.productId, isActive: true },
      select: { id: true }
    });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const call = await prisma.$transaction(async (tx) => {
    const created = await tx.call.create({
      data: {
        doctorId: doctor.id,
        userId: user.id,
        productId: parsed.data.productId || null,
        status: parsed.data.status,
        outcome: parsed.data.outcome,
        notes: parsed.data.notes,
        isDemo: true
      },
      include: { product: { select: { name: true } } }
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "CREATE",
        entityType: "CALL",
        entityId: created.id,
        metadata: {
          doctorId: doctor.id,
          status: created.status,
          productId: created.productId
        }
      }
    });

    await tx.notification.create({
      data: {
        userId: user.id,
        type: "ACTIVITY",
        title: "Call logged",
        message: `Call logged for ${doctor.name}.`,
        actionUrl: "/?section=calls"
      }
    });

    return created;
  });

  return NextResponse.json({
    id: call.id,
    doctorId: call.doctorId,
    doctorName: doctor.name,
    productName: call.product?.name ?? null,
    status: call.status,
    outcome: call.outcome,
    notes: call.notes,
    calledAt: call.calledAt
  }, { status: 201 });
}
