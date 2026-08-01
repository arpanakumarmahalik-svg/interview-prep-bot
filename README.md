# HireReady AI 🎙️

**Interview like it's placement day. Every day.**

An AI-powered mock interview platform built for engineering campus placements. Students upload their resume, pick a target company, and go through a realistic 8-stage AI-driven interview — complete with voice interaction, live emotion tracking, and a detailed performance report afterward.

Built as a major project for Diploma in Information Technology, SKDAV Government Polytechnic, Rourkela.

---

## ✨ Features

- **Resume-aware questions** — every question is generated from your actual resume, skills, and projects using Google Gemini, not a generic question bank
- **8-stage structured interview** — Introduction → Educational Background → Technical → Coding → Project → HR → Company Fit → Reverse Q&A
- **Voice-first interaction** — the AI interviewer speaks questions aloud (Text-to-Speech) and listens to your spoken answers (Speech-to-Text), with typing available as a fallback
- **Live emotion detection** — runs entirely in your browser using `face-api.js`, tracking confidence and expression throughout the session
- **Dedicated code editor** — a proper coding environment for the technical coding stage
- **AI-graded answers** — every response is scored on clarity, confidence, and relevance
- **Full session report** — overall score, emotion timeline, strengths, and areas to improve, generated after each interview
- **Dashboard** — track score trends and revisit past interview reports
- **Google Sign-In** — secure authentication via Supabase Auth
- **Light/dark aware, fully responsive** — works across desktop, tablet, and mobile

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Tailwind CSS, Vite |
| Backend | FastAPI (Python) |
| AI | Google Gemini API |
| Database & Auth | Supabase (PostgreSQL + Google OAuth) |
| Emotion Detection | face-api.js (browser-based) |
| Voice | Web Speech API (Speech-to-Text + Speech Synthesis) |
| Charts | Recharts |
| Resume Parsing | pdfplumber |
| Deployment | Backend on Render · Frontend on Netlify |

---

## 🚀 Live Demo

[https://hireready-ai-interview.netlify.app](https://hireready-ai-interview.netlify.app)

> Best experienced on Chrome or Edge for full voice support.

---

## 🏗️ Project Structure

```
hiready-ai/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── routers/
│   │   │   └── resume.py
│   │   └── questions.py
│   │
│   └── requirements.txt
│
└── frontend/
    └── src/
        ├── pages/
        ├── components/
        ├── context/
        ├── hooks/
        └── lib/
```

---

## ⚙️ Running Locally

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate      # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Create `backend/.env`:

SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Create `frontend/.env`:

VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

---

## 🗄️ Database Setup

Run the SQL schema (see `/docs/schema.sql` or Supabase project) to create the `sessions` table used for storing interview history and reports.

---

## 👤 Author

**Arpana Kumar Mahalik**
Diploma in Information Technology, SKDAV Government Polytechnic, Rourkela

## 📄 License

This project was built for academic purposes as a major project submission.

