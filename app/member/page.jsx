"use client";

import { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import {
  FiAlertCircle, FiAlertTriangle, FiCalendar, FiCheckCircle,
  FiClock, FiCreditCard, FiEdit2, FiGift, FiLogOut, FiMail,
  FiMapPin, FiPhone, FiSave, FiUser, FiX,
} from "react-icons/fi";

function Card({ children, className = "" }) {
  return (
    <section className={`rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </section>
  );
}

// ── Expiry Banner ──────────────────────────────────────────────────────────────
function ExpiryBanner({ remainingDays }) {
  if (remainingDays > 5) return null;
  const expired = remainingDays <= 0;
  return (
    <div className={`lg:col-span-3 flex items-start gap-3 rounded-2xl px-5 py-4 ${
      expired ? "bg-red-50 border border-red-200" : "bg-amber-50 border border-amber-200"
    }`}>
      <FiAlertTriangle size={20} className={expired ? "text-red-500 mt-0.5 shrink-0" : "text-amber-500 mt-0.5 shrink-0"} />
      <div>
        <p className={`text-sm font-bold ${expired ? "text-red-700" : "text-amber-700"}`}>
          {expired ? "Your membership has expired" : `Your membership expires in ${remainingDays} day${remainingDays === 1 ? "" : "s"}`}
        </p>
        <p className={`text-xs mt-0.5 ${expired ? "text-red-500" : "text-amber-600"}`}>
          {expired
            ? "Please contact the gym to renew your membership and continue accessing the facilities."
            : "Please renew soon to avoid interruption to your gym access."}
        </p>
      </div>
    </div>
  );
}

// ── Reward Card ────────────────────────────────────────────────────────────────
function RewardCard({ member, offers }) {
  if (!offers || offers.length === 0) return null;
  const activeOffers = offers.filter((o) => o.active);
  if (activeOffers.length === 0) return null;

  const latestReward = member.latestReward;
  const offer = latestReward ? activeOffers.find((o) => o.id === latestReward.offerId) : activeOffers[0];
  if (!offer) return null;

  const discountText =
    offer.offer_type === "percentage"
      ? `${offer.amount}% off your renewal`
      : `₹${offer.amount} off your renewal`;
  const intervalText = `${offer.interval_value} ${offer.interval_unit}`;

  let daysUntil = null;
  let nextDueText = null;
  if (latestReward?.nextDueAt) {
    const next = new Date(latestReward.nextDueAt);
    daysUntil = Math.max(0, Math.ceil((next - new Date()) / 86400000));
    nextDueText = next.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  const earned = latestReward !== null;

  return (
    <Card className="lg:col-span-3 bg-gradient-to-r from-indigo-600 to-purple-600 border-0 text-white">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20">
          <FiGift size={28} className="text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-bold mb-0.5">{offer.title}</h3>
          <p className="text-sm text-indigo-100">
            Stay regular for {intervalText} and earn{" "}
            <strong className="text-white">{discountText}</strong> on your next renewal!
          </p>
        </div>
        {earned ? (
          <div className="shrink-0 text-right">
            <div className="flex items-center gap-2 bg-white/20 rounded-xl px-4 py-2">
              <FiCheckCircle size={16} className="text-green-300" />
              <span className="text-sm font-bold text-white">Reward Earned!</span>
            </div>
            {nextDueText && (
              <p className="text-xs text-indigo-200 mt-1 flex items-center gap-1 justify-end">
                <FiClock size={11} />
                {daysUntil > 0 ? `Next renewal in ${daysUntil} days` : "Reward period active"}
              </p>
            )}
          </div>
        ) : (
          <div className="shrink-0 text-right">
            <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-4 py-2">
              <FiAlertCircle size={16} className="text-yellow-300" />
              <span className="text-sm font-semibold text-white">Keep coming!</span>
            </div>
            <p className="text-xs text-indigo-200 mt-1">
              {intervalText} of regular visits = reward
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Attendance Code Input ──────────────────────────────────────────────────────
function pad(n) {
  return String(n).padStart(2, "0");
}

function AttendanceSection({ memberId, onMarked }) {
  const [hasQr, setHasQr] = useState(null); // null=loading, false=no QR, true=has QR
  const [markedToday, setMarkedToday] = useState(false);
  const [activeCode, setActiveCode] = useState(null);   // { code, expiresAt }
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [codeExpired, setCodeExpired] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const timerRef = useRef(null);

  // Check QR flag + today's attendance + active code
  useEffect(() => {
    async function init() {
      // 1. QR scan check
      const qrRes = await fetch("/api/attendance/check-qr").then((r) => r.json()).catch(() => ({ allowed: false }));
      if (!qrRes.allowed) {
        setHasQr(false);
        return;
      }
      setHasQr(true);

      // 2. Today's attendance
      const todayRes = await fetch("/api/attendance/today").then((r) => r.json()).catch(() => ({ marked: false }));
      if (todayRes.marked) {
        setMarkedToday(true);
        return;
      }

      // 3. Active code for this member
      const codeRes = await fetch("/api/attendance/active-code").then((r) => r.json()).catch(() => ({}));
      if (codeRes.code) {
        setActiveCode({ code: codeRes.code, expiresAt: codeRes.expiresAt });
      }
    }
    init();
  }, []);

  // Countdown for active code
  useEffect(() => {
    if (!activeCode?.expiresAt) return;
    clearInterval(timerRef.current);

    function tick() {
      const diff = Math.max(0, Math.floor((new Date(activeCode.expiresAt) - Date.now()) / 1000));
      setSecondsLeft(diff);
      if (diff === 0) {
        setCodeExpired(true);
        clearInterval(timerRef.current);
      }
    }
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [activeCode]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!input.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/attendance/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: input.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to mark attendance.");
        return;
      }
      setSuccess(true);
      setMarkedToday(true);
      clearInterval(timerRef.current);
      onMarked?.(data.totalVisits);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Not from QR scan — hide section entirely
  if (hasQr === false) return null;

  // Loading
  if (hasQr === null) return null;

  // Already marked today
  if (markedToday || success) {
    return (
      <Card className="lg:col-span-3 border-emerald-200 bg-emerald-50">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
            <FiCheckCircle size={20} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-700">Attendance marked for today ✓</p>
            <p className="text-xs text-emerald-600 mt-0.5">Great job showing up! See you tomorrow.</p>
          </div>
        </div>
      </Card>
    );
  }

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  return (
    <Card className="lg:col-span-3">
      <div className="flex flex-col sm:flex-row sm:items-start gap-5">
        <div className="flex-1">
          <h3 className="text-sm font-bold text-gray-900 mb-0.5">Today's Attendance</h3>
          <p className="text-xs text-gray-400 mb-4">
            Enter the code from the gym check-in screen to mark your attendance.
          </p>

          {/* Show the active code with timer if one exists */}
          {activeCode && !codeExpired && (
            <div className="mb-4 flex items-center gap-3 rounded-xl bg-indigo-50 px-4 py-3 border border-indigo-100">
              <div>
                <p className="text-xs text-indigo-500 font-semibold mb-0.5">Your code</p>
                <p className="text-2xl font-black tracking-widest text-indigo-700">{activeCode.code}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-gray-400">Expires in</p>
                <p className={`text-lg font-black ${secondsLeft <= 30 ? "text-red-500" : "text-indigo-600"}`}>
                  {pad(mins)}:{pad(secs)}
                </p>
              </div>
            </div>
          )}

          {activeCode && codeExpired && (
            <div className="mb-4 rounded-xl bg-gray-50 px-4 py-3 border border-gray-100">
              <p className="text-xs text-red-500 font-semibold">Code expired — generate a new one at the gym check-in screen.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              maxLength={4}
              placeholder="Enter code (e.g. A7K9)"
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold tracking-widest uppercase outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            />
            <button
              disabled={submitting || !input.trim()}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60 whitespace-nowrap"
            >
              {submitting ? "Marking..." : "Mark Attendance"}
            </button>
          </form>

          {error && (
            <p className="mt-2 text-sm font-medium text-red-600 flex items-center gap-1.5">
              <FiAlertCircle size={14} /> {error}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

// ── Reward Popup ──────────────────────────────────────────────────────────────
function RewardPopup({ visits, offers, onClose }) {
  const matched = (offers || []).filter(
    (o) => o.active && o.interval_unit === "visits" && Number(o.interval_value) === visits
  );
  if (!matched.length) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 p-8 text-center text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-xl font-black mb-2">Congratulations!</h2>
        <p className="text-indigo-100 text-sm mb-4">You've completed <strong className="text-white">{visits} visits</strong>!</p>
        {matched.map((offer) => (
          <div key={offer.id} className="rounded-xl bg-white/20 px-4 py-3 mb-3">
            <p className="font-bold text-sm">{offer.title} Unlocked!</p>
            <p className="text-xs text-indigo-200 mt-0.5">
              {offer.offer_type === "percentage"
                ? `${offer.amount}% Membership Renewal Discount`
                : `₹${offer.amount} Membership Renewal Discount`}
            </p>
          </div>
        ))}
        <button
          onClick={onClose}
          className="mt-2 flex items-center gap-2 mx-auto rounded-xl bg-white/20 hover:bg-white/30 px-5 py-2.5 text-sm font-bold"
        >
          <FiX size={14} /> Close
        </button>
      </div>
    </div>
  );
}

// ── Edit Profile Modal ────────────────────────────────────────────────────────
function EditProfileModal({ member, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: member.name || "",
    email: member.email || "",
    phone: member.phone || "",
    address: member.address === "Not added" ? "" : (member.address || ""),
    emergency_contact: member.emergency === "Not added" ? "" : (member.emergency || ""),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
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
      if (!res.ok) throw new Error(data.error || "Failed to update profile.");
      onSaved(data.member);
      onClose();
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
            <h2 className="text-lg font-bold text-gray-900">Edit Profile</h2>
            <p className="text-xs text-gray-400 mt-0.5">Update your contact details</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-xs font-semibold text-gray-500 mb-1.5 block">Full Name</span>
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
              />
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-gray-500 mb-1.5 block">Email Address</span>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="email"
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
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
              />
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-gray-500 mb-1.5 block">Address</span>
            <div className="relative">
              <FiMapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Optional"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
              />
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-gray-500 mb-1.5 block">Emergency Contact</span>
            <div className="relative">
              <FiAlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Optional"
                value={form.emergency_contact}
                onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
              />
            </div>
          </label>

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
              className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <FiSave size={14} />
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MemberProfile() {
  const [member, setMember] = useState(null);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rewardVisits, setRewardVisits] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/me").then((r) => r.json()),
      fetch("/api/loyalty-offers").then((r) => r.json()),
    ])
      .then(([meData, offersData]) => {
        setMember(meData.member || null);
        setOffers(offersData.offers || []);
      })
      .finally(() => setLoading(false));
  }, []);

  function handleAttendanceMarked(totalVisits) {
    // Refresh member data to update visit count / last visit
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => setMember(data.member || member));

    // Check if a reward milestone was hit
    const hit = (offers || []).some(
      (o) => o.active && o.interval_unit === "visits" && Number(o.interval_value) === totalVisits
    );
    if (hit) setRewardVisits(totalVisits);
  }

  async function logout() {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    const data = await response.json();
    window.location.href = data.redirectTo || "/login";
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 text-sm text-gray-500">
        Loading member profile...
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 text-sm text-gray-500">
        No member record found for this login.
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      {rewardVisits && (
        <RewardPopup
          visits={rewardVisits}
          offers={offers}
          onClose={() => setRewardVisits(null)}
        />
      )}

      {showEditModal && (
        <EditProfileModal
          member={member}
          onClose={() => setShowEditModal(false)}
          onSaved={(updated) => setMember(updated)}
        />
      )}

      <div className="lg:ml-60 flex-1">
        <header className="sticky top-0 z-10 border-b border-gray-100 bg-white pl-14 pr-4 py-4 shadow-sm sm:px-8 lg:pl-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Membership</h1>
              <p className="mt-0.5 text-sm text-gray-400">Live details from your gym profile</p>
            </div>
            {/* Sign out & Edit — visible on mobile only */}
            <div className="flex items-center gap-2 lg:hidden">
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
              >
                <FiEdit2 size={15} />
                Edit
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-red-600 transition-colors"
              >
                <FiLogOut size={15} />
                Sign out
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-6 sm:px-8 lg:grid-cols-3">

          {/* Profile header */}
          <Card className="lg:col-span-3">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-lg font-bold text-white">
                  {member.avatar}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{member.name}</h2>
                  <p className="text-sm text-gray-500">{member.plan} Plan</p>
                </div>
              </div>
              <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
                member.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
              }`}>
                {member.status}
              </span>
            </div>
          </Card>

          {/* Expiry warning */}
          <ExpiryBanner remainingDays={member.remainingDays} />

          {/* Attendance section — only visible after QR scan */}
          <AttendanceSection memberId={member.id} onMarked={handleAttendanceMarked} />

          {/* Reward card */}
          <RewardCard member={member} offers={offers} />

          {/* Contact */}
          <Card>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-700">Contact</h3>
            <div className="space-y-3 text-sm">
              <p className="flex items-center gap-2 text-gray-600"><FiPhone className="text-gray-400" />{member.phone}</p>
              <p className="flex items-center gap-2 text-gray-600"><FiMail className="text-gray-400" />{member.email}</p>
              <p className="flex items-center gap-2 text-gray-600"><FiUser className="text-gray-400" />{member.address}</p>
            </div>
          </Card>

          {/* Membership */}
          <Card>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-700">Membership</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Join Date</span><strong>{member.joinDate}</strong></div>
              <div className="flex justify-between"><span className="text-gray-500">Expiry Date</span><strong>{member.expiryDate}</strong></div>
              <div className="flex justify-between">
                <span className="text-gray-500">Remaining</span>
                <strong className={member.remainingDays <= 5 ? "text-red-500" : "text-emerald-600"}>
                  {member.remainingDays} days
                </strong>
              </div>
            </div>
          </Card>

          {/* Payments */}
          <Card>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-700">Payments</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Total Paid</span><strong>₹{Number(member.totalPaid || 0).toLocaleString()}</strong></div>
              <div className="flex justify-between"><span className="text-gray-500">Pending</span><strong className="text-orange-600">₹{Number(member.outstanding || 0).toLocaleString()}</strong></div>
              <div className="flex justify-between"><span className="text-gray-500">Last Payment</span><strong>{member.financial?.lastPayment}</strong></div>
            </div>
          </Card>

          {/* Plan features */}
          <Card className="lg:col-span-2">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-700">Plan Features</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {member.planFeatures.map((feature) => (
                <div key={feature} className="flex items-center gap-2 rounded-xl bg-indigo-50 p-3 text-sm font-semibold text-indigo-700">
                  <FiCheckCircle /> {feature}
                </div>
              ))}
            </div>
          </Card>

          {/* Attendance stats */}
          <Card>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-700">Attendance</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-gray-500"><FiCalendar />Last Visit</span>
                <strong>{member.lastVisit}</strong>
              </div>
              <div className="flex justify-between"><span className="text-gray-500">Total Visits</span><strong>{member.totalVisits}</strong></div>
              <div className="flex justify-between"><span className="text-gray-500">This Month</span><strong>{member.attendanceInsights?.thisMonth || 0}</strong></div>
            </div>
          </Card>

          {/* Recent payments */}
          <Card className="lg:col-span-3">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-700">Recent Payments</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-gray-400">
                  <tr><th className="pb-2">Date</th><th className="pb-2">Amount</th><th className="pb-2">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(member.paymentHistory || []).slice(0, 6).map((payment, index) => (
                    <tr key={index}>
                      <td className="py-3 text-gray-600">{payment.date}</td>
                      <td className="py-3 font-semibold text-gray-800">
                        <FiCreditCard className="mr-1 inline text-gray-400" />
                        ₹{Number(payment.amount || 0).toLocaleString()}
                      </td>
                      <td className="py-3">
                        <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

        </main>
      </div>
    </div>
  );
}
