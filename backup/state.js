// --- Core Data & State ---
export let auth = null;
export let db = null;
export let data = null; // Holds the user's specific app data { subjects: { ... } }
export let currentUser = null; // Holds the Firebase Auth user object
export let currentSubject = null; // Holds the currently selected subject object from 'data'
// REMOVED: markdownContentCache - Fetched dynamically now
// export let markdownContentCache = null;
export let charts = {}; // For the progress dashboard
export let currentOnlineTestState = null; // Holds state during an online test

// --- State Modifiers ---
export function setAuth(newAuth) {
    auth = newAuth;
}
export function setDb(newDb) {
    db = newDb;
}
export function setData(newData) {
    data = newData;
}
export function setCurrentUser(newUser) {
    currentUser = newUser;
}
export function setCurrentSubject(newSubject) {
    currentSubject = newSubject;
}
// REMOVED: setMarkdownContentCache
// export function setMarkdownContentCache(newCache) {
//     markdownContentCache = newCache;
// }
export function setCharts(newCharts) {
    charts = newCharts;
}
export function setCurrentOnlineTestState(newState) {
    currentOnlineTestState = newState;
}

// --- State Reset ---
export function clearUserSession() {
    setCurrentSubject(null);
    setData(null);
    setCurrentOnlineTestState(null);
    setCharts({});
    // setMarkdownContentCache(null); // Removed
    document.getElementById('content')?.replaceChildren(); // Use replaceChildren for better cleanup
    document.getElementById('dashboard')?.classList.add('hidden');
    document.getElementById('online-test-area')?.classList.add('hidden');
    document.getElementById('subject-info')?.replaceChildren();
}

// --- Structure Update Notes for exam_history items ---
/*
Each question in `exam_history[...].questions` (for online tests) should now potentially have:
{
    // ... existing fields: id, chapter, number, text, options, image, userAnswer, correctAnswer, isCorrect
    isOverridden: boolean (optional, default false) // NEW: For override feature
}

The top-level exam_history item should now potentially have:
{
    // ... existing fields: examId, subjectId, timestamp, durationMinutes, type, questions, allocation, totalQuestions
    score: number, // This remains the ORIGINAL score
    originalScore: number, // NEW: Explicitly store original score if overridden
    overriddenScore: number (optional) // NEW: Store the score after overrides
}
*/

// --- Export direct access for convenience (use with caution) ---
// Allows reading state directly, e.g., import { data } from './state.js';