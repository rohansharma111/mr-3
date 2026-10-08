import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth-user";
import { z } from "zod";

const doctorQuerySchema = z.object({
  state: z.string().trim().min(1).max(100).default("Maharashtra"),
  region: z.string().trim().min(1).max(100).default("Andheri Region"),
  patch: z.string().trim().min(1).max(100).default("Veera Desai"),
  specialty: z.string().trim().min(1).max(100).default("All"),
  q: z.string().trim().max(200).default(""),
  sort: z.enum(["score", "distance"]).default("score")
});

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const searchParams = new URL(request.url).searchParams;
  const parsed = doctorQuerySchema.safeParse({
    state: searchParams.get("state") ?? undefined,
    region: searchParams.get("region") ?? undefined,
    patch: searchParams.get("patch") ?? undefined,
    specialty: searchParams.get("specialty") ?? undefined,
    q: searchParams.get("q") ?? undefined,
    sort: searchParams.get("sort") ?? undefined
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid doctor filters", details: parsed.error.flatten() }, { status: 400 });
  }

  const { state, region, patch, specialty, q, sort } = parsed.data;

  try {
  const doctors = await prisma.doctor.findMany({
    where: {
      isActive: true,
      patches: {
        some: {
          patch: {
            name: patch,
            state,
            region
          }
        }
      },
      ...(specialty !== "All" ? { specialty: { name: specialty } } : {}),
      ...(q ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { clinic: { contains: q, mode: "insensitive" } },
          { location: { contains: q, mode: "insensitive" } },
          { specialty: { name: { contains: q, mode: "insensitive" } } }
        ]
      } : {})
    },
    include: { specialty: true },
    orderBy: sort === "distance" ? { distanceKm: "asc" } : { score: "desc" }
  });

  return NextResponse.json(doctors.map((doctor) => ({
    id: doctor.id,
    name: doctor.name,
    spec: doctor.specialty?.name ?? "—",
    clinic: doctor.clinic,
    loc: doctor.location,
    score: doctor.score,
    potential: doctor.potential === "HIGH" ? "High" : doctor.potential === "LOW" ? "Low" : "Medium",
    dist: doctor.distanceKm ? doctor.distanceKm.toString() + " km" : "—",
    coords: doctor.mapX !== null && doctor.mapY !== null
      ? { x: Number(doctor.mapX), y: Number(doctor.mapY) }
      : null
  })));
  } catch {
    return NextResponse.json({ error: "Unable to load doctors" }, { status: 500 });
  }
}
