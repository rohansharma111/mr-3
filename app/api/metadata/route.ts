import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth-user";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [patches, specialties] = await Promise.all([
    prisma.patch.findMany({
      select: {
        id: true,
        name: true,
        doctors: {
          where: { doctor: { isActive: true } },
          select: { doctorId: true }
        }
      },
      orderBy: { name: "asc" }
    }),
    prisma.specialty.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    })
  ]);

  return NextResponse.json({
    patches: patches.map((patch) => ({
      id: patch.id,
      name: patch.name,
      doctorCount: patch.doctors.length
    })),
    specialties: specialties.map((specialty) => ({
      id: specialty.id,
      name: specialty.name
    }))
  });
}
