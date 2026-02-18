import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Admin routes: require admin role
    if (path.startsWith("/admin")) {
      if (token?.role !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // Dashboard: require authenticated user
    if (path.startsWith("/dashboard")) {
      if (!token) {
        return NextResponse.redirect(new URL("/auth/login", req.url));
      }
      // Redirect admins to admin dashboard
      if (token.role === "admin") {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
    }

    // API admin routes: require admin
    if (path.startsWith("/api/admin")) {
      if (token?.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ token, req }) {
        const path = req.nextUrl.pathname;
        // Allow public routes
        if (
          path.startsWith("/auth") ||
          path === "/" ||
          path.startsWith("/api/auth") ||
          path.startsWith("/api/partners-list")
        ) {
          return true;
        }
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/dashboard/:path*",
    "/api/claims/:path*",
  ],
};
