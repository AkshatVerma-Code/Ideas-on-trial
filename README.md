# Ideas on Trial — Project README

## Tech Stack
- **Next.js 15** (App Router, TypeScript)
- **Tailwind CSS** — Courtroom/Startup dark theme
- **Supabase** — PostgreSQL database + Row Level Security
- **Framer Motion** — Animations
- **Lucide React** — Icons
- **jose** — JWT auth

---

## Quick Setup

### 1. Supabase Setup
1. Go to [supabase.com](https://supabase.com) → Create a new project
2. Go to **SQL Editor** → Paste the contents of `supabase/schema.sql` → Run
3. Go to **Project Settings → API** → Copy:
   - `Project URL`
   - `anon public` key
   - `service_role secret` key

### 2. Environment Variables
Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_PASSWORD=your-secure-password
JWT_SECRET=a-long-random-secret-at-least-32-chars
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Participant landing — team name entry |
| `/quiz` | Quiz flow with timer per question |
| `/quiz/complete` | Score & results page |
| `/admin` | Admin login |
| `/admin/dashboard` | Stats, quiz open/close toggle |
| `/admin/questions` | Create/Edit/Delete questions & set option weights |
| `/admin/participants` | View all teams, scores, export CSV |
| `/admin/settings` | Timer defaults, quiz title, danger zone |

---

## Security Features
- ✅ Team name deduplication (normalized + database unique constraint)
- ✅ JWT tokens per participant (expire in 4h)
- ✅ Server-side answer validation (can't submit for another team)
- ✅ Admin JWT stored in HttpOnly cookie (not accessible via JS)
- ✅ Middleware protects all `/admin/*` routes server-side
- ✅ Questions not exposed without valid participant session token
- ✅ Each question can only be answered once per participant
- ✅ Quiz completion is idempotent (safe to call twice)

---

## Scoring System
Each option has a **weight** (1–10). When a participant selects an option, they earn `weight` points. Options are displayed without showing the weight to participants. Admin sets weights when creating questions (e.g., 4-3-2-1 for a 4-option question).

---

## Admin Workflow
1. Log in at `/admin` with your `ADMIN_PASSWORD`
2. Go to **Questions** → Add questions with weighted options
3. Go to **Settings** → Set quiz title, default timer
4. Go to **Dashboard** → Toggle quiz **Open** when ready
5. Monitor participants in real-time via **Participants** tab
6. Export results as CSV via the Download button
