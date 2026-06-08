import { members as fallbackMembers } from "@/lib/data";

const projectUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "";
const apiUrl =
  process.env.NEXT_PUBLIC_SUPABASE_API_URL ||
  process.env.SUPABASE_API_URL ||
  projectUrl;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY;

function normalizeRestUrl(value) {
  if (!value) return "";
  const trimmed = value.replace(/\/+$/, "");
  return trimmed.endsWith("/rest/v1") ? trimmed : `${trimmed}/rest/v1`;
}

const restUrl = normalizeRestUrl(apiUrl);

function configured() {
  return Boolean(restUrl && supabaseKey);
}

async function supabaseFetch(path, options = {}) {
  if (!configured()) return null;

  const response = await fetch(`${restUrl}/${path.replace(/^\/+/, "")}`, {
    ...options,
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Supabase request failed: ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

function daysBetween(date) {
  if (!date) return 0;
  const today = new Date();
  const target = new Date(date);
  return Math.max(0, Math.ceil((target - today) / 86400000));
}

function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "MB";
}

export function normalizeMember(row) {
  const plan = row.plans?.name || row.plan || "Basic";
  const joinDate = row.join_date || row.joinDate || row.created_at;
  const expiryDate = row.expiry_date || row.expiryDate;
  const payments = row.payments || row.paymentHistory || [];
  const attendance = row.attendance || row.attendanceHistory || [];
  const paid = payments
    .filter((payment) => (payment.status || "").toLowerCase() === "paid")
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const pending = payments
    .filter((payment) => (payment.status || "").toLowerCase() !== "paid")
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const lastAttendance = attendance[0];

  return {
    id: String(row.id),
    name: row.name || "Member",
    status: row.status || "Active",
    plan,
    phone: row.phone || row.phone_no || "",
    email: row.email || "",
    address: row.address || "Not added",
    emergency: row.emergency_contact || "Not added",
    joinDate: formatDate(joinDate),
    expiryDate: formatDate(expiryDate),
    remainingDays: daysBetween(expiryDate),
    totalVisits: row.total_visits ?? attendance.filter((item) => item.status === "Present").length,
    lastVisit: formatDate(row.last_visit || lastAttendance?.attendance_date || lastAttendance?.date),
    totalPaid: row.total_paid ?? paid,
    outstanding: row.outstanding ?? pending,
    avatar: initials(row.name),
    avatarColor: "bg-indigo-500",
    planFeatures: row.plans?.features || row.planFeatures || ["Gym Access"],
    membershipHistory: row.memberships || row.membershipHistory || [
      { plan, start: formatDate(joinDate), end: expiryDate ? formatDate(expiryDate) : "Current" },
    ],
    membershipTimeline: [
      { label: "Start Date", date: formatDate(joinDate), type: "start" },
      { label: "Expiry Date", date: formatDate(expiryDate), type: "expiry" },
    ],
    attendanceHistory: attendance.map((item) => ({
      date: formatDate(item.attendance_date || item.date),
      status: item.status || "Present",
    })),
    attendanceInsights: {
      thisMonth: attendance.filter((item) => {
        const date = new Date(item.attendance_date || item.date);
        const today = new Date();
        return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
      }).length,
      lastVisit: formatDate(row.last_visit || lastAttendance?.attendance_date || lastAttendance?.date),
      daysSince: row.last_visit ? Math.max(0, Math.floor((Date.now() - new Date(row.last_visit)) / 86400000)) : 0,
    },
    paymentHistory: payments.map((payment) => ({
      date: formatDate(payment.payment_date || payment.date),
      amount: Number(payment.amount || 0),
      status: payment.status || "Paid",
    })),
    financial: {
      totalPaid: row.total_paid ?? paid,
      pending,
      lastPayment: formatDate(payments[0]?.payment_date || payments[0]?.date),
    },
    trainerNotes: row.notes ? [row.notes] : [],
    tags: row.tags || [],
  };
}

export function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export async function getMembers() {
  try {
    const rows = await supabaseFetch(
      "members?select=*,plans(*),attendance(*),payments(*),memberships(*)&order=created_at.desc"
    );
    return rows ? rows.map(normalizeMember) : fallbackMembers;
  } catch {
    return fallbackMembers;
  }
}

export async function getMemberById(id) {
  const members = await getMembers();
  return members.find((member) => String(member.id) === String(id)) || null;
}

export async function findMemberForLogin(identifier, phone) {
  const normalizedIdentifier = identifier.trim().toLowerCase();
  const normalizedPhone = phone.replace(/\D/g, "");
  const members = await getMembers();
  return members.find((member) => {
    const memberPhone = member.phone.replace(/\D/g, "");
    return (
      memberPhone === normalizedPhone &&
      [member.name.toLowerCase(), member.email.toLowerCase()].includes(normalizedIdentifier)
    );
  });
}

export async function registerMember(payload) {
  const body = {
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    status: "Active",
    join_date: new Date().toISOString().slice(0, 10),
  };
  const rows = await supabaseFetch("members", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return rows?.[0] ? normalizeMember(rows[0]) : null;
}

export async function getSettings() {
  try {
    const rows = await supabaseFetch("settings?select=*&order=key.asc");
    if (!rows) return [];
    return rows;
  } catch {
    return [
      { key: "offer", value: { title: "New Year Offer", discount_percent: 10, active: true } },
      { key: "interval_date", value: { renewal_reminder_days: 7, attendance_alert_days: 5 } },
    ];
  }
}

export async function upsertSettings(settings) {
  return supabaseFetch("settings?on_conflict=key", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(settings),
  });
}
