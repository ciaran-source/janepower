import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const claimSchema = z.object({
  partnerId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = claimSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const userId = (session.user as any).id;

  // Check for existing pending claim
  const existing = await prisma.partnerClaim.findFirst({
    where: {
      applicantUserId: userId,
      status: "pending",
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: "You already have a pending claim" },
      { status: 400 }
    );
  }

  const claim = await prisma.partnerClaim.create({
    data: {
      applicantUserId: userId,
      partnerId: parsed.data.partnerId,
      status: "pending",
    },
  });

  return NextResponse.json({ success: true, claim });
}
