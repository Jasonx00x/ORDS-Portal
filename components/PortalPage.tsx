import { PortalShell } from "./PortalShell";
import { requirePortalUser } from "@/lib/auth";
import type { PortalSection } from "@/lib/roles";

export async function PortalPage({ section }: { section: PortalSection }) {
  const user = await requirePortalUser(section);

  return <PortalShell section={section} user={user} />;
}
