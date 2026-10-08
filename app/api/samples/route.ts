import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const demoUserEmail = "amit.rawat@mr3.demo";
const statuses = ["ISSUED", "RETURNED", "CANCELLED"] as const;

const issueSchema = z.object({
  doctorId: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(1000),
  status: z.enum(statuses).default("ISSUED")
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const doctorId = searchParams.get("doctorId");
  const status = searchParams.get("status");

  const issues = await prisma.sampleIssue.findMany({
    where: {
      user: { email: demoUserEmail },
      ...(doctorId ? { doctorId } : {}),
      ...(status && statuses.includes(status as typeof statuses[number]) ? { status } : {})
    },
    include: {
      doctor: { select: { id: true, name: true, specialty: { select: { name: true } } } },
      product: { select: { id: true, name: true, molecule: true } }
    },
    orderBy: { issuedAt: "desc" },
    take: 100
  });

  return NextResponse.json({
    samples: issues.map((sample) => ({
      id: sample.id,
      doctorId: sample.doctorId,
      doctorName: sample.doctor.name,
      specialty: sample.doctor.specialty?.name ?? "—",
      productId: sample.productId,
      productName: sample.product?.name ?? "—",
      molecule: sample.product?.molecule ?? "—",
      quantity: sample.quantity,
      status: sample.status,
      issuedAt: sample.issuedAt.toISOString()
    }))
  });
}

export async function POST(request: NextRequest) {
  const parsed = issueSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid sample issue", details: parsed.error.flatten() }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: demoUserEmail } });
  if (!user || !user.isActive) return NextResponse.json({ error: "Active user not configured" }, { status: 500 });

  const [doctor, product] = await Promise.all([
    prisma.doctor.findFirst({ where: { id: parsed.data.doctorId, isActive: true }, select: { id: true, name: true } }),
    prisma.product.findFirst({ where: { id: parsed.data.productId, isActive: true }, select: { id: true, name: true } })
  ]);
  if (!doctor) return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const sample = await prisma.$transaction(async (tx) => {
    const created = await tx.sampleIssue.create({
      data: {
        doctorId: doctor.id,
        productId: product.id,
        userId: user.id,
        quantity: parsed.data.quantity,
        status: parsed.data.status,
        isDemo: true
      }
    });
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "CREATE",
        entityType: "SAMPLE_ISSUE",
        entityId: created.id,
        metadata: { doctorId: doctor.id, productId: product.id, quantity: created.quantity, status: created.status }
      }
    });
    return created;
  });

  return NextResponse.json({
    id: sample.id, doctorId: doctor.id, doctorName: doctor.name,
    productId: product.id, productName: product.name, quantity: sample.quantity,
    status: sample.status, issuedAt: sample.issuedAt.toISOString()
  }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const parsed = z.object({
    id: z.string().uuid(),
    status: z.enum(statuses)
  }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid sample update" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: demoUserEmail } });
  if (!user) return NextResponse.json({ error: "Active user not configured" }, { status: 500 });

  const existing = await prisma.sampleIssue.findFirst({ where: { id: parsed.data.id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Sample issue not found" }, { status: 404 });

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.sampleIssue.update({ where: { id: existing.id }, data: { status: parsed.data.status } });
    await tx.auditLog.create({
      data: { userId: user.id, action: "UPDATE", entityType: "SAMPLE_ISSUE", entityId: result.id, metadata: { status: result.status } }
    });
    return result;
  });

  return NextResponse.json({ id: updated.id, status: updated.status });
}
