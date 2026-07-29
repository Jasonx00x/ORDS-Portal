import { getSupabaseConfig } from "@/lib/supabase-config";

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

    return Response.json({ connected: response.ok });
  } catch {
    return Response.json(
      {
        connected: false,
        message: "Connection check unavailable.",
      },
      { status: 500 },
    );
  }
}
