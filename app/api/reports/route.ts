import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth-user";


const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function parseDateOnly(value: string) {
  if (!dateOnlySchema.safeParse(value).success) return null;
  const date = new Date(value + "T00:00:00.000Z");
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  return date;
}

function endExclusive(date: Date) {
  return new Date(date.getTime() + 24 * 60 * 60 * 1000);
}

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {

  const params = new URL(request.url).searchParams;
  const now = new Date();
  const defaultStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const defaultEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));

  const from = params.get("from");
  const to = params.get("to");

  if ((from && !dateOnlySchema.safeParse(from).success) || (to && !dateOnlySchema.safeParse(to).success)) {
    return NextResponse.json({ error: "Invalid report date filter" }, { status: 400 });
  }

  const start = parseDateOnly(from || defaultStart.toISOString().slice(0, 10));
  const end = parseDateOnly(to || defaultEnd.toISOString().slice(0, 10));

  if (!start || !end || start > end) {
    return NextResponse.json({ error: "Invalid report period" }, { status: 400 });
  }

  const rangeEnd = endExclusive(end);

  const [
    callCounts,
    sampleSummary,
    planCounts,
    target,
    topDoctorGroups,
    topProductGroups
  ] = await Promise.all([
    prisma.call.groupBy({
      by: ["status"],
      where: { userId: user.id, calledAt: { gte: start, lt: rangeEnd } },
      _count: { _all: true }
    }),
    prisma.sampleIssue.aggregate({
      where: { userId: user.id, issuedAt: { gte: start, lt: rangeEnd } },
      _count: { _all: true },
      _sum: { quantity: true }
    }),
    prisma.plan.groupBy({
      by: ["status"],
      where: { userId: user.id, plannedFor: { gte: start, lt: rangeEnd } },
      _count: { _all: true }
    }),
    prisma.target.findFirst({
      where: { userId: user.id, periodStart: start, periodEnd: end }
    }),
    prisma.call.groupBy({
      by: ["doctorId"],
      where: { userId: user.id, status: "COMPLETED", calledAt: { gte: start, lt: rangeEnd } },
      _count: { _all: true },
      orderBy: { _count: { doctorId: "desc" } },
      take: 5
    }),
    prisma.sampleIssue.groupBy({
      by: ["productId"],
      where: { userId: user.id, status: "ISSUED", issuedAt: { gte: start, lt: rangeEnd }, productId: { not: null } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5
    })
  ]);

  const doctorIds = topDoctorGroups.map(item => item.doctorId);
  const productIds = topProductGroups.map(item => item.productId).filter((id): id is string => Boolean(id));

  const [doctors, products] = await Promise.all([
    prisma.doctor.findMany({ where: { id: { in: doctorIds } }, select: { id: true, name: true, specialty: { select: { name: true } } } }),
    prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, molecule: true } })
  ]);

  const doctorMap = new Map(doctors.map(item => [item.id, item]));
  const productMap = new Map(products.map(item => [item.id, item]));

  const calls = Object.fromEntries(callCounts.map(item => [item.status.toLowerCase(), item._count._all]));
  const plans = Object.fromEntries(planCounts.map(item => [item.status.toLowerCase(), item._count._all]));

  return NextResponse.json({
    period: { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) },
    calls: {
      total: callCounts.reduce((sum, item) => sum + item._count._all, 0),
      completed: calls.completed ?? 0,
      planned: calls.planned ?? 0,
      missed: calls.missed ?? 0,
      cancelled: calls.cancelled ?? 0
    },
    samples: {
      issues: sampleSummary._count._all,
      unitsIssued: sampleSummary._sum.quantity ?? 0
    },
    plans: {
      total: planCounts.reduce((sum, item) => sum + item._count._all, 0),
      planned: plans.planned ?? 0,
      completed: plans.completed ?? 0,
      missed: plans.missed ?? 0,
      cancelled: plans.cancelled ?? 0
    },
    target: target ? {
      targetCalls: target.targetCalls,
      targetSamples: target.targetSamples,
      targetConversions: target.targetConversions
    } : null,
    topDoctors: topDoctorGroups.map(item => ({
      doctorId: item.doctorId,
      doctorName: doctorMap.get(item.doctorId)?.name ?? "—",
      specialty: doctorMap.get(item.doctorId)?.specialty?.name ?? "—",
      completedCalls: item._count._all
    })),
    topProducts: topProductGroups.map(item => ({
      productId: item.productId,
      productName: item.productId ? productMap.get(item.productId)?.name ?? "—" : "—",
      molecule: item.productId ? productMap.get(item.productId)?.molecule ?? null : null,
      unitsIssued: item._sum.quantity ?? 0
    })),
    conversionTracking: {
      available: false,
      message: "Conversion outcomes are not yet modeled in MR 3.0."
    }
  });
  } catch {
    return NextResponse.json({ error: "Unable to load data" }, { status: 500 });
  }
}
