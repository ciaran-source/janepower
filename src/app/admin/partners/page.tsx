"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import {
  Card,
  Button,
  Input,
  Select,
  Table,
  Thead,
  Th,
  Td,
  Badge,
  Modal,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";

export default function AdminPartnersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [partners, setPartners] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState<any>(null);
  const [formName, setFormName] = useState("");
  const [formStatus, setFormStatus] = useState("active");
  const [formTag, setFormTag] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "admin")
      router.push("/dashboard");
  }, [status, session, router]);

  useEffect(() => {
    fetchPartners();
  }, []);

  async function fetchPartners() {
    const res = await fetch("/api/admin/partners");
    if (res.ok) setPartners(await res.json());
  }

  function openCreate() {
    setEditingPartner(null);
    setFormName("");
    setFormStatus("active");
    setFormTag("");
    setShowModal(true);
  }

  function openEdit(p: any) {
    setEditingPartner(p);
    setFormName(p.name);
    setFormStatus(p.status);
    setFormTag(p.defaultReferralTag);
    setShowModal(true);
  }

  async function handleSave() {
    if (editingPartner) {
      await fetch("/api/admin/partners", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingPartner.id,
          name: formName,
          status: formStatus,
          defaultReferralTag: formTag,
        }),
      });
    } else {
      await fetch("/api/admin/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          status: formStatus,
          defaultReferralTag: formTag,
        }),
      });
    }
    setShowModal(false);
    fetchPartners();
  }

  async function handleDelete(id: string) {
    if (!confirm("Disable this partner?")) return;
    await fetch("/api/admin/partners", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchPartners();
  }

  if ((session?.user as any)?.role !== "admin") return null;

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Partners</h1>
          <Button onClick={openCreate}>Add Partner</Button>
        </div>

        <Table>
          <Thead>
            <tr>
              <Th>Name</Th>
              <Th>Slug</Th>
              <Th>Status</Th>
              <Th>Referral Tag</Th>
              <Th>Users</Th>
              <Th>Businesses</Th>
              <Th>Deals</Th>
              <Th>Created</Th>
              <Th>Actions</Th>
            </tr>
          </Thead>
          <tbody className="divide-y divide-gray-200">
            {partners.map((p: any) => (
              <tr key={p.id}>
                <Td className="font-medium">{p.name}</Td>
                <Td>{p.slug}</Td>
                <Td>
                  <Badge
                    className={
                      p.status === "active"
                        ? "bg-green-100 text-green-800"
                        : p.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }
                  >
                    {p.status}
                  </Badge>
                </Td>
                <Td>{p.defaultReferralTag}</Td>
                <Td>{p._count?.users || 0}</Td>
                <Td>{p._count?.businesses || 0}</Td>
                <Td>{p._count?.deals || 0}</Td>
                <Td>{formatDate(p.createdAt)}</Td>
                <Td>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(p)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(p.id)}
                    >
                      Disable
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>

        <Modal
          open={showModal}
          onClose={() => setShowModal(false)}
          title={editingPartner ? "Edit Partner" : "Create Partner"}
        >
          <div className="space-y-4">
            <Input
              label="Partner Name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
            />
            <Select
              label="Status"
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value)}
            >
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="disabled">Disabled</option>
            </Select>
            <Input
              label="Referral Tag"
              value={formTag}
              onChange={(e) => setFormTag(e.target.value)}
              placeholder="Auto-generated from name if blank"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingPartner ? "Save Changes" : "Create Partner"}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </>
  );
}
