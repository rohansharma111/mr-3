import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth-user";
import { isAiSupportEnabled } from "@/lib/ai-config";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [patches, specialties] = await Promise.all([
      prisma.patch.findMany({
        select: {
          id: true,
          name: true,
          doctorCount: true
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
        doctorCount: patch.doctorCount
      })),
      specialties: specialties.map((specialty) => ({
        id: specialty.id,
        name: specialty.name
      })),
      aiSupport: {
        enabled: isAiSupportEnabled()
      }
    });
  } catch {
    return NextResponse.json({ error: "Unable to load metadata" }, { status: 500 });
  }
}
