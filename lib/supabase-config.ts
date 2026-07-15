export type SupabaseConnectionConfig = {
  publishableKey: string;
  url: string;
};

export type SupabaseServerConfig = SupabaseConnectionConfig & {
  serviceRoleKey?: string;
};

export function getSupabaseConfig(): SupabaseConnectionConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return { publishableKey, url };
}

export function getSupabaseServerConfig(): SupabaseServerConfig {
  return {
    ...getSupabaseConfig(),
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export function getSupabaseProjectRef(url: string) {
  return new URL(url).hostname.split(".")[0] ?? "unknown";
}
