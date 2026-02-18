"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, Button } from "@/components/ui";
import { Navbar } from "@/components/navbar";

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }
    fetch(`/api/auth/verify?token=${token}`)
      .then((r) => {
        if (r.redirected) {
          window.location.href = r.url;
        } else if (r.ok) {
          setStatus("success");
        } else {
          setStatus("error");
        }
      })
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <Card className="w-full max-w-md text-center">
      {status === "loading" && (
        <p className="text-gray-500">Verifying your email...</p>
      )}
      {status === "success" && (
        <>
          <h2 className="text-xl font-bold text-green-700 mb-2">
            Email Verified!
          </h2>
          <p className="text-gray-600 mb-4">
            Your email has been verified. You can now sign in.
          </p>
          <Link href="/auth/login">
            <Button>Go to Sign In</Button>
          </Link>
        </>
      )}
      {status === "error" && (
        <>
          <h2 className="text-xl font-bold text-red-700 mb-2">
            Verification Failed
          </h2>
          <p className="text-gray-600 mb-4">
            The verification link is invalid or has expired.
          </p>
          <Link href="/auth/login">
            <Button variant="secondary">Go to Sign In</Button>
          </Link>
        </>
      )}
    </Card>
  );
}

export default function VerifyPage() {
  return (
    <>
      <Navbar />
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <Suspense
          fallback={
            <Card className="w-full max-w-md text-center py-12">
              <p className="text-gray-400">Verifying...</p>
            </Card>
          }
        >
          <VerifyContent />
        </Suspense>
      </div>
    </>
  );
}
