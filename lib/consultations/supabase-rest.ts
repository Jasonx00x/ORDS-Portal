import { getSupabaseConfig, getSupabaseServerConfig } from "@/lib/supabase-config";

type RpcOptions = {
  method?: "GET" | "POST" | "PATCH";
  useServiceRole?: boolean;
};

export async function callSupabaseRpc<T>(functionName: string, body: Record<string, unknown>, options: RpcOptions = {}) {
  const config = getSupabaseConfig();
  const serverConfig = options.useServiceRole ? getSupabaseServerConfig() : null;
  const apiKey = options.useServiceRole ? serverConfig?.serviceRoleKey : config.publishableKey;

  if (!apiKey) {
    return {
      data: null,
      error: {
        message: "Supabase server credentials are not configured.",
        status: 503,
      },
    };
  }

  let response: Response;
  try {
    response = await fetch(`${config.url}/rest/v1/rpc/${functionName}`, {
      method: options.method ?? "POST",
      headers: {
        apikey: apiKey,
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    return {
      data: null,
      error: {
        message: "Supabase request could not be completed.",
        status: 503,
      },
    };
  }

  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

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
