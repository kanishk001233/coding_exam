# WASM-Based C Coding Test Platform

A lightweight, zero-cost, browser-based C coding test platform engineered for classroom examinations (25–30 simultaneous students).

## ✨ Key Features & Architecture

* **Zero-Cost Client-Side C Execution**: C compilation and execution happen entirely inside the student's browser using isolated Web Workers.
* **No Server-Side GCC or Docker**: Eliminates server-side arbitrary code execution risks and paid cloud execution APIs (Judge0, etc.).
* **Infinite Loop & Crash Protection**: Web Workers enforce strict timeouts (2000ms watchdog) and memory limits, killing runaway loops (`while(1)`) without freezing the user interface.
* **Monaco Code Editor**: Full-featured code editor with C syntax highlighting, shortcuts (<kbd>Ctrl</kbd> + <kbd>Enter</kbd> to run), reset template, and line numbers.
* **Automated Sample & Hidden Test Case Judging**: Evaluates visible sample test cases during "Run Code" and hidden test cases during "Submit" with output normalization.
* **Server-Synced Exam Timer & Auto-Save**: Real-time countdown timer with auto-submit on expiration and 5-second debounced code auto-save.
* **Classroom Monitoring & Anti-Cheat**: Detects and logs student tab-switching and fullscreen exit events.
* **Instructor Command Center**: Create tests, generate join codes (e.g. `C2026A`), manage question bank, monitor live student progress, and export results to CSV.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Local Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:5173`.

### 3. Production Build & Preview
```bash
npm run build
npm run preview
```

---

## 🧪 Phase 3 Diagnostic Benchmark (`/wasm-diagnostics`)

Navigate to the benchmark page by clicking **"WASM Compiler Benchmark"** on the login or join screens. It tests:
1. **Test 1**: `printf("Hello World")` standard output.
2. **Test 2**: `scanf("%d %d", &a, &b)` stdin parsing and summation.
3. **Test 3**: Syntax error trapping with line numbers.
4. **Test 4**: `while(1) {}` infinite loop safe termination within 2000ms.

---

## 📂 Project Structure

```
coding-test-platform/
├── src/
│   ├── components/
│   │   ├── CodeEditor.tsx      # Monaco Editor wrapper
│   │   ├── TestTimer.tsx       # Countdown timer with urgent alerts
│   │   ├── QuestionPanel.tsx   # Problem details and sample cases
│   │   ├── OutputPanel.tsx     # Stdout, custom input, and judge results
│   │   ├── TestHeader.tsx      # Exam header bar with auto-save & timer
│   │   └── StudentList.tsx     # Teacher classroom live monitor
│   ├── pages/
│   │   ├── Login.tsx           # Teacher sign-in (with Demo access)
│   │   ├── JoinTest.tsx        # Student join screen (Name, Roll No, Code)
│   │   ├── StudentTest.tsx     # Student exam interface
│   │   ├── TeacherDashboard.tsx# Active tests, question bank & monitor
│   │   ├── CreateTest.tsx      # Test creation wizard
│   │   ├── TestEditor.tsx      # Question & test case editor
│   │   ├── Results.tsx         # Performance analytics & CSV export
│   │   ├── Submission.tsx      # Student submission inspector
│   │   └── WasmTestPage.tsx    # Section 30 WASM verification suite
│   ├── lib/
│   │   ├── wasm/               # C compiler, worker runner, types
│   │   ├── judge/              # Test judge & output normalizer
│   │   ├── mockDb.ts           # Preloaded question bank & offline storage
│   │   └── supabase.ts         # Supabase client wrapper
│   ├── hooks/
│   │   ├── useCode.ts          # Debounced auto-save & draft hook
│   │   ├── useTimer.ts         # Server-synced countdown timer
│   │   └── useTest.ts          # Anti-cheat event tracking & test state
│   ├── types/
│   │   └── database.ts         # TypeScript schema definitions
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql # PostgreSQL schema & RLS policies
├── package.json
└── README.md
```

---

## 🗄️ Database & Supabase Integration (Optional)

The application includes an offline-first storage engine that works instantly without setup. If you wish to connect your own Supabase project:
1. Run the SQL migration script in `supabase/migrations/001_initial_schema.sql` in your Supabase SQL Editor.
2. Create `.env` in the root folder:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
3. Restart the dev server.
