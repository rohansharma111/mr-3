import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth-user";

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const targetSchema = z.object({
  periodStart: dateOnlySchema,
  periodEnd: dateOnlySchema,
  targetCalls: z.number().int().min(0).max(100000),
  targetSamples: z.number().int().min(0).max(1000000),
  targetConversions: z.number().int().min(0).max(100000)
});

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

  const params = new URL(request.url).searchParams;
  const now = new Date();
  const defaultStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const defaultEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));

  const from = params.get("from");
  const to = params.get("to");

  if ((from && !dateOnlySchema.safeParse(from).success) || (to && !dateOnlySchema.safeParse(to).success)) {
    return NextResponse.json({ error: "Invalid target date filter" }, { status: 400 });
  }

  const start = parseDateOnly(from || defaultStart.toISOString().slice(0, 10));
  const end = parseDateOnly(to || defaultEnd.toISOString().slice(0, 10));

  if (!start || !end || start > end) {
    return NextResponse.json({ error: "Invalid target period" }, { status: 400 });
  }

  const target = await prisma.target.findFirst({
    where: { userId: user.id, periodStart: start, periodEnd: end }
  });

  const [completedCalls, sampleUnits] = await Promise.all([
    prisma.call.count({
      where: {
        userId: user.id,
        isDemo: false,
        status: "COMPLETED",
        calledAt: { gte: start, lt: endExclusive(end) }
      }
    }),
    prisma.sampleIssue.aggregate({
      where: {
        userId: user.id,
        isDemo: false,
        status: "ISSUED",
        issuedAt: { gte: start, lt: endExclusive(end) }
      },
      _sum: { quantity: true }
    })
  ]);

  return NextResponse.json({
    period: {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10)
    },
    target: target
      ? {
          id: target.id,
          targetCalls: target.targetCalls,
          targetSamples: target.targetSamples,
          targetConversions: target.targetConversions
        }
      : null,
    actual: {
      completedCalls,
      sampleUnits: sampleUnits._sum.quantity ?? 0,
      conversions: null
    },
    conversionTracking: {
      available: false,
      message: "Conversion outcomes are not yet modeled in MR 3.0."
    }
  });
}

export async function POST(request: NextRequest) {
  const parsed = targetSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid target", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const start = parseDateOnly(parsed.data.periodStart);
  const end = parseDateOnly(parsed.data.periodEnd);

  if (!start || !end || start > end) {
    return NextResponse.json({ error: "Target period is invalid" }, { status: 400 });
  }

  const maxPeriodEnd = new Date(start.getTime() + 366 * 24 * 60 * 60 * 1000);
  if (end > maxPeriodEnd) {
    return NextResponse.json(
      { error: "Target period cannot exceed one year" },
      { status: 400 }
    );
  }

  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let target;
  try {
    target = await prisma.$transaction(async (tx) => {
    const existing = await tx.target.findFirst({
      where: { userId: user.id, periodStart: start, periodEnd: end }
    });

    const saved = existing
      ? await tx.target.update({
          where: { id: existing.id },
          data: {
            targetCalls: parsed.data.targetCalls,
            targetSamples: parsed.data.targetSamples,
            targetConversions: parsed.data.targetConversions
          }
        })
      : await tx.target.create({
          data: {
            userId: user.id,
            periodStart: start,
            periodEnd: end,
            targetCalls: parsed.data.targetCalls,
            targetSamples: parsed.data.targetSamples,
            targetConversions: parsed.data.targetConversions,
          }
        });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: existing ? "UPDATE" : "CREATE",
        entityType: "TARGET",
        entityId: saved.id,
        metadata: {
          periodStart: parsed.data.periodStart,
          periodEnd: parsed.data.periodEnd,
          targetCalls: saved.targetCalls,
          targetSamples: saved.targetSamples,
          targetConversions: saved.targetConversions
        }
      }
    });

    await tx.notification.create({
      data: {
        userId: user.id,
        type: "TARGET",
        title: existing ? "Targets updated" : "Targets created",
        message: `Targets saved for ${parsed.data.periodStart} to ${parsed.data.periodEnd}.`,
        actionUrl: "/?section=targets"
      }
    });

    return saved;
    });
  } catch {
    return NextResponse.json({ error: "Unable to save target" }, { status: 500 });
  }

  return NextResponse.json({
    id: target.id,
    periodStart: target.periodStart.toISOString().slice(0, 10),
    periodEnd: target.periodEnd.toISOString().slice(0, 10),
    targetCalls: target.targetCalls,
    targetSamples: target.targetSamples,
    targetConversions: target.targetConversions
  });
}
