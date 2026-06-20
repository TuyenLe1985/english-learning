/**
 * Sidebar — left-column navigation for the dashboard route group.
 *
 * D-15 REQUIRED: Renders module nav links + role-gated Admin link.
 * UI-SPEC Screen 3 + Updated Dashboard Layout Navigation:
 *   - Dashboard, Vocabulary, Grammar, Reading, Listening, Quiz, SRS Reviews, Analytics, Profile
 *   - Admin link (/admin, Shield icon) ONLY when role === 'ADMIN' (D-15 — use 'ADMIN' literal)
 *
 * Active link: bg-secondary text-foreground font-medium border-l-2 border-primary
 * Inactive link: text-muted-foreground hover:bg-muted hover:text-foreground
 *
 * Accessibility: nav role="navigation" aria-label="Main"
 *               active link: aria-current="page"
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  BookText,
  FileText,
  Headphones,
  HelpCircle,
  RotateCcw,
  BarChart3,
  User,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavLink {
  href: string;
  label: string;
  icon: React.ElementType;
}

const NAV_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vocabulary", label: "Vocabulary", icon: BookOpen },
  { href: "/grammar", label: "Grammar", icon: BookText },
  { href: "/reading", label: "Reading", icon: FileText },
  { href: "/listening", label: "Listening", icon: Headphones },
  { href: "/quiz", label: "Quiz Center", icon: HelpCircle },
  { href: "/review", label: "SRS Reviews", icon: RotateCcw },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/profile", label: "Profile", icon: User },
];

interface SidebarProps {
  role?: string | null;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();

  return (
    <nav
      role="navigation"
      aria-label="Main"
      className="flex w-56 flex-shrink-0 flex-col border-r border-border bg-background"
    >
      <div className="flex flex-col gap-0.5 p-3">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "border-l-2 border-primary bg-secondary font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              {label}
            </Link>
          );
        })}

        {/* D-15: Admin link — rendered ONLY when role === 'ADMIN' */}
        {role === 'ADMIN' && (
          <Link
            href="/admin"
            aria-current={pathname === "/admin" ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              pathname === "/admin"
                ? "border-l-2 border-primary bg-secondary font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Shield className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            Admin
          </Link>
        )}
      </div>
    </nav>
  );
}
