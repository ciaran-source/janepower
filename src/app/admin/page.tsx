"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { SummaryCard, Card } from "@/components/ui";
import Link from "next/link";

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState({
    partners: 0,
    users: 0,
    pendingClaims: 0,
    utmLinks: 0,
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    if (status === "authenticated" && (session?.user as any)?.role !== "admin") {
      router.push("/dashboard");
      return;
    }

    // Fetch stats
    Promise.all([
      fetch("/api/admin/partners").then((r) => r.json()),
      fetch("/api/admin/users").then((r) => r.json()),
      fetch("/api/admin/claims").then((r) => r.json()),
      fetch("/api/admin/utm-links").then((r) => r.json()),
    ]).then(([partners, users, claims, links]) => {
      setStats({
        partners: Array.isArray(partners) ? partners.length : 0,
        users: Array.isArray(users) ? users.length : 0,
        pendingClaims: Array.isArray(claims)
          ? claims.filter((c: any) => c.status === "pending").length
          : 0,
        utmLinks: Array.isArray(links) ? links.length : 0,
      });
    });
  }, [status, session, router]);

  if (status !== "authenticated" || (session?.user as any)?.role !== "admin") {
    return null;
  }

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Admin Dashboard
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SummaryCard
            title="Partners"
            value={stats.partners.toString()}
            color="blue"
          />
          <SummaryCard
            title="Users"
            value={stats.users.toString()}
            color="green"
          />
          <SummaryCard
            title="Pending Claims"
            value={stats.pendingClaims.toString()}
            color="yellow"
          />
          <SummaryCard
            title="UTM Links"
            value={stats.utmLinks.toString()}
            color="purple"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/admin/partners">
            <Card className="hover:border-swoop-300 transition cursor-pointer">
              <h3 className="font-semibold text-gray-900">Manage Partners</h3>
              <p className="text-sm text-gray-500 mt-1">
                Add, edit, or disable partners
              </p>
            </Card>
          </Link>
          <Link href="/admin/claims">
            <Card className="hover:border-swoop-300 transition cursor-pointer">
              <h3 className="font-semibold text-gray-900">Partner Claims</h3>
              <p className="text-sm text-gray-500 mt-1">
                Approve or reject user claims
              </p>
            </Card>
          </Link>
          <Link href="/admin/users">
            <Card className="hover:border-swoop-300 transition cursor-pointer">
              <h3 className="font-semibold text-gray-900">Users</h3>
              <p className="text-sm text-gray-500 mt-1">
                View all partner users
              </p>
            </Card>
          </Link>
          <Link href="/admin/utm-links">
            <Card className="hover:border-swoop-300 transition cursor-pointer">
              <h3 className="font-semibold text-gray-900">UTM Links</h3>
              <p className="text-sm text-gray-500 mt-1">
                Generate referral tracking links
              </p>
            </Card>
          </Link>
        </div>
      </div>
    </>
  );
}
