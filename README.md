# Syllabify

Syllabify is a full-stack academic productivity app designed to help students stay organized, understand their course outlines faster, and keep track of grades and deadlines in one place.

The project combines AI-powered syllabus understanding, course-specific question answering, deadline tracking, and grade monitoring into a single workflow. Instead of manually reading through every syllabus and calculating marks by hand, students can upload course information, ask questions about it, and get a clearer picture of what matters most in each class.

## Overview

University courses often come with long syllabi, changing deadlines, unclear grading breakdowns, and too many platforms to check at once. Syllabify aims to reduce that friction by giving students one place to:

- parse and organize syllabus content
- ask questions about course policies and deadlines
- track weighted grades
- test what-if grade scenarios
- receive deadline reminders

The goal is to make academic planning simpler, faster, and more personalized.

## Key Features

### AI-Powered Syllabus Parsing
Syllabify is designed to process syllabus content and turn it into structured course information that is easier to search, understand, and act on.

### Course Q&A with Retrieval-Augmented Generation
Students can ask questions about a course syllabus in natural language, such as:

- When is the midterm?
- What is the late policy?
- How much is the final exam worth?
- Are tutorials mandatory?

The system is intended to return answers grounded in the uploaded course content.

### Grade Tracker
Syllabify includes a weighted grade tracking system that helps students monitor current standing in a course based on completed and upcoming assessments.

### What-If Grade Scenarios
Students can experiment with possible outcomes by changing expected grades and seeing how those changes affect their final average.

### Deadline Reminders
The app is designed to support personalized reminders for important due dates through external messaging services such as SMS and email.

## Tech Stack

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS

### Backend and Infrastructure
- Firebase
- Firebase Admin
- Firestore
- Firebase Storage
- Firebase Emulators

### AI and Integrations
- Gemini
- Pinecone
- Google APIs
- Twilio
- SendGrid

## Project Structure

```text
Syllabify/
├── app/                # Next.js app router pages, layouts, API routes
├── components/         # Reusable UI components
├── functions/          # Backend and cloud-related logic
├── hooks/              # Custom React hooks
├── lib/                # Shared helpers and utility logic
├── public/             # Static assets
├── types/              # Shared TypeScript types
├── firebase.json       # Firebase configuration
├── firestore.rules     # Firestore security rules
├── storage.rules       # Storage security rules
├── tailwind.config.js  # Tailwind configuration
├── next.config.js      # Next.js configuration
└── package.json        # Scripts and dependencies
