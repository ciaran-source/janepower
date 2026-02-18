"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Table, Thead, Th, Td, Badge } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "admin")
      router.push("/dashboard");
  }, [status, session, router]);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setUsers(data));
  }, []);

  if ((session?.user as any)?.role !== "admin") return null;

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Partner Users
        </h1>

        <Table>
          <Thead>
            <tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Partner</Th>
              <Th>Verified</Th>
              <Th>Joined</Th>
            </tr>
          </Thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((u: any) => (
              <tr key={u.id}>
                <Td className="font-medium">{u.name}</Td>
                <Td>{u.email}</Td>
                <Td>
                  <Badge
                    className={
                      u.role === "admin"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-blue-100 text-blue-800"
                    }
                  >
                    {u.role}
                  </Badge>
                </Td>
                <Td>{u.partner?.name || "—"}</Td>
                <Td>
                  {u.emailVerifiedAt ? (
                    <Badge className="bg-green-100 text-green-800">
                      Verified
                    </Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-800">
                      Pending
                    </Badge>
                  )}
                </Td>
                <Td>{formatDate(u.createdAt)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </>
  );
}
