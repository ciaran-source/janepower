import { PrismaClient } from "@prisma/client";
import { parse } from "csv-parse/sync";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

// Generate random dates within the last 2 months
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

async function main() {
  console.log("Starting seed...");

  // Clean existing data
  await prisma.commission.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.business.deleteMany();
  await prisma.uTMLink.deleteMany();
  await prisma.partnerClaim.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.partnerUser.deleteMany();
  await prisma.partner.deleteMany();
  await prisma.accountManager.deleteMany();

  // Create account managers
  const accountManagers = [];
  for (const am of ACCOUNT_MANAGERS) {
    const created = await prisma.accountManager.create({ data: am });
    accountManagers.push(created);
  }
  console.log(`Created ${accountManagers.length} account managers`);

  // Create admin user
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin!234";
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
  console.log("Created admin user: admin@swoopfunding.com");

  // Read CSV
  const csvPath = path.join(process.cwd(), "data", "seed.csv");
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found at ${csvPath}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`Parsed ${records.length} CSV rows`);

  // Track created entities
  const partnersMap = new Map<string, any>();
  const businessesMap = new Map<string, any>();
  let dealCount = 0;
  let commissionCount = 0;

  let amIndex = 0;

  for (const row of records) {
    const partnerName = row.partner_name?.trim();
    const companyName = row.company_name?.trim();
    const dealCountRaw = parseInt(row.deal_count) || 1;
    const applicationType = row.application_type?.trim() || "Business Loan";
    const applicationAmount = parseFloat(row.application_amount) || 100000;
    const introducerFee = parseFloat(row.introducer_fee) || 3000;
    const rawStage = row.application_stage?.trim().toLowerCase().replace(/ /g, "_");
    const stage = STAGE_MAP[rawStage] || "new";

    if (!partnerName || !companyName) continue;

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
      console.log(`Created partner: ${partnerName} (user: ${demoEmail})`);

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

    // Explode to multiple deals if deal_count > 1
    for (let i = 0; i < dealCountRaw; i++) {
      const dealDate = randomRecentDate();
      const dealStatus = inferStatus(stage);
      const completedAt = stage === "funded" ? new Date(dealDate.getTime() + 7 * 86400000) : null;

      const deal = await prisma.deal.create({
        data: {
          partnerId: partner.id,
          businessId: business.id,
          applicationType,
          applicationAmount,
          introducerFee,
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
          amountDue: introducerFee,
          status: commStatus,
          dueAt: commStatus === "due" ? completedAt : null,
          createdAt: dealDate,
        },
      });
      commissionCount++;
    }
  }

  console.log("\nSeed complete:");
  console.log(`  Partners: ${partnersMap.size}`);
  console.log(`  Businesses: ${businessesMap.size}`);
  console.log(`  Deals: ${dealCount}`);
  console.log(`  Commissions: ${commissionCount}`);
  console.log(`\nAdmin login: admin@swoopfunding.com / ${adminPassword}`);
  console.log(`Demo partner logins: demo+{partner-slug}@example.com / Demo!234`);
  console.log(`\nExample partner logins:`);
  Array.from(partnersMap.keys()).forEach((name) => {
    const slug = slugify(name);
    console.log(`  demo+${slug}@example.com / Demo!234`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
