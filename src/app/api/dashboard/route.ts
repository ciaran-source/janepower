import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STAGE_WEIGHTS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const partnerId = (session.user as any).partnerId;
  if (!partnerId) {
    return NextResponse.json({ error: "No partner assigned" }, { status: 403 });
  }

  // Get filter params
  const stage = req.nextUrl.searchParams.get("stage") || "";
  const type = req.nextUrl.searchParams.get("type") || "";
  const from = req.nextUrl.searchParams.get("from") || "";
  const to = req.nextUrl.searchParams.get("to") || "";

  // Build deal filter
  const dealWhere: any = { partnerId };
  if (stage) dealWhere.stage = stage;
  if (type) dealWhere.applicationType = type;
  if (from || to) {
    dealWhere.createdAt = {};
    if (from) dealWhere.createdAt.gte = new Date(from);
    if (to) dealWhere.createdAt.lte = new Date(to);
  }

  const [businesses, deals, commissions, partner] = await Promise.all([
    prisma.business.findMany({
      where: { partnerId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.deal.findMany({
      where: dealWhere,
      include: {
        business: { select: { name: true } },
        commissions: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.commission.findMany({
      where: { deal: { partnerId } },
      include: {
        deal: {
          select: {
            stage: true,
            status: true,
            business: { select: { name: true } },
            applicationType: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.partner.findUnique({
      where: { id: partnerId },
      include: { accountManager: true },
    }),
  ]);

  // Summary calculations
  const totalBusinesses = businesses.length;
  const liveDeals = deals.filter((d) => d.status === "live").length;
  const fundedDeals = deals.filter((d) => d.stage === "funded").length;

  const commissionDue = commissions
    .filter((c) => c.status === "due")
    .reduce((sum, c) => sum + c.amountDue, 0);

  // Pipeline calculation
  const pipelineByStage: Record<string, { count: number; weighted: number; raw: number }> = {};
  for (const deal of deals) {
    if (deal.status === "live" && deal.stage !== "funded" && deal.stage !== "declined") {
      const weight = STAGE_WEIGHTS[deal.stage] || 0;
      if (!pipelineByStage[deal.stage]) {
        pipelineByStage[deal.stage] = { count: 0, weighted: 0, raw: 0 };
      }
      pipelineByStage[deal.stage].count++;
      pipelineByStage[deal.stage].raw += deal.introducerFee;
      pipelineByStage[deal.stage].weighted += deal.introducerFee * weight;
    }
  }

  const totalPipeline = Object.values(pipelineByStage).reduce(
    (sum, s) => sum + s.weighted,
    0
  );

  // Get unique application types for filter
  const applicationTypes = Array.from(new Set(deals.map((d) => d.applicationType)));

  return NextResponse.json({
    summary: {
      totalBusinesses,
      liveDeals,
      fundedDeals,
      commissionDue,
      totalPipeline,
      pipelineByStage,
    },
    businesses,
    deals,
    commissions,
    accountManager: partner?.accountManager || null,
    applicationTypes,
  });
}
