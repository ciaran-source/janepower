"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import {
  Card,
  SummaryCard,
  Tabs,
  Table,
  Thead,
  Th,
  Td,
  Badge,
  Button,
  Input,
  Select,
} from "@/components/ui";
import { STAGE_LABELS, STAGE_COLORS } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";

interface DashboardData {
  summary: {
    totalBusinesses: number;
    liveDeals: number;
    fundedDeals: number;
    commissionDue: number;
    totalPipeline: number;
    pipelineByStage: Record<
      string,
      { count: number; weighted: number; raw: number }
    >;
  };
  businesses: any[];
  deals: any[];
  commissions: any[];
  accountManager: any;
  applicationTypes: string[];
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("businesses");
  const [stageFilter, setStageFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [utmLinks, setUtmLinks] = useState<any[]>([]);
  const [claimPartnerId, setClaimPartnerId] = useState("");
  const [partners, setPartners] = useState<any[]>([]);
  const [claimStatus, setClaimStatus] = useState<string | null>(null);
  const [pendingClaim, setPendingClaim] = useState(false);

  const user = session?.user as any;

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams();
    if (stageFilter) params.set("stage", stageFilter);
    if (typeFilter) params.set("type", typeFilter);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);

    const res = await fetch(`/api/dashboard?${params.toString()}`);
    if (res.ok) {
      const json = await res.json();
      setData(json);
    }
    setLoading(false);
  }, [stageFilter, typeFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    if (status !== "authenticated") return;

    if (user?.role === "admin") {
      router.push("/admin");
      return;
    }

    if (!user?.emailVerifiedAt && user?.role !== "admin") {
      // Not verified
      return;
    }

    if (!user?.partnerId) {
      // No partner assigned — check if they have a pending claim
      fetch("/api/partners-list")
        .then((r) => r.json())
        .then(setPartners);
      setPendingClaim(true);
      setLoading(false);
      return;
    }

    fetchData();
    // Fetch UTM links
    fetch("/api/admin/utm-links")
      .then((r) => r.json())
      .then((links) => Array.isArray(links) && setUtmLinks(links))
      .catch(() => {});
  }, [status, user?.partnerId, user?.emailVerifiedAt, user?.role, router, fetchData]);

  // Re-fetch when filters change
  useEffect(() => {
    if (user?.partnerId) {
      fetchData();
    }
  }, [stageFilter, typeFilter, dateFrom, dateTo, user?.partnerId, fetchData]);

  async function handleClaimSubmit() {
    if (!claimPartnerId) return;
    const res = await fetch("/api/claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partnerId: claimPartnerId }),
    });
    if (res.ok) {
      setClaimStatus("submitted");
    } else {
      const data = await res.json();
      setClaimStatus(data.error || "Failed to submit claim");
    }
  }

  if (status === "loading" || (loading && !pendingClaim)) {
    return (
      <>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  if (user && !user.emailVerifiedAt && user.role !== "admin") {
    return (
      <>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-12">
          <Card className="text-center py-12">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Email Verification Required
            </h2>
            <p className="text-gray-500">
              Please check your email and click the verification link before
              accessing the dashboard.
            </p>
          </Card>
        </div>
      </>
    );
  }

  if (pendingClaim && !user?.partnerId) {
    return (
      <>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-12">
          <Card className="max-w-lg mx-auto text-center py-12">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Partner Assignment Required
            </h2>
            {claimStatus === "submitted" ? (
              <div className="text-green-700 bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                Your claim has been submitted and is awaiting admin approval.
                You&apos;ll receive an email once approved.
              </div>
            ) : (
              <>
                <p className="text-gray-500 mb-6">
                  Select a partner organisation to request access.
                </p>
                {typeof claimStatus === "string" &&
                  claimStatus !== "submitted" && (
                    <p className="text-red-600 text-sm mb-4">{claimStatus}</p>
                  )}
                <div className="flex items-end gap-3 justify-center">
                  <Select
                    value={claimPartnerId}
                    onChange={(e) => setClaimPartnerId(e.target.value)}
                  >
                    <option value="">-- Select Partner --</option>
                    {partners.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                  <Button onClick={handleClaimSubmit} disabled={!claimPartnerId}>
                    Request Access
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>
      </>
    );
  }

  if (!data) return null;

  const tabs = [
    { key: "businesses", label: "Businesses" },
    { key: "deals", label: "Deals" },
    { key: "commissions", label: "Commissions" },
    { key: "account-manager", label: "Account Manager" },
    { key: "utm-links", label: "UTM Links" },
  ];

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Partner Dashboard
        </h1>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <SummaryCard
            title="Total Businesses"
            value={data.summary.totalBusinesses.toString()}
            color="blue"
          />
          <SummaryCard
            title="Live Deals"
            value={data.summary.liveDeals.toString()}
            color="yellow"
          />
          <SummaryCard
            title="Funded Deals"
            value={data.summary.fundedDeals.toString()}
            color="green"
          />
          <SummaryCard
            title="Commission Due"
            value={formatCurrency(data.summary.commissionDue)}
            color="purple"
          />
          <SummaryCard
            title="Pipeline (Weighted)"
            value={formatCurrency(data.summary.totalPipeline)}
            color="gray"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 mb-6">
          <Select
            label="Stage"
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
          >
            <option value="">All Stages</option>
            {Object.entries(STAGE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
          <Select
            label="Type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            {data.applicationTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <Input
            label="From"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <Input
            label="To"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
          {(stageFilter || typeFilter || dateFrom || dateTo) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStageFilter("");
                setTypeFilter("");
                setDateFrom("");
                setDateTo("");
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

        <div className="mt-6">
          {/* Businesses Tab */}
          {activeTab === "businesses" && (
            <Table>
              <Thead>
                <tr>
                  <Th>Business Name</Th>
                  <Th>Added</Th>
                  <Th>Deals</Th>
                </tr>
              </Thead>
              <tbody className="divide-y divide-gray-200">
                {data.businesses.map((b: any) => {
                  const dealCount = data.deals.filter(
                    (d: any) => d.businessId === b.id
                  ).length;
                  return (
                    <tr key={b.id}>
                      <Td className="font-medium">{b.name}</Td>
                      <Td>{formatDate(b.createdAt)}</Td>
                      <Td>{dealCount}</Td>
                    </tr>
                  );
                })}
                {data.businesses.length === 0 && (
                  <tr>
                    <Td colSpan={3} className="text-center text-gray-400 py-8">
                      No businesses found
                    </Td>
                  </tr>
                )}
              </tbody>
            </Table>
          )}

          {/* Deals Tab */}
          {activeTab === "deals" && (
            <Table>
              <Thead>
                <tr>
                  <Th>Business</Th>
                  <Th>Type</Th>
                  <Th>Amount</Th>
                  <Th>Fee</Th>
                  <Th>Stage</Th>
                  <Th>Status</Th>
                  <Th>Date</Th>
                </tr>
              </Thead>
              <tbody className="divide-y divide-gray-200">
                {data.deals.map((d: any) => (
                  <tr key={d.id}>
                    <Td className="font-medium">{d.business?.name}</Td>
                    <Td>{d.applicationType}</Td>
                    <Td>{formatCurrency(d.applicationAmount)}</Td>
                    <Td>{formatCurrency(d.introducerFee)}</Td>
                    <Td>
                      <Badge className={STAGE_COLORS[d.stage] || ""}>
                        {STAGE_LABELS[d.stage] || d.stage}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge
                        className={
                          d.status === "live"
                            ? "bg-blue-100 text-blue-800"
                            : d.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }
                      >
                        {d.status}
                      </Badge>
                    </Td>
                    <Td>{formatDate(d.createdAt)}</Td>
                  </tr>
                ))}
                {data.deals.length === 0 && (
                  <tr>
                    <Td colSpan={7} className="text-center text-gray-400 py-8">
                      No deals found
                    </Td>
                  </tr>
                )}
              </tbody>
            </Table>
          )}

          {/* Commissions Tab */}
          {activeTab === "commissions" && (
            <>
              {/* Pipeline breakdown */}
              {Object.keys(data.summary.pipelineByStage).length > 0 && (
                <Card className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Pipeline by Stage (Weighted Forecast)
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {Object.entries(data.summary.pipelineByStage).map(
                      ([stage, info]) => (
                        <div key={stage} className="text-center">
                          <Badge className={STAGE_COLORS[stage] || ""}>
                            {STAGE_LABELS[stage] || stage}
                          </Badge>
                          <p className="text-lg font-bold mt-1">
                            {formatCurrency(info.weighted)}
                          </p>
                          <p className="text-xs text-gray-400">
                            {info.count} deal{info.count !== 1 ? "s" : ""} |
                            Raw: {formatCurrency(info.raw)}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </Card>
              )}
              <Table>
                <Thead>
                  <tr>
                    <Th>Business</Th>
                    <Th>Type</Th>
                    <Th>Amount Due</Th>
                    <Th>Status</Th>
                    <Th>Due Date</Th>
                  </tr>
                </Thead>
                <tbody className="divide-y divide-gray-200">
                  {data.commissions.map((c: any) => (
                    <tr key={c.id}>
                      <Td className="font-medium">
                        {c.deal?.business?.name}
                      </Td>
                      <Td>{c.deal?.applicationType}</Td>
                      <Td>{formatCurrency(c.amountDue)}</Td>
                      <Td>
                        <Badge
                          className={
                            c.status === "due"
                              ? "bg-green-100 text-green-800"
                              : c.status === "paid"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-yellow-100 text-yellow-800"
                          }
                        >
                          {c.status}
                        </Badge>
                      </Td>
                      <Td>{c.dueAt ? formatDate(c.dueAt) : "—"}</Td>
                    </tr>
                  ))}
                  {data.commissions.length === 0 && (
                    <tr>
                      <Td
                        colSpan={5}
                        className="text-center text-gray-400 py-8"
                      >
                        No commissions found
                      </Td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </>
          )}

          {/* Account Manager Tab */}
          {activeTab === "account-manager" && (
            <Card>
              {data.accountManager ? (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Your Account Manager
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        Name
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        {data.accountManager.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        Email
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        <a
                          href={`mailto:${data.accountManager.email}`}
                          className="text-swoop-600 hover:underline"
                        >
                          {data.accountManager.email}
                        </a>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        Phone
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        <a
                          href={`tel:${data.accountManager.phone}`}
                          className="text-swoop-600 hover:underline"
                        >
                          {data.accountManager.phone}
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">
                  No account manager assigned yet.
                </p>
              )}
            </Card>
          )}

          {/* UTM Links Tab */}
          {activeTab === "utm-links" && (
            <Table>
              <Thead>
                <tr>
                  <Th>Name</Th>
                  <Th>URL</Th>
                  <Th>Created</Th>
                  <Th>Actions</Th>
                </tr>
              </Thead>
              <tbody className="divide-y divide-gray-200">
                {utmLinks.map((link: any) => (
                  <tr key={link.id}>
                    <Td className="font-medium">{link.name}</Td>
                    <Td>
                      <span className="text-xs text-gray-500 max-w-xs truncate block">
                        {link.fullUrl}
                      </span>
                    </Td>
                    <Td>{formatDate(link.createdAt)}</Td>
                    <Td>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(link.fullUrl)}
                      >
                        Copy
                      </Button>
                    </Td>
                  </tr>
                ))}
                {utmLinks.length === 0 && (
                  <tr>
                    <Td
                      colSpan={4}
                      className="text-center text-gray-400 py-8"
                    >
                      No UTM links created yet. Contact your admin.
                    </Td>
                  </tr>
                )}
              </tbody>
            </Table>
          )}
        </div>
      </div>
    </>
  );
}
