<div align="center">

# 📚 Syllabify

### Upload your syllabus. Never miss a deadline.

AI-powered syllabus parser that extracts deadlines, enables RAG-based Q&A, tracks your grades, and sends personalized reminders — all from a single PDF upload.

[![Next.js](https://img.shields.io/badge/Next.js_14-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![Firebase](https://img.shields.io/badge/Firebase-FF6C37?style=flat-square&logo=firebase&logoColor=white)](https://firebase.google.com)
[![OpenAI](https://img.shields.io/badge/GPT--4o-412991?style=flat-square&logo=openai&logoColor=white)](https://openai.com)
[![Pinecone](https://img.shields.io/badge/Pinecone-00A67E?style=flat-square)](https://pinecone.io)
[![Twilio](https://img.shields.io/badge/Twilio-F22F46?style=flat-square&logo=twilio&logoColor=white)](https://twilio.com)

</div>

---

## What is Syllabify?

Students receive syllabi at the start of every semester and are expected to manually track dozens of deadlines across multiple courses. Syllabify eliminates that entirely.

Upload a PDF syllabus → GPT-4o extracts every assignment, deadline, and grade weight → your Google Calendar is populated automatically → three powerful features unlock instantly.

---

## Features

### 📄 Intelligent PDF Parsing
Upload any course syllabus PDF. GPT-4o extracts all assignments as structured data — title, due date, type (exam / paper / quiz / lab), and grade weight. Events are created in Google Calendar automatically, color-coded by assignment type.

### 💬 Chat with Your Syllabus
Ask natural-language questions about any course policy, grading rule, or deadline. A RAG pipeline (Retrieval-Augmented Generation) retrieves the most relevant chunks from your syllabus and grounds every answer in the actual document — with a source citation.

> *"What happens if I miss a lab?"*
> *"Can I submit assignments late?"*
> *"How much is the group project worth compared to the final?"*

### 📊 Grade Weight Tracker
Log your scores as the semester progresses. The app calculates your running weighted grade in real time. Set a target grade (A, B+, etc.) and the **what-if calculator** shows exactly what score you need on every remaining assignment to hit it.

### 🔔 Smart Reminders
Receive personalized SMS and email reminders before every deadline. Reminders are enriched with your grade context — not just "assignment due soon" but *"CHEM 101 Lab Report in 2 days — you need a 78% to stay on track for your B+."*

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React, Tailwind CSS |
| Backend | Firebase Cloud Functions (Python) |
| Database | Firestore |
| File Storage | Firebase Storage |
| Vector Database | Pinecone |
| Job Scheduling | Firebase Cloud Tasks |
| Auth | Firebase Auth (Google OAuth) |
| AI — Extraction & Chat | OpenAI GPT-4o |
| AI — Embeddings | OpenAI text-embedding-3-small |
| PDF Parsing | pdfplumber, pytesseract (OCR fallback) |
| SMS | Twilio |
| Email | SendGrid |
| Calendar | Google Calendar API |
| Hosting | Firebase Hosting |

---

## Architecture Overview

```
Student uploads PDF
        │
        ▼
Firebase Storage ──► Cloud Function: onSyllabusUploaded
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       pdfplumber         GPT-4o          Embeddings
      (text extract)    (parse JSON)    (Pinecone upsert)
              │               │
              │               ▼
              │         Firestore
              │       (assignments,
              │        grade weights)
              │               │
              └───────┬───────┘
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
   Google Calendar  Cloud      Dashboard
   (events created) Tasks      (real-time
                 (reminders    Firestore
                 scheduled)    listener)
```

### RAG Pipeline (Chat Feature)

```
PDF text
   │
   ▼
Chunk into 500-token overlapping windows
   │
   ▼
OpenAI text-embedding-3-small → 1536-dim vectors
   │
   ▼
Pinecone upsert (namespaced per syllabus)

── At query time ──────────────────────────
User question → embed → cosine similarity search
   │
   ▼
Top 4 chunks retrieved
   │
   ▼
GPT-4o: "Answer using only these excerpts" → streamed response + citation
```

---

## Firestore Data Model

```
users/{userId}
  ├── email          string
  ├── phone          string
  ├── reminderStyle  "aggressive" | "moderate" | "light"
  ├── calendarToken  string
  └── timezone       string

syllabi/{syllabusId}
  ├── userId             string
  ├── courseName         string
  ├── professor          string
  ├── semester           string
  ├── pdfUrl             string
  ├── pineconeNamespace  string
  └── status             "processing" | "ready" | "error"

assignments/{assignmentId}
  ├── syllabusId       string
  ├── userId           string
  ├── title            string
  ├── type             "exam" | "paper" | "quiz" | "lab" | "homework"
  ├── dueDate          timestamp
  ├── gradeWeight      number
  ├── calendarEventId  string
  └── reminderTaskIds  string[]

grades/{gradeId}
  ├── assignmentId     string
  ├── userId           string
  ├── scoreEarned      number
  ├── scoreMax         number
  ├── percentageScore  number
  └── targetGrade      string
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project with Firestore, Storage, Functions, Auth, and Hosting enabled

### Environment Variables

Create a `.env.local` file in the root:

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# OpenAI
OPENAI_API_KEY=

# Pinecone
PINECONE_API_KEY=
PINECONE_INDEX_NAME=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
TWILIO_VERIFY_SERVICE_SID=

# SendGrid
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=

# Google Calendar
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Set Cloud Function environment variables:

```bash
firebase functions:secrets:set OPENAI_API_KEY
firebase functions:secrets:set PINECONE_API_KEY
firebase functions:secrets:set TWILIO_AUTH_TOKEN
firebase functions:secrets:set SENDGRID_API_KEY
```

### Installation

```bash
# Clone the repo
git clone https://github.com/yourusername/syllabify.git
cd syllabify

# Install frontend dependencies
npm install

# Install Cloud Functions dependencies
cd functions
pip install -r requirements.txt
cd ..

# Login to Firebase
firebase login

# Start local development
npm run dev

# Emulate Firebase locally (separate terminal)
firebase emulators:start
```

### Deploy

```bash
# Deploy everything
firebase deploy

# Deploy only functions
firebase deploy --only functions

# Deploy only hosting
firebase deploy --only hosting
```

---

## Cloud Functions

| Function | Trigger | Description |
|---|---|---|
| `onSyllabusUploaded` | Storage upload | Extracts PDF text, calls GPT-4o, saves assignments, embeds into Pinecone, creates Calendar events, schedules reminders |
| `chatQuery` | HTTPS callable | Embeds question, queries Pinecone, streams GPT-4o response with citations |
| `dispatchReminder` | Cloud Tasks | Fetches assignment + grade data, sends personalized Twilio SMS and SendGrid email |
| `rescheduleReminders` | Firestore update | Cancels old Cloud Tasks, creates new ones when a due date changes |
| `syncCalendarEvent` | Firestore update | Updates Google Calendar event in-place when assignment data changes |
| `verifyPhone` | HTTPS callable | Sends Twilio Verify OTP to provided phone number |
| `confirmPhone` | HTTPS callable | Confirms OTP and saves verified phone to user document |

---

## Security

- **Firestore Security Rules** — every document is scoped to its owner via `userId`. Users can only read and write their own data.
- **API keys** — all third-party keys (OpenAI, Twilio, SendGrid, Pinecone) live exclusively in Cloud Function secrets, never in client code.
- **Google OAuth tokens** — stored server-side only, never exposed to the frontend.
- **Pinecone namespacing** — each syllabus gets an isolated namespace; a query against one course cannot retrieve another course's chunks.
- **Storage rules** — PDF files are access-controlled by Firebase Auth UID.
- **Account deletion** — a single Cloud Function purges all user data: Firestore documents, Storage files, Pinecone namespace, and scheduled Cloud Tasks.

---

## Project Structure

```
syllabify/
├── app/                        # Next.js App Router pages
│   ├── dashboard/              # Main dashboard
│   ├── course/[id]/            # Per-course view
│   │   ├── chat/               # Syllabus Q&A
│   │   └── grades/             # Grade tracker
│   └── onboarding/             # Phone verification + preferences
├── components/                 # Reusable React components
├── lib/                        # Firebase client SDK, helpers
├── functions/                  # Firebase Cloud Functions (Python)
│   ├── main.py                 # Function entry points
│   ├── pdf_processor.py        # pdfplumber + OCR logic
│   ├── ai_extractor.py         # GPT-4o extraction + parsing
│   ├── embedder.py             # Chunking + Pinecone upsert
│   ├── rag_query.py            # Chat RAG pipeline
│   ├── reminder_dispatcher.py  # Twilio + SendGrid dispatch
│   └── requirements.txt
├── firestore.rules             # Security rules
├── storage.rules               # Storage access rules
└── firebase.json
```

---

## Roadmap

- [ ] Multi-syllabus workload heat map (detect crunch weeks across all courses)
- [ ] Canvas / Blackboard LMS API integration
- [ ] Shared class calendars (one upload, whole class benefits)
- [ ] React Native mobile app with home screen widget
- [ ] Study session auto-scheduling before major deadlines
- [ ] Syllabus diff detection (notify when professor updates dates)

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <sub>Built with Next.js · Firebase · OpenAI · Pinecone · Twilio · SendGrid</sub>
</div>
