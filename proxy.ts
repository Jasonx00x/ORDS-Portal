import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|apple-touch-icon.png|apple-touch-icon-precomposed.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
