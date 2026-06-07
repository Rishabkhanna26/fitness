"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FiGrid,
  FiUsers,
  FiCalendar,
  FiCreditCard,
  FiSettings,
  FiActivity,
  FiBarChart2,
} from "react-icons/fi";

const navItems = [
  { label: "Dashboard", href: "/", icon: FiGrid },
  { label: "Members", href: "/members", icon: FiUsers },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-white border-r border-gray-100 flex flex-col z-20 shadow-sm">
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
            AD
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-800">Admin</p>
            <p className="text-[10px] text-gray-400">admin@fitnation.in</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
