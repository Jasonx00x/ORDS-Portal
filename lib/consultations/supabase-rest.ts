import { getSupabaseConfig, getSupabaseServerConfig } from "@/lib/supabase-config";

type RpcOptions = {
  method?: "GET" | "POST" | "PATCH";
  useServiceRole?: boolean;
};

export async function callSupabaseRpc<T>(functionName: string, body: Record<string, unknown>, options: RpcOptions = {}) {
  const config = getSupabaseConfig();
  const serverConfig = options.useServiceRole ? getSupabaseServerConfig() : null;
  const apiKey = serverConfig?.serviceRoleKey ?? config.publishableKey;

  const response = await fetch(`${config.url}/rest/v1/rpc/${functionName}`, {
    method: options.method ?? "POST",
    headers: {
      apikey: apiKey,
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    return {
      data: null,
      error: {
        message: "Supabase request failed.",
        status: response.status,
      },
    };
  }

  return { data: data as T, error: null };
}
