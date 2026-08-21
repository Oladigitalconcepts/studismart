# Study Buddy AI

StudyMind AI App Design Prompt

Objective:

Design a mobile-first, AI-driven study app for university students that provides functionality for uploading lecture materials, generating study packs, practicing questions, and focusing on high-priority topics.

1. Onboarding Screen

Action: Users should be greeted with a welcome screen where they can sign up or log in. Afterward, they should be able to select their course (e.g., CSC101, MTH202).

Components:

Welcome Text: Large bold title, “Welcome to StudyMind AI.”

Action Buttons:

 “Get Started” (primary button)

 “Sign In” (secondary button)

Input Field: Add a course code with the placeholder “Enter Course Code (e.g., CSC101).”

2. Home Dashboard

Action: After logging in, users should be able to view their current courses and access main features.

Components:

Greeting Message: “Good Evening, [Student Name].”

Main Buttons:

 “Upload Material” (primary, full-width button)

 “Generate Study Pack” (primary, full-width button)

 “Exam Focus” (secondary action, outline button)

Recent Activity Section: List of recently uploaded materials with a button to continue where they left off.

3. Material Upload Screen

Action: Allow users to upload lecture materials and paste text.

Components:

Upload Button: “Choose File” (for PDF, DOCX, etc.)

Text Field: Option to paste lecture notes directly.

Drag-and-Drop Box: Dashed border box that users can drag files into.

Progress Bar: Display a smooth loading bar when the system is processing uploaded materials.

4. Study Pack Screen

Action: After processing the uploaded materials, the app generates a study pack (summaries, topics, and questions).

Components:

Tabs:

 Summary (default tab)

 Topics

 Questions

Cards for Topics: Display the main topics derived from the lecture materials with a small description for each.

Questions Section:

 AI-generated questions (MCQs, short-answer questions) based on the uploaded material.

 “Generate More Questions” button for additional practice questions.

5. Practice Mode Screen

Action: Provide a timed practice mode for students to take exams with random questions based on the topics they’ve studied.

Components:

Question Display: Bold question at the top.

Answer Options: Multiple-choice options (A, B, C, D), stacked vertically.

Timer: Countdown timer on the top right, indicating time remaining.

Next Button: After selecting an answer, a “Next Question” button appears.

Feedback: After answering, the app will show whether the answer was correct or incorrect with immediate feedback.

6. Exam Focus Mode

Action: Provide performance insights, showing readiness and focus areas based on previous practice sessions.

Components:

Readiness Score Card: Display the student’s current exam readiness score (e.g., “65% Ready”) with a progress bar.

High Priority Topics: Show topics that need focus, color-coded for importance (e.g., red for weak areas).

Button: “Focus on Weak Areas” (button to start focused practice for weak topics).

7. Profile Screen

Action: Users can see their study history, stats, and achievements.

Components:

Profile Info: Show the student’s name and the courses they are enrolled in.

Performance Stats: Stats in a 2-column grid (e.g., total questions answered, correct answers).

Study Streak Tracker: Circular progress bar displaying the student’s study streak (e.g., 7 days in a row).

8. Navigation Bar (Bottom Bar)

Action: Easy navigation between main app sections.

Components:

 Icons for the following sections:

Home (Dashboard)

Practice (Test Mode)

Materials (Uploaded content)

Profile (Stats & Info)

Height: 64px with full-width icons and labels.

 Active icons should be highlighted with a primary accent color (e.g., blue).

Design Style:

Light Mode: A clean white background with neon accent colors (e.g., blue for primary buttons, green for success).

Dark Mode: Dark background with bright neon colors (e.g., neon green, purple) for accents and text, ensuring readability.

Typography:

 Headings: Bold, large (24px-28px)

 Body Text: Regular (14px-16px)

 Buttons: Semi-bold (16px)

Iconography: Modern, simple icons for navigation (e.g., home, profile, test mode).

Card Design: Rounded corners (16px), shadow effect for interactivity.

Button Styles: Rounded corners, with hover effects (scale 0.97 on tap).

Interaction Feedback:

Button Press: Scale animation (0.97x) on tap.

Correct/Incorrect Answers: Use green/red background for instant feedback on question answers.

Loading States: Skeleton loaders (shimmer effect) for content being processed (e.g., study pack, exam focus mode).

Transitions: Smooth screen transitions (250ms ease-in) for changing screens.

Additional Notes:

Mobile-First Design: Ensure all components are responsive and function well on both smaller and larger devices.

Real-Time Feedback: Ensure that the app gives real-time feedback after each action (upload, question answered, focus mode results).

Focus on Simplicity: Every screen must guide the user toward their goal—studying more efficiently for exams.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://studismart.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/594b1084-d093-46cc-9df2-016eb869c48e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
