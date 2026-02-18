"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui";

export function Navbar() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-swoop-600 flex items-center justify-center text-white font-bold text-sm">
                S
              </div>
              <span className="text-lg font-bold text-gray-900">
                Swoop Partners
              </span>
            </Link>
            {session && (
              <div className="hidden sm:flex items-center gap-4">
                {isAdmin ? (
                  <>
                    <Link
                      href="/admin"
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/admin/partners"
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      Partners
                    </Link>
                    <Link
                      href="/admin/claims"
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      Claims
                    </Link>
                    <Link
                      href="/admin/users"
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      Users
                    </Link>
                    <Link
                      href="/admin/utm-links"
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      UTM Links
                    </Link>
                  </>
                ) : (
                  <Link
                    href="/dashboard"
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Dashboard
                  </Link>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {session ? (
              <>
                <span className="text-sm text-gray-500">
                  {session.user?.email}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button size="sm">Register</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
