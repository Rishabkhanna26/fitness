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
    let detail = "";
    try {
      const errBody = await response.json();
      detail = errBody?.message || errBody?.hint || errBody?.details || JSON.stringify(errBody);
    } catch {}
    throw new Error(`Supabase error ${response.status}: ${detail || response.statusText}`);
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

function parseDateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sortByRecentDate(items, keys) {
  return [...items].sort((a, b) => {
    const dateA = parseDateValue(keys.map((key) => a?.[key]).find(Boolean));
    const dateB = parseDateValue(keys.map((key) => b?.[key]).find(Boolean));
    return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
  });
}

function formatTime(value) {
  const date = parseDateValue(value);
  if (!date) return "";
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function normalizeMember(row) {
  const plan = row.plan || row.plans?.name || "1 Month";
  const joinDate = row.join_date || row.joinDate || row.created_at;
  const expiryDate = row.expiry_date || row.expiryDate;
  const payments = sortByRecentDate(row.payments || row.paymentHistory || [], ["payment_date", "date", "created_at"]);
  const attendance = sortByRecentDate(row.attendance || row.attendanceHistory || [], ["attendance_date", "date", "created_at"]);
  const rewards = row.member_rewards || [];
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
      rawDate: item.attendance_date || item.date || item.created_at,
      time: formatTime(item.created_at),
      status: item.status || "Present",
    })),
    attendanceInsights: {
      thisMonth: attendance.filter((item) => {
        const date = new Date(item.attendance_date || item.date);
        const today = new Date();
        return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
      }).length,
      lastVisit: formatDate(row.last_visit || lastAttendance?.attendance_date || lastAttendance?.date),
      daysSince: (() => {
        const target = parseDateValue(row.last_visit || lastAttendance?.attendance_date || lastAttendance?.date);
        if (!target) return 0;
        return Math.max(0, Math.floor((Date.now() - target.getTime()) / 86400000));
      })(),
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
    rewards: rewards.map((r) => ({
      id: r.id,
      offerId: r.offer_id,
      availedAt: r.availed_at,
      nextDueAt: r.next_due_at,
    })),
    latestReward: rewards[0] || null,
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
      "members?select=*,plans(*),attendance(*),payments(*),memberships(*),member_rewards(*)&order=created_at.desc"
    );
    if (!rows) return [];
    return rows.map(normalizeMember);
  } catch {
    return [];
  }
}

export async function getMemberById(id) {
  try {
    const rows = await supabaseFetch(
      `members?id=eq.${id}&select=*,plans(*),attendance(*),payments(*),memberships(*),member_rewards(*)`
    );
    if (rows && rows[0]) return normalizeMember(rows[0]);
  } catch {}
  return null;
}

export async function findMemberByPhone(phone) {
  const normalizedPhone = String(phone || "").replace(/\D/g, "");
  if (!normalizedPhone) return null;
  const members = await getMembers();
  return members.find((member) => {
    const memberPhone = member.phone.replace(/\D/g, "");
    return memberPhone === normalizedPhone;
  });
}

export async function findMemberForLogin(identifier, phone) {
  const normalizedIdentifier = String(identifier || "").trim().toLowerCase();
  if (normalizedIdentifier) {
    const members = await getMembers();
    const normalizedPhone = String(phone || "").replace(/\D/g, "");
    return members.find((member) => {
      const memberPhone = member.phone.replace(/\D/g, "");
      return (
        memberPhone === normalizedPhone &&
        [member.name.toLowerCase(), member.email.toLowerCase()].includes(normalizedIdentifier)
      );
    });
  }
  return findMemberByPhone(phone);
}

export async function updateMember(id, payload) {
  // ── 1. Update member fields ───────────────────────────────────────────────
  const body = {};
  if (payload.name             !== undefined) body.name              = payload.name;
  if (payload.email            !== undefined) body.email             = payload.email;
  if (payload.phone            !== undefined) body.phone             = payload.phone;
  if (payload.address          !== undefined) body.address           = payload.address;
  if (payload.emergency_contact !== undefined) body.emergency_contact = payload.emergency_contact;
  if (payload.status           !== undefined) body.status            = payload.status;
  if (payload.plan_id          !== undefined) body.plan_id           = payload.plan_id;
  if (payload.expiry_date      !== undefined) body.expiry_date       = payload.expiry_date;
  if (payload.notes            !== undefined) body.notes             = payload.notes;

  // Only PATCH members table if there are fields to update
  if (Object.keys(body).length > 0) {
    body.updated_at = new Date().toISOString();
    await supabaseFetch(`members?id=eq.${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  // ── 2. Record payment if provided ────────────────────────────────────────
  if (payload.payment_amount && Number(payload.payment_amount) > 0) {
    await supabaseFetch("payments", {
      method: "POST",
      body: JSON.stringify({
        member_id: id,
        amount:       Number(payload.payment_amount),
        status:       "Paid",
        payment_date: new Date().toISOString().slice(0, 10),
        method:       payload.payment_method  || null,
        notes:        payload.payment_notes   || null,
      }),
    });
  }

  // ── 3. Return updated member ──────────────────────────────────────────────
  const rows = await supabaseFetch(
    `members?id=eq.${id}&select=*,plans(*),attendance(*),payments(*),memberships(*),member_rewards(*)`
  );
  return rows?.[0] ? normalizeMember(rows[0]) : null;
}

export async function deleteMember(id) {
  await supabaseFetch(`members?id=eq.${id}`, { method: "DELETE" });
}

export async function markMemberAttendance(memberId, status = "Present") {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await supabaseFetch("attendance?on_conflict=member_id,attendance_date", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      member_id: memberId,
      attendance_date: today,
      status,
    }),
  });
  return rows?.[0] || null;
}

export async function registerMember(payload) {
  const joinDate = new Date().toISOString().slice(0, 10);

  // Compute expiry date from duration
  let expiryDate = null;
  if (payload.duration === "1 Month") {
    const d = new Date(); d.setMonth(d.getMonth() + 1);
    expiryDate = d.toISOString().slice(0, 10);
  } else if (payload.duration === "3 Months") {
    const d = new Date(); d.setMonth(d.getMonth() + 3);
    expiryDate = d.toISOString().slice(0, 10);
  } else if (payload.duration === "6 Months") {
    const d = new Date(); d.setMonth(d.getMonth() + 6);
    expiryDate = d.toISOString().slice(0, 10);
  } else if (payload.duration === "Custom" && payload.customDays) {
    const d = new Date(); d.setDate(d.getDate() + Number(payload.customDays));
    expiryDate = d.toISOString().slice(0, 10);
  }

  // Generate a placeholder email if none provided to satisfy the unique not-null constraint
  const email = payload.email?.trim()
    ? payload.email.trim()
    : `member_${payload.phone.replace(/\D/g, "")}_${Date.now()}@noemail.local`;

  const body = {
    name: payload.name,
    email,
    phone: payload.phone,
    status: "Active",
    join_date: joinDate,
    expiry_date: expiryDate,
    plan: payload.duration || "1 Month",
  };
  const rows = await supabaseFetch("members", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const member = rows?.[0] ? normalizeMember(rows[0]) : null;

  // Save initial payment record if amount provided
  if (member && payload.amountPaid && Number(payload.amountPaid) > 0) {
    try {
      await supabaseFetch("payments", {
        method: "POST",
        body: JSON.stringify({
          member_id: member.id,
          amount: Number(payload.amountPaid),
          status: "Paid",
          payment_date: joinDate,
        }),
      });
    } catch {
      // Payment save failed silently — member still created
    }
  }

  return member;
}

export async function getAdminAttendance(email) {
  try {
    const query = email
      ? `admin_attendance?admin_email=eq.${encodeURIComponent(email)}&select=*&order=attendance_date.desc,created_at.desc`
      : "admin_attendance?select=*&order=attendance_date.desc,created_at.desc";
    const rows = await supabaseFetch(query);
    return rows || [];
  } catch {
    return [];
  }
}

export async function markAdminAttendance(payload) {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await supabaseFetch("admin_attendance?on_conflict=admin_email,attendance_date", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      admin_email: payload.admin_email,
      admin_name: payload.admin_name,
      attendance_date: today,
      status: payload.status || "Present",
      updated_at: new Date().toISOString(),
    }),
  });
  return rows?.[0] || null;
}

export async function getSettings() {
  try {
    const rows = await supabaseFetch("settings?select=*&order=key.asc");
    if (!rows) return [];
    return rows;
  } catch {
    return [
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

// Loyalty Offers
export async function getLoyaltyOffers() {
  try {
    const rows = await supabaseFetch("loyalty_offers?select=*&order=created_at.desc");
    return rows || [];
  } catch {
    return [];
  }
}

export async function createLoyaltyOffer(payload) {
  const rows = await supabaseFetch("loyalty_offers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return rows?.[0] || null;
}

export async function updateLoyaltyOffer(id, payload) {
  const rows = await supabaseFetch(`loyalty_offers?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify({ ...payload, updated_at: new Date().toISOString() }),
  });
  return rows?.[0] || null;
}

export async function deleteLoyaltyOffer(id) {
  await supabaseFetch(`loyalty_offers?id=eq.${id}`, { method: "DELETE" });
}

// Member Rewards
export async function availMemberReward(memberId, offerId) {
  // Fetch the offer to compute next_due_at
  const offers = await supabaseFetch(`loyalty_offers?id=eq.${offerId}&select=*`);
  const offer = offers?.[0];
  if (!offer) throw new Error("Offer not found");

  const now = new Date();
  let nextDue = new Date(now);
  if (offer.interval_unit === "days") nextDue.setDate(now.getDate() + offer.interval_value);
  else if (offer.interval_unit === "months") nextDue.setMonth(now.getMonth() + offer.interval_value);
  else if (offer.interval_unit === "years") nextDue.setFullYear(now.getFullYear() + offer.interval_value);

  const rows = await supabaseFetch("member_rewards", {
    method: "POST",
    body: JSON.stringify({
      member_id: memberId,
      offer_id: offerId,
      availed_at: now.toISOString(),
      next_due_at: nextDue.toISOString(),
    }),
  });
  return rows?.[0] || null;
}

// Attendance Codes
export async function generateAttendanceCode(memberId) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars O/0/I/1
  const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();

  // Try up to 5 times to get a unique active code
  for (let attempt = 0; attempt < 5; attempt++) {
    let code = "";
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }

    // Check uniqueness among active codes
    const existing = await supabaseFetch(
      `attendance_codes?code=eq.${code}&used=eq.false&expires_at=gt.${new Date().toISOString()}&select=id`
    );
    if (existing && existing.length > 0) continue;

    const rows = await supabaseFetch("attendance_codes", {
      method: "POST",
      body: JSON.stringify({
        member_id: memberId,
        code,
        expires_at: expiresAt,
        used: false,
      }),
    });
    return rows?.[0] || null;
  }
  throw new Error("Could not generate a unique attendance code. Please try again.");
}

export async function verifyAndMarkAttendance(memberId, code) {
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();

  // 1. Find the code
  const codes = await supabaseFetch(
    `attendance_codes?code=eq.${encodeURIComponent(code.toUpperCase())}&select=*`
  );
  const record = codes?.[0];
  if (!record) return { success: false, error: "Invalid code." };

  // 2. Check ownership
  if (String(record.member_id) !== String(memberId)) {
    return { success: false, error: "This code does not belong to your account." };
  }

  // 3. Check expiry
  if (new Date(record.expires_at) <= new Date()) {
    return { success: false, error: "Code has expired. Please generate a new one." };
  }

  // 4. Check already used
  if (record.used) {
    return { success: false, error: "Code has already been used." };
  }

  // 5. Check already marked today
  const existing = await supabaseFetch(
    `attendance?member_id=eq.${memberId}&attendance_date=eq.${today}&select=id`
  );
  if (existing && existing.length > 0) {
    return { success: false, error: "Attendance already marked for today." };
  }

  // 6. Mark attendance with today's server date
  await supabaseFetch("attendance?on_conflict=member_id,attendance_date", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ member_id: memberId, attendance_date: today, status: "Present" }),
  });

  // 7. Mark code as used
  await supabaseFetch(`attendance_codes?id=eq.${record.id}`, {
    method: "PATCH",
    body: JSON.stringify({ used: true }),
  });

  // 8. Get updated visit count
  const memberRows = await supabaseFetch(`members?id=eq.${memberId}&select=*,attendance(*)`);
  const memberRow = memberRows?.[0];
  const totalVisits = memberRow
    ? (memberRow.attendance || []).filter((a) => a.status === "Present").length
    : 0;

  return { success: true, totalVisits };
}

export async function hasValidAttendanceCode(memberId) {
  const now = new Date().toISOString();
  const rows = await supabaseFetch(
    `attendance_codes?member_id=eq.${memberId}&used=eq.false&expires_at=gt.${now}&select=code,expires_at&order=created_at.desc&limit=1`
  );
  return rows?.[0] || null;
}

export async function hasTodayAttendance(memberId) {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await supabaseFetch(
    `attendance?member_id=eq.${memberId}&attendance_date=eq.${today}&select=id`
  );
  return rows && rows.length > 0;
}
