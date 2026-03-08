// @ts-nocheck
import { NextResponse } from "next/server";
import { z } from "zod";
import { compare, hash } from "bcryptjs";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { hashedPassword: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const valid = await compare(parsed.data.currentPassword, user.hashedPassword);
    if (!valid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(parsed.data.newPassword, 12);
    await db.user.update({
      where: { id: session.user.id },
      data: { hashedPassword },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
