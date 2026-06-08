"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { members as fallbackMembers } from "@/lib/data";
import {
  FiArrowLeft, FiEdit2, FiCalendar, FiMoreVertical,
  FiUser, FiPhone, FiMail, FiMapPin, FiAlertCircle,
  FiCheckCircle, FiXCircle, FiClock, FiDollarSign,
  FiCreditCard, FiBarChart2, FiStar, FiEdit,
  FiTrash2, FiX, FiSave, FiPlusCircle,
} from "react-icons/fi";

const planBadge = {
  Premium: "bg-indigo-100 text-indigo-700 border border-indigo-200",
  Standard: "bg-green-100 text-green-700 border border-green-200",
  Basic: "bg-yellow-100 text-yellow-700 border border-yellow-200",
};

const tagColors = [
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-purple-100 text-purple-700",
  "bg-yellow-100 text-yellow-700",
  "bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-700",
];

function EditMemberModal({ member, onClose, onSaved }) {
  const [activeTab, setActiveTab] = useState("details"); // "details" | "payment"
  const [form, setForm] = useState({
    name: member.name || "",
    email: member.email || "",
    phone: member.phone || "",
    address: member.address === "Not added" ? "" : (member.address || ""),
    emergency_contact: member.emergency === "Not added" ? "" : (member.emergency || ""),
    status: member.status || "Active",
  });
  const [payment, setPayment] = useState({
    amount: "",
    outstanding: "",
    method: "Cash",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState("");

  async function handleDetailsSave(e) {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError("Name, email and phone are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update member.");
      onSaved(data.member);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePaymentSave(e) {
    e.preventDefault();
    setError(""); setPaymentSuccess("");
    if (!payment.amount || Number(payment.amount) <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }
    setLoading(true);
    try {
      const body = {
        payment_amount: Number(payment.amount),
        outstanding: payment.outstanding !== "" ? Number(payment.outstanding) : undefined,
        payment_method: payment.method,
        payment_notes: payment.notes,
      };
      const res = await fetch(`/api/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record payment.");
      onSaved(data.member);
      setPaymentSuccess(`Payment of ₹${Number(payment.amount).toLocaleString()} recorded successfully.`);
      setPayment({ amount: "", outstanding: "", method: "Cash", notes: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const tabs = [
    { id: "details", label: "Member Details" },
    { id: "payment", label: "Payment" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Edit Member</h2>
            <p className="text-xs text-gray-400 mt-0.5">{member.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <FiX size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pb-0 shrink-0">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => { setActiveTab(t.id); setError(""); setPaymentSuccess(""); }}
              className={`px-4 py-2 text-sm font-semibold rounded-t-xl border-b-2 transition-all ${
                activeTab === t.id
                  ? "border-indigo-600 text-indigo-600 bg-indigo-50"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="border-b border-gray-100 shrink-0" />

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">

          {/* ── Details Tab ── */}
          {activeTab === "details" && (
            <form id="details-form" onSubmit={handleDetailsSave} className="space-y-4">
              <label className="block">
                <span className="text-xs font-semibold text-gray-500 mb-1.5 block">Full Name</span>
                <div className="relative">
                  <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input type="text" value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300" />
                </div>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-gray-500 mb-1.5 block">Email Address</span>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input type="email" value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300" />
                </div>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-gray-500 mb-1.5 block">Phone Number</span>
                <div className="relative">
                  <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input type="tel" value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300" />
                </div>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-gray-500 mb-1.5 block">Address</span>
                <div className="relative">
                  <FiMapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input type="text" placeholder="Optional" value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300" />
                </div>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-gray-500 mb-1.5 block">Emergency Contact</span>
                <div className="relative">
                  <FiAlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input type="text" placeholder="Optional" value={form.emergency_contact}
                    onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300" />
                </div>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-gray-500 mb-1.5 block">Status</span>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>
            </form>
          )}

          {/* ── Payment Tab ── */}
          {activeTab === "payment" && (
            <form id="payment-form" onSubmit={handlePaymentSave} className="space-y-4">
              {/* Current balance summary */}
              <div className="grid grid-cols-2 gap-3 mb-2">
                <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3">
                  <p className="text-xs text-green-500 font-semibold mb-0.5">Total Paid</p>
                  <p className="text-lg font-black text-green-700">₹{Number(member.totalPaid || 0).toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-orange-50 border border-orange-100 px-4 py-3">
                  <p className="text-xs text-orange-500 font-semibold mb-0.5">Outstanding</p>
                  <p className="text-lg font-black text-orange-700">₹{Number(member.outstanding || 0).toLocaleString()}</p>
                </div>
              </div>

              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Record New Payment</p>

              <label className="block">
                <span className="text-xs font-semibold text-gray-500 mb-1.5 block">Amount Paid (₹) <span className="text-red-400">*</span></span>
                <div className="relative">
                  <FiDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input type="number" min="1" placeholder="e.g. 1500"
                    value={payment.amount}
                    onChange={(e) => setPayment({ ...payment, amount: e.target.value })}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300" />
                </div>
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-gray-500 mb-1.5 block">Update Outstanding Balance (₹)</span>
                <div className="relative">
                  <FiCreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input type="number" min="0" placeholder={`Current: ₹${Number(member.outstanding || 0).toLocaleString()}`}
                    value={payment.outstanding}
                    onChange={(e) => setPayment({ ...payment, outstanding: e.target.value })}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300" />
                </div>
                <p className="text-xs text-gray-400 mt-1">Leave blank to keep current outstanding amount.</p>
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-gray-500 mb-1.5 block">Payment Method</span>
                <select value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300">
                  <option>Cash</option>
                  <option>UPI</option>
                  <option>Card</option>
                  <option>Bank Transfer</option>
                  <option>Other</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-gray-500 mb-1.5 block">Notes (optional)</span>
                <textarea rows={2} placeholder="e.g. Renewal payment for June"
                  value={payment.notes}
                  onChange={(e) => setPayment({ ...payment, notes: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 resize-none" />
              </label>

              {paymentSuccess && (
                <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-100 px-4 py-3">
                  <FiCheckCircle size={15} className="text-green-600 shrink-0" />
                  <p className="text-sm font-semibold text-green-700">{paymentSuccess}</p>
                </div>
              )}
            </form>
          )}

          {error && <p className="text-xs font-semibold text-red-500 bg-red-50 rounded-lg px-3 py-2 mt-3">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
            Cancel
          </button>
          <button
            type="submit"
            form={activeTab === "details" ? "details-form" : "payment-form"}
            disabled={loading}
            className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <FiSave size={14} />
            {loading ? "Saving..." : activeTab === "details" ? "Save Changes" : "Record Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ member, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/members/${member.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete member.");
      onDeleted();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Delete Member</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <FiX size={20} />
          </button>
        </div>
        <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl mb-5">
          <FiTrash2 className="text-red-500 shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-sm font-semibold text-gray-900">Are you sure?</p>
            <p className="text-xs text-gray-500 mt-1">
              This will permanently delete <span className="font-bold text-gray-800">{member.name}</span> and all their data. This action cannot be undone.
            </p>
          </div>
        </div>
        {error && <p className="text-xs font-semibold text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-600 transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <FiTrash2 size={14} />
            {loading ? "Deleting..." : "Delete Member"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ number, title }) {
  return (
    <h2 className="text-lg font-bold text-gray-900 mb-4">
      <span className="text-gray-400 font-semibold">{number}. </span>{title}
    </h2>
  );
}

function InfoCard({ children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 ${className}`}>
      {children}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={13} className="text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-gray-800 break-words">{value}</p>
      </div>
    </div>
  );
}

export default function MemberDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [member, setMember] = useState(fallbackMembers.find((m) => m.id === id));
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    fetch(`/api/members/${id}`)
      .then((response) => response.json())
      .then((data) => setMember(data.member || fallbackMembers.find((m) => m.id === id)))
      .catch(() => setMember(fallbackMembers.find((m) => m.id === id)));
  }, [id]);

  if (!member) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="lg:ml-60 flex-1 p-8 text-sm text-gray-500">Member not found.</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      {showEditModal && (
        <EditMemberModal
          member={member}
          onClose={() => setShowEditModal(false)}
          onSaved={(updated) => setMember(updated)}
        />
      )}
      {showDeleteModal && (
        <DeleteConfirmModal
          member={member}
          onClose={() => setShowDeleteModal(false)}
          onDeleted={() => router.push("/members")}
        />
      )}
      <div className="lg:ml-60 flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-100 pl-14 pr-4 sm:px-8 py-4 sticky top-0 z-10 shadow-sm lg:pl-8">
          <Link
            href="/members"
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition mb-3 w-fit"
          >
            <FiArrowLeft size={14} />
            Back to Members
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{member.name}</h1>
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  member.status === "Active"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-500"
                }`}
              >
                {member.status} Member
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                <FiEdit2 size={14} />
                Edit Member
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2 border border-red-200 rounded-xl px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 transition"
              >
                <FiTrash2 size={14} />
                Delete
              </button>
            </div>
          </div>
        </header>

        <main className="px-4 sm:px-8 py-6 space-y-8 max-w-screen-xl mx-auto w-full">
          <section>
            <SectionTitle number="1" title="Member Overview" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <InfoCard>
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">Personal Information</p>
                <InfoRow icon={FiUser} label="Full Name" value={member.name} />
                <InfoRow icon={FiPhone} label="Phone Number" value={member.phone} />
                <InfoRow icon={FiMail} label="Email" value={member.email} />
                <InfoRow icon={FiMapPin} label="Address" value={member.address} />
                <InfoRow icon={FiAlertCircle} label="Emergency Contact" value={member.emergency} />
              </InfoCard>

              <InfoCard>
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">Membership Summary</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-gray-50">
                    <span className="text-sm text-gray-500">Current Plan</span>
                    <span className={`text-xs font-bold px-3 py-1 rounded-lg ${planBadge[member.plan]}`}>
                      {member.plan} Plan
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-50">
                    <span className="text-sm text-gray-500">Status</span>
                    <span className={`text-xs font-bold px-3 py-1 rounded-lg ${
                      member.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-500"
                    }`}>
                      {member.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-50">
                    <span className="text-sm text-gray-500">Join Date</span>
                    <span className="text-sm font-semibold text-gray-800">{member.joinDate}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-50">
                    <span className="text-sm text-gray-500">Expiry Date</span>
                    <span className="text-sm font-semibold text-gray-800">{member.expiryDate}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-500">Remaining Days</span>
                    <span className={`text-sm font-bold ${member.remainingDays > 30 ? "text-green-600" : member.remainingDays > 7 ? "text-orange-500" : "text-red-500"}`}>
                      {member.remainingDays} Days
                    </span>
                  </div>
                </div>
              </InfoCard>

              <InfoCard>
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">Quick Stats</p>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FiUser size={14} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-blue-400 font-medium">Total Visits</p>
                      <p className="text-lg font-bold text-blue-700">{member.totalVisits}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <FiCalendar size={14} className="text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-xs text-indigo-400 font-medium">Last Visit Date</p>
                      <p className="text-sm font-bold text-indigo-700">{member.lastVisit}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <FiDollarSign size={14} className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-green-400 font-medium">Total Payments Made</p>
                      <p className="text-sm font-bold text-green-700">₹ {member.totalPaid.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <FiCreditCard size={14} className="text-orange-500" />
                    </div>
                    <div>
                      <p className="text-xs text-orange-400 font-medium">Outstanding Balance</p>
                      <p className="text-sm font-bold text-orange-700">₹ {member.outstanding}</p>
                    </div>
                  </div>
                </div>
              </InfoCard>
            </div>
          </section>

          <section>
            <SectionTitle number="2" title="Membership & Services" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <InfoCard>
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-4">Current Plan</p>
                <div className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <FiStar size={16} className="text-indigo-600" />
                    </div>
                    <p className="font-bold text-gray-900">{member.plan} Plan</p>
                  </div>
                  <div className="space-y-2">
                    {member.planFeatures.map((f) => (
                      <div key={f} className="flex items-center gap-2">
                        <FiCheckCircle size={14} className="text-emerald-500 shrink-0" />
                        <span className="text-sm text-gray-700">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </InfoCard>

              <InfoCard>
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-4">Membership Timeline</p>
                <div className="relative pl-5">
                  {member.membershipTimeline.map((t, i) => (
                    <div key={i} className="relative mb-6 last:mb-0">
                      {i < member.membershipTimeline.length - 1 && (
                        <div className="absolute left-[-14px] top-5 w-0.5 h-full bg-gray-200" />
                      )}
                      <div className={`absolute left-[-18px] top-1 w-3 h-3 rounded-full border-2 ${
                        t.type === "expiry"
                          ? "bg-blue-500 border-blue-500"
                          : "bg-gray-300 border-gray-300"
                      }`} />
                      <p className="text-xs text-gray-400 font-medium">{t.label}</p>
                      <p className="text-sm font-bold text-gray-800 mt-0.5">{t.date}</p>
                    </div>
                  ))}
                </div>
              </InfoCard>

              <InfoCard>
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-4">Membership History</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left pb-2 text-xs text-gray-500 font-semibold">Plan</th>
                      <th className="text-left pb-2 text-xs text-gray-500 font-semibold">Start Date</th>
                      <th className="text-left pb-2 text-xs text-gray-500 font-semibold">End Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {member.membershipHistory.map((h, i) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0">
                        <td className="py-2.5 text-gray-700 font-medium text-xs">{h.plan}</td>
                        <td className="py-2.5 text-gray-500 text-xs">{h.start}</td>
                        <td className="py-2.5 text-xs">
                          {h.end === "Current" ? (
                            <span className="text-emerald-600 font-bold">Current</span>
                          ) : (
                            <span className="text-gray-500">{h.end}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </InfoCard>
            </div>
          </section>

          <section>
            <SectionTitle number="3" title="Attendance & Payment History" />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              <InfoCard>
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-4">Attendance History</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left pb-2 text-xs text-gray-500 font-semibold">Date</th>
                      <th className="text-left pb-2 text-xs text-gray-500 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {member.attendanceHistory.map((a, i) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 text-gray-600 text-xs">{a.date}</td>
                        <td className="py-2">
                          <div className="flex items-center gap-1.5">
                            {a.status === "Present" ? (
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-red-400" />
                            )}
                            <span className={`text-xs font-medium ${a.status === "Present" ? "text-emerald-600" : "text-red-400"}`}>
                              {a.status}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </InfoCard>

              <InfoCard>
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-4">Attendance Insights</p>
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                      <FiBarChart2 size={16} className="text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Total Visits This Month</p>
                      <p className="text-lg font-bold text-gray-900">{member.attendanceInsights.thisMonth}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                      <FiCalendar size={16} className="text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Last Visit Date</p>
                      <p className="text-sm font-bold text-gray-900">{member.attendanceInsights.lastVisit}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                      <FiClock size={16} className="text-orange-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Days Since Last Visit</p>
                      <p className={`text-sm font-bold ${member.attendanceInsights.daysSince === 0 ? "text-green-600" : "text-orange-500"}`}>
                        {member.attendanceInsights.daysSince} Days
                      </p>
                    </div>
                  </div>
                </div>
              </InfoCard>

              <InfoCard>
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-4">Payment History</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left pb-2 text-xs text-gray-500 font-semibold">Date</th>
                      <th className="text-left pb-2 text-xs text-gray-500 font-semibold">Amount</th>
                      <th className="text-left pb-2 text-xs text-gray-500 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {member.paymentHistory.map((p, i) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 text-gray-600 text-xs">{p.date}</td>
                        <td className="py-2 text-gray-800 text-xs font-medium">₹ {p.amount.toLocaleString()}</td>
                        <td className="py-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            p.status === "Paid"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-orange-100 text-orange-600"
                          }`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </InfoCard>

              <InfoCard>
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-4">Financial Summary</p>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                    <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
                      <FiDollarSign size={14} className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-green-400">Total Amount Paid</p>
                      <p className="text-base font-bold text-green-700">₹ {member.financial.totalPaid.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
                    <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center">
                      <FiCreditCard size={14} className="text-orange-500" />
                    </div>
                    <div>
                      <p className="text-xs text-orange-400">Pending Amount</p>
                      <p className="text-base font-bold text-orange-700">₹ {member.financial.pending}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                    <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FiCalendar size={14} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-blue-400">Last Payment Date</p>
                      <p className="text-sm font-bold text-blue-700">{member.financial.lastPayment}</p>
                    </div>
                  </div>
                </div>
              </InfoCard>
            </div>
          </section>

        </main>

      </div>
    </div>
  );
}
