"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import {
  FiUsers, FiCheckCircle, FiDollarSign, FiCreditCard,
  FiUserPlus, FiCalendar, FiTrendingUp, FiTrendingDown,
  FiChevronDown, FiStar, FiBarChart2,
} from "react-icons/fi";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";

const stats = [
  { label: "Total Members", value: "265", change: "+12%", up: true, sub: "from last month", icon: FiUsers, color: "bg-blue-50 text-blue-500", ring: "ring-blue-100" },
  { label: "Today's Attendance", value: "128", change: "+8%", up: true, sub: "from yesterday", icon: FiCheckCircle, color: "bg-green-50 text-green-500", ring: "ring-green-100" },
  { label: "Monthly Revenue", value: "₹45,680", change: "+15%", up: true, sub: "from last month", icon: FiDollarSign, color: "bg-yellow-50 text-yellow-500", ring: "ring-yellow-100" },
  { label: "Pending Payments", value: "12,450", change: "-5%", up: false, sub: "from last month", icon: FiCreditCard, color: "bg-red-50 text-red-400", ring: "ring-red-100" },
  { label: "New Members", value: "23", change: "+18%", up: true, sub: "from last month", icon: FiUserPlus, color: "bg-purple-50 text-purple-500", ring: "ring-purple-100" },
  { label: "Expiring Soon", value: "18", change: "-10%", up: false, sub: "from last month", icon: FiCalendar, color: "bg-orange-50 text-orange-400", ring: "ring-orange-100" },
];

const planBadge = {
  Premium: "bg-indigo-100 text-indigo-700",
  Standard: "bg-green-100 text-green-700",
  Basic: "bg-yellow-100 text-yellow-700",
};

function Badge({ plan }) {
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${planBadge[plan] || "bg-gray-100 text-gray-600"}`}>
      {plan}
    </span>
  );
}

function DaysChip({ days }) {
  const color = days <= 5 ? "text-red-500" : days <= 10 ? "text-orange-500" : "text-green-600";
  return <span className={`font-semibold text-sm ${color}`}>{days} Days</span>;
}

function toDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sameDay(a, b) {
  const dateA = toDate(a);
  const dateB = toDate(b);
  if (!dateA || !dateB) return false;
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function sameMonth(a, b) {
  const dateA = toDate(a);
  const dateB = toDate(b);
  if (!dateA || !dateB) return false;
  return dateA.getFullYear() === dateB.getFullYear() && dateA.getMonth() === dateB.getMonth();
}

function dateLabel(value) {
  const date = toDate(value);
  if (!date) return "Not set";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function DonutChart({ data }) {
  const safeData = data
    .map((d) => ({ ...d, count: Number(d.count) || 0 }))
    .filter((d) => d.count > 0);
  const total = safeData.reduce((s, d) => s + d.count, 0);
  const R = 60, cx = 80, cy = 80, circ = 2 * Math.PI * R;
  if (!total) {
    return (
      <svg viewBox="0 0 160 160" className="w-36 h-36">
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="#e5e7eb" strokeWidth={28} />
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill="#1e293b">0</text>
      </svg>
    );
  }

  let offset = 0;
  const slices = safeData.map((d) => {
    const pct = d.count / total;
    const dash = pct * circ;
    const slice = { ...d, dash, gap: circ - dash, offset };
    offset += dash;
    return slice;
  });
  return (
    <svg viewBox="0 0 160 160" className="w-36 h-36">
      {slices.map((s, i) => (
        <circle key={i} cx={cx} cy={cy} r={R} fill="none" stroke={s.color} strokeWidth={28}
          strokeDasharray={`${s.dash} ${s.gap}`}
          strokeDashoffset={-s.offset + circ / 4}
          style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }} />
      ))}
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill="#1e293b">{total}</text>
    </svg>
  );
}

function Card({ children, className = "" }) {
  return <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-5 ${className}`}>{children}</div>;
}

export default function DashboardPage() {
  const [members, setMembers] = useState([]);

  useEffect(() => {
    fetch("/api/members")
      .then((response) => response.json())
      .then((data) => setMembers(data.members || []))
      .catch(() => setMembers([]));
  }, []);

  const stats = useMemo(() => {
    const today = new Date();
    const monthlyRevenue = members.reduce((sum, member) => sum + Number(member.totalPaid || 0), 0);
    const pending = members.reduce((sum, member) => sum + Number(member.outstanding || 0), 0);
    const expiring = members.filter((member) => Number(member.remainingDays || 0) <= 30).length;
    const newMembersCount = members.filter((member) => sameMonth(member.joinDate, today)).length;
    const todaysAttendance = members.filter((member) =>
      (member.attendanceHistory || []).some((entry) => entry.status === "Present" && sameDay(entry.date, today))
    ).length;

    return [
      { label: "Total Members", value: members.length, change: "+0%", up: true, sub: "live records", icon: FiUsers, color: "bg-blue-50 text-blue-500", ring: "ring-blue-100" },
      { label: "Today's Attendance", value: todaysAttendance, change: "+0%", up: true, sub: "present today", icon: FiCheckCircle, color: "bg-green-50 text-green-500", ring: "ring-green-100" },
      { label: "Monthly Revenue", value: `Rs ${monthlyRevenue.toLocaleString()}`, change: "+0%", up: true, sub: "from payments", icon: FiDollarSign, color: "bg-yellow-50 text-yellow-500", ring: "ring-yellow-100" },
      { label: "Pending Payments", value: `Rs ${pending.toLocaleString()}`, change: "-0%", up: false, sub: "outstanding", icon: FiCreditCard, color: "bg-red-50 text-red-400", ring: "ring-red-100" },
      { label: "New Members", value: newMembersCount, change: "+0%", up: true, sub: "recent records", icon: FiUserPlus, color: "bg-purple-50 text-purple-500", ring: "ring-purple-100" },
      { label: "Expiring Soon", value: expiring, change: "-0%", up: false, sub: "next 30 days", icon: FiCalendar, color: "bg-orange-50 text-orange-400", ring: "ring-orange-100" },
    ];
  }, [members]);

  const today = new Date();
  const todayAttendance = members
    .filter((member) => (member.attendanceHistory || []).some((entry) => entry.status === "Present" && sameDay(entry.date, today)))
    .slice(0, 5)
    .map((member) => ({ name: member.name, plan: member.plan }));
  const inactiveMembers = members
    .filter((member) => Number(member.attendanceInsights?.daysSince || 0) >= 5)
    .slice(0, 3)
    .map((member) => ({ name: member.name, lastVisit: member.lastVisit, daysAbsent: member.attendanceInsights.daysSince }));
  const expiryAlerts = members
    .filter((member) => Number(member.remainingDays || 0) <= 30)
    .slice(0, 4)
    .map((member) => ({ name: member.name, plan: member.plan, expiry: member.expiryDate, days: member.remainingDays }));
  const planTotals = members.reduce((acc, member) => {
    const key = member.plan || "Unassigned";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const planData = Object.entries(planTotals)
    .map(([label, count], index) => ({
      label,
      count,
      color: ["#6366f1", "#22c55e", "#f59e0b", "#a78bfa", "#06b6d4", "#ef4444"][index % 6],
    }))
    .sort((a, b) => b.count - a.count);
  const paymentEntries = members.flatMap((member) =>
    (member.paymentHistory || []).map((payment) => ({
      member,
      payment,
      date: toDate(payment.date),
      amount: Number(payment.amount || 0),
      status: (payment.status || "").toLowerCase(),
    }))
  );
  const todayCollection = paymentEntries
    .filter((entry) => entry.status === "paid" && entry.date && sameDay(entry.date, today))
    .reduce((sum, entry) => sum + entry.amount, 0);
  const weeklyCollection = paymentEntries
    .filter((entry) => entry.status === "paid" && entry.date && (today - entry.date) <= 7 * 86400000 && (today - entry.date) >= 0)
    .reduce((sum, entry) => sum + entry.amount, 0);
  const monthlyCollection = paymentEntries
    .filter((entry) => entry.status === "paid" && entry.date && (today - entry.date) <= 30 * 86400000 && (today - entry.date) >= 0)
    .reduce((sum, entry) => sum + entry.amount, 0);
  const newSales = paymentEntries
    .filter((entry) => entry.status === "paid" && entry.date && sameMonth(entry.date, entry.member.joinDate))
    .reduce((sum, entry) => sum + entry.amount, 0);
  const renewals = paymentEntries
    .filter((entry) => entry.status === "paid" && entry.date && !sameMonth(entry.date, entry.member.joinDate))
    .reduce((sum, entry) => sum + entry.amount, 0);
  const pendingPayments = members.reduce((sum, member) => sum + Number(member.outstanding || 0), 0);
  const revenueBase = Math.max(newSales + renewals + pendingPayments, 1);
  const revenueBreakdown = [
    { label: "New Membership Sales", pct: Math.round((newSales / revenueBase) * 100), color: "bg-blue-500" },
    { label: "Membership Renewals", pct: Math.round((renewals / revenueBase) * 100), color: "bg-green-500" },
    { label: "Pending Payments", pct: Math.max(0, 100 - Math.round((newSales / revenueBase) * 100) - Math.round((renewals / revenueBase) * 100)), color: "bg-yellow-400" },
  ];
  const newMembers = members
    .filter((member) => sameMonth(member.joinDate, today))
    .sort((a, b) => {
      const dateA = toDate(a.joinDate)?.getTime() || 0;
      const dateB = toDate(b.joinDate)?.getTime() || 0;
      return dateB - dateA;
    })
    .slice(0, 5)
    .map((member) => ({ name: member.name, joined: member.joinDate, plan: member.plan }));
  const newMembersCount = newMembers.length;
  const conversionRate = members.length ? Math.round((newMembersCount / members.length) * 100) : 0;
  const mostSelectedPlan = planData[0]?.label || "N/A";
  const paymentStatus = members
    .filter((member) => Number(member.outstanding || 0) > 0)
    .slice(0, 4)
    .map((member) => ({ name: member.name, amount: `Rs ${Number(member.outstanding || 0).toLocaleString()}`, due: member.expiryDate }));
  const attendanceTrend = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (6 - index));
    const count = members.filter((member) =>
      (member.attendanceHistory || []).some((entry) => entry.status === "Present" && sameDay(entry.date, day))
    ).length;
    return {
      day: day.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      count,
    };
  });

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:ml-60 flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-100 pl-14 pr-4 sm:px-8 py-4 flex flex-col sm:flex-row gap-4 sm:items-center justify-between sticky top-0 z-10 shadow-sm lg:pl-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-400 mt-0.5">Overview of your gym</p>
          </div>
          <button className="flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
            <FiCalendar className="text-gray-400" />07 Jun 2026<FiChevronDown className="text-gray-400" />
          </button>
        </header>

        <main className="px-4 sm:px-8 py-6 space-y-6 max-w-screen-2xl mx-auto w-full">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {stats.map((s) => (
              <Card key={s.label} className="flex flex-col gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ring-4 ${s.color} ${s.ring}`}>
                  <s.icon size={18} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                </div>
                <div className="flex items-center gap-1">
                  {s.up ? <FiTrendingUp className="text-green-500" size={13} /> : <FiTrendingDown className="text-red-400" size={13} />}
                  <span className={`text-xs font-semibold ${s.up ? "text-green-600" : "text-red-500"}`}>{s.change}</span>
                  <span className="text-xs text-gray-400">{s.sub}</span>
                </div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h2 className="text-base font-bold text-gray-800 mb-4">Attendance Overview</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Today's Attendance</p>
                  <table className="w-full text-sm">
                    <thead><tr className="text-xs text-gray-400 border-b border-gray-100">
                      <th className="text-left pb-2 font-medium">Member</th>
                      <th className="text-left pb-2 font-medium">Plan</th>
                    </tr></thead>
                    <tbody>
                      {todayAttendance.map((m) => (
                        <tr key={m.name} className="border-b border-gray-50 last:border-0">
                          <td className="py-2 text-gray-700 font-medium text-xs">{m.name}</td>
                          <td className="py-2"><Badge plan={m.plan} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button className="text-xs text-blue-500 font-semibold mt-3 hover:underline">View all</button>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Attendance Trend (Last 7 Days)</p>
                  <ResponsiveContainer width="100%" height={130}>
                    <LineChart data={attendanceTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                      <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-4 mb-2">Inactive Members</p>
                  <table className="w-full text-xs">
                    <thead><tr className="text-gray-400 border-b border-gray-100">
                      <th className="text-left pb-1.5 font-medium">Member</th>
                      <th className="text-left pb-1.5 font-medium">Last Visit</th>
                      <th className="text-right pb-1.5 font-medium">Days Absent</th>
                    </tr></thead>
                    <tbody>
                      {inactiveMembers.map((m) => (
                        <tr key={m.name} className="border-b border-gray-50 last:border-0">
                          <td className="py-1.5 text-gray-700 font-medium">{m.name}</td>
                          <td className="py-1.5 text-gray-500">{m.lastVisit}</td>
                          <td className="py-1.5 text-right"><span className="text-red-500 font-semibold">{m.daysAbsent} Days</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="text-base font-bold text-gray-800 mb-4">Membership Summary</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Expiry Alerts</p>
                  <table className="w-full text-xs">
                    <thead><tr className="text-gray-400 border-b border-gray-100">
                      <th className="text-left pb-2 font-medium">Member</th>
                      <th className="text-left pb-2 font-medium">Plan</th>
                      <th className="text-left pb-2 font-medium">Expiry</th>
                      <th className="text-right pb-2 font-medium">Days</th>
                    </tr></thead>
                    <tbody>
                      {expiryAlerts.map((m) => (
                        <tr key={m.name} className="border-b border-gray-50 last:border-0">
                          <td className="py-2 text-gray-700 font-medium">{m.name}</td>
                          <td className="py-2"><Badge plan={m.plan} /></td>
                          <td className="py-2 text-gray-500">{m.expiry}</td>
                          <td className="py-2 text-right"><DaysChip days={m.days} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button className="text-xs text-blue-500 font-semibold mt-3 hover:underline">View all</button>
                </div>
                <div className="flex flex-col items-start gap-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Active Members by Plan</p>
                  <div className="w-full flex justify-center">
                    <DonutChart data={planData} />
                  </div>
                  <div className="space-y-1.5 w-full">
                    {planData.map((p) => (
                      <div key={p.label} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                          <span className="text-gray-600">{p.label}</span>
                        </div>
                        <span className="font-semibold text-gray-700">{p.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h2 className="text-base font-bold text-gray-800 mb-4">Payments & Revenue</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Revenue Summary</p>
                  <div className="space-y-3">
                    {[
                      { label: "Today's Collection", value: `₹${todayCollection.toLocaleString()}`, color: "bg-green-100 text-green-600", icon: "💰" },
                      { label: "Weekly Collection", value: `₹${weeklyCollection.toLocaleString()}`, color: "bg-blue-100 text-blue-600", icon: "📊" },
                      { label: "Monthly Collection", value: `₹${monthlyCollection.toLocaleString()}`, color: "bg-yellow-100 text-yellow-600", icon: "🏆" },
                    ].map((r) => (
                      <div key={r.label} className={`flex items-center gap-2 rounded-xl p-2.5 ${r.color}`}>
                        <span>{r.icon}</span>
                        <div><p className="text-xs font-medium opacity-70">{r.label}</p><p className="text-sm font-bold">{r.value}</p></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Payment Status</p>
                  <table className="w-full text-xs">
                    <thead><tr className="text-gray-400 border-b border-gray-100">
                      <th className="text-left pb-2 font-medium">Member</th>
                      <th className="text-left pb-2 font-medium">Amount</th>
                      <th className="text-left pb-2 font-medium">Due</th>
                    </tr></thead>
                    <tbody>
                      {paymentStatus.map((p) => (
                        <tr key={p.name} className="border-b border-gray-50 last:border-0">
                          <td className="py-2 text-gray-700 font-medium">{p.name}</td>
                          <td className="py-2 text-gray-600">{p.amount}</td>
                          <td className="py-2 text-gray-500">{p.due}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Revenue Breakdown</p>
                  <div className="space-y-4">
                    {revenueBreakdown.map((r) => (
                      <div key={r.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600">{r.label}</span>
                          <span className="font-semibold text-gray-700">{r.pct}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${r.color}`} style={{ width: `${r.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="text-base font-bold text-gray-800 mb-4">New Members <span className="text-gray-400 font-medium text-sm">(This Month)</span></h2>
              <div className="grid grid-cols-2 gap-4">
                  <table className="w-full text-xs">
                  <thead><tr className="text-gray-400 border-b border-gray-100">
                    <th className="text-left pb-2 font-medium">Member</th>
                    <th className="text-left pb-2 font-medium">Join Date</th>
                    <th className="text-left pb-2 font-medium">Plan</th>
                  </tr></thead>
                    <tbody>
                      {newMembers.map((m) => (
                        <tr key={m.name} className="border-b border-gray-50 last:border-0">
                          <td className="py-2 text-gray-700 font-medium">{m.name}</td>
                        <td className="py-2 text-gray-500">{m.joined}</td>
                        <td className="py-2"><Badge plan={m.plan} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex flex-col justify-center gap-5">
                  <div className="flex items-center gap-3 bg-indigo-50 rounded-2xl p-4">
                    <FiUsers className="text-indigo-500" size={22} />
                    <div><p className="text-xl font-bold text-indigo-700">{newMembersCount}</p><p className="text-xs text-indigo-400 font-medium">Total New Members</p></div>
                  </div>
                  <div className="flex items-center gap-3 bg-green-50 rounded-2xl p-4">
                    <FiBarChart2 className="text-green-500" size={22} />
                    <div><p className="text-xl font-bold text-green-700">{conversionRate}%</p><p className="text-xs text-green-400 font-medium">Conversion Rate</p></div>
                  </div>
                  <div className="flex items-center gap-3 bg-yellow-50 rounded-2xl p-4">
                    <FiStar className="text-yellow-500" size={22} />
                    <div><p className="text-lg font-bold text-yellow-700">{mostSelectedPlan}</p><p className="text-xs text-yellow-400 font-medium">Most Selected Plan</p></div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </main>

        <footer className="text-center text-xs text-gray-400 py-6">© 2026 FitNation Gym CRM. All rights reserved.</footer>
      </div>
    </div>
  );
}
