import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { z } from "zod";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "admin") {
    return null;
  }
  return session;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const partners = await prisma.partner.findMany({
    include: {
      accountManager: true,
      _count: { select: { users: true, businesses: true, deals: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(partners);
}

const partnerSchema = z.object({
  name: z.string().min(1),
  status: z.enum(["active", "pending", "disabled"]).optional(),
  defaultReferralTag: z.string().optional(),
});

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = partnerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const slug = slugify(parsed.data.name);
  const partner = await prisma.partner.create({
    data: {
      name: parsed.data.name,
      slug,
      status: parsed.data.status || "active",
      defaultReferralTag: parsed.data.defaultReferralTag || slug,
    },
  });

  return NextResponse.json(partner);
}

export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { id, ...data } = body;
  if (!id) {
    return NextResponse.json({ error: "Missing partner id" }, { status: 400 });
  }

  const partner = await prisma.partner.update({
    where: { id },
    data: {
      name: data.name,
      status: data.status,
      defaultReferralTag: data.defaultReferralTag,
      slug: data.name ? slugify(data.name) : undefined,
    },
  });

  return NextResponse.json(partner);
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "Missing partner id" }, { status: 400 });
  }

  await prisma.partner.update({
    where: { id },
    data: { status: "disabled" },
  });

  return NextResponse.json({ success: true });
}
