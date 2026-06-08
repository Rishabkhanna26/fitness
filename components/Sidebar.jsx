"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FiGrid,
  FiUsers,
  FiCalendar,
  FiCreditCard,
  FiSettings,
  FiActivity,
  FiBarChart2,
  FiLogOut,
} from "react-icons/fi";
import { getClientSession } from "@/lib/session";

const adminNavItems = [
  { label: "Dashboard", href: "/", icon: FiGrid },
  { label: "Members", href: "/members", icon: FiUsers },
  { label: "Attendance", href: "/attendance", icon: FiCalendar },
  { label: "Settings", href: "/settings", icon: FiSettings },
];

const memberNavItems = [
  { label: "My Profile", href: "/member", icon: FiUsers },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [session, setSession] = useState(null);

  useEffect(() => {
    setSession(getClientSession());
  }, []);

  const navItems = session?.role === "member" ? memberNavItems : adminNavItems;

  async function logout() {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    const data = await response.json();
    window.location.href = data.redirectTo || "/login";
  }

  return (
    <aside className="fixed left-0 top-0 hidden h-full w-60 bg-white border-r border-gray-100 flex-col z-20 shadow-sm lg:flex">
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <FiActivity className="text-white" size={16} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">FitNation</p>
            <p className="text-[10px] text-gray-400 font-medium">Gym CRM</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
              }`}
            >
              <Icon size={16} className={active ? "text-indigo-600" : "text-gray-400"} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">
            {session?.role === "member" ? "MB" : "AD"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-gray-800">{session?.name || "Admin"}</p>
            <p className="truncate text-[10px] text-gray-400">{session?.email || "admin@fitnation.in"}</p>
          </div>
          <button
            onClick={logout}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-700"
            title="Logout"
          >
            <FiLogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
