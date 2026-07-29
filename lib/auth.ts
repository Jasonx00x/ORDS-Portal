import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canAccess, defaultPathForRole, type PortalSection, type Role } from "@/lib/roles";

type PortalClaims = {
  app_metadata?: { role?: unknown };
  email?: string;
  sub?: string;
  user_metadata?: {
    display_name?: unknown;
    full_name?: unknown;
    name?: unknown;
  };
};

export type PortalUser = {
  displayName: string;
  email: string;
  id: string;
  role: Role;
};

export function portalRoleFromClaim(value: unknown): Role | null {
  if (value === "owner" || value === "staff" || value === "admin") return "admin";
  if (value === "instructor" || value === "parent" || value === "student" || value === "client") return value;
  return null;
}

function claimString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

export async function getPortalUser(): Promise<PortalUser | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims) return null;

  const portalClaims = claims as PortalClaims;
  const role = portalRoleFromClaim(portalClaims.app_metadata?.role);
  if (!role) return null;

  const email = claimString(portalClaims.email);
  const displayName =
    claimString(portalClaims.user_metadata?.display_name) ||
    claimString(portalClaims.user_metadata?.full_name) ||
    claimString(portalClaims.user_metadata?.name) ||
    email.split("@")[0] ||
    "ORDS Portal User";

  return {
    displayName,
    email,
    id: claimString(portalClaims.sub),
    role,
  };
}

export async function requirePortalUser(section?: PortalSection) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims) redirect("/login");

  const user = await getPortalUser();
  if (!user) redirect("/access-pending");

  if (section && !canAccess(user.role, section)) {
    redirect(defaultPathForRole(user.role));
  }

  return user;
}
