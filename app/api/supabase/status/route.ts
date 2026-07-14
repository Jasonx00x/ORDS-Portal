import { getSupabaseConfig, getSupabaseProjectRef } from "@/lib/supabase-config";

export async function GET() {
  try {
    const { publishableKey, url } = getSupabaseConfig();
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: {
        apikey: publishableKey,
        authorization: `Bearer ${publishableKey}`,
      },
      cache: "no-store",
    });

    return Response.json({
      connected: response.ok,
      projectRef: getSupabaseProjectRef(url),
      status: response.status,
      statusText: response.statusText,
    });
  } catch (error) {
    return Response.json(
      {
        connected: false,
        message: error instanceof Error ? error.message : "Unable to check Supabase connection.",
      },
      { status: 500 },
    );
  }
}
