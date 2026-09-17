"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, LogOut, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const navItems = [
    { name: "Gestion Menu", href: "/admin/menu", icon: LayoutDashboard },
    { name: "Utilisateurs", href: "/admin/users", icon: Users },
  ];

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside className="flex w-64 flex-col bg-gray-900 text-gray-300">
        <div className="flex h-16 items-center px-6 text-lg font-bold tracking-widest text-white uppercase border-b border-gray-800">
          GAIA Admin
        </div>

        <nav className="flex-1 space-y-1 px-3 py-6">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-gray-800 text-white"
                    : "hover:bg-gray-800 hover:text-white"
                }`}
              >
                <item.icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-800 p-4 space-y-2">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          >
            <ArrowLeft size={18} />
            Retour Caisse
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-gray-800 hover:text-red-300"
          >
            <LogOut size={18} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto bg-gray-100">
        <div className="mx-auto max-w-5xl p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
