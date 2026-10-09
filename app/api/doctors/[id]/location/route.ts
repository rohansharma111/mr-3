import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, ROLES } from "@/lib/auth-user";

const paramsSchema = z.object({ id: z.string().uuid() });
const locationSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  location: z.string().trim().min(2).max(300).optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== ROLES.ADMIN) return NextResponse.json({ error: "Only an administrator can update verified clinic coordinates" }, { status: 403 });

  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) return NextResponse.json({ error: "Invalid doctor id" }, { status: 400 });

  const body = await request.json().catch(() => null);
  const parsedBody = locationSchema.safeParse(body);
  if (!parsedBody.success) return NextResponse.json({ error: "Enter valid latitude and longitude coordinates" }, { status: 400 });

  try {
    const doctor = await prisma.doctor.findFirst({
      where: { id: parsedParams.data.id, isActive: true },
      select: { id: true, latitude: true, longitude: true, location: true, clinic: true }
    });
    if (!doctor) return NextResponse.json({ error: "Doctor not found" }, { status: 404 });

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.doctor.update({
        where: { id: doctor.id },
        data: {
          latitude: parsedBody.data.latitude,
          longitude: parsedBody.data.longitude,
          ...(parsedBody.data.location ? { location: parsedBody.data.location } : {})
        },
        select: { id: true, latitude: true, longitude: true, location: true, clinic: true }
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "DOCTOR_LOCATION_UPDATED",
          entityType: "Doctor",
          entityId: doctor.id,
          metadata: {
            previousLatitude: doctor.latitude?.toString() ?? null,
            previousLongitude: doctor.longitude?.toString() ?? null,
            latitude: parsedBody.data.latitude,
            longitude: parsedBody.data.longitude,
            locationUpdated: Boolean(parsedBody.data.location)
          }
        }
      });
      return result;
    });

    return NextResponse.json({
      doctor: {
        id: updated.id,
        clinic: updated.clinic,
        location: updated.location,
        exactLocation: updated.latitude !== null && updated.longitude !== null
          ? { latitude: Number(updated.latitude), longitude: Number(updated.longitude) }
          : null
      }
    });
  } catch {
    return NextResponse.json({ error: "Unable to update clinic coordinates" }, { status: 500 });
  }
}
