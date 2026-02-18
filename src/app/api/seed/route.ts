import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STAGE_MAP: Record<string, string> = {
  new: "new",
  submitted: "submitted",
  in_review: "in_review",
  in_progress: "in_review",
  approved: "approved",
  funded: "funded",
  declined: "declined",
  rejected: "declined",
};

function inferStatus(stage: string): string {
  if (stage === "funded") return "completed";
  if (stage === "declined") return "cancelled";
  return "live";
}

function inferCommissionStatus(stage: string): string {
  if (stage === "funded") return "due";
  return "pipeline";
}

function randomRecentDate(): Date {
  const now = new Date();
  const twoMonthsAgo = new Date(now);
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  const diff = now.getTime() - twoMonthsAgo.getTime();
  return new Date(twoMonthsAgo.getTime() + Math.random() * diff);
}

const ACCOUNT_MANAGERS = [
  { name: "Sarah Johnson", email: "sarah.johnson@swoopfunding.com", phone: "+44 20 7946 0958" },
  { name: "James Mitchell", email: "james.mitchell@swoopfunding.com", phone: "+44 20 7946 0959" },
  { name: "Emily Clarke", email: "emily.clarke@swoopfunding.com", phone: "+44 20 7946 0960" },
];

// Seed data embedded directly (from data/seed.csv)
const SEED_ROWS = [
  { partner_name: "Acme Financial Advisors", company_name: "TechStart Ltd", deal_count: 2, application_type: "Business Loan", application_amount: 150000, introducer_fee: 4500, application_stage: "funded" },
  { partner_name: "Acme Financial Advisors", company_name: "GreenGrow Co", deal_count: 1, application_type: "Invoice Finance", application_amount: 80000, introducer_fee: 2400, application_stage: "approved" },
  { partner_name: "Acme Financial Advisors", company_name: "CloudNine Services", deal_count: 3, application_type: "Asset Finance", application_amount: 200000, introducer_fee: 6000, application_stage: "submitted" },
  { partner_name: "Acme Financial Advisors", company_name: "Metro Retail Group", deal_count: 1, application_type: "Business Loan", application_amount: 500000, introducer_fee: 15000, application_stage: "in_review" },
  { partner_name: "Acme Financial Advisors", company_name: "Sunrise Bakery", deal_count: 1, application_type: "Merchant Cash Advance", application_amount: 30000, introducer_fee: 900, application_stage: "new" },
  { partner_name: "Acme Financial Advisors", company_name: "DataFlow Analytics", deal_count: 1, application_type: "Business Loan", application_amount: 250000, introducer_fee: 7500, application_stage: "funded" },
  { partner_name: "Sterling Partners", company_name: "BlueWave Marketing", deal_count: 2, application_type: "Business Loan", application_amount: 120000, introducer_fee: 3600, application_stage: "funded" },
  { partner_name: "Sterling Partners", company_name: "QuickFix Plumbing", deal_count: 1, application_type: "Asset Finance", application_amount: 45000, introducer_fee: 1350, application_stage: "submitted" },
  { partner_name: "Sterling Partners", company_name: "Elite Catering", deal_count: 1, application_type: "Invoice Finance", application_amount: 90000, introducer_fee: 2700, application_stage: "approved" },
  { partner_name: "Sterling Partners", company_name: "Nova Designs", deal_count: 2, application_type: "Business Loan", application_amount: 175000, introducer_fee: 5250, application_stage: "in_review" },
  { partner_name: "Sterling Partners", company_name: "Bright Sparks Electric", deal_count: 1, application_type: "Merchant Cash Advance", application_amount: 25000, introducer_fee: 750, application_stage: "new" },
  { partner_name: "GlobalReach Consulting", company_name: "Summit Construction", deal_count: 3, application_type: "Business Loan", application_amount: 350000, introducer_fee: 10500, application_stage: "funded" },
  { partner_name: "GlobalReach Consulting", company_name: "Harmony Health Spa", deal_count: 1, application_type: "Invoice Finance", application_amount: 60000, introducer_fee: 1800, application_stage: "in_review" },
  { partner_name: "GlobalReach Consulting", company_name: "Pixel Perfect Studios", deal_count: 2, application_type: "Asset Finance", application_amount: 130000, introducer_fee: 3900, application_stage: "approved" },
  { partner_name: "GlobalReach Consulting", company_name: "Swift Logistics", deal_count: 1, application_type: "Business Loan", application_amount: 220000, introducer_fee: 6600, application_stage: "submitted" },
  { partner_name: "FinanceHub UK", company_name: "Oakwood Properties", deal_count: 2, application_type: "Business Loan", application_amount: 400000, introducer_fee: 12000, application_stage: "funded" },
  { partner_name: "FinanceHub UK", company_name: "Coastal Cafe Chain", deal_count: 1, application_type: "Merchant Cash Advance", application_amount: 35000, introducer_fee: 1050, application_stage: "approved" },
  { partner_name: "FinanceHub UK", company_name: "ProTech Solutions", deal_count: 1, application_type: "Business Loan", application_amount: 180000, introducer_fee: 5400, application_stage: "submitted" },
  { partner_name: "FinanceHub UK", company_name: "Garden World", deal_count: 1, application_type: "Asset Finance", application_amount: 70000, introducer_fee: 2100, application_stage: "new" },
  { partner_name: "FinanceHub UK", company_name: "Urban Fitness", deal_count: 2, application_type: "Invoice Finance", application_amount: 95000, introducer_fee: 2850, application_stage: "in_review" },
  { partner_name: "Pinnacle Advisory", company_name: "Riverside Restaurant", deal_count: 1, application_type: "Business Loan", application_amount: 110000, introducer_fee: 3300, application_stage: "funded" },
  { partner_name: "Pinnacle Advisory", company_name: "Matrix IT Consulting", deal_count: 3, application_type: "Business Loan", application_amount: 280000, introducer_fee: 8400, application_stage: "submitted" },
  { partner_name: "Pinnacle Advisory", company_name: "Silver Screen Cinema", deal_count: 1, application_type: "Asset Finance", application_amount: 160000, introducer_fee: 4800, application_stage: "approved" },
  { partner_name: "Pinnacle Advisory", company_name: "FreshFields Organic", deal_count: 1, application_type: "Merchant Cash Advance", application_amount: 40000, introducer_fee: 1200, application_stage: "declined" },
  { partner_name: "Pinnacle Advisory", company_name: "Titan Manufacturing", deal_count: 2, application_type: "Business Loan", application_amount: 450000, introducer_fee: 13500, application_stage: "in_review" },
];

export async function POST(req: NextRequest) {
  // Secure with admin password
  const { secret } = await req.json().catch(() => ({ secret: "" }));
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin!234";

  if (secret !== adminPassword) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  // Check if already seeded
  const existingPartners = await prisma.partner.count();
  if (existingPartners > 0) {
    return NextResponse.json({
      error: "Database already seeded",
      partnerCount: existingPartners,
    }, { status: 400 });
  }

  try {
    // Create account managers
    const accountManagers = [];
    for (const am of ACCOUNT_MANAGERS) {
      const created = await prisma.accountManager.create({ data: am });
      accountManagers.push(created);
    }

    // Create admin user
    const adminHash = await bcrypt.hash(adminPassword, 12);
    await prisma.partnerUser.create({
      data: {
        name: "Swoop Admin",
        email: "admin@swoopfunding.com",
        passwordHash: adminHash,
        role: "admin",
        emailVerifiedAt: new Date(),
      },
    });

    // Seed partners and data
    const partnersMap = new Map<string, any>();
    const businessesMap = new Map<string, any>();
    let dealCount = 0;
    let commissionCount = 0;
    let amIndex = 0;

    for (const row of SEED_ROWS) {
      const partnerName = row.partner_name;
      const companyName = row.company_name;
      const rawStage = row.application_stage.toLowerCase().replace(/ /g, "_");
      const stage = STAGE_MAP[rawStage] || "new";

      // Ensure Partner exists
      let partner = partnersMap.get(partnerName);
      if (!partner) {
        const slug = slugify(partnerName);
        partner = await prisma.partner.create({
          data: {
            name: partnerName,
            slug,
            status: "active",
            defaultReferralTag: slug,
            accountManagerId: accountManagers[amIndex % accountManagers.length].id,
          },
        });
        partnersMap.set(partnerName, partner);
        amIndex++;

        // Create demo partner user
        const demoEmail = `demo+${slug}@example.com`;
        const demoHash = await bcrypt.hash("Demo!234", 12);
        await prisma.partnerUser.create({
          data: {
            name: `${partnerName} Demo User`,
            email: demoEmail,
            passwordHash: demoHash,
            partnerId: partner.id,
            role: "partner_user",
            emailVerifiedAt: new Date(),
          },
        });

        // Create a default UTM link
        const fullUrl = `https://swoopfunding.com/?utm_source=partner&utm_medium=referral&utm_campaign=partner_portal&utm_partner=${slug}&utm_ref=${slug}`;
        await prisma.uTMLink.create({
          data: {
            partnerId: partner.id,
            name: `${partnerName} Default Link`,
            baseUrl: "https://swoopfunding.com/",
            params: "{}",
            fullUrl,
          },
        });
      }

      // Ensure Business exists (scoped to partner)
      const bizKey = `${partner.id}:${companyName}`;
      let business = businessesMap.get(bizKey);
      if (!business) {
        business = await prisma.business.create({
          data: {
            name: companyName,
            partnerId: partner.id,
            createdAt: randomRecentDate(),
          },
        });
        businessesMap.set(bizKey, business);
      }

      // Create deals
      for (let i = 0; i < row.deal_count; i++) {
        const dealDate = randomRecentDate();
        const dealStatus = inferStatus(stage);
        const completedAt = stage === "funded" ? new Date(dealDate.getTime() + 7 * 86400000) : null;

        const deal = await prisma.deal.create({
          data: {
            partnerId: partner.id,
            businessId: business.id,
            applicationType: row.application_type,
            applicationAmount: row.application_amount,
            introducerFee: row.introducer_fee,
            stage,
            status: dealStatus,
            createdAt: dealDate,
            completedAt,
          },
        });
        dealCount++;

        // Create commission
        const commStatus = inferCommissionStatus(stage);
        await prisma.commission.create({
          data: {
            dealId: deal.id,
            amountDue: row.introducer_fee,
            status: commStatus,
            dueAt: commStatus === "due" ? completedAt : null,
            createdAt: dealDate,
          },
        });
        commissionCount++;
      }
    }

    const partnerLogins = Array.from(partnersMap.keys()).map((name) => ({
      partner: name,
      email: `demo+${slugify(name)}@example.com`,
      password: "Demo!234",
    }));

    return NextResponse.json({
      success: true,
      summary: {
        partners: partnersMap.size,
        businesses: businessesMap.size,
        deals: dealCount,
        commissions: commissionCount,
      },
      admin: {
        email: "admin@swoopfunding.com",
        password: adminPassword,
      },
      partnerLogins,
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Seed failed", details: String(error) },
      { status: 500 }
    );
  }
}
