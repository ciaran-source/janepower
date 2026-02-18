"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Table, Thead, Th, Td, Badge, Button } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export default function AdminClaimsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [claims, setClaims] = useState<any[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "admin")
      router.push("/dashboard");
  }, [status, session, router]);

  useEffect(() => {
    fetchClaims();
  }, []);

  async function fetchClaims() {
    const res = await fetch("/api/admin/claims");
    if (res.ok) setClaims(await res.json());
  }

  async function handleAction(claimId: string, action: "approve" | "reject") {
    await fetch("/api/admin/claims", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claimId, action }),
    });
    fetchClaims();
  }

  if ((session?.user as any)?.role !== "admin") return null;

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Partner Claims
        </h1>

        <Table>
          <Thead>
            <tr>
              <Th>Applicant</Th>
              <Th>Email</Th>
              <Th>Partner</Th>
              <Th>Status</Th>
              <Th>Requested</Th>
              <Th>Actions</Th>
            </tr>
          </Thead>
          <tbody className="divide-y divide-gray-200">
            {claims.map((c: any) => (
              <tr key={c.id}>
                <Td className="font-medium">{c.applicant?.name}</Td>
                <Td>{c.applicant?.email}</Td>
                <Td>{c.partner?.name}</Td>
                <Td>
                  <Badge
                    className={
                      c.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : c.status === "approved"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }
                  >
                    {c.status}
                  </Badge>
                </Td>
                <Td>{formatDate(c.createdAt)}</Td>
                <Td>
                  {c.status === "pending" && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        onClick={() => handleAction(c.id, "approve")}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleAction(c.id, "reject")}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </Td>
              </tr>
            ))}
            {claims.length === 0 && (
              <tr>
                <Td colSpan={6} className="text-center text-gray-400 py-8">
                  No claims found
                </Td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </>
  );
}
