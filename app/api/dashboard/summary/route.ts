import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth-user";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [doctorCount, highPotential, callCount, sampleUnits, specialties, sampleProducts] =
    await Promise.all([
      prisma.doctor.count({ where: { isActive: true } }),
      prisma.doctor.count({ where: { isActive: true, potential: "HIGH" } }),
      prisma.call.count({ where: { userId: user.id } }),
      prisma.sampleIssue.aggregate({
        where: { userId: user.id, status: "ISSUED" },
        _sum: { quantity: true }
      }),
      prisma.doctor.groupBy({
        by: ["specialtyId"],
        where: { isActive: true, specialtyId: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { specialtyId: "desc" } },
        take: 1
      }),
      prisma.sampleIssue.groupBy({
        by: ["productId"],
        where: { userId: user.id, status: "ISSUED", productId: { not: null } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 1
      })
    ]);

  const topSpecialtyId = specialties[0]?.specialtyId ?? null;
  const topProductId = sampleProducts[0]?.productId ?? null;

  const [topSpecialty, topProduct] = await Promise.all([
    topSpecialtyId
      ? prisma.specialty.findUnique({ where: { id: topSpecialtyId }, select: { name: true } })
      : null,
    topProductId
      ? prisma.product.findUnique({ where: { id: topProductId }, select: { molecule: true } })
      : null
  ]);

  return NextResponse.json({
    doctors: doctorCount,
    highPotential,
    highPotentialPercent: doctorCount ? Number(((highPotential / doctorCount) * 100).toFixed(1)) : 0,
    calls: callCount,
    sampleUnits: sampleUnits._sum.quantity ?? 0,
    conversionRate: null,
    topSpecialty: topSpecialty?.name ?? null,
    topSpecialtyCount: specialties[0]?._count._all ?? 0,
    topMolecule: topProduct?.molecule ?? null
  });
}
