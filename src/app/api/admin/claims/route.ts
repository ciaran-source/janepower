import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendClaimApproval } from "@/lib/email";

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

  const claims = await prisma.partnerClaim.findMany({
    include: {
      applicant: { select: { id: true, name: true, email: true } },
      partner: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(claims);
}

export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { claimId, action } = await req.json();
  if (!claimId || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const claim = await prisma.partnerClaim.findUnique({
    where: { id: claimId },
    include: { applicant: true, partner: true },
  });

  if (!claim || claim.status !== "pending") {
    return NextResponse.json(
      { error: "Claim not found or already processed" },
      { status: 404 }
    );
  }

  if (action === "approve") {
    // Update claim status
    await prisma.partnerClaim.update({
      where: { id: claimId },
      data: { status: "approved" },
    });
    // Assign partner to user
    await prisma.partnerUser.update({
      where: { id: claim.applicantUserId },
      data: { partnerId: claim.partnerId },
    });
    // Send approval email
    try {
      await sendClaimApproval(claim.applicant.email, claim.partner.name);
    } catch (e) {
      console.error("Failed to send approval email:", e);
    }
  } else {
    await prisma.partnerClaim.update({
      where: { id: claimId },
      data: { status: "rejected" },
    });
  }

  return NextResponse.json({ success: true });
}
