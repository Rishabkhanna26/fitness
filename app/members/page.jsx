"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import {
  FiSearch, FiFilter, FiPlus, FiUser,
  FiPhone, FiCalendar, FiChevronRight, FiX,
  FiMail, FiGift, FiCheck, FiDollarSign, FiClock,
} from "react-icons/fi";

const DURATIONS = ["1 Month", "3 Months", "6 Months", "Custom"];

const durationBadge = {
  "1 Month":   "bg-blue-100 text-blue-700",
  "3 Months":  "bg-indigo-100 text-indigo-700",
  "6 Months":  "bg-purple-100 text-purple-700",
  "Custom":    "bg-orange-100 text-orange-700",
};

const statusBadge = {
  Active:   "bg-emerald-100 text-emerald-700",
  Inactive: "bg-red-100 text-red-500",
};

function AddMemberModal({ onClose, onAdded }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    duration: "1 Month",
    customDays: "",
    amountPaid: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.phone.trim()) {
      setError("Name and phone are required.");
      return;
    }
    if (form.duration === "Custom" && (!form.customDays || Number(form.customDays) < 1)) {
      setError("Enter a valid number of days for custom duration.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add member.");
      onAdded(data.member);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Add New Member</h2>
            <p className="text-xs text-gray-400 mt-0.5">Enter details to register</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Personal Details */}
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Personal Details</p>

          <label className="block">
            <span className="text-xs font-semibold text-gray-500 mb-1.5 block">Full Name</span>
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Rahul Sharma"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-gray-500 mb-1.5 block">Email Address (optional)</span>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="email"
                placeholder="rahul@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-gray-500 mb-1.5 block">Phone Number</span>
            <div className="relative">
              <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="tel"
                placeholder="98765 43210"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
              />
            </div>
          </label>

          {/* Membership */}
          <div className="pt-1">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Membership Duration</p>
            <div className="grid grid-cols-4 gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setForm({ ...form, duration: d })}
                  className={`py-2 rounded-xl text-xs font-bold border-2 transition ${
                    form.duration === d
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-gray-100 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            {form.duration === "Custom" && (
              <div className="mt-3 relative">
                <FiClock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="number"
                  min="1"
                  placeholder="Number of days"
                  value={form.customDays}
                  onChange={(e) => setForm({ ...form, customDays: e.target.value })}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
                />
              </div>
            )}
          </div>

          {/* Payment */}
          <div className="pt-1">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Payment</p>
            <label className="block">
              <span className="text-xs font-semibold text-gray-500 mb-1.5 block">Amount Paid (₹)</span>
              <div className="relative">
                <FiDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 1500"
                  value={form.amountPaid}
                  onChange={(e) => setForm({ ...form, amountPaid: e.target.value })}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
                />
              </div>
            </label>
          </div>

          {error && <p className="text-xs font-semibold text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 transition disabled:opacity-60"
            >
              {loading ? "Adding..." : "Add Member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RewardModal({ member, offers, onClose, onAvailed }) {
  const [selectedOffer, setSelectedOffer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const activeOffers = offers.filter((o) => o.active);

  async function handleAvail() {
    if (!selectedOffer) { setError("Please select an offer."); return; }
    setError(""); setLoading(true);
    try {
      const res = await fetch(`/api/members/${member.id}/avail-reward`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offer_id: selectedOffer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed.");
      const offer = activeOffers.find((o) => o.id === selectedOffer);
      setSuccess(`Reward "${offer?.title}" availed! Next renewal period starts now.`);
      onAvailed();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Avail Reward</h2>
            <p className="text-xs text-gray-400 mt-0.5">for {member.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
        </div>

        {success ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <FiCheck className="text-green-600" size={28} />
            </div>
            <p className="text-sm font-semibold text-gray-800">{success}</p>
            <button onClick={onClose} className="mt-4 px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold">Done</button>
          </div>
        ) : (
          <>
            {activeOffers.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No active offers configured. Add offers in Settings.</p>
            ) : (
              <div className="space-y-3 mb-5">
                {activeOffers.map((offer) => (
                  <label
                    key={offer.id}
                    className={`flex items-center gap-3 rounded-xl border-2 p-3 cursor-pointer transition ${
                      selectedOffer === offer.id ? "border-indigo-500 bg-indigo-50" : "border-gray-100 hover:border-gray-300"
                    }`}
                  >
                    <input type="radio" name="offer" value={offer.id} checked={selectedOffer === offer.id}
                      onChange={() => setSelectedOffer(offer.id)} className="accent-indigo-600" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">{offer.title}</p>
                      <p className="text-xs text-gray-500">
                        {offer.offer_type === "percentage" ? `${offer.amount}% off` : `₹${offer.amount} off`}
                        {" · "}Valid for {offer.interval_value} {offer.interval_unit}
                      </p>
                    </div>
                    <FiGift className="text-indigo-400" size={18} />
                  </label>
                ))}
              </div>
            )}
            {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>}
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleAvail} disabled={loading || activeOffers.length === 0}
                className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60">
                {loading ? "Availing..." : "Avail Reward"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function MembersPage() {
  const [search, setSearch] = useState("");
  const [durationFilter, setDurationFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [members, setMembers] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [rewardMember, setRewardMember] = useState(null);

  function loadData() {
    setLoading(true);
    Promise.all([
      fetch("/api/members").then((r) => r.json()),
      fetch("/api/loyalty-offers").then((r) => r.json()),
    ])
      .then(([membersData, offersData]) => {
        setMembers(membersData.members || []);
        setOffers(offersData.offers || []);
      })
      .catch(() => {
        setMembers([]);
        setOffers([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadData(); }, []);

  const filtered = members.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      m.phone.includes(search);
    // Custom filter: match any plan that isn't 1/3/6 Month
    const matchDuration =
      durationFilter === "All" ||
      (durationFilter === "Custom"
        ? !["1 Month", "3 Months", "6 Months"].includes(m.plan)
        : m.plan === durationFilter);
    const matchStatus = statusFilter === "All" || m.status === statusFilter;
    return matchSearch && matchDuration && matchStatus;
  });

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      {showAddModal && (
        <AddMemberModal
          onClose={() => setShowAddModal(false)}
          onAdded={(member) => { setMembers((prev) => [member, ...prev]); }}
        />
      )}
      {rewardMember && (
        <RewardModal
          member={rewardMember}
          offers={offers}
          onClose={() => setRewardMember(null)}
          onAvailed={loadData}
        />
      )}
      <div className="lg:ml-60 flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-100 pl-14 pr-4 sm:px-8 py-4 flex flex-col sm:flex-row gap-4 sm:items-center justify-between sticky top-0 z-10 shadow-sm lg:pl-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Members</h1>
            <p className="text-sm text-gray-400 mt-0.5">Manage all gym members</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition shadow-sm shadow-indigo-200"
          >
            <FiPlus size={16} />
            Add Member
          </button>
        </header>

        <main className="px-4 sm:px-8 py-6 max-w-screen-2xl mx-auto w-full">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Members",    value: members.length,                                          color: "text-indigo-600",  bg: "bg-indigo-50"  },
              { label: "Active Members",   value: members.filter((m) => m.status === "Active").length,     color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "Inactive Members", value: members.filter((m) => m.status === "Inactive").length,   color: "text-red-500",     bg: "bg-red-50"     },
              { label: "Custom Plans",     value: members.filter((m) => !["1 Month","3 Months","6 Months"].includes(m.plan)).length, color: "text-orange-600", bg: "bg-orange-50" },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} rounded-2xl p-4 border border-white`}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6 flex flex-wrap items-start sm:items-center gap-3">
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

            <div className="flex items-center gap-2 flex-wrap">
              <FiFilter className="text-gray-400" size={14} />
              <span className="text-xs text-gray-500 font-medium">Duration:</span>
              {["All", "1 Month", "3 Months", "6 Months", "Custom"].map((d) => (
                <button
                  key={d}
                  onClick={() => setDurationFilter(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    durationFilter === d ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Status:</span>
              {["All", "Active", "Inactive"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    statusFilter === s ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <span className="text-xs text-gray-400 ml-auto">{filtered.length} members found</span>
          </div>

          {/* Member Cards */}
          {loading ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-sm">Loading members...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <FiUser size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No members found matching your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((member) => (
                <div
                  key={member.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-indigo-100 transition-all group flex flex-col"
                >
                  <Link href={`/members/${member.id}`} className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl ${member.avatarColor} flex items-center justify-center text-white font-bold text-sm`}>
                        {member.avatar}
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusBadge[member.status]}`}>
                        {member.status}
                      </span>
                    </div>

                    <h3 className="font-bold text-gray-900 text-sm group-hover:text-indigo-700 transition">{member.name}</h3>

                    <div className="mt-1 mb-3 flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${durationBadge[member.plan] || "bg-orange-100 text-orange-700"}`}>
                        {member.plan}
                      </span>
                      {member.expiryDate && member.expiryDate !== "Not set" && (
                        <span className="text-xs text-gray-400">· expires {member.expiryDate}</span>
                      )}
                    </div>

                    <div className="space-y-1.5 text-xs text-gray-500">
                      <div className="flex items-center gap-2">
                        <FiPhone size={11} className="text-gray-400 shrink-0" />
                        <span>{member.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiCalendar size={11} className="text-gray-400 shrink-0" />
                        <span>
                          {member.remainingDays > 0
                            ? `${member.remainingDays} days left`
                            : "Expired"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-400">Visits</p>
                        <p className="text-sm font-bold text-gray-800">{member.totalVisits}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Paid</p>
                        <p className="text-sm font-bold text-gray-800">₹{Number(member.totalPaid || 0).toLocaleString()}</p>
                      </div>
                      <FiChevronRight className="text-gray-300 group-hover:text-indigo-500 transition" size={16} />
                    </div>
                  </Link>

                  <button
                    onClick={() => setRewardMember(member)}
                    className="mt-3 flex items-center justify-center gap-1.5 w-full rounded-xl border border-indigo-200 bg-indigo-50 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                  >
                    <FiGift size={13} /> Reward Availed
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>

        <footer className="text-center text-xs text-gray-400 py-6">© 2026 FitNation Gym CRM. All rights reserved.</footer>
      </div>
    </div>
  );
}
