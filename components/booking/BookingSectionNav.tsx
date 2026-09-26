"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CalendarRange,
  CheckSquare2,
  Clock3,
  DoorOpen,
  LayoutDashboard,
  UsersRound,
} from "lucide-react";
import type { Role } from "@/lib/roles";

export type BookingView = "availability" | "calendar" | "lessons" | "overview" | "people" | "rooms";

const adminItems = [
  { href: "/booking", icon: LayoutDashboard, label: "Overview" },
  { href: "/booking/calendar", icon: CalendarDays, label: "Master Calendar" },
  { href: "/booking/people", icon: UsersRound, label: "People & Assignments" },
  { href: "/booking/availability", icon: Clock3, label: "Availability" },
  { href: "/booking/rooms", icon: DoorOpen, label: "Rooms & Approvals" },
  { href: "/booking/calendars", icon: CalendarRange, label: "Public Calendars" },
  { href: "/booking/lessons", icon: CheckSquare2, label: "Lesson Records" },
];

const instructorItems = [
  { href: "/booking", icon: LayoutDashboard, label: "Overview" },
  { href: "/booking/calendar", icon: CalendarDays, label: "Teaching Calendar" },
  { href: "/booking/availability", icon: Clock3, label: "Availability" },
  { href: "/booking/rooms", icon: DoorOpen, label: "Room Requests" },
  { href: "/booking/lessons", icon: CheckSquare2, label: "Lesson Records" },
];

export function BookingSectionNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = role === "admin" ? adminItems : role === "instructor" ? instructorItems : [];
  if (!items.length) return null;

  return (
    <nav aria-label="Booking center" className="booking-section-nav">
      <div className="booking-section-nav-head">
        <span>Booking Center</span>
        <small>Operations workspace</small>
      </div>
      <div className="booking-section-nav-links">
        {items.map(({ href, icon: Icon, label }) => {
          const active = href === "/booking" ? pathname === href : pathname.startsWith(href);
          return (
            <Link aria-current={active ? "page" : undefined} className={active ? "active" : ""} href={href} key={href}>
              <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function BookingPageLayout({ children, role }: { children: React.ReactNode; role: Role }) {
  return (
    <div className="booking-page-layout">
      <BookingSectionNav role={role} />
      <div className="booking-page-content">{children}</div>
    </div>
  );
}

