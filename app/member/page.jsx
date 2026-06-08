"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import {
  FiCalendar, FiCreditCard, FiMail, FiPhone, FiUser,
  FiCheckCircle, FiGift, FiClock, FiAlertCircle,
} from "react-icons/fi";

function Card({ children, className = "" }) {
  return <section className={`rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ${className}`}>{children}</section>;
}

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

  let nextDueText = null;
  let daysUntil = null;
  if (latestReward?.nextDueAt) {
    const next = new Date(latestReward.nextDueAt);
    const now = new Date();
    daysUntil = Math.max(0, Math.ceil((next - now) / 86400000));
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
            Stay regular for {intervalText} and earn <strong className="text-white">{discountText}</strong> on your next renewal!
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

export default function MemberProfile() {
  const [member, setMember] = useState(null);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return <div className="min-h-screen bg-gray-50 p-8 text-sm text-gray-500">Loading member profile...</div>;
  }

  if (!member) {
    return <div className="min-h-screen bg-gray-50 p-8 text-sm text-gray-500">No member record found for this login.</div>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:ml-60 flex-1">
        <header className="sticky top-0 z-10 border-b border-gray-100 bg-white px-4 py-4 shadow-sm sm:px-8">
          <h1 className="text-2xl font-bold text-gray-900">My Membership</h1>
          <p className="mt-0.5 text-sm text-gray-400">Live details from your gym profile</p>
        </header>

        <main className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-6 sm:px-8 lg:grid-cols-3">
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

          {/* Reward Card - shown for all members if offers exist */}
          <RewardCard member={member} offers={offers} />

          <Card>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-700">Contact</h3>
            <div className="space-y-3 text-sm">
              <p className="flex items-center gap-2 text-gray-600"><FiPhone className="text-gray-400" />{member.phone}</p>
              <p className="flex items-center gap-2 text-gray-600"><FiMail className="text-gray-400" />{member.email}</p>
              <p className="flex items-center gap-2 text-gray-600"><FiUser className="text-gray-400" />{member.address}</p>
            </div>
          </Card>

          <Card>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-700">Membership</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Join Date</span><strong>{member.joinDate}</strong></div>
              <div className="flex justify-between"><span className="text-gray-500">Expiry Date</span><strong>{member.expiryDate}</strong></div>
              <div className="flex justify-between"><span className="text-gray-500">Remaining</span><strong className="text-emerald-600">{member.remainingDays} days</strong></div>
            </div>
          </Card>

          <Card>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-700">Payments</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Total Paid</span><strong>₹{Number(member.totalPaid || 0).toLocaleString()}</strong></div>
              <div className="flex justify-between"><span className="text-gray-500">Pending</span><strong className="text-orange-600">₹{Number(member.outstanding || 0).toLocaleString()}</strong></div>
              <div className="flex justify-between"><span className="text-gray-500">Last Payment</span><strong>{member.financial?.lastPayment}</strong></div>
            </div>
          </Card>

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

          <Card>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-700">Attendance</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-gray-500"><FiCalendar />Last Visit</span><strong>{member.lastVisit}</strong></div>
              <div className="flex justify-between"><span className="text-gray-500">Total Visits</span><strong>{member.totalVisits}</strong></div>
              <div className="flex justify-between"><span className="text-gray-500">This Month</span><strong>{member.attendanceInsights?.thisMonth || 0}</strong></div>
            </div>
          </Card>

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
                      <td className="py-3 font-semibold text-gray-800"><FiCreditCard className="mr-1 inline text-gray-400" />₹{Number(payment.amount || 0).toLocaleString()}</td>
                      <td className="py-3"><span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">{payment.status}</span></td>
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
