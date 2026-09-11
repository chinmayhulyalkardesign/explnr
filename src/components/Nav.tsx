"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Tags, Wallet, Receipt } from "lucide-react";

const LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/income", label: "Income", icon: Wallet },
  { href: "/expenses", label: "Expenses", icon: Receipt },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center px-4 py-3">
        <div className="flex gap-1">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                }`}
              >
                <Icon size={15} strokeWidth={2} />
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
