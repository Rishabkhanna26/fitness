"use client";

import { useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { members } from "@/lib/data";
import {
  FiSearch, FiFilter, FiPlus, FiUser,
  FiPhone, FiCalendar, FiChevronRight,
} from "react-icons/fi";

const planBadge = {
  Premium: "bg-indigo-100 text-indigo-700",
  Standard: "bg-green-100 text-green-700",
  Basic: "bg-yellow-100 text-yellow-700",
};

const statusBadge = {
  Active: "bg-emerald-100 text-emerald-700",
  Inactive: "bg-red-100 text-red-500",
};

export default function MembersPage() {
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const filtered = members.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      m.phone.includes(search);
    const matchPlan = planFilter === "All" || m.plan === planFilter;
    const matchStatus = statusFilter === "All" || m.status === statusFilter;
    return matchSearch && matchPlan && matchStatus;
  });

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="ml-60 flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Members</h1>
            <p className="text-sm text-gray-400 mt-0.5">Manage all gym members</p>
          </div>
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition shadow-sm shadow-indigo-200">
            <FiPlus size={16} />
            Add Member
          </button>
        </header>

        <main className="px-8 py-6 max-w-screen-2xl mx-auto w-full">
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Members", value: members.length, color: "text-indigo-600", bg: "bg-indigo-50" },
              { label: "Active Members", value: members.filter((m) => m.status === "Active").length, color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "Inactive Members", value: members.filter((m) => m.status === "Inactive").length, color: "text-red-500", bg: "bg-red-50" },
              { label: "Premium Members", value: members.filter((m) => m.plan === "Premium").length, color: "text-purple-600", bg: "bg-purple-50" },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} rounded-2xl p-4 border border-white`}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6 flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                type="text"
                placeholder="Search by name, email or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
              />
            </div>
            <div className="flex items-center gap-2">
              <FiFilter className="text-gray-400" size={14} />
              <span className="text-xs text-gray-500 font-medium">Plan:</span>
              {['All', 'Premium', 'Standard', 'Basic'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPlanFilter(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    planFilter === p
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Status:</span>
              {['All', 'Active', 'Inactive'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    statusFilter === s
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-400 ml-auto">{filtered.length} members found</span>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <FiUser size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No members found matching your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((member) => (
                <Link href={`/members/${member.id}`} key={member.id}>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer group">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl ${member.avatarColor} flex items-center justify-center text-white font-bold text-sm`}>
                        {member.avatar}
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusBadge[member.status]}`}>
                        {member.status}
                      </span>
                    </div>

                    <h3 className="font-bold text-gray-900 text-sm group-hover:text-indigo-700 transition">{member.name}</h3>
                    <div className="mt-1 mb-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${planBadge[member.plan] || 'bg-gray-100 text-gray-600'}`}>
                        {member.plan} Plan
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-gray-500">
                      <div className="flex items-center gap-2">
                        <FiPhone size={11} className="text-gray-400 shrink-0" />
                        <span>{member.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiCalendar size={11} className="text-gray-400 shrink-0" />
                        <span>Expires: {member.expiryDate}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-400">Total Visits</p>
                        <p className="text-sm font-bold text-gray-800">{member.totalVisits}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Paid</p>
                        <p className="text-sm font-bold text-gray-800">₹{member.totalPaid.toLocaleString()}</p>
                      </div>
                      <FiChevronRight className="text-gray-300 group-hover:text-indigo-500 transition" size={16} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>

        <footer className="text-center text-xs text-gray-400 py-6">© 2026 FitNation Gym CRM. All rights reserved.</footer>
      </div>
    </div>
  );
}
