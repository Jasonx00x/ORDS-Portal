import { PortalShell } from "./PortalShell";
import type { PortalSection } from "@/lib/roles";

export function PortalPage({ section }: { section: PortalSection }) {
  return <PortalShell section={section} />;
}
