"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  FiActivity,
  FiBarChart2,
  FiCalendar,
  FiCreditCard,
  FiGrid,
  FiLogOut,
  FiMenu,
  FiSettings,
  FiUsers,
  FiX,
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

function SidebarContent({ session, navItems, pathname, logout, onNavClick }) {
  return (
    <>
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <FiActivity className="text-white" size={16} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Optimus</p>
            <p className="text-[10px] text-gray-400 font-medium">Gym CRM</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavClick}
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

      {/* User + Logout */}
      <div className="px-5 py-4 border-t border-gray-100 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
            {session?.role === "member" ? "MB" : "AD"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-gray-800">{session?.name || "Admin"}</p>
            <p className="truncate text-[10px] text-gray-400">{session?.email || "admin@Optimus.in"}</p>
          </div>
          <button
            onClick={logout}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-700 shrink-0"
            title="Logout"
          >
            <FiLogOut size={14} />
          </button>
        </div>
      </div>
    </>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [session, setSession] = useState(null);
  const [open, setOpen] = useState(false);
  const drawerRef = useRef(null);

  useEffect(() => {
    setSession(getClientSession());
  }, []);

  // Close drawer on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const navItems = session?.role === "member" ? memberNavItems : adminNavItems;

  async function logout() {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    const data = await response.json();
    window.location.href = data.redirectTo || "/login";
  }

  return (
    <>
      {/* ── Desktop Sidebar ─────────────────────────────────── */}
      <aside className="fixed left-0 top-0 hidden h-full w-60 bg-white border-r border-gray-100 flex-col z-20 shadow-sm lg:flex">
        <SidebarContent
          session={session}
          navItems={navItems}
          pathname={pathname}
          logout={logout}
          onNavClick={() => {}}
        />
      </aside>

      {/* ── Mobile / Tablet Hamburger Button ────────────────── */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="fixed top-4 left-4 z-30 flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-gray-200 shadow-sm text-gray-600 hover:bg-gray-50 transition lg:hidden"
      >
        <FiMenu size={18} />
      </button>

      {/* ── Backdrop ────────────────────────────────────────── */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 lg:hidden ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
      />

      {/* ── Slide-in Drawer ─────────────────────────────────── */}
      <aside
        ref={drawerRef}
        className={`fixed left-0 top-0 z-50 h-full w-72 bg-white border-r border-gray-100 flex flex-col shadow-xl transition-transform duration-300 ease-in-out lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Close button */}
        <button
          onClick={() => setOpen(false)}
          aria-label="Close menu"
          className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
        >
          <FiX size={16} />
        </button>

        <SidebarContent
          session={session}
          navItems={navItems}
          pathname={pathname}
          logout={logout}
          onNavClick={() => setOpen(false)}
        />
      </aside>
    </>
  );
}
