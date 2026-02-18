import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      partnerId: string | null;
      emailVerifiedAt: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    partnerId: string | null;
    emailVerifiedAt: string | null;
  }
}

export type UserRole = "partner_user" | "partner_admin" | "admin";
export type PartnerStatus = "active" | "pending" | "disabled";
export type DealStage =
  | "new"
  | "submitted"
  | "in_review"
  | "approved"
  | "funded"
  | "declined";
export type DealStatus = "live" | "completed" | "cancelled";
export type CommissionStatus = "pipeline" | "due" | "paid";
export type ClaimStatus = "pending" | "approved" | "rejected";
