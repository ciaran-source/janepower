import Link from "next/link";
import { Navbar } from "@/components/navbar";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-2xl">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-swoop-600 flex items-center justify-center text-white font-bold text-2xl mb-6">
            S
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Swoop Partner Portal
          </h1>
          <p className="text-lg text-gray-500 mb-8">
            Track your referred businesses, deal statuses, and commissions —
            all in one place.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/auth/login"
              className="inline-flex items-center rounded-lg bg-swoop-600 px-6 py-3 text-sm font-medium text-white hover:bg-swoop-700 transition"
            >
              Sign In
            </Link>
            <Link
              href="/auth/register"
              className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Create Account
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
