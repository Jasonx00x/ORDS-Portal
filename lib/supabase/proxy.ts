import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase-config";

const publicPaths = [
  "/access-pending",
  "/auth",
  "/book-consultation",
  "/forgot-password",
  "/login",
];

function isPublicPath(pathname: string) {
  return (
    publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ||
    pathname.startsWith("/api/consultations/") ||
    pathname === "/api/supabase/status"
  );
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { publishableKey, url } = getSupabaseConfig();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, options, value }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const pathname = request.nextUrl.pathname;

  if (!claims && !isPublicPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (claims && (pathname === "/login" || pathname === "/forgot-password")) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}
