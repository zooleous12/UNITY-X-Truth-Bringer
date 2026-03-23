# Lecture Me Pro - Implementation Guide for VS Code Copilot

**Copyright (c) 2026 Charles Kendrick. All Rights Reserved.**

This guide helps you complete Lecture Me Pro using GitHub Copilot (free) while preserving Manus AI credits for complex integrations later.

---

## 🎯 Current Status

**✅ What's Built:**
- Authentication system (Manus OAuth)
- Database schema (basic tables)
- tRPC API layer (type-safe backend)
- Landing page with hero section
- Upload pages (audio + PDF placeholders)
- Dashboard skeleton
- Copyright protection everywhere
- Google Drive backup system
- Logo assets (5 variations)

**❌ What Needs Building:**
- Color scheme fix (remove white backgrounds)
- Audio recording component
- Course management system
- Syllabus upload and parsing
- Test tracking
- Weakness analysis
- Flashcard generation
- Canvas-inspired dashboard layout

---

## 🎨 PRIORITY 1: Fix Color Scheme

**Problem:** White backgrounds are too harsh.

**Solution:** Update CSS variables in `client/src/index.css`

### Task for Copilot:

```css
/* Find the :root and .dark sections and update: */

:root {
  /* Change background from white to soft cream */
  --background: 42 35% 97%; /* Soft cream #FAF9F6 */
  --foreground: 240 10% 20%; /* Dark text for readability */
  
  /* Keep existing purple/gold accents */
  --primary: 262 83% 58%; /* Purple */
  --accent: 45 93% 58%; /* Gold */
}

.dark {
  /* Change background to deep purple */
  --background: 270 20% 10%; /* Deep purple #1a1625 */
  --foreground: 0 0% 95%; /* Light text */
  
  /* Keep existing accents */
  --primary: 262 83% 68%;
  --accent: 45 93% 68%;
}
```

**Test:** Reload app, check landing page and dashboard - no more white!

---

## 📊 PRIORITY 2: Database Schema Expansion

**File:** `drizzle/schema.ts`

Add these tables (Copilot will help with syntax):

### Courses Table
```typescript
export const courses = sqliteTable('courses', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // "Biology 101"
  courseCode: text('course_code'), // "BIO-101"
  instructor: text('instructor'),
  semester: text('semester'), // "Spring 2026"
  syllabusUrl: text('syllabus_url'), // S3 URL
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
```

### Course Topics Table
```typescript
export const courseTopics = sqliteTable('course_topics', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  topicName: text('topic_name').notNull(), // "Cell Structure"
  weekNumber: integer('week_number'), // Week 1, 2, 3...
  description: text('description'),
  testCoverage: integer('test_coverage', { mode: 'boolean' }).default(false),
});
```

### Tests Table
```typescript
export const tests = sqliteTable('tests', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  testDate: integer('test_date', { mode: 'timestamp' }).notNull(),
  testType: text('test_type').notNull(), // "midterm", "final", "quiz"
  score: real('score'), // 85.5
  totalPoints: real('total_points'), // 100
  grade: text('grade'), // "B+"
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
```

### Test Questions Table (for weakness analysis)
```typescript
export const testQuestions = sqliteTable('test_questions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  testId: text('test_id').notNull().references(() => tests.id, { onDelete: 'cascade' }),
  questionNumber: integer('question_number').notNull(),
  topicTags: text('topic_tags'), // JSON array: ["Cell Structure", "Mitosis"]
  correct: integer('correct', { mode: 'boolean' }).notNull(),
  points: real('points'),
});
```

### Study Sessions Table (time tracking)
```typescript
export const studySessions = sqliteTable('study_sessions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseId: text('course_id').references(() => courses.id, { onDelete: 'cascade' }),
  topicId: text('topic_id').references(() => courseTopics.id, { onDelete: 'set null' }),
  activityType: text('activity_type').notNull(), // "flashcards", "lecture", "reading"
  duration: integer('duration'), // seconds
  sessionDate: integer('session_date', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
```

**After adding tables, run:**
```bash
pnpm db:push
```

---

## 🎤 PRIORITY 3: Audio Recording Component

**File:** `client/src/components/AudioRecorder.tsx`

### Copilot Prompt:
"Create a React component for recording audio using MediaRecorder API. Include:
- Record button with mic icon
- Real-time duration display (MM:SS format)
- Stop button
- Waveform visualization (optional)
- Return audio blob when recording stops
- Show upload progress bar
- Course selection dropdown"

### Key Requirements:
- Use `lucide-react` for icons (Mic, Square, Upload)
- Use shadcn/ui Button component
- Handle browser permissions gracefully
- Save as WebM or MP3
- Max recording length: 3 hours

### Integration Points:
```typescript
// When recording stops:
const audioBlob = await stopRecording();
const formData = new FormData();
formData.append('audio', audioBlob, 'lecture.webm');
formData.append('courseId', selectedCourseId);

// Upload to server (tRPC mutation)
await trpc.audio.upload.mutate({ file: audioBlob, courseId });
```

---

## 📚 PRIORITY 4: Course Management UI

**File:** `client/src/pages/Courses.tsx`

### Copilot Prompt:
"Create a course management page with:
- Grid of course cards (3 columns on desktop)
- Each card shows: course name, code, instructor, next test date
- Add Course button (opens modal)
- Course card click → detail view
- Upload syllabus button per course
- Delete course button (with confirmation)"

### Card Design:
```typescript
<Card>
  <CardHeader>
    <CardTitle>{course.name}</CardTitle>
    <CardDescription>{course.courseCode} • {course.instructor}</CardDescription>
  </CardHeader>
  <CardContent>
    <div>Next Test: {formatDate(nextTest)}</div>
    <div>Weak Topics: {weakTopics.length}</div>
    <Button>Upload Syllabus</Button>
  </CardContent>
</Card>
```

---

## 🏠 PRIORITY 5: Canvas-Inspired Dashboard

**File:** `client/src/pages/Dashboard.tsx`

### Layout Structure:
```
┌─────────────────────────────────────────────────────┐
│  Header (user profile, notifications)              │
├──────────────────────┬──────────────────────────────┤
│                      │                              │
│  LEFT COLUMN (60%)   │  RIGHT COLUMN (40%)          │
│                      │                              │
│  📚 My Courses       │  ⚡ Quick Actions            │
│  - Course Card 1     │  - 🎤 Record Lecture         │
│  - Course Card 2     │  - 📸 Scan Document          │
│  - Course Card 3     │  - 📋 Upcoming Tests         │
│                      │  - 📊 Weak Topics Alert      │
│                      │  - 🎵 Study Music            │
│                      │  - 🔗 Share                  │
│                      │                              │
└──────────────────────┴──────────────────────────────┘
```

### Copilot Prompt:
"Create a two-column dashboard layout:
- Left: List of course cards with next test, materials count, weak topics badge
- Right: Quick action widgets (record button, scan button, upcoming tests, recent activity)
- Use CSS Grid for responsive layout
- Mobile: stack columns vertically"

---

## 🧠 PRIORITY 6: Weakness Analysis (Placeholder)

**For now, just show mock data:**

```typescript
const weakTopics = [
  { topic: "Cell Structure", errorRate: 0.7, lastReviewed: "2 weeks ago" },
  { topic: "Mitosis", errorRate: 0.6, lastReviewed: "1 week ago" },
];

// Display in a card:
<Card>
  <CardHeader>
    <CardTitle>⚠️ Weak Topics</CardTitle>
  </CardHeader>
  <CardContent>
    {weakTopics.map(topic => (
      <div key={topic.topic}>
        <Badge variant="destructive">{topic.topic}</Badge>
        <span>{Math.round(topic.errorRate * 100)}% error rate</span>
      </div>
    ))}
  </CardContent>
</Card>
```

**Real analysis comes later** (requires AI integration with 30k credits).

---

## 🔧 Database Helpers (server/db.ts)

Add these query helpers for Copilot to use:

```typescript
// Courses
export async function getUserCourses(userId: string) {
  return db.select().from(courses).where(eq(courses.userId, userId));
}

export async function createCourse(data: NewCourse) {
  return db.insert(courses).values(data).returning();
}

// Tests
export async function getUpcomingTests(userId: string) {
  return db.select()
    .from(tests)
    .where(eq(tests.userId, userId))
    .where(gt(tests.testDate, new Date()))
    .orderBy(asc(tests.testDate));
}

// Study Sessions
export async function logStudySession(data: NewStudySession) {
  return db.insert(studySessions).values(data).returning();
}
```

---

## 🎯 tRPC Procedures (server/routers.ts)

Add these endpoints:

```typescript
// Courses
courses: {
  list: protectedProcedure.query(({ ctx }) => {
    return getUserCourses(ctx.user.id);
  }),
  
  create: protectedProcedure
    .input(z.object({
      name: z.string(),
      courseCode: z.string().optional(),
      instructor: z.string().optional(),
      semester: z.string().optional(),
    }))
    .mutation(({ ctx, input }) => {
      return createCourse({ ...input, userId: ctx.user.id });
    }),
},

// Tests
tests: {
  upcoming: protectedProcedure.query(({ ctx }) => {
    return getUpcomingTests(ctx.user.id);
  }),
},
```

---

## 📝 Implementation Checklist

Use this order for maximum efficiency:

- [ ] Fix color scheme (CSS variables)
- [ ] Add database tables (schema.ts)
- [ ] Run `pnpm db:push`
- [ ] Add database helpers (server/db.ts)
- [ ] Add tRPC procedures (server/routers.ts)
- [ ] Build Courses page (client/src/pages/Courses.tsx)
- [ ] Build AudioRecorder component (client/src/components/AudioRecorder.tsx)
- [ ] Rebuild Dashboard with split layout (client/src/pages/Dashboard.tsx)
- [ ] Add quick action widgets (record, scan, upcoming tests)
- [ ] Test everything in browser
- [ ] Create checkpoint

---

## 🚫 What NOT to Build Yet

**Save these for when you have 30k credits:**
- S3 file upload integration
- Whisper transcription
- PDF parsing
- LLM study guide generation
- Flashcard generation algorithm
- Real weakness analysis
- Spaced repetition system

**Why?** These require complex backend integrations that Copilot can't do well. Manus AI will handle these efficiently.

---

## 💡 Copilot Tips

**Best prompts:**
- "Create a [component] that does [specific thing]"
- "Add a [feature] using [specific library]"
- "Style this with Tailwind CSS"

**When stuck:**
- Ask Copilot to explain the error
- Reference existing components (like `Home.tsx`)
- Check shadcn/ui docs for component usage

**Testing:**
- Run `pnpm dev` to see changes live
- Check browser console for errors
- Use React DevTools to debug state

---

## 🔄 When to Call Manus AI Back

**You're ready for the 30k credit integration when:**
- ✅ All UI components are built
- ✅ Database schema is complete
- ✅ tRPC procedures are defined
- ✅ Everything looks good visually
- ✅ No TypeScript errors

**Then Manus AI will:**
- Wire up S3 storage
- Integrate Whisper transcription
- Add LLM analysis
- Build weakness detection
- Create flashcard generation
- Connect all the pieces
- Test end-to-end
- Deploy to production

---

## 📞 Support

**Stuck on something?**
1. Ask Copilot first
2. Check existing code in the project
3. Google the error message
4. If truly blocked, save your credits and ask Manus AI

**Remember:** Copilot is free, Manus AI costs credits. Use Copilot for 80% of the work, Manus AI for the final 20% that requires architectural thinking.

---

**Good luck! You've got this. 🚀**

**- Manus AI**
