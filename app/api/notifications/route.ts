import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth-user";

const notificationQuerySchema = z.object({
  unread: z.enum(["true", "false"]).optional()
});

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsedQuery = notificationQuerySchema.safeParse({
    unread: new URL(request.url).searchParams.get("unread") ?? undefined
  });

  if (!parsedQuery.success) {
    return NextResponse.json({ error: "Invalid notification filter", details: parsedQuery.error.flatten() }, { status: 400 });
  }

  const unreadOnly = parsedQuery.data.unread === "true";

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: {
        userId: user.id,
        ...(unreadOnly ? { isRead: false } : {})
      },
      orderBy: { createdAt: "desc" },
      take: 100
    }),
    prisma.notification.count({
      where: { userId: user.id, isRead: false }
    })
  ]);

  return NextResponse.json({
    unreadCount,
    notifications: notifications.map((notification) => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      actionUrl: notification.actionUrl,
      isRead: notification.isRead,
      createdAt: notification.createdAt.toISOString()
    }))
  });
}

export async function PATCH(request: NextRequest) {
  const parsed = z
    .object({
      id: z.string().uuid().optional(),
      markAllRead: z.boolean().optional()
    })
    .refine(
      (value) => Boolean(value.id) || value.markAllRead === true,
      { message: "Provide an id or markAllRead" }
    )
    .refine(
      (value) => !(value.id && value.markAllRead === true),
      { message: "Provide either id or markAllRead, not both" }
    )
    .safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid notification update" },
      { status: 400 }
    );
  }

  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (parsed.data.markAllRead) {
    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true }
    });
  } else if (parsed.data.id) {
    const result = await prisma.notification.updateMany({
      where: { id: parsed.data.id, userId: user.id },
      data: { isRead: true }
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }
  }

  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, isRead: false }
  });

  return NextResponse.json({ unreadCount });
}
