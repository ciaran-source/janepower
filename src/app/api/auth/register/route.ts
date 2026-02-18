import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendVerificationEmail } from "@/lib/email";
import { z } from "zod";

export const dynamic = "force-dynamic";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  partnerId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }
    const { name, email, password, partnerId } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    // Check existing user
    const existing = await prisma.partnerUser.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const hasSmtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER);

    // If SMTP is configured, require email verification; otherwise auto-verify
    const emailVerifyToken = hasSmtp
      ? crypto.randomBytes(32).toString("hex")
      : null;

    // Create user without partner assignment (needs claim approval)
    const user = await prisma.partnerUser.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
        role: "partner_user",
        emailVerifyToken,
        emailVerifiedAt: hasSmtp ? undefined : new Date(),
      },
    });

    // If partner selected, create a claim
    if (partnerId) {
      await prisma.partnerClaim.create({
        data: {
          applicantUserId: user.id,
          partnerId,
          status: "pending",
        },
      });
    }

    // Send verification email only if SMTP is configured
    let previewUrl: string | null = null;
    if (hasSmtp && emailVerifyToken) {
      previewUrl = await sendVerificationEmail(
        normalizedEmail,
        emailVerifyToken
      );
    }

    return NextResponse.json({
      success: true,
      message: hasSmtp
        ? "Registration successful. Please verify your email."
        : "Registration successful! You can now sign in.",
      previewUrl,
      autoVerified: !hasSmtp,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}
