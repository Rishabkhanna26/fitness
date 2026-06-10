require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const express = require("express");
const cors    = require("cors");
const { Client, LocalAuth } = require("whatsapp-web.js");
const fetch   = require("node-fetch");
const fs      = require("fs");
const path    = require("path");

const app = express();

// ── Security: restrict CORS to known origins only ─────────────────────────────
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",").map(s => s.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (server-to-server, curl) or whitelisted origins
    if (!origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin))
      return cb(null, true);
    cb(new Error("CORS: origin not allowed"));
  },
  methods: ["GET","POST","DELETE"],
}));

// ── Security: limit request body size to prevent payload attacks ──────────────
app.use(express.json({ limit: "32kb" }));

// ── Security: remove fingerprinting headers ───────────────────────────────────
app.disable("x-powered-by");

// ── Config ────────────────────────────────────────────────────────────────────
const PORT               = parseInt(process.env.BOT_PORT, 10)      || 3002;
const BOT_SECRET         = process.env.BOT_SECRET                  || "";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY          || "";
const OPENROUTER_API_URL = process.env.OPENROUTER_API_URL          || "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL   = process.env.OPENROUTER_MODEL            || "meta-llama/llama-3.3-70b-instruct:free";
const GEMINI_API_KEY     = process.env.GEMINI_API_KEY              || "";
const GEMINI_MODEL       = "gemma-4-31b-it";
const SUPABASE_URL       = (process.env.SUPABASE_API_URL || process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const SUPABASE_KEY       = process.env.SUPABASE_ANON_KEY           || "";

// Admin alert number — set in .env as ADMIN_WHATSAPP=919876543210
// The bot will message this number when a "high" joining-interest crux is saved.
const ADMIN_WHATSAPP     = (process.env.ADMIN_WHATSAPP || "").replace(/\D/g, "");

// Fail fast if BOT_SECRET is not set — prevents running with empty secret
if (!BOT_SECRET) {
  console.error("FATAL: BOT_SECRET env var is not set. Set it in your .env file.");
  process.exit(1);
}

// ── Gym context cache ─────────────────────────────────────────────────────────
let   gymContextCache    = null;
let   gymContextCachedAt = 0;
const GYM_CONTEXT_TTL    = 5 * 60 * 1000; // 5 minutes

// ── Saved-phone file ──────────────────────────────────────────────────────────
const PHONE_FILE = path.join(__dirname, ".saved_phone");

function savedPhone() {
  try { return fs.readFileSync(PHONE_FILE, "utf8").trim(); } catch { return null; }
}
function savePhone(phone) {
  // Validate: digits only, 10-15 chars
  if (!/^\d{10,15}$/.test(phone)) return;
  try { fs.writeFileSync(PHONE_FILE, phone, "utf8"); } catch {}
}
function clearPhone() {
  try { fs.unlinkSync(PHONE_FILE); } catch {}
}

// ── State ─────────────────────────────────────────────────────────────────────
let botState    = "idle";   // idle | pairing | ready | auth_failed | disconnected
let pairingCode = null;
let client      = null;
let pendingPhone = savedPhone(); // restore from last session

const conversations   = new Map(); // jid -> [{role, content}]
const userMeta        = new Map(); // jid -> { name, whatsappName, nameConfirmed, ... }
const lastActivityMap = new Map(); // jid -> timestamp
const MAX_HISTORY     = 20;

// ── Puppeteer args ────────────────────────────────────────────────────────────
const PUPPETEER_ARGS = [
  "--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage",
  "--disable-gpu", "--no-first-run", "--disable-accelerated-2d-canvas",
  "--disable-extensions", "--disable-background-networking",
  "--disable-default-apps", "--disable-sync", "--disable-translate",
  "--hide-scrollbars", "--metrics-recording-only", "--mute-audio",
  "--safebrowsing-disable-auto-update",
];

// ── Input sanitisation ────────────────────────────────────────────────────────
// Strips control characters and limits length before passing to AI.
// Prevents prompt injection via crafted WhatsApp messages.
function sanitiseInput(text) {
  if (typeof text !== "string") return "";
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // strip control chars
    .slice(0, 1000)                                       // hard cap at 1000 chars
    .trim();
}

// ── Supabase helpers ──────────────────────────────────────────────────────────
async function supabaseGet(p) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/${p}`, {
      headers: {
        apikey:        SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type":"application/json",
      },
    });
    return res.ok ? res.json() : null;
  } catch { return null; }
}

async function supabaseDelete(table, filter) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/${table}?${filter}`, {
      method: "DELETE",
      headers: {
        apikey:        SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });
    return res.ok ? true : false;
  } catch { return false; }
}

async function supabasePatch(table, filter, body) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/${table}?${filter}`, {
      method: "PATCH",
      headers: {
        apikey:        SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type":"application/json",
        Prefer:        "return=representation",
      },
      body: JSON.stringify(body),
    });
    return res.ok ? res.json() : null;
  } catch { return null; }
}

async function supabasePost(table, body) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/${table}`, {
      method: "POST",
      headers: {
        apikey:        SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type":"application/json",
        Prefer:        "return=representation",
      },
      body: JSON.stringify(body),
    });
    return res.ok ? res.json() : null;
  } catch { return null; }
}

/**
 * True upsert via Supabase PostgREST — merge-duplicates on conflict.
 * onConflictCol = unique column name, e.g. "jid".
 */
async function supabaseUpsert(table, body, onConflictCol) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/${table}?on_conflict=${onConflictCol}`,
      {
        method: "POST",
        headers: {
          apikey:        SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type":"application/json",
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) {
      console.error(`Supabase upsert error (${table}):`, await res.text());
      return null;
    }
    return res.json();
  } catch (e) {
    console.error(`Supabase upsert exception (${table}):`, e.message);
    return null;
  }
}

// ── Contact helpers ───────────────────────────────────────────────────────────
async function getContact(jid) {
  const rows = await supabaseGet(`whatsapp_contacts?jid=eq.${encodeURIComponent(jid)}&limit=1`);
  return rows?.length ? rows[0] : null;
}

async function upsertContact(jid, phone, name, extraFields = {}) {
  const now = new Date().toISOString();
  return supabaseUpsert("whatsapp_contacts", {
    jid, phone,
    name:           name || null,
    name_confirmed: false,
    first_seen:     now,   // trigger in DB preserves original on update
    last_seen:      now,
    updated_at:     now,
    ...extraFields,
  }, "jid");
}

async function updateContact(jid, fields) {
  return supabasePatch("whatsapp_contacts", `jid=eq.${encodeURIComponent(jid)}`, {
    ...fields,
    last_seen:  new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

async function saveChatCrux(jid, crux) {
  return supabaseUpsert("chat_crux", {
    jid, ...crux, updated_at: new Date().toISOString(),
  }, "jid");
}

// ── Feedback helpers ──────────────────────────────────────────────────────────
async function saveFeedback(jid, contactName, sentiment) {
  return supabasePost("bot_feedback", {
    jid,
    contact_name: contactName || null,
    sentiment,    // "positive" | "negative"
    created_at:   new Date().toISOString(),
  });
}

// ── Token usage tracking ──────────────────────────────────────────────────────
async function saveTokenUsage(jid, provider, model, tokenData, contactName) {
  return supabasePost("chat_tokens", {
    jid,
    contact_name:  contactName || null,
    provider,
    model,
    input_tokens:  tokenData.inputTokens  || 0,
    output_tokens: tokenData.outputTokens || 0,
    total_tokens:  tokenData.totalTokens  || 0,
    created_at:    new Date().toISOString(),
  });
}

// ── Admin alert — notify owner when a "high interest" lead is detected ─────────
async function alertAdminHighInterest(jid, contactName, joiningReason) {
  if (!ADMIN_WHATSAPP || !client || botState !== "ready") return;
  try {
    const chatId  = `${ADMIN_WHATSAPP}@c.us`;
    const phone   = jid.replace("@c.us", "");
    const message =
      `🔔 *New High-Interest Lead!*\n\n` +
      `*Name:* ${contactName || "Unknown"}\n` +
      `*Phone:* +${phone}\n` +
      `*Why interested:* ${joiningReason || "Asked about joining"}\n\n` +
      `Follow up soon! 💪`;
    await client.sendMessage(chatId, message);
    console.log(`📣 Admin alerted about high-interest lead: ${jid}`);
  } catch (err) {
    console.error("Admin alert error:", err.message);
  }
}

// ── Extract WhatsApp push-name ────────────────────────────────────────────────
function extractNameFromContact(msg) {
  try { return msg._data?.notifyName || msg.notifyName || null; } catch { return null; }
}

function phoneFromJid(jid) {
  return jid
    .split("@")[0]
    .split(":")[0]
    .replace(/\D/g, "");
}

// ── Gym context ───────────────────────────────────────────────────────────────
async function getGymContext() {
  if (gymContextCache && (Date.now() - gymContextCachedAt) < GYM_CONTEXT_TTL)
    return gymContextCache;

  try {
    const rows = await supabaseGet("settings?select=*");
    if (!rows?.length) return buildDefaultContext();

    const get       = (key) => rows.find(r => r.key === key)?.value ?? null;
    const timing    = get("gym_timing")         || {};
    const pricing   = get("membership_pricing") || [];
    const dietPlans = get("diet_plans")         || [];

    let ctx = `You are OptimusBot — the friendly WhatsApp assistant for Optimus Gym, India. Think of yourself as a helpful gym buddy, not a rulebook.

OUTPUT RULE: Write ONLY the final WhatsApp reply. No thinking, no reasoning, no internal notes, no language-detection commentary. Just the message.

━━━ PERSONALITY & TONE ━━━
- Warm, encouraging, and conversational — like a knowledgeable friend at the gym.
- Mirror the user's energy: if they are excited, match it; if they are stressed, be calm and supportive.
- In Hindi/Hinglish context use "bhai", "yaar" naturally — not forced every sentence.
- Keep replies short and human. No walls of text. No unnecessary formality.
- Hinglish example: "Bhai, pehle bata — veg hai ya non-veg? 🥗" not "Please specify your dietary preference."

━━━ LANGUAGE RULES ━━━
1. Detect the language of the customer's LAST message.
2. Reply in exactly the same language.
3. English -> English.
4. Hindi -> Hindi (Devanagari script).
5. Punjabi -> Punjabi.
6. Hinglish -> Hinglish.
7. Never switch languages on your own.
8. Never greet in Hindi if the customer wrote in English.

━━━ SOCIAL MESSAGES — ALWAYS RESPOND WARMLY ━━━
Greetings ("hi", "hello", "namaste", "hey"), thanks ("thanks", "shukriya"), compliments, and goodbyes MUST get a warm, natural reply. Never refuse social messages.
- "Hi!" → "Hey! 👋 Welcome to Optimus Gym! Kya help kar sakta hoon aaj? 💪"
- "Thanks bhai" → "Koi baat nahi yaar! All the best for your fitness journey 🙌"
- "You're very helpful!" → "Glad I could help! Kuch aur chahiye toh bata dena 😊"

━━━ FEEDBACK RESPONSES ━━━
If the user sends 👍, "helpful", "good bot", "nice", "bahut accha", "shukriya" → reply warmly and thank them.
If the user sends 👎, "not helpful", "wrong", "galat" → apologise warmly, ask how you can do better.

━━━ TOPICS YOU HELP WITH ━━━
✅ Gym timings, holidays, location
✅ Membership plans and joining process
✅ Diet and nutrition advice (Indian context)
✅ Workout plans and exercise tips
✅ Fitness goals — weight loss, muscle gain, strength, endurance
✅ Recovery, rest days, injury prevention basics
✅ Sleep, hydration, stress management AS THEY RELATE TO FITNESS
✅ Motivation and general wellness encouragement

❌ Refuse only clearly unrelated topics: relationships, politics, finance, religion, legal advice.
   When refusing: "Yaar, woh topic meri expertise ke bahar hai! 😅 Par fitness ya gym ke baare mein kuch poochna ho toh batao 💪"
   Never use the rigid "Sorry, I can only help with gym questions" — make it sound human.

━━━ DIET PLAN FLOW ━━━
When someone wants a personalised diet plan (not just a quick tip):
Step 1 — Ask: veg or non-veg? (first, always)
Step 2 — Ask age
Step 3 — Ask height
Step 4 — Ask current weight
Step 5 — Ask goal (weight loss / muscle gain / maintenance / strength)
➜ Ask ONE question at a time, conversationally. After all 5 answers, give the full plan.
➜ For quick general questions ("what should I eat before workout?") answer directly — no need to collect all stats.

🚫 NON-VEG DIET — STRICT INDIAN RULE:
ONLY use: chicken, eggs, fish (rohu, surmai, tuna), mutton/lamb.
NEVER suggest: beef, pork, bacon, ham, pepperoni, lard, or any pork/beef product.
This is non-negotiable — Optimus Gym serves an Indian audience.

✅ VEG PROTEINS: paneer, dal (moong, masoor, chana), rajma, soya chunks, tofu, curd, milk, whey protein, nuts, seeds, peanut butter.

━━━ WORKOUT PLAN FLOW ━━━
Ask: age → fitness level (beginner / intermediate / advanced) → goal
ONE question at a time. Give plan only after all 3 answers.
For simple questions ("best exercise for chest?") answer directly.

━━━ MEMBERSHIP & JOINING ━━━
- If someone seems interested in joining (asking about plans, timing, facilities) → give a warm answer AND add a natural nudge: "Agar join karna ho toh directly gym aa sakte ho ya mujhe batao — main help kar deta hoon! 💪"
- Share pricing only if they specifically ask.
- For membership/attendance account queries → "Uske liye member portal check karo ya front desk se baat karo."

━━━ BUSINESS HOURS AWARENESS ━━━
If someone messages after gym closing time or very early (before opening), naturally mention when the gym opens next. Keep it friendly — not robotic.

━━━ UNCLEAR MESSAGES ━━━
If a message is confusing or too vague, ask ONE short clarifying question — don't refuse or give a generic error.

━━━ FORMAT ━━━
WhatsApp markdown only: *bold* for headings, blank lines between sections, dashes for lists.
No tables. No ### headers. Keep it clean and easy to read on a phone screen.

`;

    const dayLabels  = { mon:"Monday", tue:"Tuesday", wed:"Wednesday", thu:"Thursday", fri:"Friday", sat:"Saturday", sun:"Sunday" };
    const schedule   = timing.schedule || {};
    const holidays   = timing.holidays || [];
    const openDays   = Object.entries(schedule).filter(([,v]) => !v.closed);
    const closedDays = Object.entries(schedule).filter(([,v]) => v.closed);

    if (openDays.length > 0) {
      ctx += "GYM HOURS:\n";
      const groups = {};
      for (const [d, v] of openDays) {
        const key = `${v.open}-${v.close}`;
        if (!groups[key]) groups[key] = { open: v.open, close: v.close, days: [] };
        groups[key].days.push(dayLabels[d]);
      }
      for (const g of Object.values(groups))
        ctx += `${g.days.join(", ")}: ${g.open} to ${g.close}\n`;
      if (closedDays.length > 0)
        ctx += `Weekly off: ${closedDays.map(([d]) => dayLabels[d]).join(", ")}\n`;
      ctx += "\n";
    } else if (timing.weekday_open) {
      ctx += `GYM HOURS:\nWeekdays: ${timing.weekday_open} to ${timing.weekday_close}\nWeekends: ${timing.weekend_open} to ${timing.weekend_close}\n\n`;
    }

    if (holidays.length > 0) {
      const upcoming = holidays
        .filter(d => new Date(d) >= new Date())
        .map(d => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }));
      if (upcoming.length > 0)
        ctx += `UPCOMING HOLIDAYS (gym closed): ${upcoming.join(", ")}\n\n`;
    }

    if (pricing.length > 0) {
      ctx += "MEMBERSHIP PLANS:\n";
      for (const p of pricing)
        if (p.price) ctx += `- ${p.name}: ₹${p.price} (${p.duration_days} days)\n`;
      ctx += "\n";
    }

    if (dietPlans.length > 0) {
      ctx += "SAVED DIET PLANS (use these when a member's goal matches — personalise based on their stats):\n";
      ctx += "IMPORTANT: For all non-veg plans, ONLY use chicken, eggs, fish, or mutton. NEVER suggest beef or pork.\n";
      for (const d of dietPlans) {
        ctx += `\nPlan: ${d.title}\nGoal: ${d.goal.replace(/_/g, " ")}\n`;
        if (d.calories) ctx += `Calories: ${d.calories} kcal/day\n`;
        if (d.protein)  ctx += `Protein: ${d.protein}g | Carbs: ${d.carbs||"?"}g | Fats: ${d.fats||"?"}g\n`;
        if (d.meals)    ctx += `Meals: ${d.meals}\n`;
        if (d.notes)    ctx += `Notes: ${d.notes}\n`;
      }
      ctx += "\n";
    }

    ctx += "JOINING NUDGE: When someone seems interested in joining (asking about plans, facilities, timings) → answer their question AND add a warm nudge like 'Agar join karna ho toh directly gym aa sakte ho ya mujhe batao!'\n";
    ctx += "MEMBERSHIP/ATTENDANCE QUERIES: Tell them to check the member portal or speak to the front desk.\n";
    ctx += "NON-VEG DIET (all plans): ONLY chicken, eggs, fish, mutton. NEVER beef or pork — strict Indian cultural rule.\n";
    ctx += "VEG DIET (all plans): paneer, dal, rajma, chana, soya chunks, tofu, curd, milk, whey protein, nuts, seeds, peanut butter.";

    gymContextCache    = ctx;
    gymContextCachedAt = Date.now();
    return ctx;
  } catch { return buildDefaultContext(); }
}

function buildDefaultContext() {
  return `You are OptimusBot — the friendly WhatsApp assistant for Optimus Gym, India.

OUTPUT RULE: Write ONLY the final WhatsApp reply. No thinking, no reasoning, no internal notes.

PERSONALITY: Warm, encouraging gym buddy. Mirror the user's energy. Short, human replies.
LANGUAGE RULES:
1. Detect the language of the customer's LAST message.
2. Reply in exactly the same language.
3. English -> English.
4. Hindi -> Hindi.
5. Punjabi -> Punjabi.
6. Hinglish -> Hinglish.
7. Never switch languages on your own.
8. Never greet in Hindi if the customer wrote in English.

SOCIAL MESSAGES: Always reply warmly to greetings, thanks, compliments, goodbyes. Never refuse them.
FEEDBACK: 👍 / "helpful" → thank warmly. 👎 / "not helpful" → apologise and ask how to improve.

TOPICS: Help with gym timings, membership, diet, workouts, fitness goals, recovery, sleep/hydration as related to fitness, motivation.
Refuse only clearly unrelated topics (relationships, politics, finance) — do it warmly, not rigidly.

DIET PLAN FLOW (personalised plans only):
1) Veg or non-veg? 2) Age 3) Height 4) Weight 5) Goal — ask ONE at a time.
Quick tips → answer directly without collecting stats.
NON-VEG: ONLY chicken, eggs, fish, mutton. NEVER beef or pork — strict Indian dietary rule.
VEG: paneer, dal, rajma, soya, tofu, curd, whey, nuts.

WORKOUT FLOW: Age → level (beginner/intermediate/advanced) → goal. ONE at a time.
MEMBERSHIP: Answer warmly + nudge interested users to visit. Share pricing only if asked.
UNCLEAR INPUT: Ask one short clarifying question instead of refusing.
FORMAT: WhatsApp markdown (*bold*, dashes, blank lines). No tables, no ### headers.`;
}

// ── Format AI reply for WhatsApp ──────────────────────────────────────────────
function formatForWhatsApp(text) {
  let t = text;
  t = t.replace(/<think[\s\S]*?<\/think>/gi, "");
  t = t.replace(/<thinking[\s\S]*?<\/thinking>/gi, "");
  t = t.replace(/^\*\s+\w[\w\s]+:\s+.+\.\*?\s*$/gm, "");
  t = t.replace(/^User says:.*$/gm, "");
  t = t.replace(/\*\*(.+?)\*\*/g, "*$1*");
  t = t.replace(/^#{1,3}\s+(.+)$/gm, "*$1*");
  t = t.replace(/\n{3,}/g, "\n\n");
  return t.trim();
}

// ── Detect feedback sentiment from user message ────────────────────────────────
function detectFeedback(body) {
  const lower = body.toLowerCase().trim();
  if (/^(👍|helpful|good bot|nice|bahut accha|shukriya|great|amazing|perfect|superb|thanks a lot|bohot acha)/.test(lower))
    return "positive";
  if (/^(👎|not helpful|wrong answer|galat|bad|poor|useless|worst|kuch nahi aaya|bekaar)/.test(lower))
    return "negative";
  return null;
}

// ── AI Models ─────────────────────────────────────────────────────────────────
const ALL_MODELS = [
  // ── OpenRouter ──────────────────────────────────────────────────────────────
  { id: "or_llama33",    provider: "openrouter", model: "meta-llama/llama-3.3-70b-instruct:free",                    label: "Llama 3.3 70B"        },
  { id: "or_gptoss120",  provider: "openrouter", model: "openai/gpt-oss-120b:free",                                  label: "GPT-OSS 120B"          },
  { id: "or_gptoss20",   provider: "openrouter", model: "openai/gpt-oss-20b:free",                                   label: "GPT-OSS 20B"           },
  { id: "or_nem120",     provider: "openrouter", model: "nvidia/nemotron-3-super-120b-a12b:free",                    label: "Nemotron Super 120B"   },
  { id: "or_nem550",     provider: "openrouter", model: "nvidia/nemotron-3-ultra-550b-a55b:free",                    label: "Nemotron Ultra 550B"   },
  { id: "or_nem30",      provider: "openrouter", model: "nvidia/nemotron-3-nano-30b-a3b:free",                       label: "Nemotron Nano 30B"     },
  { id: "or_nem30o",     provider: "openrouter", model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",        label: "Nemotron Nano Omni"    },
  { id: "or_nem12",      provider: "openrouter", model: "nvidia/nemotron-nano-12b-v2-vl:free",                       label: "Nemotron Nano VL 12B"  },
  { id: "or_nem9",       provider: "openrouter", model: "nvidia/nemotron-nano-9b-v2:free",                           label: "Nemotron Nano 9B"      },
  { id: "or_kimi",       provider: "openrouter", model: "moonshotai/kimi-k2.6:free",                                 label: "Kimi K2.6"             },
  { id: "or_qwencoder",  provider: "openrouter", model: "qwen/qwen3-coder:free",                                     label: "Qwen3 Coder"           },
  { id: "or_qwennext",   provider: "openrouter", model: "qwen/qwen3-next-80b-a3b-instruct:free",                     label: "Qwen3 Next 80B"        },
  { id: "or_glm45",      provider: "openrouter", model: "z-ai/glm-4.5-air:free",                                     label: "GLM 4.5 Air"           },
  { id: "or_gemma431",   provider: "openrouter", model: "google/gemma-4-31b-it:free",                                label: "Gemma 4 31B (OR)"      },
  { id: "or_gemma426",   provider: "openrouter", model: "google/gemma-4-26b-a4b-it:free",                            label: "Gemma 4 26B (OR)"      },
  { id: "or_hermes",     provider: "openrouter", model: "nousresearch/hermes-3-llama-3.1-405b:free",                 label: "Hermes 3 405B"         },
  { id: "or_dolphin",    provider: "openrouter", model: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free", label: "Dolphin Mistral 24B" },
  { id: "or_llama32_3b", provider: "openrouter", model: "meta-llama/llama-3.2-3b-instruct:free",                    label: "Llama 3.2 3B"          },
  // ── Gemini ──────────────────────────────────────────────────────────────────
  { id: "gm_25flash",     provider: "gemini", model: "gemini-2.5-flash",                       label: "Gemini 2.5 Flash"      },
  { id: "gm_25flashlite", provider: "gemini", model: "gemini-2.5-flash-lite-preview-06-17",    label: "Gemini 2.5 Flash Lite" },
  { id: "gm_31flashlite", provider: "gemini", model: "gemini-3.1-flash-lite",                  label: "Gemini 3.1 Flash Lite" },
  { id: "gm_31pro",       provider: "gemini", model: "gemini-3.1-pro",                         label: "Gemini 3.1 Pro"        },
  { id: "gm_3flash",      provider: "gemini", model: "gemini-3-flash",                         label: "Gemini 3 Flash"        },
  { id: "gm_gemma426",    provider: "gemini", model: "gemma-3-27b-it",                         label: "Gemma 4 26B"           },
  { id: "gm_gemma431",    provider: "gemini", model: "gemma-4-31b",                            label: "Gemma 4 31B"           },
];

const MAIN_MODELS = [
  { provider: "openrouter", model: "openai/gpt-oss-120b:free"            },
  { provider: "openrouter", model: "openai/gpt-oss-20b:free"             },
  { provider: "gemini",     model: "gemini-3.1-flash-lite"               },
  { provider: "gemini",     model: "gemini-2.5-flash"                    },
];

// MAIN_MODELS tried first, then the rest of ALL_MODELS as fallback
const MODEL_SEQUENCE = [
  ...MAIN_MODELS,
  ...ALL_MODELS.filter(m => !MAIN_MODELS.some(mm => mm.model === m.model && mm.provider === m.provider)),
];

async function callOpenRouter(messages, model) {
  const res = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization:  `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://optimus.gym",
      "X-Title":      "OptimusGym Bot",
    },
    body: JSON.stringify({ model, messages, max_tokens: 400, temperature: 0.65, include_reasoning: false }),
    signal: AbortSignal.timeout(20000), // 20s timeout per model
  });
  const data = await res.json();
  if (res.status === 429 || (data?.error?.message||"").match(/rate.?limit|quota/i))
    throw Object.assign(new Error("rate_limit"), { isRateLimit: true });
  if (!res.ok || data.error)
    throw new Error(`openrouter_error(${model}): ${data?.error?.message || res.status}`);
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error(`empty_response(${model})`);
  return {
    text,
    inputTokens:  data.usage?.prompt_tokens     || 0,
    outputTokens: data.usage?.completion_tokens || 0,
    totalTokens:  data.usage?.total_tokens      || 0,
  };
}

async function callGemini(messages, model) {
  if (!GEMINI_API_KEY) throw new Error("no_gemini_key");
  const systemMsg = messages.find(m => m.role === "system")?.content || "";
  const geminiContents = messages
    .filter(m => m.role !== "system")
    .map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  const res  = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemMsg }] },
      contents:           geminiContents,
      generationConfig:   { maxOutputTokens: 400, temperature: 0.65 },
    }),
    signal: AbortSignal.timeout(20000), // 20s timeout per model
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    if (res.status === 429 || (data?.error?.message||"").match(/rate.?limit|quota/i))
      throw Object.assign(new Error("rate_limit"), { isRateLimit: true });
    throw new Error(`gemini_error(${model}): ${data?.error?.message || res.status}`);
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error(`gemini_empty(${model})`);
  return {
    text,
    inputTokens:  data.usageMetadata?.promptTokenCount     || 0,
    outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
    totalTokens:  data.usageMetadata?.totalTokenCount      || 0,
  };
}

async function callModel(m, messages) {
  if (m.provider === "openrouter") {
    if (!OPENROUTER_API_KEY) throw new Error("no_key");
    return callOpenRouter(messages, m.model);
  }
  if (m.provider === "gemini") {
    if (!GEMINI_API_KEY) throw new Error("no_key");
    return callGemini(messages, m.model);
  }
  throw new Error("unknown_provider");
}

// ── Generate chat crux ────────────────────────────────────────────────────────
async function generateChatCrux(jid, history, contactName) {
  if (!history || history.length < 2) return null;
  const chatText = history.map(h => `${h.role === "user" ? "User" : "Bot"}: ${h.content}`).join("\n");
  const cruxPrompt = [
    { role: "system", content: `You are a CRM data extractor for a gym. Analyze a WhatsApp chat and return ONLY a valid JSON object (no markdown, no explanation) with these exact fields:
{"summary":"2-3 sentence summary of why the person messaged","main_topics":["topic1"],"asked_about":["diet|timing|membership|workout|pricing|other"],"diet_preference":"veg|non-veg|unknown","joining_interest":"high|medium|low|unknown","joining_reason":"one line explanation"}` },
    { role: "user", content: `Contact: ${contactName || "Unknown"}\n\nChat:\n${chatText.slice(0, 3000)}` },
  ];
  for (const m of MODEL_SEQUENCE) {
    try {
      const result = await callModel(m, cruxPrompt);
      const clean  = result.text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      return parsed;
    } catch { continue; }
  }
  return null;
}

// ── Name confirmation flow ────────────────────────────────────────────────────
async function handleNameConfirmation(jid, body, meta, contact) {
  if (meta.nameConfirmed) return null;

  const isEnglish = /^[a-zA-Z0-9\s.,!?'"()-]+$/.test(body);

  if (meta.awaitingNameConfirm) {
    const lower = body.toLowerCase().trim();
    const isYes = /^(yes|ha|haan|haa|correct|right|bilkul|sahi|ok|okay|yep|yup|👍)/.test(lower);
    const isNo  = /^(no|nahi|nope|wrong|galat|change|different|mera naam)/.test(lower);

    if (isYes) {
      meta.nameConfirmed = true; meta.awaitingNameConfirm = false;
      await updateContact(jid, { name: meta.pendingName, name_confirmed: true });
      return isEnglish 
        ? `Great! Welcome to Optimus Gym, *${meta.pendingName}* 🎉\nHow can I help you today? 💪`
        : `Great! Welcome to Optimus Gym, *${meta.pendingName}* 🎉\nKya help kar sakta hoon aaj? 💪`;
    }

    if (isNo || body.length > 2) {
      const providedName = isNo ? null : body.trim().replace(/^(mera naam|my name is|i am|main hoon)\s*/i, "").trim();
      if (providedName && providedName.length > 1 && providedName.length < 50) {
        meta.pendingName = providedName; meta.nameConfirmed = true; meta.awaitingNameConfirm = false;
        await updateContact(jid, { name: providedName, name_confirmed: true });
        return isEnglish
          ? `Got it! Welcome, *${providedName}* 🙌\nHow can I help you? 💪`
          : `Got it! Welcome, *${providedName}* 🙌\nKya help kar sakta hoon? 💪`;
      } else {
        meta.awaitingNameConfirm = false; meta.awaitingName = true;
        return isEnglish
          ? "No problem! What's your name? 😊"
          : "Koi baat nahi! Apna naam bata do 😊";
      }
    }
  }

  if (meta.awaitingName) {
    const name = body.trim().replace(/^(mera naam|my name is|i am|main hoon)\s*/i, "").trim();
    if (name.length > 1 && name.length < 50) {
      meta.pendingName = name; meta.nameConfirmed = true; meta.awaitingName = false;
      await updateContact(jid, { name, name_confirmed: true });
      return isEnglish
        ? `Nice to meet you, *${name}* 🙌\nHow can I help you? 💪`
        : `Nice to meet you, *${name}* 🙌\nKya help kar sakta hoon? 💪`;
    }
    return isEnglish
      ? "Please share your name so I can help you better 😊"
      : "Apna naam share karo toh main better help kar sakta hoon 😊";
  }

  if (!contact || !contact.name_confirmed) {
    const whatsappName = meta.whatsappName;
    if (whatsappName && whatsappName.length > 1) {
      meta.pendingName = whatsappName; meta.awaitingNameConfirm = true;
      return isEnglish
        ? `Hi! 👋 Welcome to *Optimus Gym*!\nIs your name *${whatsappName}*?\n\nReply *Yes* to confirm or type your correct name 😊`
        : `Hi! 👋 Welcome to *Optimus Gym*!\nKya aapka naam *${whatsappName}* hai?\n\nReply *Yes* to confirm or type your correct name 😊`;
    } else {
      meta.awaitingName = true;
      return isEnglish
        ? `Hi! 👋 Welcome to *Optimus Gym*!\nMay I know your name? 😊`
        : `Hi! 👋 Welcome to *Optimus Gym*!\nAapka naam kya hai? 😊`;
    }
  }
  return null;
}

// ── Main AI reply ─────────────────────────────────────────────────────────────
async function askAI(userJid, userMessage, contact) {
  if (!OPENROUTER_API_KEY && !GEMINI_API_KEY)
    return "Hi! I'm OptimusBot 💪 No AI key configured yet. Please contact the gym admin.";

  const gymContext     = await getGymContext();
  const history        = conversations.get(userJid) || [];
  const meta           = userMeta.get(userJid) || {};
  const isFirstMessage = history.length === 0;
  const knownName      = meta.name || contact?.name;
  const whatsappName   = meta.whatsappName;

  let systemExtra = "";
  if (knownName)
    systemExtra += `\nUser's confirmed name: ${knownName}. Use it occasionally in replies.`;
  else if (whatsappName)
    systemExtra += `\nUser's WhatsApp display name: ${whatsappName}. You can use this to address them until they confirm.`;
  if (isFirstMessage)
    systemExtra += `\nThis is the user's FIRST message. Greet them warmly, introduce yourself briefly, and ask for their name naturally.`;

  const messages = [
    { role: "system", content: gymContext + systemExtra },
    ...history,
    { role: "user",   content: userMessage },
  ];

  let result    = null;
  let usedModel = null;
  for (const m of MODEL_SEQUENCE) {
    try {
      result = await callModel(m, messages);
      if (result) {
        usedModel = m;
        console.log(`✅ ${m.provider}/${m.model} | tokens:${result.totalTokens}`);
        break;
      }
    } catch (err) {
      console.warn(`⚠️  ${m.provider}/${m.model} failed: ${err.message}`);
      continue;
    }
  }

  if (!result) {
    console.error("All fallback models failed.");
    return "Sorry yaar, abhi kuch problem aa rahi hai. Thodi der baad try karo ya gym pe aa jao! 💪";
  }

  const reply = formatForWhatsApp(result.text);

  history.push({ role: "user",      content: userMessage });
  history.push({ role: "assistant", content: reply });
  if (history.length > MAX_HISTORY * 2)
    history.splice(0, history.length - MAX_HISTORY * 2);
  conversations.set(userJid, history);

  if (usedModel) {
    saveTokenUsage(userJid, usedModel.provider, usedModel.model, result, knownName || whatsappName)
      .catch(console.error);
  }

  return reply;
}

// ── Business hours awareness ──────────────────────────────────────────────────
// Returns a context string if the current time is outside gym hours, else "".
async function getBusinessHoursContext() {
  try {
    const rows = await supabaseGet("settings?key=eq.gym_timing&limit=1");
    if (!rows?.length) return "";
    const timing   = rows[0].value || {};
    const schedule = timing.schedule || {};
    const days     = ["sun","mon","tue","wed","thu","fri","sat"];
    const now      = new Date();
    const dayKey   = days[now.getDay()];
    const dayData  = schedule[dayKey];
    if (!dayData || dayData.closed) return " [Note: Gym is closed today — mention this naturally if relevant]";
    const [oh, om] = (dayData.open  || "06:00").split(":").map(Number);
    const [ch, cm] = (dayData.close || "22:00").split(":").map(Number);
    const nowMins  = now.getHours() * 60 + now.getMinutes();
    const openMins = oh * 60 + om;
    const closeMins= ch * 60 + cm;
    if (nowMins < openMins)
      return ` [Note: Gym opens at ${dayData.open} today — mention this naturally if relevant]`;
    if (nowMins >= closeMins)
      return ` [Note: Gym closed at ${dayData.close} today — mention this naturally if relevant]`;
    return "";
  } catch { return ""; }
}

// ── Save crux milestone ───────────────────────────────────────────────────────
async function maybeSaveCrux(jid) {
  const history = conversations.get(jid) || [];
  if (history.length < 4) return;
  if (history.length % 10 !== 0 && history.length !== 4) return;

  const meta    = userMeta.get(jid) || {};
  const contact = await getContact(jid);
  const name    = meta.name || contact?.name || "Unknown";

  console.log(`📊 Generating chat crux for ${jid}…`);
  const crux = await generateChatCrux(jid, history, name);
  if (!crux) return;

  await saveChatCrux(jid, {
    contact_name:     name,
    summary:          crux.summary          || "",
    main_topics:      crux.main_topics      || [],
    asked_about:      crux.asked_about      || [],
    diet_preference:  crux.diet_preference  || "unknown",
    joining_interest: crux.joining_interest || "unknown",
    joining_reason:   crux.joining_reason   || "",
    message_count:    Math.floor(history.length / 2),
  });
  console.log(`✅ Crux saved for ${jid}`);

  // Alert admin if high interest lead detected
  if (crux.joining_interest === "high") {
    alertAdminHighInterest(jid, name, crux.joining_reason).catch(() => {});
  }
}

// ── Build WhatsApp client ─────────────────────────────────────────────────────
function buildClient() {
  return new Client({
    authStrategy: new LocalAuth({ dataPath: path.join(__dirname, "wwebjs_auth") }),
    puppeteer:    { headless: true, args: PUPPETEER_ARGS },
    webVersionCache: { type: "local", path: path.join(__dirname, ".wwebjs_cache") },
  });
}

// ── Start WhatsApp client ─────────────────────────────────────────────────────
function startClient(phone) {
  if (client) { try { client.destroy(); } catch {} client = null; }
  pendingPhone = phone;
  pairingCode  = null;

  const c = buildClient();
  client  = c;
  let pairingRequested = false;

  c.on("qr", async () => {
    if (pairingRequested) return;
    pairingRequested = true;
    botState = "pairing";
    console.log("📱 QR ready — requesting pairing code for", phone);
    try {
      pairingCode = await c.requestPairingCode(phone);
      console.log(`✓ Pairing code: ${pairingCode}`);
    } catch (err) {
      console.error("requestPairingCode failed:", err.message);
      setTimeout(async () => {
        try {
          pairingCode = await c.requestPairingCode(phone);
          console.log(`✓ Pairing code (retry): ${pairingCode}`);
        } catch (err2) {
          console.error("requestPairingCode retry failed:", err2.message);
          botState = "auth_failed";
        }
      }, 3000);
    }
  });

  c.on("loading_screen", (pct) => console.log(`⏳ Loading: ${pct}%`));

  c.on("authenticated", () => {
    console.log("✅ WhatsApp authenticated");
    pairingCode = null;
    botState    = "ready";
  });

  c.on("auth_failure", (msg) => {
    console.error("❌ Auth failure:", msg);
    botState    = "auth_failed";
    pairingCode = null;
    client      = null;
  });

  c.on("ready", () => {
    console.log("✅ WhatsApp bot is READY");
    botState    = "ready";
    pairingCode = null;
    if (pendingPhone) savePhone(pendingPhone); // persist phone for manual reconnect
  });

  c.on("disconnected", (reason) => {
    console.log("⚡ Disconnected:", reason);
    client      = null;
    pairingCode = null;
    // No auto-reconnect — set state so UI shows manual reconnect button
    botState = "disconnected";
    console.log("ℹ️  Session disconnected. Use the dashboard to reconnect manually.");
  });

  c.on("message", async (msg) => {
    console.log("\n=== INCOMING MESSAGE DATA ===");
    console.log(msg);
    console.log("==============================\n");

    if (msg.from === "status@broadcast" || msg.isStatus) return;
    if (msg.from.endsWith("@g.us") || msg.fromMe) return;

    const rawBody = (msg.body || "").trim();
    if (!rawBody) return;

    const jid   = msg.from;
    let   phone = phoneFromJid(jid);
    let   pushname = null;
    try {
      const contactData = await msg.getContact();
      if (contactData?.number) phone = contactData.number;
      pushname = contactData?.pushname || msg._data?.notifyName || null;
    } catch {
      pushname = msg._data?.notifyName || null;
    }

    const contact = await upsertContact(jid, phone, pushname);

    // ── Security: sanitise input before any processing ────────────────────
    const body = sanitiseInput(rawBody);
    if (!body) return;
    console.log(`📩 ${jid}: ${body}`);

    if (!userMeta.has(jid)) userMeta.set(jid, {});
    const meta = userMeta.get(jid);
    if (!meta.whatsappName && pushname) meta.whatsappName = pushname;

    // ── 5. Business hours context ─────────────────────────────────────────
    const hoursCtx = await getBusinessHoursContext();

    // ── 6. AI reply ───────────────────────────────────────────────────────
    try {
      const originalCache = gymContextCache;
      if (hoursCtx) gymContextCache = (gymContextCache || "") + hoursCtx;
      const reply = await askAI(jid, body, contact);
      gymContextCache = originalCache;
      await msg.reply(reply);
    } catch (err) {
      console.error("Reply error:", err.message);
    }

    // ── 7. Crux milestone (async, non-blocking) ───────────────────────────
    maybeSaveCrux(jid).catch(e => console.error("Crux error:", e.message));
  });

  c.initialize().catch(err => {
    console.error("initialize() error:", err.message);
    botState = "disconnected";
    client   = null;
  });
}

// ── Auth middleware ───────────────────────────────────────────────────────────
function auth(req, res, next) {
  const secret = req.headers["x-bot-secret"] || req.query.secret;
  // Constant-time comparison to prevent timing attacks
  if (!secret || secret.length !== BOT_SECRET.length) return res.status(401).json({ error: "Unauthorized" });
  let diff = 0;
  for (let i = 0; i < BOT_SECRET.length; i++) diff |= secret.charCodeAt(i) ^ BOT_SECRET.charCodeAt(i);
  if (diff !== 0) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// ── API Routes ────────────────────────────────────────────────────────────────
app.get("/status", auth, (_req, res) => {
  res.json({ state: botState, pairingCode: pairingCode || null, hasPairingCode: Boolean(pairingCode), phone: pendingPhone });
});

app.post("/start-pairing", auth, (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: "phone required" });
  const normalized = String(phone).replace(/\D/g, "");
  const withCode   = normalized.length === 10 ? "91" + normalized : normalized;
  if (!/^\d{11,15}$/.test(withCode)) return res.status(400).json({ error: "Invalid phone number" });
  botState = "pairing"; pairingCode = null;
  startClient(withCode);
  res.json({ success: true, state: "pairing" });
});

app.post("/disconnect", auth, async (_req, res) => {
  try { if (client) { await client.logout(); await client.destroy(); client = null; } } catch {}
  botState = "idle"; pairingCode = null; pendingPhone = null;
  clearPhone(); conversations.clear(); userMeta.clear(); lastActivityMap.clear();
  res.json({ success: true });
});

app.post("/reconnect", auth, (req, res) => {
  const phone = pendingPhone || savedPhone();
  if (!phone) return res.status(400).json({ error: "No saved phone — pair first" });
  if (botState === "ready") return res.json({ success: true, state: "ready" });
  botState = "pairing";
  startClient(phone);
  res.json({ success: true, state: "reconnecting" });
});

app.post("/reset", auth, async (_req, res) => {
  try { if (client) { await client.destroy(); client = null; } } catch {}
  botState = "idle"; pairingCode = null; pendingPhone = null;
  clearPhone();
  res.json({ success: true });
});

app.post("/send", auth, async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) return res.status(400).json({ error: "to and message required" });
  // Validate destination format
  const toClean = String(to).replace(/\D/g, "");
  if (!/^\d{10,15}$/.test(toClean)) return res.status(400).json({ error: "Invalid 'to' number" });
  if (typeof message !== "string" || message.length > 4096)
    return res.status(400).json({ error: "message must be a string ≤ 4096 chars" });
  if (botState !== "ready") return res.status(503).json({ error: "Bot not ready" });
  try {
    const chatId = to.includes("@") ? to : `${toClean}@c.us`;
    await client.sendMessage(chatId, message);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/contacts", auth, async (_req, res) => {
  const rows = await supabaseGet("whatsapp_contacts?order=last_seen.desc&limit=200");
  res.json(rows || []);
});

app.delete("/contact/:jid", auth, async (req, res) => {
  const jid = decodeURIComponent(req.params.jid);
  if (!/^\d+(?::\d+)?@[a-z.]+$/.test(jid)) return res.status(400).json({ error: "Invalid JID format" });

  const filter = `jid=eq.${encodeURIComponent(jid)}`;
  await Promise.allSettled([
    supabaseDelete("whatsapp_contacts", filter),
    supabaseDelete("chat_crux", filter),
    supabaseDelete("bot_feedback", filter),
    supabaseDelete("chat_tokens", filter)
  ]);

  conversations.delete(jid);
  userMeta.delete(jid);
  res.json({ success: true });
});

app.delete("/contact/:jid", auth, async (req, res) => {
  const jid = decodeURIComponent(req.params.jid);
  if (!/^\d+(?::\d+)?@[a-z.]+$/.test(jid)) return res.status(400).json({ error: "Invalid JID format" });

  const filter = `jid=eq.${encodeURIComponent(jid)}`;
  await Promise.allSettled([
    supabaseDelete("whatsapp_contacts", filter),
    supabaseDelete("chat_crux", filter),
    supabaseDelete("bot_feedback", filter),
    supabaseDelete("chat_tokens", filter)
  ]);

  conversations.delete(jid);
  userMeta.delete(jid);
  res.json({ success: true });
});

app.get("/crux/:jid", auth, async (req, res) => {
  const jid = decodeURIComponent(req.params.jid);
  // Validate JID format before querying
  if (!/^\d+@c\.us$/.test(jid)) return res.status(400).json({ error: "Invalid JID format" });
  const rows = await supabaseGet(`chat_crux?jid=eq.${encodeURIComponent(jid)}&limit=1`);
  res.json(rows?.length ? rows[0] : null);
});

// High-interest leads list — useful for admin dashboard
app.get("/leads", auth, async (_req, res) => {
  const rows = await supabaseGet("chat_crux?joining_interest=eq.high&order=updated_at.desc&limit=100");
  res.json(rows || []);
});

// Feedback summary
app.get("/feedback", auth, async (_req, res) => {
  const rows = await supabaseGet("bot_feedback?order=created_at.desc&limit=200");
  res.json(rows || []);
});

app.get("/health", (_req, res) => res.json({ ok: true, state: botState, ts: new Date().toISOString() }));

// ── Global error handler — never leak stack traces to client ──────────────────
app.use((err, _req, res, _next) => {
  console.error("Unhandled express error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, "127.0.0.1", () => {
  // Bind to 127.0.0.1 only — never expose directly to the internet
  console.log(`\n🤖 OptimusWhatsApp Bot on port ${PORT} (localhost only)`);
  console.log(`   OpenRouter: ${OPENROUTER_API_KEY ? "✓" : "✗ NOT SET"}`);
  console.log(`   Gemini:     ${GEMINI_API_KEY     ? "✓" : "✗ not set (optional)"}`);
  console.log(`   Supabase:   ${SUPABASE_URL        ? "✓" : "✗ NOT SET"}`);
  console.log(`   Admin WA:   ${ADMIN_WHATSAPP      ? `+${ADMIN_WHATSAPP}` : "not set (alerts disabled)"}`);

  const phone = savedPhone();
  if (phone) {
    console.log(`\n🔁 Restoring session for +${phone}…`);
    pendingPhone = phone;
    botState     = "pairing";
    startClient(phone);
  } else {
    console.log("   No saved session — waiting for pairing.\n");
  }
});