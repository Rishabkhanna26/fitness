# OptimusGym CRM

A modern, full-featured Gym Management System built with **Next.js 14**, **Tailwind CSS**, and **React Icons**.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Main Dashboard with stats, charts, attendance, revenue |
| `/members` | Members list with search & filter |
| `/members/[id]` | Full member detail page |

## Tech Stack

- **Next.js 14** (App Router)
- **Tailwind CSS** — utility-first styling
- **React Icons** (Feather Icons set)
- **Recharts** — attendance trend line chart

## Setup & Run

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Open in browser
http://localhost:3000
```

## Project Structure

```
Optimus-gym-crm/
├── app/
│   ├── layout.jsx          # Root layout
│   ├── globals.css         # Tailwind + global styles
│   ├── page.jsx            # Dashboard page
│   └── members/
│       ├── page.jsx        # Members list
│       └── [id]/
│           └── page.jsx    # Member detail
├── components/
│   └── Sidebar.jsx         # Navigation sidebar
├── lib/
│   └── data.js             # All member data
├── next.config.js
├── tailwind.config.js
└── package.json
```

## Features

### Dashboard
- 6 stat cards with trend indicators
- 7-day attendance trend chart (Recharts)
- Today's attendance + inactive members table
- Membership expiry alerts with donut chart
- Revenue breakdown with progress bars
- New members this month

### Members Page
- Search by name, email, phone
- Filter by Plan (All / Premium / Standard / Basic)
- Filter by Status (All / Active / Inactive)
- Card grid with avatar, plan badge, visits & payment info
- Click any card → member detail page

### Member Detail Page (4 Sections)
1. **Member Overview** — personal info, membership summary, quick stats
2. **Membership & Services** — current plan features, timeline, history
3. **Attendance & Payment** — attendance log, insights, payment history, financial summary
4. **Notes & Management** — trainer notes, member tags
