"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Receipt, Sparkles, History, Users } from "lucide-react";

const TABS = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/factures", label: "Factures", icon: Receipt },
  { href: "/menage", label: "Ménage", icon: Sparkles },
  { href: "/historique", label: "Historique", icon: History },
  { href: "/reglages", label: "Réglages", icon: Users },
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #EEF1EF", display: "flex", padding: "8px 4px 12px", zIndex: 5 }}>
      {TABS.map((t) => {
        const Icon = t.icon;
        const active = pathname === t.href;
        return (
          <Link key={t.href} href={t.href} style={{ flex: 1, textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: active ? "#2F6F63" : "#9AA6A0" }}>
            <Icon size={19} />
            <span style={{ fontSize: 10.5, fontWeight: active ? 700 : 500 }}>{t.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
