import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Create Ethereal test account
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log("Ethereal email account:", testAccount.user);
  }
  return transporter;
}

export async function sendVerificationEmail(
  email: string,
  token: string
): Promise<string | null> {
  const t = await getTransporter();
  const verifyUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/auth/verify?token=${token}`;

  const info = await t.sendMail({
    from: process.env.EMAIL_FROM || "noreply@swoopfunding.com",
    to: email,
    subject: "Verify your email — Swoop Partner Portal",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">Swoop Partner Portal</h2>
        <p>Click the link below to verify your email address:</p>
        <p><a href="${verifyUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email</a></p>
        <p style="color: #666; font-size: 12px;">Or copy this URL: ${verifyUrl}</p>
      </div>
    `,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log("Preview email URL:", previewUrl);
  }
  return typeof previewUrl === "string" ? previewUrl : null;
}

export async function sendClaimNotification(
  adminEmail: string,
  userName: string,
  partnerName: string
): Promise<void> {
  const t = await getTransporter();
  const info = await t.sendMail({
    from: process.env.EMAIL_FROM || "noreply@swoopfunding.com",
    to: adminEmail,
    subject: `Partner Claim Request — ${userName} wants to join ${partnerName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">New Partner Claim</h2>
        <p><strong>${userName}</strong> has requested to join partner <strong>${partnerName}</strong>.</p>
        <p><a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/admin/claims">Review in Admin Portal</a></p>
      </div>
    `,
  });
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) console.log("Preview claim notification:", previewUrl);
}

export async function sendClaimApproval(
  userEmail: string,
  partnerName: string
): Promise<void> {
  const t = await getTransporter();
  const info = await t.sendMail({
    from: process.env.EMAIL_FROM || "noreply@swoopfunding.com",
    to: userEmail,
    subject: `Partner Claim Approved — ${partnerName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">Claim Approved!</h2>
        <p>Your request to join <strong>${partnerName}</strong> has been approved.</p>
        <p><a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard">Go to Dashboard</a></p>
      </div>
    `,
  });
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) console.log("Preview approval email:", previewUrl);
}
