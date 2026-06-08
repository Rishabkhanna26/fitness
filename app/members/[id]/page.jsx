"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { members as fallbackMembers } from "@/lib/data";
import {
  FiArrowLeft, FiEdit2, FiCalendar, FiMoreVertical,
  FiUser, FiPhone, FiMail, FiMapPin, FiAlertCircle,
  FiCheckCircle, FiXCircle, FiClock, FiDollarSign,
  FiCreditCard, FiBarChart2, FiStar, FiEdit,
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
  const { id } = params;
  const [member, setMember] = useState(fallbackMembers.find((m) => m.id === id));

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
      <div className="lg:ml-60 flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-100 px-8 py-4 sticky top-0 z-10 shadow-sm">
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
              <button className="flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                <FiEdit2 size={14} />
                Edit Member
              </button>
              <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 text-sm font-semibold transition shadow-sm shadow-indigo-200">
                <FiCalendar size={14} />
                Mark Attendance
              </button>
              <button className="w-9 h-9 border border-gray-200 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-50 transition">
                <FiMoreVertical size={15} />
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

        <footer className="text-center text-xs text-gray-400 py-6">© 2026 FitNation Gym CRM. All rights reserved.</footer>
      </div>
    </div>
  );
}
