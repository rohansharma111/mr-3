import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth-user";

const paramsSchema = z.object({
  id: z.string().uuid()
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = paramsSchema.safeParse(await params);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid doctor id" }, { status: 400 });
  }

  const doctor = await prisma.doctor.findFirst({
    where: { id: parsed.data.id, isActive: true },
    include: {
      specialty: { select: { id: true, name: true } },
      patches: {
        include: { patch: { select: { id: true, name: true, doctorCount: true } } }
      }
    }
  });

  if (!doctor) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  const [calls, samples, plans, writingPattern] = await Promise.all([
    prisma.call.findMany({
      where: { doctorId: doctor.id, userId: user.id },
      orderBy: { calledAt: "desc" },
      take: 20,
      include: {
        product: { select: { id: true, name: true, molecule: true } }
      }
    }),
    prisma.sampleIssue.findMany({
      where: { doctorId: doctor.id, userId: user.id },
      orderBy: { issuedAt: "desc" },
      take: 20,
      include: {
        product: { select: { id: true, name: true, molecule: true } }
      }
    }),
    prisma.plan.findMany({
      where: { doctorId: doctor.id, userId: user.id },
      orderBy: { plannedFor: "desc" },
      take: 20
    }),
    prisma.writingPatternSnapshot.findUnique({
      where: { period: "Last 3 Months" }
    })
  ]);

  const completedCalls = calls.filter((call) => call.status === "COMPLETED").length;
  const issuedSampleUnits = samples
    .filter((sample) => sample.status === "ISSUED")
    .reduce((sum, sample) => sum + sample.quantity, 0);

  const lastActivityCandidates = [
    ...calls.map((call) => call.calledAt),
    ...samples.map((sample) => sample.issuedAt),
    ...plans.map((plan) => plan.updatedAt)
  ];

  const lastActivity = lastActivityCandidates.length
    ? new Date(Math.max(...lastActivityCandidates.map((date) => date.getTime()))).toISOString()
    : null;

  return NextResponse.json({
    doctor: {
      id: doctor.id,
      name: doctor.name,
      specialty: doctor.specialty,
      clinic: doctor.clinic,
      location: doctor.location,
      score: doctor.score,
      potential: doctor.potential,
      distanceKm: doctor.distanceKm?.toString() ?? null,
      mapCoordinates:
        doctor.mapX !== null && doctor.mapY !== null
          ? { x: Number(doctor.mapX), y: Number(doctor.mapY) }
          : null,
      patches: doctor.patches.map(({ patch }) => patch)
    },
    activity: {
      completedCalls,
      totalCalls: calls.length,
      issuedSampleUnits,
      sampleIssues: samples.length,
      plans: plans.length,
      lastActivity
    },
    calls: calls.map((call) => ({
      id: call.id,
      status: call.status,
      outcome: call.outcome,
      notes: call.notes,
      calledAt: call.calledAt,
      product: call.product
    })),
    samples: samples.map((sample) => ({
      id: sample.id,
      quantity: sample.quantity,
      status: sample.status,
      issuedAt: sample.issuedAt,
      product: sample.product
    })),
    plans: plans.map((plan) => ({
      id: plan.id,
      plannedFor: plan.plannedFor,
      priority: plan.priority,
      objective: plan.objective,
      status: plan.status,
      notes: plan.notes
    })),
    writingPattern: writingPattern
      ? {
          period: writingPattern.period,
          categories: writingPattern.categories,
          molecules: writingPattern.molecules,
          insight: writingPattern.insight,
          sourceLabel: writingPattern.sourceLabel,
          doctorSpecific: false
        }
      : null
  });
}
