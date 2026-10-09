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
          state: true,
          region: true,
          doctorCount: true
        },
        orderBy: { name: "asc" }
      }),
      prisma.specialty.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" }
      })
    ]);

    const locations = Array.from(
      patches.reduce((states, patch) => {
        const state = states.get(patch.state) ?? new Map<string, typeof patches>();
        const regionPatches = state.get(patch.region) ?? [];
        state.set(patch.region, [...regionPatches, patch]);
        states.set(patch.state, state);
        return states;
      }, new Map<string, Map<string, typeof patches>>())
    ).map(([state, regions]) => ({
      state,
      regions: Array.from(regions).map(([region, regionPatches]) => ({
        name: region,
        patches: regionPatches.map((patch) => ({
          id: patch.id,
          name: patch.name,
          doctorCount: patch.doctorCount
        }))
      }))
    }));

    return NextResponse.json({
      locations,
      patches: patches.map((patch) => ({
        id: patch.id,
        name: patch.name,
        state: patch.state,
        region: patch.region,
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
  } catch (error) {
    console.error("[API metadata] Failed to load location and specialty metadata", error);
    return NextResponse.json({ error: "Unable to load metadata" }, { status: 500 });
  }
}
