import { prisma } from "@/lib/prisma";

export type AiContext = {
  user: {
    name: string;
    role: string;
  };
  doctors: Array<{
    name: string;
    specialty: string | null;
    clinic: string;
    location: string;
    score: number;
    potential: string;
    distanceKm: string | null;
  }>;
  products: Array<{
    name: string;
    molecule: string | null;
    category: string | null;
  }>;
  stockists: Array<{
    name: string;
    location: string;
    product: string;
    molecule: string | null;
    quantity: number;
    unit: string;
    status: string;
  }>;
  recentCalls: Array<{
    doctor: string;
    product: string | null;
    status: string;
    outcome: string | null;
    notes: string | null;
    calledAt: string;
  }>;
  upcomingPlans: Array<{
    doctor: string;
    plannedFor: string;
    priority: string;
    objective: string;
    status: string;
  }>;
  recentSamples: Array<{
    doctor: string;
    product: string | null;
    quantity: number;
    status: string;
    issuedAt: string;
  }>;
};

export async function buildAiContext(userId: string): Promise<AiContext> {
  const [user, doctors, products, stockists, recentCalls, upcomingPlans, recentSamples] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, role: true }
      }),
      prisma.doctor.findMany({
        where: { isActive: true },
        select: {
          name: true,
          clinic: true,
          location: true,
          score: true,
          potential: true,
          distanceKm: true,
          specialty: { select: { name: true } }
        },
        orderBy: { score: "desc" },
        take: 50
      }),
      prisma.product.findMany({
        where: { isActive: true },
        select: { name: true, molecule: true, category: true },
        orderBy: { name: "asc" }
      }),
      prisma.stockist.findMany({
        where: { isActive: true },
        select: {
          name: true,
          location: true,
          inventory: {
            select: {
              quantity: true,
              unit: true,
              status: true,
              product: { select: { name: true, molecule: true } }
            },
            orderBy: { quantity: "desc" },
            take: 10
          }
        },
        orderBy: { name: "asc" }
      }),
      prisma.call.findMany({
        where: { userId },
        select: {
          status: true,
          outcome: true,
          notes: true,
          calledAt: true,
          doctor: { select: { name: true } },
          product: { select: { name: true } }
        },
        orderBy: { calledAt: "desc" },
        take: 20
      }),
      prisma.plan.findMany({
        where: {
          userId,
          plannedFor: { gte: new Date() },
          status: "PLANNED"
        },
        select: {
          plannedFor: true,
          priority: true,
          objective: true,
          status: true,
          doctor: { select: { name: true } }
        },
        orderBy: { plannedFor: "asc" },
        take: 20
      }),
      prisma.sampleIssue.findMany({
        where: { userId },
        select: {
          quantity: true,
          status: true,
          issuedAt: true,
          doctor: { select: { name: true } },
          product: { select: { name: true } }
        },
        orderBy: { issuedAt: "desc" },
        take: 20
      })
    ]);

  return {
    user: {
      name: user?.name ?? "MR 3.0 user",
      role: user?.role ?? "FIELD_MANAGER"
    },
    doctors: doctors.map((doctor) => ({
      name: doctor.name,
      specialty: doctor.specialty?.name ?? null,
      clinic: doctor.clinic,
      location: doctor.location,
      score: doctor.score,
      potential: doctor.potential,
      distanceKm: doctor.distanceKm?.toString() ?? null
    })),
    products,
    stockists: stockists.flatMap((stockist) =>
      stockist.inventory.map((item) => ({
        name: stockist.name,
        location: stockist.location,
        product: item.product.name,
        molecule: item.product.molecule,
        quantity: item.quantity,
        unit: item.unit,
        status: item.status
      }))
    ),
    recentCalls: recentCalls.map((call) => ({
      doctor: call.doctor.name,
      product: call.product?.name ?? null,
      status: call.status,
      outcome: call.outcome,
      notes: call.notes,
      calledAt: call.calledAt.toISOString()
    })),
    upcomingPlans: upcomingPlans.map((plan) => ({
      doctor: plan.doctor.name,
      plannedFor: plan.plannedFor.toISOString(),
      priority: plan.priority,
      objective: plan.objective,
      status: plan.status
    })),
    recentSamples: recentSamples.map((sample) => ({
      doctor: sample.doctor.name,
      product: sample.product?.name ?? null,
      quantity: sample.quantity,
      status: sample.status,
      issuedAt: sample.issuedAt.toISOString()
    }))
  };
}
