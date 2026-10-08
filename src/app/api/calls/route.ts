import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const callSchema = z.object({
  doctorId: z.string().uuid(),
  productId: z.string().uuid().optional().nullable(),
  outcome: z.string().trim().min(1).max(500),
  notes: z.string().trim().max(5000).optional().default(""),
  status: z.enum(["PLANNED", "COMPLETED", "MISSED", "CANCELLED"]).default("COMPLETED")
});

const demoUserEmail = "amit.rawat@mr3.demo";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const doctorId = searchParams.get("doctorId");
  const status = searchParams.get("status");
  const limitParam = Number(searchParams.get("limit") || 50);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 50;

  const calls = await prisma.call.findMany({
    where: {
      ...(doctorId ? { doctorId } : {}),
      ...(status && ["PLANNED", "COMPLETED", "MISSED", "CANCELLED"].includes(status)
        ? { status: status as "PLANNED" | "COMPLETED" | "MISSED" | "CANCELLED" }
        : {})
    },
    include: {
      doctor: { select: { id: true, name: true, specialty: { select: { name: true } } } },
      product: { select: { id: true, name: true } },
      user: { select: { name: true } }
    },
    orderBy: { calledAt: "desc" },
    take: limit
  });

  return NextResponse.json({
    calls: calls.map((call) => ({
      id: call.id,
      doctorId: call.doctorId,
      doctorName: call.doctor.name,
      specialty: call.doctor.specialty?.name ?? "—",
      productId: call.product?.id ?? null,
      productName: call.product?.name ?? null,
      status: call.status,
      outcome: call.outcome ?? "",
      notes: call.notes ?? "",
      userName: call.user?.name ?? "Unknown",
      calledAt: call.calledAt.toISOString()
    }))
  });
}

export async function POST(request: NextRequest) {
  const parsed = callSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid call log", details: parsed.error.flatten() }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: demoUserEmail } });
  if (!user) return NextResponse.json({ error: "Active user not configured" }, { status: 500 });

  const doctor = await prisma.doctor.findFirst({ where: { id: parsed.data.doctorId, isActive: true }, select: { id: true, name: true } });
  if (!doctor) return NextResponse.json({ error: "Doctor not found" }, { status: 404 });

  if (parsed.data.productId) {
    const product = await prisma.product.findFirst({ where: { id: parsed.data.productId, isActive: true }, select: { id: true } });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const call = await prisma.$transaction(async (tx) => {
    const created = await tx.call.create({
      data: { doctorId: doctor.id, userId: user.id, productId: parsed.data.productId || null, status: parsed.data.status, outcome: parsed.data.outcome, notes: parsed.data.notes, isDemo: true },
      include: { product: { select: { name: true } } }
    });
    await tx.auditLog.create({
      data: { userId: user.id, action: "CREATE", entityType: "CALL", entityId: created.id, metadata: { doctorId: doctor.id, status: created.status, productId: created.productId } }
    });
    return created;
  });

  return NextResponse.json({
    id: call.id, doctorId: call.doctorId, doctorName: doctor.name, productName: call.product?.name ?? null,
    status: call.status, outcome: call.outcome, notes: call.notes, calledAt: call.calledAt
  }, { status: 201 });
}
