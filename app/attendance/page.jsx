"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { getClientSession } from "@/lib/session";
import {
  FiActivity,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiMail,
  FiPhone,
  FiSearch,
  FiTrendingUp,
  FiUsers,
  FiX,
  FiXCircle,
} from "react-icons/fi";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const FILTERS = ["All", "Active", "Inactive", "Present", "Absent", "Not Marked"];

const planBadge = {
  Premium: "bg-indigo-100 text-indigo-700",
  Standard: "bg-green-100 text-green-700",
  Basic: "bg-yellow-100 text-yellow-700",
  "1 Month": "bg-blue-100 text-blue-700",
  "3 Months": "bg-indigo-100 text-indigo-700",
  "6 Months": "bg-purple-100 text-purple-700",
  Custom: "bg-orange-100 text-orange-700",
};

function Card({ children, className = "" }) {
  return <div className={`rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}

function Badge({ value }) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${planBadge[value] || "bg-gray-100 text-gray-600"}`}>
      {value}
    </span>
  );
}

function initials(name = "") {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "MB"
  );
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sameDay(a, b) {
  const dateA = parseDate(a);
  const dateB = parseDate(b);
  if (!dateA || !dateB) return false;
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function formatShortDate(value) {
  const date = parseDate(value);
  if (!date) return "Not set";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(value) {
  const date = parseDate(value);
  if (!date) return "—";
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function getAttendanceRate(member, today) {
  const joined = parseDate(member.joinDate) || parseDate(member.rawJoinDate) || today;
  const daysActive = Math.max(1, Math.ceil((today.getTime() - joined.getTime()) / 86400000) + 1);
  const presentCount = (member.attendanceHistory || []).filter((entry) => entry.status === "Present").length;
  return Math.min(100, Math.round((presentCount / daysActive) * 100));
}

function getTodayStatus(member, today) {
  const entry = (member.attendanceHistory || []).find((item) => sameDay(item.rawDate || item.date, today));
  return entry?.status || "Not Marked";
}

function AttendanceModal({ member, onClose }) {
  if (!member) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-base font-bold text-white">
              {initials(member.name)}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{member.name}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge value={member.plan} />
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    member.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
                  }`}
                >
                  {member.status}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    member.todayStatus === "Present"
                      ? "bg-emerald-100 text-emerald-700"
                      : member.todayStatus === "Absent"
                        ? "bg-red-100 text-red-600"
                        : "bg-gray-100 text-gray-500"
                  }`}
                >
                  Today: {member.todayStatus}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <FiX size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 border-b border-gray-100 px-6 py-5 sm:grid-cols-4">
          {[
            { label: "Total Visits", value: member.totalVisits, icon: FiActivity, bg: "bg-indigo-50", color: "text-indigo-600" },
            { label: "Attendance Rate", value: `${member.attendanceRate}%`, icon: FiTrendingUp, bg: "bg-green-50", color: "text-green-600" },
            { label: "Last Visit", value: member.lastVisit || "Not set", icon: FiClock, bg: "bg-blue-50", color: "text-blue-600" },
            { label: "Days Absent", value: `${member.daysAbsent} Days`, icon: FiXCircle, bg: "bg-orange-50", color: "text-orange-500" },
          ].map((item) => (
            <div key={item.label} className={`${item.bg} rounded-xl p-3`}>
              <div className={`mb-1.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white ${item.color}`}>
                <item.icon size={16} />
              </div>
              <div className="text-lg font-bold text-gray-900">{item.value}</div>
              <div className="text-xs text-gray-500">{item.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-5 px-6 py-5 lg:grid-cols-2">
          <Card className="p-4">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wide text-gray-500">Member Info</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                <FiPhone className="text-gray-400" />
                <div>
                  <div className="text-xs text-gray-400">Phone Number</div>
                  <div className="text-sm font-semibold text-gray-800">{member.phone}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                <FiMail className="text-gray-400" />
                <div>
                  <div className="text-xs text-gray-400">Email</div>
                  <div className="text-sm font-semibold text-gray-800">{member.email || "Not added"}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                <FiCalendar className="text-gray-400" />
                <div>
                  <div className="text-xs text-gray-400">Join / Expiry</div>
                  <div className="text-sm font-semibold text-gray-800">
                    {member.joinDate} - {member.expiryDate}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wide text-gray-500">Recent Attendance</h3>
            <div className="space-y-2">
              {(member.attendanceHistory || []).slice(0, 8).map((entry, index) => (
                <div key={`${entry.rawDate || entry.date}-${index}`} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5">
                  <div>
                    <div className="text-sm font-semibold text-gray-800">{formatShortDate(entry.rawDate || entry.date)}</div>
                    <div className="text-xs text-gray-400">{entry.time || "—"}</div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      entry.status === "Present" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
                    }`}
                  >
                    {entry.status}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// function AdminAttendanceCard({ adminState, onMark, marking }) {
//   const todayStatus = adminState.today?.status || null;

//   return (
//     <Card>
//       {/* <div className="mb-4 flex items-start justify-between gap-4">
//         <div>
//           <h3 className="text-sm font-bold text-gray-900">Admin Attendance</h3>
//           <p className="mt-1 text-xs text-gray-400">Mark your own attendance for today.</p>
//         </div>
//         <span
//           className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
//             todayStatus === "Present"
//               ? "bg-emerald-100 text-emerald-700"
//               : todayStatus === "Absent"
//                 ? "bg-red-100 text-red-600"
//                 : "bg-gray-100 text-gray-500"
//           }`}
//         >
//           {todayStatus ? `Today: ${todayStatus}` : "Not marked"}
//         </span>
//       </div> */}

//       {/* <div className="flex flex-wrap items-center gap-2">
//         <button
//           onClick={() => onMark("Present")}
//           disabled={marking}
//           className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60"
//         >
//           {marking ? "Marking..." : "Mark My Attendance"}
//         </button>
//         <span className="text-xs text-gray-400">Logged in as {adminState.name || "Admin"}</span>
//       </div> */}

//       {/* <div className="mt-4 space-y-2">
//         {(adminState.records || []).slice(0, 5).map((record) => (
//           <div key={record.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5">
//             <div>
//               <div className="text-sm font-semibold text-gray-800">{formatShortDate(record.attendance_date)}</div>
//               <div className="text-xs text-gray-400">{formatTime(record.created_at)}</div>
//             </div>
//             <span
//               className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
//                 record.status === "Present" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
//               }`}
//             >
//               {record.status}
//             </span>
//           </div>
//         ))}
//       </div> */}
//     </Card>
//   );
// }

export default function AttendancePage() {
  const [members, setMembers] = useState([]);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [markingMemberId, setMarkingMemberId] = useState("");

  useEffect(() => {
    setSession(getClientSession());
  }, []);

  async function loadMembers() {
    try {
      const res = await fetch("/api/members");
      const data = await res.json();
      setMembers(data.members || []);
    } catch {
      setMembers([]);
    }
  }

  async function refreshAll() {
    setLoading(true);
    await loadMembers();
    setLoading(false);
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.role]);

  const today = useMemo(() => new Date(), []);

  const processedMembers = useMemo(() => {
    return members.map((member) => {
      const attendanceHistory = member.attendanceHistory || [];
      const todayStatus = getTodayStatus(member, today);
      const lastPresent = [...attendanceHistory].find((entry) => entry.status === "Present");
      const attendanceRate = getAttendanceRate(member, today);
      const lastVisit = member.lastVisit || formatShortDate(lastPresent?.rawDate || lastPresent?.date);
      const daysAbsent = member.attendanceInsights?.daysSince ?? 0;

      return {
        ...member,
        attendanceHistory,
        todayStatus,
        attendanceRate,
        lastVisit,
        daysAbsent,
        totalVisits: member.totalVisits ?? attendanceHistory.filter((item) => item.status === "Present").length,
      };
    });
  }, [members, today]);

  const filteredMembers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return processedMembers.filter((member) => {
      const matchSearch =
        !term ||
        member.name.toLowerCase().includes(term) ||
        (member.phone || "").toLowerCase().includes(term) ||
        (member.email || "").toLowerCase().includes(term);
      const matchFilter =
        filter === "All" ||
        (filter === "Active" && member.status === "Active") ||
        (filter === "Inactive" && member.status === "Inactive") ||
        (filter === "Present" && member.todayStatus === "Present") ||
        (filter === "Absent" && member.todayStatus === "Absent") ||
        (filter === "Not Marked" && member.todayStatus === "Not Marked");
      return matchSearch && matchFilter;
    });
  }, [filter, processedMembers, search]);

  const totalMembers = processedMembers.length;
  const presentToday = processedMembers.filter((member) => member.todayStatus === "Present").length;
  const notMarkedToday = processedMembers.filter((member) => member.todayStatus === "Not Marked").length;
  const avgAttendance = totalMembers
    ? Math.round(processedMembers.reduce((sum, member) => sum + Number(member.attendanceRate || 0), 0) / totalMembers)
    : 0;

  const attendanceTrend = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (6 - index));
    const count = processedMembers.filter((member) =>
      (member.attendanceHistory || []).some((entry) => entry.status === "Present" && sameDay(entry.rawDate || entry.date, day))
    ).length;
    return {
      day: day.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      count,
    };
  });

  const inactiveMembers = [...processedMembers]
    .filter((member) => Number(member.daysAbsent || 0) >= 5)
    .sort((a, b) => Number(b.daysAbsent || 0) - Number(a.daysAbsent || 0))
    .slice(0, 5);

  const recentLogs = processedMembers
    .flatMap((member) =>
      (member.attendanceHistory || []).map((entry) => ({
        id: `${member.id}-${entry.rawDate || entry.date}-${entry.status}`,
        member: member.name,
        plan: member.plan,
        date: entry.rawDate || entry.date,
        time: entry.time || "—",
        status: entry.status,
      }))
    )
    .sort((a, b) => (parseDate(b.date)?.getTime() || 0) - (parseDate(a.date)?.getTime() || 0))
    .slice(0, 8);

  const markMember = async (memberId, status) => {
    setError("");
    setMessage("");
    setMarkingMemberId(memberId);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: memberId, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to mark attendance.");
      setMessage("Member attendance updated.");
      await loadMembers();
      if (selected?.id === memberId) {
        const refreshed = processedMembers.find((m) => m.id === memberId);
        if (refreshed) setSelected(refreshed);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setMarkingMemberId("");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const selectedMember = selected
    ? processedMembers.find((member) => member.id === selected.id) || selected
    : null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="lg:ml-60 flex flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-gray-100 bg-white pl-14 pr-4 py-4 shadow-sm sm:px-8 lg:pl-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
              <p className="mt-0.5 text-sm text-gray-400">Track members and mark attendance from the CRM data.</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700">
              <FiCalendar className="text-gray-400" />
              {today.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-screen-2xl space-y-6 px-4 py-6 sm:px-8">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: "Total Members", value: totalMembers, icon: FiUsers, bg: "bg-blue-50", iconColor: "text-blue-600", sub: "Live CRM records" },
              { label: "Present Today", value: presentToday, icon: FiCheckCircle, bg: "bg-emerald-50", iconColor: "text-emerald-600", sub: "Marked present" },
              { label: "Not Marked", value: notMarkedToday, icon: FiClock, bg: "bg-gray-50", iconColor: "text-gray-600", sub: "Pending check-ins" },
              { label: "Avg. Attendance", value: `${avgAttendance}%`, icon: FiTrendingUp, bg: "bg-purple-50", iconColor: "text-purple-600", sub: "Across all members" },
            ].map((card) => (
              <Card key={card.label}>
                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${card.bg}`}>
                  <card.icon className={card.iconColor} size={20} />
                </div>
                <div className="text-2xl font-bold text-gray-900">{card.value}</div>
                <div className="mt-0.5 text-sm text-gray-500">{card.label}</div>
                <div className="mt-1 text-xs text-gray-400">{card.sub}</div>
              </Card>
            ))}
          </div>

          {(message || error) && (
            <div
              className={`rounded-2xl px-4 py-3 text-sm font-medium ${error ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}
            >
              {error || message}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
            <Card>
              <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="relative w-full md:max-w-md">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, email, or phone"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-9 pr-4 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-gray-400">Filter:</span>
                  {FILTERS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setFilter(item)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        filter === item ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                  <span className="ml-1 text-xs text-gray-400">{filteredMembers.length} members</span>
                </div>
              </div>

              <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] border-b border-gray-100 bg-gray-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400 md:grid">
                <span>Member</span>
                <span>Plan</span>
                <span>Today Status</span>
                <span>Last Visit</span>
                <span>Rate</span>
                <span>Actions</span>
              </div>

              <div className="divide-y divide-gray-50">
                {loading ? (
                  <div className="py-16 text-center text-sm text-gray-400">Loading attendance data...</div>
                ) : filteredMembers.length === 0 ? (
                  <div className="py-16 text-center text-sm text-gray-400">No members found.</div>
                ) : (
                  filteredMembers.map((member) => (
                    <div
                      key={member.id}
                      onClick={() => setSelected(member)}
                      className="grid cursor-pointer grid-cols-1 gap-3 px-5 py-4 transition hover:bg-indigo-50/40 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] md:items-center"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white">
                          {initials(member.name)}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{member.name}</div>
                          <div className="text-xs text-gray-400">{member.phone}</div>
                        </div>
                      </div>

                      <div>
                        <Badge value={member.plan} />
                      </div>

                      <div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            member.todayStatus === "Present"
                              ? "bg-emerald-100 text-emerald-700"
                              : member.todayStatus === "Absent"
                                ? "bg-red-100 text-red-600"
                                : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {member.todayStatus}
                        </span>
                      </div>

                      <div>
                        <div className="text-sm font-semibold text-gray-800">{member.lastVisit}</div>
                        <div className="text-xs text-gray-400">{member.daysAbsent} days absent</div>
                      </div>

                      <div>
                        <div className="mb-1 flex items-center gap-2">
                          <div className="h-1.5 flex-1 rounded-full bg-gray-100">
                            <div
                              className={`h-full rounded-full ${member.attendanceRate >= 80 ? "bg-emerald-500" : member.attendanceRate >= 50 ? "bg-yellow-400" : "bg-red-400"}`}
                              style={{ width: `${member.attendanceRate}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-600">{member.attendanceRate}%</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => markMember(member.id, "Present")}
                          disabled={markingMemberId === member.id}
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                            member.todayStatus === "Present"
                              ? "bg-emerald-600 text-white"
                              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          } disabled:opacity-60`}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          onClick={() => markMember(member.id, "Absent")}
                          disabled={markingMemberId === member.id}
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                            member.todayStatus === "Absent"
                              ? "bg-red-500 text-white"
                              : "bg-red-50 text-red-600 hover:bg-red-100"
                          } disabled:opacity-60`}
                        >
                          Absent
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <div className="space-y-6">
              <Card>
                <h3 className="mb-4 text-sm font-bold text-gray-900">Attendance Trend (Last 7 Days)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={attendanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 10, border: "none", boxShadow: "0 10px 20px rgba(0,0,0,0.08)" }}
                    />
                    <Line type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 3, fill: "#4f46e5", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              <Card>
                <h3 className="mb-4 text-sm font-bold text-gray-900">Inactive Members</h3>
                <div className="space-y-2">
                  {inactiveMembers.length === 0 ? (
                    <p className="py-4 text-sm text-gray-400">No inactive members right now.</p>
                  ) : (
                    inactiveMembers.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => setSelected(member)}
                        className="flex w-full items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5 text-left transition hover:bg-gray-100"
                      >
                        <div>
                          <div className="text-sm font-semibold text-gray-800">{member.name}</div>
                          <div className="text-xs text-gray-400">{member.lastVisit}</div>
                        </div>
                        <div className="text-xs font-semibold text-red-500">{member.daysAbsent} days</div>
                      </button>
                    ))
                  )}
                </div>
              </Card>

              {/* {session?.role === "admin" && (
                // <AdminAttendanceCard
                //   adminState={adminState}
                //   marking={markingAdmin}
                //   onMark={markAdmin}
                // />
              )} */}

              <Card>
                <h3 className="mb-4 text-sm font-bold text-gray-900">Recent Attendance Logs</h3>
                <div className="space-y-2">
                  {recentLogs.length === 0 ? (
                    <p className="py-4 text-sm text-gray-400">No attendance records yet.</p>
                  ) : (
                    recentLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5">
                        <div>
                          <div className="text-sm font-semibold text-gray-800">{log.member}</div>
                          <div className="text-xs text-gray-400">{formatShortDate(log.date)} · {log.time}</div>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            log.status === "Present" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
                          }`}
                        >
                          {log.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>

      {selectedMember && <AttendanceModal member={selectedMember} onClose={() => setSelected(null)} />}
    </div>
  );
}
