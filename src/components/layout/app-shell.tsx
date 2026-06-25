"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Car,
  Database,
  LayoutDashboard,
  Menu,
  Plus,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/datasets", label: "AI Hub", icon: Database },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const NavLink = ({
    href,
    label,
    icon: Icon,
    exact,
    onClick,
  }: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    exact?: boolean;
    onClick?: () => void;
  }) => {
    const active = isActive(href, exact);
    return (
      <Link
        href={href}
        onClick={onClick}
        className={cn(
          "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
          active
            ? "bg-white/10 text-white shadow-sm"
            : "text-white/60 hover:bg-white/5 hover:text-white"
        )}
      >
        <Icon
          className={cn(
            "h-[18px] w-[18px] shrink-0 transition-colors",
            active ? "text-gold" : "text-white/50 group-hover:text-white/80"
          )}
        />
        {label}
        {active && (
          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gold" />
        )}
      </Link>
    );
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link href="/dashboard" className="flex items-center gap-3 px-2 py-1">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-gold-darker shadow-lg">
          <Car className="h-5 w-5 text-[#1a1508]" />
        </div>
        <div>
          <p className="font-display text-base leading-tight text-white">
            AutoDealer
          </p>
          <p className="text-[11px] tracking-wide text-white/40 uppercase">
            Copilot
          </p>
        </div>
      </Link>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            {...item}
            onClick={() => setMobileOpen(false)}
          />
        ))}
      </nav>

      <div className="mt-auto space-y-3 border-t border-white/10 pt-5">
        <Link
          href="/dashboard/new"
          onClick={() => setMobileOpen(false)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold to-gold-dark px-4 py-3 text-sm font-semibold text-[#1a1508] shadow-lg transition-all hover:shadow-xl hover:brightness-105"
        >
          <Plus className="h-4 w-4" />
          새 차량 등록
        </Link>
        <p className="text-center text-[10px] text-white/30">
          OpenRouter 무료 AI · 로컬 저장
        </p>
      </div>
    </div>
  );

  return (
    <div className="app-bg flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-sidebar p-5 lg:flex">
        {sidebar}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-sidebar p-5 transition-transform duration-300 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
          aria-label="메뉴 닫기"
        >
          <X className="h-5 w-5" />
        </button>
        {sidebar}
      </aside>

      {/* Main content */}
      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/60 bg-card/80 px-4 backdrop-blur-md lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-foreground/70 hover:bg-muted"
            aria-label="메뉴 열기"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-display text-base">AutoDealer Copilot</span>
          <Link
            href="/dashboard/new"
            className="rounded-lg bg-primary p-2 text-white"
          >
            <Plus className="h-5 w-5" />
          </Link>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
