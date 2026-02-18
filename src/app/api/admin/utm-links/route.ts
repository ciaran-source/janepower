import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "admin") {
    return null;
  }
  return session;
}

const utmSchema = z.object({
  partnerId: z.string().min(1),
  name: z.string().min(1),
  extraParams: z.record(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isAdmin = (session.user as any).role === "admin";
  const partnerId = (session.user as any).partnerId;

  const where = isAdmin ? {} : { partnerId: partnerId || "none" };

  const links = await prisma.uTMLink.findMany({
    where,
    include: { partner: { select: { name: true, slug: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(links);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = utmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const partner = await prisma.partner.findUnique({
    where: { id: parsed.data.partnerId },
  });
  if (!partner) {
    return NextResponse.json(
      { error: "Partner not found" },
      { status: 404 }
    );
  }

  const baseUrl = "https://swoopfunding.com/";
  const params = new URLSearchParams({
    utm_source: "partner",
    utm_medium: "referral",
    utm_campaign: "partner_portal",
    utm_partner: partner.slug,
    utm_ref: partner.defaultReferralTag || partner.slug,
    ...(parsed.data.extraParams || {}),
  });

  const fullUrl = `${baseUrl}?${params.toString()}`;

  const link = await prisma.uTMLink.create({
    data: {
      partnerId: parsed.data.partnerId,
      name: parsed.data.name,
      baseUrl,
      params: JSON.stringify(parsed.data.extraParams || {}),
      fullUrl,
    },
  });

  return NextResponse.json(link);
}
