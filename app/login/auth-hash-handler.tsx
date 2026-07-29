"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AuthHashHandler() {
  const router = useRouter();

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    const linkType = hash.get("type");

    if (!accessToken || !refreshToken) return;

    let active = true;
    const supabase = createClient();

    void supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error }) => {
      if (!active || error) return;

      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      router.replace(linkType === "invite" || linkType === "recovery" ? "/auth/update-password" : "/dashboard");
      router.refresh();
    });

    return () => {
      active = false;
    };
  }, [router]);

  return null;
}
