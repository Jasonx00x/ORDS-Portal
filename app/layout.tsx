import type { Metadata } from "next";
import "@/css/styles.css";

export const metadata: Metadata = {
  title: "ORDS Operations Portal",
  description: "Role-based ORDS Operations Portal for scheduling, reports, homework, announcements, and accountability.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="portal-body ops-portal">{children}</body>
    </html>
  );
}
