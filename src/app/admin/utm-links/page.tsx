"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import {
  Table,
  Thead,
  Th,
  Td,
  Button,
  Input,
  Select,
  Modal,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";

export default function AdminUtmLinksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [links, setLinks] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formName, setFormName] = useState("");
  const [formPartnerId, setFormPartnerId] = useState("");
  const [formExtraParams, setFormExtraParams] = useState("{}");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
    if (status === "authenticated" && (session?.user as any)?.role !== "admin")
      router.push("/dashboard");
  }, [status, session, router]);

  useEffect(() => {
    fetchLinks();
    fetch("/api/admin/partners")
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setPartners(data));
  }, []);

  async function fetchLinks() {
    const res = await fetch("/api/admin/utm-links");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) setLinks(data);
    }
  }

  async function handleCreate() {
    let extra = {};
    try {
      extra = JSON.parse(formExtraParams);
    } catch {
      alert("Invalid JSON for extra params");
      return;
    }

    await fetch("/api/admin/utm-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partnerId: formPartnerId,
        name: formName,
        extraParams: extra,
      }),
    });
    setShowModal(false);
    setFormName("");
    setFormPartnerId("");
    setFormExtraParams("{}");
    fetchLinks();
  }

  function copyUrl(url: string, id: string) {
    navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  if ((session?.user as any)?.role !== "admin") return null;

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">UTM Links</h1>
          <Button onClick={() => setShowModal(true)}>Create UTM Link</Button>
        </div>

        <Table>
          <Thead>
            <tr>
              <Th>Name</Th>
              <Th>Partner</Th>
              <Th>URL</Th>
              <Th>Created</Th>
              <Th>Actions</Th>
            </tr>
          </Thead>
          <tbody className="divide-y divide-gray-200">
            {links.map((link: any) => (
              <tr key={link.id}>
                <Td className="font-medium">{link.name}</Td>
                <Td>{link.partner?.name}</Td>
                <Td>
                  <span className="text-xs text-gray-500 max-w-md truncate block">
                    {link.fullUrl}
                  </span>
                </Td>
                <Td>{formatDate(link.createdAt)}</Td>
                <Td>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyUrl(link.fullUrl, link.id)}
                  >
                    {copied === link.id ? "Copied!" : "Copy"}
                  </Button>
                </Td>
              </tr>
            ))}
            {links.length === 0 && (
              <tr>
                <Td colSpan={5} className="text-center text-gray-400 py-8">
                  No UTM links created yet
                </Td>
              </tr>
            )}
          </tbody>
        </Table>

        <Modal
          open={showModal}
          onClose={() => setShowModal(false)}
          title="Create UTM Link"
        >
          <div className="space-y-4">
            <Input
              label="Link Name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g., Homepage Referral Q1"
              required
            />
            <Select
              label="Partner"
              value={formPartnerId}
              onChange={(e) => setFormPartnerId(e.target.value)}
            >
              <option value="">-- Select Partner --</option>
              {partners.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Extra Params (JSON)
              </label>
              <textarea
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm font-mono focus:border-swoop-500 focus:outline-none focus:ring-1 focus:ring-swoop-500"
                rows={3}
                value={formExtraParams}
                onChange={(e) => setFormExtraParams(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!formName || !formPartnerId}>
                Create Link
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </>
  );
}
