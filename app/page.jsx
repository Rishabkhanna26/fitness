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

const attendanceTrend = [
  { day: "01 Jun", count: 55 }, { day: "02 Jun", count: 80 }, { day: "03 Jun", count: 68 },
  { day: "04 Jun", count: 140 }, { day: "05 Jun", count: 110 }, { day: "06 Jun", count: 95 }, { day: "07 Jun", count: 75 },
];

const todayAttendance = [
  { name: "Rahul Sharma", plan: "Premium" }, { name: "Aman Singh", plan: "Basic" },
  { name: "Priya", plan: "Standard" }, { name: "Vikram Das", plan: "Premium" }, { name: "Neha Verma", plan: "Basic" },
];

const inactiveMembers = [
  { name: "Rahul Sharma", lastVisit: "01 Jun 2026", daysAbsent: 6 },
  { name: "Neha Verma", lastVisit: "31 May 2026", daysAbsent: 7 },
  { name: "Sujit Roy", lastVisit: "28 May 2026", daysAbsent: 10 },
];

const expiryAlerts = [
  { name: "Rahul Sharma", plan: "Premium", expiry: "15 Jun 2026", days: 8 },
  { name: "Aman Singh", plan: "Basic", expiry: "12 Jun 2026", days: 5 },
  { name: "Priya", plan: "Standard", expiry: "20 Jun 2026", days: 13 },
  { name: "Vikram Das", plan: "Premium", expiry: "25 Jun 2026", days: 18 },
];

const planData = [
  { label: "Premium", count: 120, color: "#6366f1" },
  { label: "Standard", count: 75, color: "#22c55e" },
  { label: "Basic", count: 45, color: "#f59e0b" },
  { label: "Personal Training", count: 25, color: "#a78bfa" },
];

const revenueBreakdown = [
  { label: "New Membership Sales", pct: 40, color: "bg-blue-500" },
  { label: "Membership Renewals", pct: 35, color: "bg-green-500" },
  { label: "Pending Payments", pct: 25, color: "bg-yellow-400" },
];

const paymentStatus = [
  { name: "Aman Singh", amount: "₹1,500", due: "10 Jun 2026" },
  { name: "Neha Verma", amount: "₹2,000", due: "12 Jun 2026" },
  { name: "Sujit Roy", amount: "₹1,000", due: "15 Jun 2026" },
  { name: "Vikram Das", amount: "₹2,500", due: "18 Jun 2026" },
];

const newMembers = [
  { name: "Aman Singh", joined: "05 Jun 2026", plan: "Premium" },
  { name: "Priya", joined: "04 Jun 2026", plan: "Basic" },
  { name: "Rohit Verma", joined: "03 Jun 2026", plan: "Standard" },
  { name: "Karan Mehta", joined: "02 Jun 2026", plan: "Premium" },
  { name: "Sneha Kapoor", joined: "01 Jun 2026", plan: "Basic" },
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

function DonutChart({ data }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  let offset = 0;
  const R = 60, cx = 80, cy = 80, circ = 2 * Math.PI * R;
  const slices = data.map((d) => {
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
    const activeMembers = members.filter((member) => member.status === "Active");
    const monthlyRevenue = members.reduce((sum, member) => sum + Number(member.totalPaid || 0), 0);
    const pending = members.reduce((sum, member) => sum + Number(member.outstanding || 0), 0);
    const expiring = members.filter((member) => Number(member.remainingDays || 0) <= 30).length;

    return [
      { label: "Total Members", value: members.length, change: "+0%", up: true, sub: "live records", icon: FiUsers, color: "bg-blue-50 text-blue-500", ring: "ring-blue-100" },
      { label: "Today's Attendance", value: activeMembers.reduce((sum, member) => sum + Number(member.attendanceInsights?.thisMonth || 0), 0), change: "+0%", up: true, sub: "this month visits", icon: FiCheckCircle, color: "bg-green-50 text-green-500", ring: "ring-green-100" },
      { label: "Monthly Revenue", value: `Rs ${monthlyRevenue.toLocaleString()}`, change: "+0%", up: true, sub: "from payments", icon: FiDollarSign, color: "bg-yellow-50 text-yellow-500", ring: "ring-yellow-100" },
      { label: "Pending Payments", value: `Rs ${pending.toLocaleString()}`, change: "-0%", up: false, sub: "outstanding", icon: FiCreditCard, color: "bg-red-50 text-red-400", ring: "ring-red-100" },
      { label: "New Members", value: members.slice(0, 5).length, change: "+0%", up: true, sub: "recent records", icon: FiUserPlus, color: "bg-purple-50 text-purple-500", ring: "ring-purple-100" },
      { label: "Expiring Soon", value: expiring, change: "-0%", up: false, sub: "next 30 days", icon: FiCalendar, color: "bg-orange-50 text-orange-400", ring: "ring-orange-100" },
    ];
  }, [members]);

  const todayAttendance = members
    .filter((member) => member.attendanceHistory?.[0]?.status === "Present")
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
  const planData = ["Premium", "Standard", "Basic"].map((plan, index) => ({
    label: plan,
    count: members.filter((member) => member.plan === plan).length,
    color: ["#6366f1", "#22c55e", "#f59e0b"][index],
  }));
  const paymentStatus = members
    .filter((member) => Number(member.outstanding || 0) > 0)
    .slice(0, 4)
    .map((member) => ({ name: member.name, amount: `Rs ${Number(member.outstanding || 0).toLocaleString()}`, due: member.expiryDate }));
  const newMembers = members.slice(0, 5).map((member) => ({ name: member.name, joined: member.joinDate, plan: member.plan }));

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:ml-60 flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-100 px-4 sm:px-8 py-4 flex flex-col sm:flex-row gap-4 sm:items-center justify-between sticky top-0 z-10 shadow-sm">
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
                      { label: "Today's Collection", value: "₹6,850", color: "bg-green-100 text-green-600", icon: "💰" },
                      { label: "Weekly Collection", value: "₹28,450", color: "bg-blue-100 text-blue-600", icon: "📊" },
                      { label: "Monthly Collection", value: "₹45,680", color: "bg-yellow-100 text-yellow-600", icon: "🏆" },
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
                    <div><p className="text-xl font-bold text-indigo-700">23</p><p className="text-xs text-indigo-400 font-medium">Total New Members</p></div>
                  </div>
                  <div className="flex items-center gap-3 bg-green-50 rounded-2xl p-4">
                    <FiBarChart2 className="text-green-500" size={22} />
                    <div><p className="text-xl font-bold text-green-700">28%</p><p className="text-xs text-green-400 font-medium">Conversion Rate</p></div>
                  </div>
                  <div className="flex items-center gap-3 bg-yellow-50 rounded-2xl p-4">
                    <FiStar className="text-yellow-500" size={22} />
                    <div><p className="text-lg font-bold text-yellow-700">Premium</p><p className="text-xs text-yellow-400 font-medium">Most Selected Plan</p></div>
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
