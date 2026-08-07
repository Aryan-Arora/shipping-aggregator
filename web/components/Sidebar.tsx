"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/orders", label: "Orders" },
  { href: "/ship-now", label: "Ship Now" },
  { href: "/shipments", label: "Shipments" },
  { href: "/pickup-locations", label: "Pickup Locations" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r"
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.72)",
        backdropFilter: "blur(20px) saturate(180%)",
        borderColor: "var(--color-border)",
      }}
    >
      <div className="px-5 py-5">
        <span className="text-[0.95rem] font-semibold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
          Shipping Aggregator
        </span>
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-[var(--radius-sm)] px-3 py-2 text-[0.875rem] font-medium transition-all duration-150 active:scale-[0.98]"
              style={
                active
                  ? { backgroundColor: "var(--color-accent-soft)", color: "var(--color-accent-hover)" }
                  : { color: "var(--color-text-secondary)" }
              }
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t px-3 py-3" style={{ borderColor: "var(--color-border)" }}>
        <button onClick={handleLogout} className="btn-ghost w-full justify-start px-3">
          Log out
        </button>
      </div>
    </aside>
  );
}
