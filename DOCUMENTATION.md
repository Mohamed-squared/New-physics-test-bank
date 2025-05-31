### `script.js`

**Purpose:** This file serves as the main entry point and central coordinator for the web application. It handles the initialization of various components, manages global state by importing from `state.js` and `config.js`, and sets up event listeners for UI interactions. It also exports key UI interaction functions to the global window object, making them accessible from HTML event attributes.

**Key Functions/Variables:**

*   `initializeApp()`: The core initialization function. It sets up Firebase, loads global settings (AI prompts, course defaults, subject definitions), applies user preferences (theme, background), initializes the music player and audio services, and sets up the initial UI including the public homepage.
*   `attachAuthListeners()`: Sets up event listeners for authentication forms (login, signup) and Google Sign-In.
*   Global UI Function Exports: Numerous functions from various `ui_*.js` modules are attached to the `window` object (e.g., `window.showHomeDashboard`, `window.showTestGenerationDashboard`, `window.showCourseDetails`). This allows these functions to be called directly from HTML onclick attributes or other browser events.
*   Theme Management: Includes logic to detect user's preferred theme (dark/light), save it to local storage, and apply it. It also handles re-rendering of charts and Mermaid diagrams when the theme changes.
*   Mobile Menu Management: Handles the toggling of the mobile sidebar and overlay.
*   `updateAdminPanelVisibility()`: Controls the visibility of admin-specific UI elements based on the current user's admin status.
*   `updateExperimentalFeaturesSidebarVisibility()`: Controls the visibility of sidebar links for experimental features based on the current user's settings.

**Role within the Application:** `script.js` is the orchestrator. It pieces together different modules, initializes the application environment, manages global UI state changes (like theme and mobile navigation), and exposes necessary UI functions to the browser's global scope. It's the first major piece of JavaScript that runs and sets up the entire application structure and behavior.

---

### `state.js`

**Purpose:** This file is responsible for managing the global client-side state of the application. It exports variables that hold core data, user information, UI states, and configuration settings that need to be accessible across different modules. It also provides functions to modify this state.

**Key Functions/Variables:**

*   `auth`, `db`: Firebase authentication and Firestore database instances.
*   `currentUser`: An object holding details of the currently logged-in user (UID, email, displayName, photoURL, isAdmin, credits, userSettings including experimentalFeatures).
*   `currentSubject`: Holds the currently selected subject object for TestGen.
*   `userCourseProgressMap`: A Map holding the user's progress for all enrolled courses, keyed by `courseId`.
*   `globalCourseDataMap`: A Map holding global definitions for all available courses, keyed by `courseId`.
*   `activeCourseId`: The ID of the course currently being viewed or interacted with.
*   `userAiChatSettings`: Stores user preferences for AI models and custom system prompts.
*   `globalAiSystemPrompts`: Stores system-wide AI prompts loaded from Firestore.
*   `courseExamDefaults`: Stores default configurations for different types of course exams (assignment, weekly, etc.).
*   `musicPlayerState`: An object managing the state of the music player (current track, playlist, volume, ambient sound, UI sounds enabled, etc.).
*   `setAuth()`, `setDb()`, `setCurrentUser()`, `setCurrentSubject()`, `setUserCourseProgressMap()`, `setGlobalCourseDataMap()`, `setActiveCourseId()`, `setUserAiChatSettings()`, `setGlobalAiSystemPrompts()`, `setCourseExamDefaults()`, `setMusicPlayerState()`: Setter functions to update their respective state variables.
*   `clearUserSession()`: Resets user-specific state variables upon logout, including parts of the music player state while preserving user preferences like volume and saved playlists.

**Role within the Application:** `state.js` acts as the single source of truth for global client-side data. By centralizing state, it allows different modules to access and modify shared information consistently, reducing prop-drilling and making state management more predictable.

---

### `config.js`

**Purpose:** This file stores static configuration variables for the application. These include API keys, default settings, file paths, constants for application logic (like grading weights, passing percentages), and predefined data structures (like default experimental features, UI sound effects library).

**Key Functions/Variables:**

*   `ADMIN_UID`: The unique Firebase UID of the primary administrator.
*   `GEMINI_API_KEYS`: An array of API keys for the Google Gemini AI.
*   `YOUTUBE_API_KEY`: API key for the YouTube Data API.
*   `COURSE_BASE_PATH`, `DEFAULT_COURSE_PDF_FOLDER`, `SUBJECT_RESOURCE_FOLDER`, etc.: Constants defining file paths for course materials and subject resources.
*   `PDF_GENERATION_OPTIONS`: Configuration object for `html2pdf.js` library.
*   `LATEX_DOCUMENT_CLASS`, `LATEX_PACKAGES`: Strings for generating LaTeX documents.
*   `DEFAULT_MAX_QUESTIONS`, `DEFAULT_MCQ_PROBLEM_RATIO`, `MAX_MARKS_PER_PROBLEM`: Constants for test generation.
*   `FALLBACK_EXAM_CONFIG`: Default settings (questions, duration, ratios) for different types of course exams.
*   `globalSubjectBootstrapData`: Default data for bootstrapping global TestGen subjects if the Firestore collection is empty.
*   `DEFAULT_PROFILE_PIC_URL`: Path to the default user avatar.
*   `FOP_COURSE_ID`, `FOP_COURSE_DEFINITION`: Specific configuration for the "Fundamentals of Physics" course.
*   `GRADING_WEIGHTS`, `PASSING_GRADE_PERCENT`: Constants for course grading.
*   `PACE_MULTIPLIER`: Multipliers for different course paces (compact, mediocre, lenient).
*   `PDF_WORKER_SRC`: URL for the PDF.js worker script.
*   `AVAILABLE_AI_MODELS`, `DEFAULT_PRIMARY_AI_MODEL`, `DEFAULT_FALLBACK_AI_MODEL`: AI model identifiers.
*   `DEFAULT_UI_SOUNDS_ENABLED`, `DEFAULT_AMBIENT_SOUND_VOLUME`, `DEFAULT_MUSIC_VOLUME`: Default settings for audio features.
*   `UI_SOUND_EFFECTS`, `AMBIENT_SOUNDS_LIBRARY`, `STUDY_MUSIC_LIBRARY`, `BINAURAL_BEATS_LIBRARY`: Predefined libraries for the music and sound features.
*   `DEFAULT_EXPERIMENTAL_FEATURES`: Default settings for experimental features available to users.
*   `PREDEFINED_BACKGROUNDS_PATH`, `PREDEFINED_BACKGROUND_IMAGES`, `DEFAULT_CARD_OPACITY`: Configuration for UI background and card opacity customization.

**Role within the Application:** `config.js` centralizes all static configuration, making it easy to update application-wide settings without searching through multiple files. It provides a single source for constants that control various aspects of the application's behavior, appearance, and integration with external services.

---

### `utils.js`

**Purpose:** This file provides a collection of utility functions used across various parts of the application. These functions encapsulate common operations like showing/hiding loading indicators, rendering mathematical formulas using MathJax, escaping HTML, and date formatting.

**Key Functions/Variables:**

*   `showLoading(message)`: Displays a global loading overlay with an optional message.
*   `hideLoading()`: Hides the global loading overlay.
*   `mathJaxReadyPromise`: A promise that resolves when MathJax is fully loaded and ready for use. This is crucial for ensuring MathJax operations are only attempted after initialization.
*   `renderMathIn(element)`: Asynchronously typesets mathematical content (LaTeX) within a given HTML element using MathJax. It waits for `mathJaxReadyPromise` and handles potential rendering errors.
*   `escapeHtml(unsafe)`: Escapes HTML special characters in a string to prevent XSS vulnerabilities or incorrect rendering.
*   `getFormattedDate(date)`: Formats a JavaScript Date object into a 'YYYY-MM-DD' string.
*   `daysBetween(date1, date2)`: Calculates the number of days between two Date objects.
*   `getYouTubeVideoId(url)`: Extracts the YouTube video ID from various YouTube URL formats.
*   `decodeHtmlEntities(text)`: Decodes HTML entities in a string back to their original characters.

**Role within the Application:** `utils.js` promotes code reusability and separation of concerns by providing common helper functions. This keeps other modules cleaner and more focused on their specific logic, while common tasks like DOM manipulation for loading states or complex text processing (MathJax) are handled by these utilities.

---

### `filename_utils.js`

**Purpose:** This file contains utility functions specifically designed for cleaning and generating filenames and directory names. This is important for ensuring that user-provided or dynamically generated titles can be safely used in file systems or URLs, and for creating consistent naming conventions for files like SRT subtitles.

**Key Functions/Variables:**

*   `cleanTextForFilename(text)`:
    *   Removes explicitly forbidden characters like `| / \ : * ? " < >`.
    *   Replaces sequences of whitespace (spaces, tabs, newlines) with a single underscore `_`.
    *   Removes leading and trailing underscores.
    *   Collapses multiple consecutive underscores to a single one.
    *   It aims to produce a string suitable for use as a filename or directory name by retaining alphanumeric characters, underscores, hyphens, and dots.
*   `generateStructuredFilename(title)`:
    *   Takes a title string (e.g., a video title).
    *   Excludes content after a `|` character (often used for translations or secondary titles).
    *   Uses `cleanTextForFilename` on the main part of the title.
    *   Returns the cleaned base filename or `null` if the input is invalid or results in an empty string.
*   `getSrtFilenameFromTitle(title)`:
    *   Generates a base filename using `generateStructuredFilename`.
    *   Appends the `.srt` extension to the base filename.
    *   Returns the full SRT filename (e.g., "Course_Name_Part1.srt") or `null` if the base filename generation failed.

**Role within the Application:** `filename_utils.js` is crucial for maintaining data integrity and preventing errors when the application needs to create, reference, or manage files based on textual input (like course names, chapter titles, or video titles). It ensures that filenames are valid and consistently formatted, which is particularly important for systems that might generate or organize course materials, subtitles, or other downloadable content.

---

### `audio_service.js`

**Purpose:** This file manages all audio playback within the application, including UI sound effects, ambient sounds, and music tracks (both direct streams and YouTube-based music). It initializes and controls HTML5 Audio elements and YouTube player instances.

**Key Functions/Variables:**

*   `ambientAudioPlayer`, `musicAudioPlayer`, `uiSoundPlayer`, `testSoundPlayer`: HTML5 Audio elements for different types of sounds.
*   `currentTestingSoundButtonAudioService`: Tracks the button associated with a currently playing test sound in the admin panel.
*   `initAudioPlayers()`: Initializes the HTML5 Audio elements, setting up properties like `loop` for ambient sounds and event listeners for test sounds.
*   `playAmbientSound(sound)`: Plays an ambient sound. Manages stopping other ambient sounds but allows main music to continue.
*   `stopAmbientSound()`: Stops the currently playing ambient sound.
*   `setAmbientVolume(volume)`: Sets the volume for the ambient sound player.
*   `playStreamableMusicTrack(track)`: Plays music from a direct URL (e.g., MP3, OGG). Handles stopping other music sources (including YouTube) if a different track is started.
*   `pauseStreamableMusic()`, `resumeStreamableMusic()`, `stopStreamableMusic()`: Basic playback controls for streamable music.
*   `setStreamableMusicVolume(volume)`: Sets the volume for the streamable music player.
*   `seekStreamableMusic(time)`: Seeks to a specific time in the streamable music track.
*   `playUiSound(soundKey)`: Plays a UI sound effect based on a key from `UI_SOUND_EFFECTS` in `config.js`, if UI sounds are enabled in the `musicPlayerState`.
*   `playTestSoundOnce(url, buttonElement)`: Plays a sound once for testing purposes, typically in an admin panel, and updates the UI of the triggering button.
*   `stopCurrentMusic(exceptPlayerType)`: A crucial function to stop currently playing audio from various sources (HTML5 stream, Main Tab YouTube, Mini YouTube Player). The `exceptPlayerType` argument allows for granular control, for instance, stopping YouTube music when an HTML5 stream starts, without stopping ambient sound.
*   `getMusicAudioElement()`: Returns the `musicAudioPlayer` instance.
*   `destroyYouTubePlayers()`: Stops and destroys instances of YouTube players (main tab and mini-player) and clears associated intervals. This is important for cleanup, especially when the user logs out or navigates away from pages with active players.

**Role within the Application:** `audio_service.js` centralizes audio control, providing a consistent API for playing different types of sounds. It interacts with the `musicPlayerState` from `state.js` to manage volume, track information, and playback status, ensuring that audio behavior is synchronized across the application and that resources like YouTube players are managed efficiently.

---

### `course_logic.js`

**Purpose:** This file encapsulates the business logic related to course progression, grading, pace calculation, and determining daily objectives for users enrolled in courses. It uses configuration values from `config.js` (like grading weights and pace multipliers) and user progress data from `state.js`.

**Key Functions/Variables:**

*   `calculateChapterCombinedProgress(progress, chapterNum, chapterVideoDurationMap, pdfInfo)`: Calculates the combined progress for a chapter, considering both video watching time and PDF page reading. It returns a percentage, formatted strings for watched/total time, and a completion status.
*   `calculateTotalMark(progressData)`: Calculates the overall weighted mark for a course based on chapter completion, assignment scores, exam scores (weekly, midcourse, final), attendance, and bonuses (extra practice, TestGen). It uses `GRADING_WEIGHTS` from `config.js`.
*   `getLetterGrade(totalMark)`: Converts a numerical total mark into a letter grade (A+, A, B+, etc.) based on `PASSING_GRADE_PERCENT`.
*   `getLetterGradeColor(grade)`: Returns an object with CSS class names for styling elements based on the letter grade.
*   `calculateInitialMediocrePace(progressData, totalCourseChapters)`: Calculates an initial "mediocre" study pace for a user based on their activity in the first week of enrollment.
*   `updateCurrentPace(progressData, totalCourseChapters)`: Calculates the user's current study pace based on total chapters studied and days enrolled.
*   `determineTargetChapter(progressData, courseDef)`: Determines the chapter a user *should* be on based on their enrollment date, selected pace (compact, mediocre, lenient, or custom), and the course definition.
*   `determineTodaysObjective(progressData, courseDef)`: Determines the most relevant task for the user for the current day (e.g., "Study Chapter X", "Complete Assignment Y", "Take Midcourse Exam"). This is a key function for guiding the user.
*   `determineNextTask(progressData, courseDef)`: Based on `determineTodaysObjective`, returns an object with details about the next task, suitable for creating a call-to-action button (e.g., type, id, buttonText).
*   `calculateAttendanceScore(progressData)`: Calculates an attendance score based on the number of days the user has interacted with the course (completed assignments, studied chapters) relative to the days elapsed since enrollment.

**Role within the Application:** `course_logic.js` is the brain behind the course progression system. It provides the calculations and logic necessary to track how a user is doing in a course, what they should do next, and what their final grade is. It separates complex business rules from the UI and data storage layers.

---

### `exam_storage.js`

**Purpose:** This file handles the storage, retrieval, and review of exam results. It interacts with Firebase Firestore to save completed exams and fetch historical exam data. It also includes UI generation logic for displaying exam reviews, handling AI explanations for questions, and managing issue reporting.

**Key Functions/Variables:**

*   `storeExamResult(courseId, examState, examType)`:
    *   Marks the full exam using `ai_exam_marking.js`.
    *   Constructs an `examRecordForFirestore` object with relevant details (userId, questions, answers, markingResults, score, status, timestamps, duration, course/subject context, etc.), carefully distinguishing between TestGen exams (no `courseId`, includes `subjectId` and `testGenConfig`) and course activity exams (includes `courseId` and `examType`).
    *   Saves this record to the `userExams/{userId}/exams/{examId}` path in Firestore.
    *   Awards user credits based on the exam type.
    *   Returns a `savedExamRecordForUI` object for immediate display.
*   `getExamDetails(userId, examId)`: Fetches a specific exam document from Firestore.
*   `getExamHistory(userId, filterId, filterType)`: Retrieves a list of completed exams for a user, with optional filtering by course or subject.
*   `showExamReviewUI(userId, examId)`:
    *   Fetches exam details using `getExamDetails`.
    *   Generates detailed HTML for reviewing an exam, including overall score, pass/fail status, a breakdown of each question (text, user's answer, correct answer, AI feedback, key points, improvement suggestions), and overall AI feedback for the exam.
    *   Renders MathJax for mathematical content.
    *   Attaches event listeners for "Explain (AI)", "Report Issue", PDF download, and navigation buttons.
*   `showAIExplanationSection(examId, questionIndex)`: Toggles the visibility of the AI explanation section for a specific question. On first reveal, it fetches exam data, calls `generateExplanation` (from `ai_exam_marking.js`) to get an AI-generated explanation for the question and student's answer, and displays it. It also sets up a text input for follow-up questions.
*   `askAIFollowUp(examId, questionIndex)`: Sends a user's follow-up question (along with the conversation history for that question) to `generateExplanation` and appends the AI's response to the conversation display.
*   `showIssueReportingModal(examId, questionIndex)`: Displays a modal dialog for users to report issues with a question or its marking.
*   `submitIssueReport(examId, questionIndex)`: Gathers issue details from the modal and submits it as feedback using `submitFeedback` (from `firebase_firestore.js`).
*   `deleteCompletedExamV2(examId)`:
    *   Deletes a completed exam record from Firestore.
    *   If it's a TestGen exam, it attempts to update the user's subject progress data (`data.subjects`) by decrementing `total_attempted`, `total_wrong`, and adding the question numbers back to `available_questions` for the respective chapters. This effectively "undoes" the statistics changes made when the exam was taken.
    *   Saves the updated `appData` to Firestore.
    *   Refreshes the progress dashboard if data was modified.
*   PDF Download Wrappers (`handleDownloadExamQuestionsPdfWrapper`, `handleDownloadExamSolutionsPdfWrapper`, `handleDownloadFullReportWrapper`): These functions call internal logic to fetch exam details and then use `ui_pdf_generation.js` or direct HTML generation to create and download PDFs or HTML reports of the exam questions, solutions/explanations, or a full report with AI explanations.

**Role within the Application:** `exam_storage.js` is central to the assessment aspect of the platform. It bridges the gap between taking an exam (online test UI), AI marking, persistent storage of results, and the user's ability to review their performance and get feedback. It also provides mechanisms for quality control through issue reporting and data management for administrators (deleting exams).

---

### `markdown_parser.js`

**Purpose:** This file is responsible for parsing Markdown content, primarily for extracting questions (MCQs) and chapter structures from text files that define TestGen question banks or course materials.

**Key Functions/Variables:**

*   `updateChaptersFromMarkdown(subject, mdContent)`:
    *   Parses Markdown content using `parseChaptersFromMarkdown` to get chapter titles and total question counts.
    *   Compares this parsed data with the `subject.chapters` object (typically from the user's data in `state.js`).
    *   Updates chapter titles and `total_questions` in the `subject.chapters` object.
    *   If `total_questions` for a chapter changes, it resets `available_questions` for that chapter to be all questions from 1 to `total_questions`.
    *   If `total_questions` remains the same, it cleans up `available_questions` to ensure all numbers are valid and within the total range.
    *   Adds new chapters found in the Markdown to the subject's chapter list.
    *   Returns `true` if any changes were made to the subject's chapter data.
*   `parseChaptersFromMarkdown(mdContent)`:
    *   Scans Markdown text for lines matching `### Chapter X: Title` (or similar).
    *   For each chapter found, it counts subsequent lines that appear to be questions (e.g., starting with a number and a period/parenthesis).
    *   Returns an object where keys are chapter numbers (as strings) and values are objects containing `{ total_questions: number, title: string | null }`.
*   `extractQuestionsFromMarkdown(mdContent, chapterScopeOrQuestionMap, sourceType)`:
    *   Extracts Multiple Choice Questions from Markdown.
    *   `chapterScopeOrQuestionMap`: Can be an array of chapter numbers (to get all questions from those chapters) or an object map like `{ "chapterNum": [qNum1, qNum2], "anotherChap": null }` (to get specific questions from specified chapters, or all from chapters mapped to `null`).
    *   `sourceType`: A string identifier (e.g., 'text_mcq', 'lecture_problems') used to generate unique question IDs.
    *   Iterates through lines, identifying chapter headings, question numbers, question text, options (A, B, C, D, E), and answer lines (e.g., "Answer: A").
    *   Parses image references (`![alt](url)`) within question text.
    *   Constructs question objects with `id`, `chapter`, `number`, `text`, `options`, `image`, `correctAnswer`, and `isProblem: false`.
    *   Returns an object `{ questions: Array<QuestionObject>, answers: { questionId: correctAnswer } }`.
*   `parseSkipExamText(rawText, chapterNum)`:
    *   Parses a specific text format, presumably output from an AI, designed for "skip exam" questions.
    *   Looks for question numbers, multi-line question text, options (A-E), and an answer line.
    *   Constructs question objects similar to `extractQuestionsFromMarkdown` but with `type: 'mcq-skip'`.
    *   This function is specialized for a different input format than the general Markdown question parser.

**Role within the Application:** `markdown_parser.js` is essential for populating the question banks for the Test Generation feature and potentially for structuring other course content presented in Markdown. It allows subject matter experts or content creators to define questions and chapter structures in a human-readable text format, which the application can then parse and use dynamically. `updateChaptersFromMarkdown` plays a key role in synchronizing the user's local question availability statistics with the master Markdown definition for a subject.

---

### `firebase_auth.js`

**Purpose:** This file centralizes all Firebase Authentication related logic. It handles user sign-up, sign-in (email/password and Google), sign-out, password reset, and listens for authentication state changes to update the application's UI and state accordingly.

**Key Functions/Variables:**

*   `signUpUser(username, email, password)`:
    *   Validates username format.
    *   Checks if the username is already taken by querying the `usernames` Firestore collection.
    *   Creates a new user with email and password using `auth.createUserWithEmailAndPassword()`.
    *   Calls `initializeUserData()` (from `firebase_firestore.js`) to set up the user's document in Firestore.
    *   Sends a welcome guide message to the new user.
*   `signInUser(identifier, password)`:
    *   Handles sign-in with either email or username.
    *   If an email is provided, calls `auth.signInWithEmailAndPassword()`.
    *   If a username is provided, it first queries the `usernames` collection to find the associated email, then signs in with that email.
*   `signInWithGoogle()`:
    *   Uses Firebase's GoogleAuthProvider to sign in the user via a popup.
    *   If it's a new user, it generates a unique username (checking against the `usernames` collection) based on their email or a random string.
    *   Calls `initializeUserData()` to set up the user's Firestore document.
    *   Sends a welcome guide message to new Google users.
*   `signOutUser()`: Signs out the current user using `auth.signOut()`.
*   `sendPasswordReset(email)`: Sends a password reset email to the provided email address using `auth.sendPasswordResetEmail()`.
*   `changeUserEmail(newEmail, currentPassword)`:
    *   Re-authenticates the current user with their `currentPassword`.
    *   Attempts to update the user's email in Firebase Auth using `user.updateEmail(newEmail)`.
    *   Updates the email in the user's Firestore document. Firebase Auth may send a verification email to the new address.
*   `changeUserPassword(currentPassword, newPassword)`:
    *   Re-authenticates the current user.
    *   Updates the user's password using `user.updatePassword(newPassword)`.
*   `setupAuthListener()`:
    *   Attaches an observer to Firebase Auth's `onAuthStateChanged` event.
    *   When a user signs in:
        *   Shows a loading indicator.
        *   Fetches and updates user info in the UI (`fetchAndUpdateUserInfo`).
        *   Updates admin panel visibility.
        *   Loads global course definitions.
        *   Calls `loadUserData()` (from `firebase_firestore.js`) to load all user-specific data, including subject progress, course progress, and AI settings, and checks for onboarding.
        *   Updates experimental feature visibility in the sidebar.
        *   Hides the login UI and shows the home dashboard.
    *   When a user signs out:
        *   Clears the current user state (`setCurrentUser(null)`).
        *   Clears the user session data (`clearUserSession`).
        *   Updates UI elements (admin panel, user info).
        *   Shows the public homepage and login UI.
        *   Hides loading indicators.

**Role within the Application:** `firebase_auth.js` is the gatekeeper for user access. It manages all aspects of user authentication, ensuring that users are properly identified and that their sessions are handled correctly. The `setupAuthListener` is critical for reacting to login/logout events and orchestrating the loading and clearing of user-specific application data.

---

### `firebase_firestore.js`

**Purpose:** This file is responsible for all interactions with the Firebase Firestore database, excluding authentication-specific user creation which is handled in `firebase_auth.js` during `initializeUserData`. It includes functions for loading and saving user data (like subject progress, course progress, AI settings, notes), managing global application settings (like AI prompts, course exam defaults), and handling course definitions. It also contains admin-specific Firestore operations.

**Key Functions/Variables:**

*   **Global Settings/Definitions:**
    *   `loadCourseExamDefaults()`, `saveCourseExamDefaults()`: Manage default configurations for course exams (assignments, weekly exams, etc.) stored in `settings/courseExamDefaults`.
    *   `loadGlobalSubjectDefinitionsFromFirestore()`: Loads all global subject definitions from the `/subjects` collection into `globalSubjectDefinitionsMap`. Handles bootstrapping default subjects if the collection is empty (admin only).
    *   `loadGlobalCourseDefinitions()`: Loads all course definitions from the `/courses` collection into `globalCourseDataMap`. Handles bootstrapping the "Fundamentals of Physics" course if not found. Parses chapter titles from associated Markdown files for non-FoP courses.
    *   `loadGlobalAiPrompts()`, `saveGlobalAiPrompts()`: Manage global AI system prompts stored in `settings/aiPrompts`.
*   **User Data Management:**
    *   `initializeUserData()`: Sets up a new user's document in the `/users` collection with default fields (email, username, displayName, photoURL, isAdmin status, credits, onboarding status, default appData structure for subjectProgress, default AI/experimental feature settings). Also reserves the username in the `/usernames` collection.
    *   `loadUserData(uid, authUserFromEvent)`: Loads a user's document. Merges global subject definitions with the user's specific progress for each subject. Handles migration from older data structures. Syncs chapter details (titles, question counts) from Markdown for each subject. Loads user's course progress and AI settings. Checks onboarding status.
    *   `saveUserData(uid, appDataToSave)`: Saves the user's `appData` (specifically `subjectProgress`) to their user document.
    *   `reloadUserDataAfterChange(uid)`: Reloads all essential user data after a significant change (e.g., admin status toggle).
    *   `saveUserAiSettings(userId, settings)`, `loadUserAiSettings(userId)`: Manage user-specific AI chat settings.
    *   `saveUserExperimentalFeatureSettings(userId, settings)`: Saves user preferences for experimental features.
*   **User Course Progress:**
    *   `saveUserCourseProgress(uid, courseId, progressData)`: Saves or updates a user's progress for a specific course in `userCourseProgress/{uid}/courses/{courseId}`. Handles Firestore Timestamps for dates.
    *   `loadAllUserCourseProgress(uid)`: Loads all course progress documents for a user into `userCourseProgressMap`.
    *   `unenrollFromCourse(uid, courseId)`: Deletes a user's progress document for a course.
    *   `markChapterStudiedInCourse(uid, courseId, chapterNum, method)`: Marks a chapter as studied in a user's course progress and logs it in daily progress.
*   **User-Specific Content (Notes, Summaries, etc.):**
    *   `saveUserFormulaSheet()`, `loadUserFormulaSheet()`: Manage user-generated formula sheets per chapter.
    *   `saveUserChapterSummary()`, `loadUserChapterSummary()`: Manage user-generated chapter summaries.
    *   `saveUserNotes()`, `loadUserNotes()`: Manage user's personal notes per chapter.
    *   `saveSharedNote()`, `loadSharedNotes()`: Manage notes shared by users for a specific chapter.
*   **Feedback & Messaging:**
    *   `submitFeedback(feedbackData, user)`: Submits user feedback or exam issue reports to `feedback` or `examIssues` collections.
    *   `sendAdminReply()`, `markMessageAsRead()`, `sendWelcomeGuideMessage()`, `deleteInboxMessage()`: Manage user inbox messages.
    *   `sendGlobalAnnouncementToAllUsers()`: Sends a message to all users' inboxes (admin only).
*   **Admin Functions:**
    *   `updateCourseDefinition(courseId, updates)`: Allows admins to update course details in the `/courses` collection.
    *   `addCourseToFirestore(courseData)`: Allows users (admin or regular) to submit new course definitions. Admins' courses are auto-approved.
    *   `approveCourse(courseId)`: Allows admins to approve a pending course.
    *   `updateCourseStatusForUser()`: Admin function to manually set a user's completion status and grade for a course.
    *   `handleAddBadgeForUser()`, `handleRemoveBadgeForUser()`: Admin functions to manage user badges.
    *   `adminUpdateUsername()`: Admin function to change a user's username.
    *   `deleteUserFormulaSheet()`, `deleteUserChapterSummary()`: Admin functions to delete user-generated content.
    *   `deleteAllFeedbackMessages()`, `deleteAllExamIssues()`: Admin functions for clearing feedback collections.
    *   `deleteCourseActivityProgress()`: Admin function to remove specific activity scores from a user's course progress.
    *   `fetchAdminTasks()`, `addAdminTask()`, `updateAdminTaskStatus()`, `deleteAdminTask()`: Manage a list of admin tasks.
    *   `toggleUserAdminStatus()`: Primary admin function to grant/revoke admin rights.
    *   `adminUpdateUserSubjectStatus()`: (Likely deprecated by global subject approval) Admin function to approve user-specific subject instances.
    *   `updateUserCredits()`: Updates a user's credit balance and logs the transaction. Can be called by system or admin.
    *   Admin Testing Aids: Functions like `adminMarkTestGenChaptersStudied`, `adminResetTestGenSubjectProgress`, `adminMarkCourseChapterStudied`, `adminCompleteCourseActivity`, `adminSimulateDaysPassed` for testing purposes.
    *   `adminAddGlobalSubject()`, `adminUpdateGlobalSubjectDefinition()`, `adminDeleteGlobalSubject()`: Manage global TestGen subject definitions.
*   **AI Chat Studio:**
    *   `saveChatSession()`, `loadUserChatSessionsFromFirestore()`, `deleteChatSessionFromFirestore()`: Manage user's AI chat sessions.
*   `getCourseDetails(courseId)`: Fetches details for a single course, first from cache, then Firestore.
*   `getAdminOverviewStats()`: Fetches various statistics for the admin dashboard.

**Role within the Application:** `firebase_firestore.js` is the primary interface for all data persistence and retrieval operations involving Firestore. It abstracts the complexities of database interactions, providing a clear API for other modules to use when they need to load or save data. It plays a crucial role in initializing user data, managing course and subject definitions, tracking progress, and enabling administrative control over the platform's content and users.

---
### `admin_course_content.js`

**Purpose:** This file serves as the main hub for managing course content from an administrative perspective. It consolidates various course creation and management functionalities, including tools for automated course generation, processing of course materials (PDFs, transcriptions), and reviewing courses pending approval.

**Key Functions/Variables:**

*   `displayCourseManagementSection(containerElement)`: Renders the main UI for course content management, including tabs for different functionalities like "Full Course Creator," "Pending Review," "Google Drive Tools," "Transcription," "PDF Processing," and "Question Generators." It dynamically loads content for the selected tab.
*   `displayPendingCoursesList(containerElement)`: Fetches and displays a list of courses that have a "pending_review" status from the `globalCourseDataMap`. Allows admins to preview and approve these courses.
*   `window.previewAndApproveCourse(courseId)`: (Attached to window) Displays a modal with detailed information about a pending course, including its title, tags, AI-generated description, Google Drive links/IDs for assets (textbook, chapter PDFs, transcriptions, generated questions), and allows the admin to approve it.
*   `window.approveCourseInFirestore(courseId)`: (Attached to window) Called when an admin approves a course. It uses the `approveCourse` function (from `firebase_firestore.js`) to update the course's status in Firestore and refreshes the local `globalCourseDataMap` and the pending courses list UI.
*   `displayFullCourseAutomationForm(containerElement)`: Renders a comprehensive form for automating the creation of a new course. This form collects details like course title, textbook PDF (or Google Drive link/ID), page numbering, subject tags, optional metadata (prerequisites, banner/course pictures), lecture information (titles, files/links, SRT links, associated chapter keys), and credentials for external services (Google Drive, AssemblyAI, Gemini).
*   Event Listener for Full Course Automation Form: Handles the submission of the "Full Course Creator" form. It collects all input data, including file uploads and lecture metadata, constructs a `FormData` object, and sends it to a backend service (`/automate-full-course`) for processing. It then displays feedback from the backend, including progress logs and links to created assets.
*   `loadCoursesForAdmin()`: A function that was likely used to ensure `globalCourseDataMap` was populated for older versions of the admin panel sections. With the refactoring, its direct necessity might be reduced if data is loaded globally, but it's kept for potential external calls.

**Role within the Application:** `admin_course_content.js` is a central administrative tool for overseeing the lifecycle of course content. It enables admins to:
1.  Initiate fully automated course creation processes by providing raw materials and metadata.
2.  Review and approve courses submitted through these automated processes or by other users.
3.  Access specialized sub-modules for managing Google Drive cloud storage (`admin_google_drive_service.js`), transcribing lectures (`admin_transcription_service.js`), processing textbook PDFs (`admin_pdf_processing_service.js`), and generating questions from these materials (`admin_question_generation_service.js`).
It acts as a high-level interface that orchestrates calls to backend services and updates Firestore through imported functions, while also managing the UI for these complex administrative tasks.

---

### `admin_database_management.js`

**Purpose:** This file provides a UI for administrators to directly browse and manage data within the Firebase Firestore database. It allows for viewing collections, documents, and their fields, as well as performing basic CRUD (Create, Read, Update, Delete) operations on documents.

**Key Functions/Variables:**

*   `COLLECTIONS_TO_BROWSE`: An array of objects defining root collections accessible in the browser, including their display names, Firestore IDs, fields to omit in the summary view, and potential subcollection names.
*   `currentDbManagementState`: An object holding the state of the database browser, including the currently selected collection/document, loaded documents, pagination state, and navigation path segments.
*   `displayDatabaseManagementSection(containerElement)`: Renders the main UI for the database browser, including a dropdown for root collections, navigation buttons (Up), breadcrumbs for the current path, a list area for documents, and a view area for document content.
*   `updatePathBreadcrumbs()`: Updates the breadcrumb navigation display based on `currentDbManagementState.pathSegments`.
*   `window.adminDbJumpToSegment(segmentIndex, jumpToDocView)`: Allows navigation to a specific part of the path via breadcrumbs.
*   `window.adminDbNavigateUp()`: Navigates up one level in the database hierarchy (from document to collection, or subcollection to parent document).
*   `window.adminLoadSelectedRootCollection()`: Loads documents from the selected root collection.
*   `adminLoadCollectionDocuments(collectionRef, pathSegments)`: Fetches and displays a list of documents from the given `collectionRef`. Handles pagination.
*   `renderDocumentList(pathSegments)`: Renders the list of documents in the left-hand panel, highlighting the selected one.
*   `window.adminLoadMoreDocuments()`: Loads the next page of documents for the current collection.
*   `window.adminLoadDocumentContentWrapper(docId)`: A wrapper to call `adminLoadDocumentContent`.
*   `adminLoadDocumentContent(pathSegments, docId)`: Fetches and displays the content of a specific document. It renders fields based on their data type (string, number, boolean, timestamp, array, object) and provides an interface for editing and deleting the document. It also lists known subcollections.
*   `window.adminNavigateToSubcollection(subcollectionName)`: Navigates into a subcollection of the currently viewed document.
*   `window.adminToggleEditDocumentMode(docPath, isEditing)`: Toggles the UI between view mode and edit mode for a document's fields.
*   `window.adminSaveDocumentChanges(docPath)`: Collects data from the edit form, parses JSON for arrays/objects, and updates the document in Firestore.
*   `window.adminConfirmDeleteDocument(docPath)`: Prompts for confirmation and then deletes the specified document from Firestore.

**Role within the Application:** `admin_database_management.js` is a powerful, low-level tool for administrators with direct database access. It allows for inspection and manual manipulation of Firestore data, which can be useful for debugging, troubleshooting, data correction, or performing administrative actions not covered by other specialized UI sections. Due to its direct nature, it's intended for users who understand the database schema and the implications of their changes.

---

### `admin_google_drive_service.js` (Formerly `admin_mega_service.js`)

**Purpose:** This file provides administrative functionalities related to managing course content stored on Google Drive. It includes features for migrating courses to Google Drive, browsing Google Drive folders, uploading/downloading files, and potentially selecting assets from Google Drive for course creation.

**Key Functions/Variables:**

*   `createPlaceholderFile(fileName, content)`: A helper function to create a client-side File object, typically used for uploading placeholder files (like READMEs) to Google Drive.
*   `displayGoogleDriveMigrationDashboard(containerElement)`: Renders the main UI for Google Drive cloud management. This includes:
    *   A section to list courses and their Google Drive migration status (Not Migrated, Partially Migrated, Fully Migrated).
    *   Buttons to initiate migration for unmigrated courses or explore already migrated course vaults (using Google Drive folder IDs/links).
    *   An embedded Google Drive File Explorer.
*   `loadCoursesForGoogleDriveMigration()`: Fetches course data from `globalCourseDataMap` and renders the list of courses, showing their Google Drive migration status and providing action buttons. It also displays a "gamified alert" if unmigrated courses exist.
*   `startGoogleDriveMigration(courseId)`:
    *   Initiates the migration process for a given course to Google Drive.
    *   Connects to Google Drive using the `google_drive_service.js` initialization (API key, with OAuth flow needed for user-specific write access typically).
    *   Creates a standard folder structure for the course on Google Drive (e.g., main course folder, subfolders for Transcriptions, Textbook PDFs, Generated Assessments).
    *   Uploads placeholder README files to these folders.
    *   Updates the course definition in Firestore (via `updateCourseDefinition`) with the new Google Drive folder IDs and web view links.
    *   Updates the local `globalCourseDataMap` and refreshes the course list UI.
*   `displayGoogleDriveFileExplorer(containerElement, initialFolderId)`: Renders a UI for browsing Google Drive folders. It includes:
    *   An input field to load a specific Google Drive folder ID (or blank for root).
    *   Navigation controls (Parent Folder, breadcrumbs).
    *   A list to display folder contents (files and subfolders).
    *   An upload section to add files to the currently viewed Google Drive folder.
*   `loadGoogleDriveFolderById(folderId, folderName)`: Loads and displays the contents of a Google Drive folder specified by its ID (or defaults to 'root'). It interacts with `google_drive_service.js` to fetch folder contents.
*   `renderGoogleDriveFolderContents(folderId, newPathSegment)`: Renders the list of files and folders within the given Google Drive folder ID. It displays names, sizes (where applicable), and provides "Open Folder" buttons for subfolders and "Download" buttons for files.
*   `navigateToGoogleDrivePathIndex(index)`: Handles navigation within the Google Drive explorer using breadcrumbs.
*   `navigateToGoogleDriveParentFolder()`: Navigates to the parent folder in the Google Drive explorer.
*   `handleGoogleDriveFileDownload(fileId, fileName)`: Initiates a download of a file from Google Drive.
*   `handleGoogleDriveFileUpload(event)`: Handles file uploads from the user's computer to the currently selected Google Drive folder.
*   `setupCourseAssetSelectionGoogleDrive()`: Initializes a UI section where an admin can provide a Google Drive folder ID, view its contents, and select files/folders to be used as assets for creating a new course.

**Role within the Application:** `admin_google_drive_service.js` acts as the bridge between the application and Google Drive cloud storage for course materials. It automates the process of creating a standardized, cloud-backed folder structure for courses, facilitating better organization and potentially larger file storage. The embedded file explorer provides admins with direct visibility and control over these cloud assets from within the application.

---

### `admin_moderation.js`

**Purpose:** This file provides the UI and functionality for administrators to moderate user-generated content, specifically feedback messages and exam issue reports submitted by users.

**Key Functions/Variables:**

*   `displayFeedbackSection(containerElement)`: Renders the main UI for the "Content Moderation" section. This includes an area to display a combined list of feedback and exam issues, and buttons to refresh these lists or delete all items.
*   `loadFeedbackForAdmin()`:
    *   Fetches the latest feedback messages from the `feedback` collection in Firestore.
    *   Fetches the latest exam issue reports from the `examIssues` collection in Firestore.
    *   Combines and sorts these items by timestamp.
    *   Renders each item with details like sender, context (subject/question ID), date, the feedback text, and status (new, replied).
    *   Provides "Reply" and "Delete" buttons for each item.
*   `promptAdminReply(collectionName, itemId, recipientUserId)`: (Wrapper function) Prompts the admin to enter a reply message for a specific feedback item or exam issue.
*   `handleAdminFeedbackReply(collectionName, itemId, recipientUserId, replyText)`:
    *   Sends the admin's reply to the user's inbox using `sendAdminReply` (from `firebase_firestore.js`).
    *   Updates the status of the original feedback/issue item in Firestore to "replied" and stores the reply text.
    *   Refreshes the feedback/issues list.
*   `confirmDeleteItem(collectionName, itemId)`: (Wrapper function) Prompts the admin for confirmation before deleting a feedback item or exam issue.
*   `handleDeleteDbItem(collectionName, itemId)`: Deletes the specified item from its Firestore collection (`feedback` or `examIssues`). Refreshes the list.
*   `confirmDeleteAllFeedbackAndIssues()`: Prompts the admin for confirmation before deleting *all* items from both the `feedback` and `examIssues` collections. It calls `deleteAllFeedbackMessages()` and `deleteAllExamIssues()` from `firebase_firestore.js`.

**Role within the Application:** `admin_moderation.js` is a crucial tool for maintaining platform quality and addressing user concerns. It allows administrators to review user-submitted feedback and issue reports in a centralized location, respond to users directly, and manage the lifecycle of these reports (e.g., by marking them as replied or deleting them). This helps in identifying problems with course content, exam questions, or the platform itself.

---

### `admin_music_management.js`

**Purpose:** This file provides an administrative interface for managing the predefined sound libraries (Ambient Sounds, Study Music, Binaural Beats, UI Sound Effects) that are available to users in the application. It allows admins to view, modify, add, delete, and test sounds within these libraries. Importantly, changes made here are *not* saved directly to a server or database; instead, the module generates a JavaScript code snippet that the admin must manually copy into the `config.js` file to update the application's configuration.

**Key Functions/Variables:**

*   `currentAmbientSounds`, `currentStudyMusic`, `currentBinauralBeats`, `currentUiSounds`: Module-level arrays/objects that hold a working copy of the sound libraries, initialized from `config.js`.
*   `loadLibrariesFromConfig()`: Initializes the module-level library variables with data from `config.js`.
*   `displayMusicManagementSection(containerElement)`: Renders the main UI for music and sound library management. This includes separate sections for each type of sound library and a section to generate the updated configuration code.
*   `renderSoundLibrarySection(title, libraryArray, typePrefix)`: Renders a table for a specific sound library (Ambient, Study, Binaural). Each row in the table represents a sound item and includes input fields for its properties (icon, name, URL/YouTube ID, type, artist, album art, description). It also provides "Test" and "Delete" buttons for each item.
*   `renderUiSoundsSection()`: Renders a table for the UI Sound Effects library. Each row displays a key (e.g., `exam_finish_success`) and an input field for its URL, along with "Test" and "Delete" buttons.
*   `updateLibraryItem(libraryType, index, field, value)`: Updates a specific field of an item in one of the sound libraries (Ambient, Study, Binaural) based on user input in the table. Handles special logic for `urlOrId` and `type` fields to correctly manage YouTube IDs vs. direct URLs.
*   `updateUiSoundItem(key, newUrl)`: Updates the URL for a specific key in the `currentUiSounds` object.
*   `attachMusicManagementEventListeners()`: Attaches event listeners to all input fields in the rendered tables to call the respective update functions when changes occur.
*   `window.adminMusicManagement.addLibraryItem(typePrefix)`: Adds a new, empty item to the specified sound library array and re-renders the relevant section.
*   `window.adminMusicManagement.deleteLibraryItem(typePrefix, index)`: Removes an item from the specified sound library array after confirmation and re-renders the section.
*   `window.adminMusicManagement.addUiSoundItem()`: Prompts the admin for a new key for a UI sound, adds it to `currentUiSounds` with a placeholder URL, and re-renders the UI sounds section.
*   `window.adminMusicManagement.deleteUiSoundItem(key)`: Removes a UI sound item by its key after confirmation and re-renders the section.
*   `window.adminMusicManagement.testSound(typePrefix, index, buttonElement)`: Tests a sound from the Ambient, Study, or Binaural libraries. For YouTube links, it opens the video in a new tab. For streamable sounds, it uses `playTestSoundOnce` (from `audio_service.js`).
*   `window.adminMusicManagement.testUiSound(key, buttonElement)`: Tests a UI sound effect using `playTestSoundOnce`.
*   `window.adminMusicManagement.generateConfigCode()`:
    *   Cleans the current library arrays (e.g., ensuring required fields, correct structure for YouTube vs. stream).
    *   Generates a JavaScript code snippet representing the updated `AMBIENT_SOUNDS_LIBRARY`, `STUDY_MUSIC_LIBRARY`, `BINAURAL_BEATS_LIBRARY`, and `UI_SOUND_EFFECTS` constants.
    *   Displays this code in a `<pre>` tag for the admin to copy.

**Role within the Application:** `admin_music_management.js` provides a convenient way for administrators to curate the sound experience of the application without directly editing JavaScript code for every minor change. By generating the configuration code, it maintains a separation between the admin UI and the actual application configuration, requiring a manual step by a developer (or an admin with file system access) to apply the changes. This makes it easier to manage and update the lists of available sounds and music.

---

### `admin_pdf_processing_service.js`

**Purpose:** This file provides an administrative interface for processing textbook PDF files. The primary goal is to take a full textbook PDF, analyze its table of contents (using AI), split it into individual chapter PDFs, and archive these assets (the full textbook and individual chapters) to Google Drive.

**Key Functions/Variables:**

*   `startPdfProcessing(file, courseId, actualFirstPageNumber)`:
    *   This is the core function triggered when an admin submits the PDF processing form.
    *   It takes the uploaded PDF file, the ID of the course it belongs to, and the "actual first page number" (the page number in the PDF viewer that corresponds to page 1 of the textbook's content, accounting for front matter).
    *   It prompts the admin for a Gemini API Key (used by the backend for Table of Contents analysis).
    *   It constructs a `FormData` object containing the PDF file and other details.
    *   It sends this data to a backend service endpoint (`http://localhost:3001/process-textbook-pdf`).
    *   It updates a feedback area in the UI with the status of the processing and the results (links/IDs to the full PDF and chapter PDFs on Google Drive).
    *   The actual PDF parsing, splitting, and Google Drive interaction happen on the backend server.
*   `displayTextbookPdfProcessor(containerElement)`:
    *   Renders the UI for the "PDF Alchemist's Bench."
    *   This UI includes:
        *   A file input for uploading the textbook PDF.
        *   A dropdown to select the course to associate the PDF with (populated from `globalCourseDataMap`).
        *   A number input for the "actual first page number."
        *   A button to start the processing.
        *   A feedback area to display results or errors.
    *   It attaches an event listener to the "Start Transmutation" button to call `startPdfProcessing`.

**Role within the Application:** `admin_pdf_processing_service.js` (in conjunction with its backend counterpart) is a key tool for course content preparation. It automates the laborious task of breaking down large textbook PDFs into more manageable chapter-specific PDFs. These chapter PDFs can then be used as study materials within the courses or as input for further AI-driven question generation. By integrating with Google Drive, it ensures these processed assets are stored in the cloud. The Google Drive API key and potentially service account credentials (configured on the backend) are used by the backend service for authentication and uploads.

---

### `admin_playlist_and_content_deletion.js`

**Purpose:** This file provides administrative tools for managing YouTube video playlists associated with courses and for deleting user-generated content (specifically formula sheets and chapter summaries).

**Key Functions/Variables:**

*   **Playlist Management:**
    *   `selectedVideosForAssignmentAdmin`, `currentLoadedPlaylistCourseIdAdmin`: Module-level state to keep track of selected videos and the currently loaded course for playlist operations.
    *   `populateAdminCourseSelect()`: Populates a dropdown menu (`admin-playlist-course-select`) with courses that have associated YouTube playlists.
    *   `extractPlaylistIdAdmin(url)`: Extracts the YouTube playlist ID from a YouTube playlist URL.
    *   `fetchPlaylistItemsAdmin(playlistId, apiKey, pageToken)`: Fetches video items from a YouTube playlist using the YouTube Data API. Handles pagination.
    *   `loadPlaylistForAdmin()`: Loads all videos from the YouTube playlist(s) associated with the selected course. It then renders these videos in a list, allowing admins to select them.
    *   `renderPlaylistVideosAdmin(videos, container)`: Renders the list of videos from a playlist, each with a checkbox for selection.
    *   `toggleSelectAllVideosAdmin(select)`: Selects or deselects all videos in the currently displayed playlist.
    *   `toggleVideoSelectionAdmin(listItem, videoId, videoTitle)`: Toggles the selection state of an individual video.
    *   `updateSelectionStateAdmin(videoId, videoTitle, isSelected)`: Updates the `selectedVideosForAssignmentAdmin` array based on user selections.
    *   `updateSelectedVideoCountAdmin()`: Updates a UI element displaying the number of currently selected videos and enables/disables action buttons.
    *   `handleAssignVideoToChapter()`: Assigns the selected YouTube videos (their URLs and titles) to a specified chapter number within the selected course. It updates the `chapterResources` field of the course definition in Firestore via `updateCourseDefinition`.
    *   `handleUnassignVideoFromChapter()`: Removes selected YouTube videos from a specified chapter in the course definition in Firestore.
*   **User-Generated Content Deletion:**
    *   `findUserIdForContentDeletion(searchTerm)`: A helper to find a user's ID by searching their UID, email, or username (likely similar to `findUserIdAdmin` in `admin_user_management.js`).
    *   `handleDeleteUserFormulaSheetAdmin()`: Provides a UI for admins to specify a user, course, and chapter, and then deletes the user's saved formula sheet for that context using `deleteUserFormulaSheet` (from `firebase_firestore.js`).
    *   `handleDeleteUserChapterSummaryAdmin()`: Similar to the formula sheet deletion, but for user-generated chapter summaries, using `deleteUserChapterSummary` (from `firebase_firestore.js`).

**Role within the Application:** This module serves two main administrative purposes:
1.  **Course Video Management:** It allows admins to curate the video content associated with course chapters by easily pulling videos from YouTube playlists and linking them to specific chapters in the course structure. This is crucial for courses that rely on video lectures.
2.  **Content Moderation/Cleanup:** It provides tools for targeted deletion of specific user-generated content (formula sheets, summaries). This might be used to remove inappropriate content, outdated materials, or as part of user data management requests.

The functions related to playlist management are typically part of the "Course Content" or "Course Editor" section of an admin panel, while the deletion tools fall under user data management or moderation.

---

### `admin_question_generation_service.js`

**Purpose:** This file provides administrative interfaces for generating multiple-choice questions (MCQs) and open-ended problems from course materials, specifically from chapter PDFs and lecture transcripts (SRT files). It relies on a backend service to perform the actual AI-driven question generation and interaction with Google Drive for storing the generated content.

**Key Functions/Variables:**

*   `unescape(htmlStr)`: A utility function to decode HTML entities, likely used for correctly displaying titles or other text retrieved from attributes.
*   **PDF Question Generation:**
    *   `startPdfMcqProblemGeneration(courseId, chapterKey, chapterPdfGoogleDriveLink, chapterTitle)`:
        *   Triggered when an admin wants to generate questions from a specific chapter PDF.
        *   Takes the course ID, a unique key for the chapter (e.g., `chapter_1`), the Google Drive link/ID to the chapter's PDF, and the chapter title.
        *   Prompts the admin for a Gemini API Key.
        *   Sends a request to a backend service endpoint (`http://localhost:3001/generate-questions-from-pdf`) with these details. The backend would use its Google Drive credentials to access the PDF.
        *   Displays feedback from the backend, including links/IDs to the generated MCQ and problem files on Google Drive.
    *   `displayPdfMcqProblemGenerator(containerElement)`:
        *   Renders the UI for the "Oracle's Forge (Chapter PDF Q-Gen)."
        *   Allows admins to select a course, then a chapter within that course (dynamically populated if the chapter has an associated PDF link/ID in `chapterResources`).
        *   Displays the Google Drive PDF link/ID for the selected chapter.
        *   Provides a button to initiate the question generation process by calling `startPdfMcqProblemGeneration`.
*   **Lecture Transcript Question Generation:**
    *   `startLectureMcqProblemGeneration(courseId, selectedLectures, chapterNameForLectures)`:
        *   Triggered for generating questions from lecture transcripts.
        *   Takes the course ID, an array of selected lecture objects (each containing a `title` and `gdriveSrtId` or `gdriveSrtLink`), and a name for the topic/chapter these lectures pertain to.
        *   Prompts for a Gemini API Key.
        *   Sends a request to a backend service endpoint (`http://localhost:3001/generate-questions-from-lectures`) with these details. The backend uses its Google Drive credentials.
        *   Displays feedback, including links/IDs to the generated MCQ and problem files on Google Drive, and the new chapter/topic key created for these questions.
    *   `displayLectureMcqProblemGenerator(containerElement)`:
        *   Renders the UI for the "Oracle's Forge (Lecture Q-Gen)."
        *   Allows admins to select a course.
        *   Dynamically lists available lecture transcripts (SRT files linked in `chapterResources.lectureUrls` with `type: 'transcription'`, now pointing to Google Drive IDs/links) for the selected course, allowing multiple selections.
        *   Requires the admin to provide a name for the collection of questions (e.g., "Week 1 Insights").
        *   Provides a button to initiate generation by calling `startLectureMcqProblemGeneration`.

**Role within the Application:** `admin_question_generation_service.js` is a powerful administrative tool that leverages AI to automate the creation of assessment materials. By integrating with backend services that handle the complex AI processing and Google Drive file operations, it allows admins to easily generate questions from existing course content (PDFs and lecture transcripts). This significantly aids in building up question banks for quizzes, exams, and practice exercises. The backend service handles Google Drive authentication for accessing content and saving generated files.

---

### `admin_system_operations.js`

**Purpose:** This file provides an administrative interface for managing various system-level settings and operations. This includes managing a to-do list for admins, configuring global AI system prompts, setting chat auto-deletion policies, and deleting user-generated content (formula sheets, chapter summaries). It also includes a section for configuring default parameters for course exams.

**Key Functions/Variables:**

*   **Admin Tasks Management:**
    *   `loadAdminTasksUI()`: Fetches admin tasks from Firestore (via `fetchAdminTasks`) and renders them in a list. Allows Primary Admin to toggle task status and delete completed tasks.
    *   `handleAddAdminTask()`: Adds a new task to Firestore (via `addAdminTask`). Primary Admin only.
    *   `handleToggleAdminTaskStatus(taskId, isCurrentlyDone)`: Updates the status of a task in Firestore (via `updateAdminTaskStatus`). Primary Admin only.
    *   `handleDeleteAdminTask(taskId)`: Deletes a 'done' task from Firestore (via `deleteAdminTask`). Primary Admin only.
*   **Global AI System Prompts Management:**
    *   `formatAiFunctionKeyForDisplay(key)`: Formats AI function keys (e.g., `mcqGeneration`) for display (e.g., "Mcq Generation").
    *   `renderGlobalAiPromptsAdminUI()`: Renders textareas for each AI function key defined in `AI_FUNCTION_KEYS` (from `ai_prompts.js`). Displays current global prompts and default values. Editable by Primary Admin only.
    *   `handleSaveGlobalPromptsToFirestore()`: Saves the entered global AI prompts to Firestore (via `saveGlobalAiPrompts`) and updates the local `globalAiSystemPrompts` state. Primary Admin only.
*   **Chat Auto-Deletion Settings:**
    *   `loadChatAutoDeleteSettingAdmin()`: Loads the current chat auto-deletion setting (number of days, or 0 for disabled) from `settings/chat` in Firestore and updates the UI select element.
    *   `saveChatAutoDeleteSettingAdmin()`: Saves the selected auto-deletion period to Firestore. Primary Admin only.
*   **Course Exam Defaults Configuration:**
    *   `handleSaveCourseExamDefaults()`: Collects default exam parameters (questions, duration, MCQ ratio, text source ratio) for different exam types (assignment, weekly, etc.) from the UI form. Validates the input and saves it to Firestore via `saveCourseExamDefaults`. Primary Admin only.
    *   `displayCourseExamDefaultsSection(containerElement)`: Renders a form with input fields for each exam type and parameter, pre-filled with current defaults from `courseExamDefaults` state or `FALLBACK_EXAM_CONFIG`.
*   **Main Display Function:**
    *   `displaySystemOperationsSection(containerElement)`: Renders the overall UI for the "System Operations" section, including subsections for Admin Tasks, Global AI Prompts, Chat Auto-Deletion, and Course Exam Defaults. It initializes these subsections by calling their respective rendering/loading functions.
*   **User-Generated Content Deletion (UI setup, actual deletion in `admin_playlist_and_content_deletion.js`):**
    *   The UI for deleting user formula sheets and chapter summaries is set up here, allowing an admin to input user details, course, and chapter. The actual deletion logic is typically handled by functions imported from `firebase_firestore.js` and called from `admin_playlist_and_content_deletion.js` or directly if those UI elements were moved here. (Based on the provided code, the UI for this is in `admin_system_operations.js` but the handlers `handleDeleteUserFormulaSheetAdmin` etc. are in `admin_playlist_and_content_deletion.js`. This suggests a potential structural inconsistency or that those handlers are globally available and this file just sets up the UI that calls them).

**Role within the Application:** `admin_system_operations.js` serves as a control panel for various backend and global settings of the application. It allows Primary Admins to manage operational tasks, fine-tune the behavior of AI systems through global prompts, establish data retention policies for chat, configure default behaviors for course exams, and perform specific content deletions. This module is critical for the overall administration and maintenance of the platform.

---

### `admin_testing_aids.js`

**Purpose:** This file provides a suite of tools specifically for administrators to manipulate user progress and data for testing and debugging purposes. It allows admins to simulate various user states and scenarios without having to manually go through the entire user experience.

**Key Functions/Variables:**

*   `selectedUserForAids`, `selectedTestGenSubjectIdForAids`, `selectedCourseIdForAids`: Module-level state variables to store the context (user, subject, course) for which the testing aids will be applied.
*   `findUserForAids(searchTerm)`: Searches for a user in Firestore by UID, email, or username. Returns an object with user details including their TestGen subjects and enrolled courses with progress.
*   `renderTestGenSubjectSelector()`: Populates a dropdown with the TestGen subjects of the `selectedUserForAids`.
*   `renderCourseSelectorForAids()`: Populates a dropdown with the courses the `selectedUserForAids` is enrolled in. Also updates a display area showing which course is selected for the "Simulate Days Passed" feature.
*   `renderChapterSelectorForAids(courseId)`: Populates a dropdown with chapters for the selected course, including an "All Chapters" option.
*   `displayTestingAidsSection(containerElement)`: Renders the main UI for the "Admin Testing Aids" section. This includes:
    *   A user search input to load a user's data.
    *   Sections for "TestGen Subject Aids" and "Course Aids" that become visible after a user is loaded.
    *   A section for "Simulate Days Passed in Course."
*   `window.loadUserForAids()`: Attached to a button; calls `findUserForAids` and then updates the UI to display selectors for the loaded user's subjects and courses, and makes the relevant aid sections visible.
*   **TestGen Aids (Attached to window):**
    *   `window.handleMarkAllTestGenStudied()`: Marks all chapters in the `selectedTestGenSubjectIdForAids` as studied for the `selectedUserForAids`. Calls `adminMarkTestGenChaptersStudied` from `firebase_firestore.js`.
    *   `window.handleResetTestGenProgressForUser()`: Resets all progress (attempts, scores, available questions) for the `selectedTestGenSubjectIdForAids` for the `selectedUserForAids`. Calls `adminResetTestGenSubjectProgress` from `firebase_firestore.js`.
*   **Course Aids (Attached to window):**
    *   `window.handleMarkCourseChapterStudied()`: Marks the selected chapter (or all chapters) in the `selectedCourseIdForAids` as studied for the `selectedUserForAids`, including setting 100% media progress (video/PDF). Calls `adminMarkCourseChapterStudied` from `firebase_firestore.js`.
    *   `window.handleAdminCompleteActivity()`: Prompts the admin for activity type (e.g., assignment, weekly_exam), activity ID, and score, then marks that activity as complete with the given score for the selected user and course. Calls `adminCompleteCourseActivity` from `firebase_firestore.js`.
    *   `window.handleAdminSetCourseStatus()`: Prompts for a new status (enrolled, completed, failed) and an optional final mark for the selected user and course. Calls `adminSetCourseStatusAndGrade` from `firebase_firestore.js`.
    *   `window.handleAdminAdjustCredits()`: Allows granting or revoking a specified number of credits for the selected user with a given reason. Calls `adminAdjustUserCredits` from `firebase_firestore.js`, logging the performing admin's UID.
*   **Simulate Days Passed (Attached to window):**
    *   `window.handleAdminSimulateDaysPassed()`: Takes a number of days from an input field and effectively changes the enrollment date of the `selectedUserForAids` for the `selectedCourseIdForAids` to simulate that those many days have passed. This is useful for testing pace calculations and time-based objectives. Calls `adminSimulateDaysPassed` from `firebase_firestore.js`.

**Role within the Application:** `admin_testing_aids.js` is a specialized administrative tool designed to facilitate testing and debugging of features related to user progress, course completion, and TestGen mechanics. It provides shortcuts to manipulate user data in ways that would normally require significant time or specific sequences of actions as a regular user. This is essential for developers and QA testers to efficiently verify application logic.

---

### `admin_transcription_service.js`

**Purpose:** This file provides an administrative interface for transcribing YouTube lectures into SRT (SubRip Text) subtitle files. It interacts with a backend service that handles the actual transcription process (likely using AssemblyAI) and archiving the resulting SRT file to Google Drive.

**Key Functions/Variables:**

*   `ASSEMBLYAI_API_KEY`: A constant holding the API key for the AssemblyAI service. (Note: Storing API keys client-side is generally insecure for production; this suggests it might be for a local admin tool or the key is proxied/validated server-side if this were a deployed feature).
*   `startLectureTranscription(youtubeUrl, courseId, chapterId)`:
    *   This is the core function triggered when an admin initiates a transcription.
    *   It takes a YouTube video URL, the ID of the course it belongs to, and the ID/key of the chapter it's associated with.
    *   It sends a request to a backend service endpoint (`http://localhost:3001/transcribe-lecture`).
    *   The request includes the YouTube URL, course/chapter context, and the AssemblyAI API key. The backend uses its Google Drive credentials for storage.
    *   It updates a feedback area in the UI with the status of the transcription and the results (video title, SRT filename, Google Drive link/ID to the SRT file, AssemblyAI transcript ID, and Firestore update status).
    *   The actual audio downloading, transcription via AssemblyAI, SRT file generation, and Google Drive upload happen on the backend server.
*   `displayLectureTranscriptionAutomator(containerElement)`:
    *   Renders the UI for the "Lecture Transcription" tool.
    *   This UI includes:
        *   An input field for the YouTube lecture URL.
        *   A dropdown to select the course to associate the transcript with (populated from `globalCourseDataMap`).
        *   A dropdown to select the specific chapter within the chosen course (dynamically populated based on the selected course's chapter list).
        *   A button to start the transcription process.
        *   A feedback area to display results or errors.
    *   It attaches an event listener to the "Start Transcription" button to call `startLectureTranscription`.
    *   It also sets up an event listener on the course selection dropdown to dynamically update the chapter selection dropdown.

**Role within the Application:** `admin_transcription_service.js` (along with its backend counterpart) automates the creation of text transcripts for video lectures. This is a valuable feature for:
1.  Accessibility: Providing text alternatives for hearing-impaired users.
2.  Searchability: Making video content searchable.
3.  Content Repurposing: Transcripts can be used as a base for creating summaries, notes, or even further AI-driven question generation (as seen in `admin_question_generation_service.js`).
By integrating with Google Drive, it ensures these generated SRT files are stored in the cloud alongside other course assets. The backend service handles Google Drive authentication for file uploads.

---

### `admin_user_management.js`

**Purpose:** This file provides comprehensive administrative tools for managing users, their course enrollments, badges, and TestGen subject statuses. It allows admins to search for users, view their details, modify their roles (admin status), and manage various aspects of their learning progress and achievements.

**Key Functions/Variables:**

*   `currentManagingUserIdForSubjects`: A module-level variable to keep track of the user whose TestGen subjects are currently being managed (likely for subject approval workflows).
*   `findUserIdAdmin(searchTerm)`: An asynchronous helper function to find a user's ID by searching their UID, email, or username in Firestore. This is a common utility for admin panels.
*   `displayUserManagementSection(containerElement)`: Renders the main UI for the "User Management" section, which is typically divided into subsections:
    *   User Listing & Search: Allows searching for users and displays a list.
    *   User Course Progress: Displays courses a selected user is enrolled in and allows status/grade changes.
    *   User Badges: Manages badges awarded to a user for course completions.
    *   User Subject Approvals (TestGen): Manages the approval status of user-created or modified TestGen subjects.
*   **User Listing & Search:**
    *   `listAllUsersAdmin()`: Fetches users from Firestore based on a search term (UID, email, name prefix) or lists all users (with a limit). Renders each user with their details (avatar, name, email, UID, creation date, admin status) and provides buttons to "View Details" or toggle their admin status (Primary Admin only).
*   **User Detail View (Modal):**
    *   `viewUserDetailsAdmin(userId)`: Fetches detailed data for a specific user (profile info, course progress, badges) and displays it in a modal dialog. Allows Primary Admin to edit the username.
*   **User Course Progress Management:**
    *   `loadUserCoursesForAdmin()`: Searches for a user and then lists all courses they are enrolled in, showing their status and grade. Provides a button to "Set Status/Grade" for each course.
    *   `handleAdminMarkCourseComplete(userId, courseId)`: Prompts the admin for a new status (enrolled, completed, failed) and an optional final mark for a user's course. Calls `updateCourseStatusForUser` (from `firebase_firestore.js`) to update the data.
*   **User Badge Management:**
    *   `loadUserBadgesForAdmin()`: Searches for a user and displays a list of their completed course badges. Provides buttons to add a new badge or remove existing ones.
    *   `promptAddBadge(userId)`: Prompts the admin for course ID, course name, grade, and completion date to create a new badge. Calls `handleAddBadgeForUser` (from `firebase_firestore.js`).
    *   `confirmRemoveBadge(userId, courseId)`: Prompts for confirmation and then calls `handleRemoveBadgeForUser` (from `firebase_firestore.js`) to remove a badge.
*   **User Subject Approval (TestGen):**
    *   `loadUserSubjectsForAdmin()`: Searches for a user and lists their TestGen subjects, showing the status of each (pending, approved, rejected). Provides buttons to change the approval status.
    *   `handleAdminUserSubjectApproval(targetUserId, subjectId, newStatus)`: Calls `adminUpdateUserSubjectStatus` (from `firebase_firestore.js`) to change the approval status of a user's TestGen subject.
*   **Username & Admin Status Toggling:**
    *   `promptAdminChangeUsername(userId, currentUsername)`: (Primary Admin only) Prompts for a new username for a user.
    *   `handleAdminChangeUsername(userId, currentUsername, newUsername)`: (Internal helper) Calls `adminUpdateUsername` (from `firebase_firestore.js`) to update the username in Firestore and the `usernames` collection.
    *   `handleToggleAdminStatus(targetUserId, currentIsAdmin)`: (Primary Admin only, cannot target self) Calls `toggleUserAdminStatus` (from `firebase_firestore.js`) to grant or revoke admin privileges for a user.

**Role within the Application:** `admin_user_management.js` is a central hub for administrators to oversee and manage the user base. It provides the necessary tools to inspect user activity, modify user roles, manage course completions and badges, and control the status of user-contributed TestGen subjects. This module is critical for maintaining user data integrity, supporting users, and managing administrative permissions.
---
### `ui_admin_dashboard.js`

**Purpose:** This file is responsible for creating and managing the main administrative dashboard interface. It acts as a central navigation hub for various admin functionalities by dynamically loading different sections (e.g., User Management, Course Content, Moderation, System Operations) into a content area.

**Key Functions/Variables:**

*   `currentAdminSection`: A module-level variable that keeps track of the currently active admin section being displayed (e.g., 'overview', 'userManagement').
*   Imported Display Functions: It imports various `display...Section` functions from specialized admin modules (e.g., `displayUserManagementSection` from `admin_user_management.js`, `displayCourseManagementSection` from `admin_course_content.js`, etc.).
*   `updateAdminPanelBackgroundRGBs()`: A utility function to adjust CSS custom property values for background and border colors based on the current theme (dark/light). This is used to maintain consistent styling for the admin panel's custom opacity settings.
*   `showAdminDashboard()`:
    *   The main function to render the admin dashboard structure.
    *   Checks if the current user is an admin; if not, it displays an access denied message.
    *   Sets up the admin panel layout with a sidebar navigation menu and a main content area.
    *   The sidebar menu contains links that, when clicked, call `window.showAdminSection()` to load the corresponding section.
    *   Initializes the dashboard by showing the 'overview' section by default.
    *   Attaches an event listener to the theme toggle to update admin panel background colors if the theme changes.
*   `showAdminSection(sectionName)`:
    *   Updates `currentAdminSection` with the new `sectionName`.
    *   Highlights the active link in the admin sidebar navigation.
    *   Clears the main admin content area and displays a loading message.
    *   Uses a `switch` statement to call the appropriate `display...Section` function based on `sectionName`, which then renders the content for that specific admin module (e.g., user management tools, course content tools, etc.).
    *   For the 'overview' section, it dynamically creates stat card placeholders and then calls `loadAdminOverviewStats()` to populate them. It also renders a form for sending global announcements.
*   `window.handleSendGlobalAnnouncement(event)`: Handles the submission of the global announcement form. It prevents default form submission, gets the subject and body, confirms with the admin, and then calls `sendGlobalAnnouncementToAllUsers` (from `firebase_firestore.js`).
*   `loadAdminOverviewStats()`: Fetches aggregate statistics (total users, pending courses, etc.) using `getAdminOverviewStats` (from `firebase_firestore.js`) and renders them as "stat cards" in the overview section.
*   `createStatCard(title, value, iconType, ...)`: A helper function to generate the HTML for a single statistic card displayed on the admin overview page.
*   `getStatIcon(type, ...)`: A helper to return SVG HTML for different icon types used in stat cards.
*   Global Window Assignments: Many functions from the imported admin modules (and some defined within this file like `showAdminSection`) are explicitly assigned to the `window` object. This makes them callable directly from `onclick` attributes in the HTML generated by this and other admin UI modules.

**Role within the Application:** `ui_admin_dashboard.js` serves as the primary entry point and container for all administrative functionalities. It provides a consistent navigation structure (sidebar) and a flexible content area where different admin modules can display their interfaces. It orchestrates the display of various admin sections, ensuring that only authorized admin users can access these tools.

---

### `ui_ai_chat_studio.js`

**Purpose:** This file implements the "AI Chat Studio," a feature allowing users to engage in conversational interactions with an AI model (Lyra). It manages chat sessions (creating, loading, switching, deleting), handles message sending and receiving, and renders the chat interface.

**Key Functions/Variables:**

*   `chatSessions`: A `Map` storing all loaded chat sessions for the current user. Each session object includes a `name`, `history` (array of message objects), `createdAt`, `systemPromptKey`, and `lastModified` timestamp.
*   `activeChatSessionId`: Stores the ID of the currently displayed chat session.
*   `defaultSystemPromptKey`: The key used to fetch the default system prompt for new chat sessions (e.g., 'aiChatStudioDefault').
*   `replyingToMessageId`, `replyingToSenderName`, `replyingToPreview`: Module-level state for managing the reply context when a user chooses to reply to a specific message.
*   Mention-related variables (`mentionSuggestions`, `activeSuggestionIndex`, `currentMentionQuery`, `currentMentionTriggerPosition`, `mentionPopup`, `mentionListElement`, `isFetchingSuggestions`, `suggestionFetchTimeout`): State and UI elements for the @mention user suggestion feature.
*   `showAiChatStudio()`: The main function to display the Chat Studio UI. It sets up the HTML structure (sidebar for sessions, main chat area), attaches event listeners for new chat, message sending, and input handling. It then loads existing user chat sessions.
*   `loadUserChatSessions()`: Fetches the user's chat sessions from Firestore (via `loadUserChatSessionsFromFirestore`), populates the `chatSessions` map, and then calls `loadChatSessionsList()` and `renderActiveChatInterface()`.
*   `generateChatStudioHtml()`: Returns the basic HTML structure for the chat studio.
*   `autoResizeTextarea(event)`: Adjusts the height of the chat input textarea dynamically as the user types.
*   `loadChatSessionsList()`: Renders the list of chat sessions in the sidebar, sorted by `lastModified` date. Allows switching between sessions and deleting sessions.
*   `deleteChatSessionUI(sessionId, sessionName)`: (Exposed on `window`) Handles the UI confirmation and calls `deleteChatSessionFromFirestore` to delete a session. Updates the UI.
*   `renderActiveChatInterface()`: Renders the header (session name) and messages for the `activeChatSessionId`. If no session is active, it displays a welcome/instructional message.
*   `handleNewChat()`: Prompts for a new chat session name, creates a new session object with an initial system prompt and AI acknowledgment message, saves it to Firestore (via `saveChatSession`), and makes it the active session.
*   `handleSwitchChat(sessionId)`: Sets the `activeChatSessionId` and re-renders the chat interface.
*   `renderChatMessage(message, isLastUserMessage)`: Generates the HTML for a single chat message, styling it differently for user vs. model messages. It includes sender avatar, name, timestamp, and action buttons (copy, delete, pin, reply). It also formats the message content using `applyMarkdown` and `highlightMentions`. It hides the initial system prompt setup messages from display.
*   `renderActiveChatMessages()`: Renders all messages for the currently active chat session into the messages container and scrolls to the bottom. It also calls `renderMathIn` to typeset any LaTeX.
*   `handleSendMessage()`:
    *   Triggered when the user sends a message.
    *   Gets the message text from the input.
    *   Creates a user message object and adds it to the current session's history.
    *   Calls `callGeminiTextAPI` (from `ai_integration.js`) with the message text and the session's history (excluding the latest user message) and system prompt key.
    *   Adds the AI's response (or an error message) to the history.
    *   Saves the updated session to Firestore (via `saveChatSession`).
    *   Re-renders messages and updates the session list.
*   **Reply Context Functions:**
    *   `startReply(messageId, senderName, previewText)`: Sets the reply context state and updates the UI to show what message is being replied to.
    *   `cancelReply()`: Clears the reply context state and UI.
*   **Mention Suggestion Functions:**
    *   `fetchUserSuggestions(query)`: Fetches user suggestions from Firestore based on the text typed after "@".
    *   `renderMentionSuggestions()`: Displays the suggestion popup near the chat input.
    *   `hideMentionSuggestions()`: Hides the popup.
    *   `updateActiveSuggestion(direction)`: Navigates through suggestions using arrow keys.
    *   `selectMentionSuggestion(selectedUsername)`: Inserts the selected mention into the chat input.
    *   `handleChatInput(event)`: Listens to input events to trigger mention suggestion fetching.
    *   `handleChatKeyDown(event)`: Handles keyboard navigation (arrows, Enter, Tab, Escape) for mention suggestions.

**Role within the Application:** `ui_ai_chat_studio.js` provides a dedicated, feature-rich interface for users to have extended conversations with the AI model. It supports multiple chat sessions, message history persistence (via Firestore), reply functionality, @mentions, and Markdown/LaTeX rendering in messages. This makes it a more powerful alternative to simple, one-off AI interactions elsewhere in the app.

---

### `ui_ai_settings.js`

**Purpose:** This file provides the user interface for managing AI-related settings. Users can configure their preferred AI models (primary and fallback) and customize system prompts for various AI functions used throughout the application.

**Key Functions/Variables:**

*   Simulated Firestore Functions (`simulatedSaveUserAiSettingsToFirestore`, `simulatedLoadUserAiSettingsFromFirestore`): Placeholder functions that use `localStorage` to mimic Firestore interaction for saving and loading user-specific AI settings. **In a real application, these would be replaced by actual calls to functions in `firebase_firestore.js`.**
*   `formatAiFunctionKey(key)`: A helper function to convert camelCase or snake_case AI function keys (e.g., `examMarkerProblem`) into a more human-readable format (e.g., "Exam Marker Problem") for display in the UI.
*   `renderAiSettingsForm()`:
    *   The main function to generate and display the AI settings form.
    *   **Model Selection:** Creates dropdowns (`<select>`) for choosing the "Primary AI Model" and "Fallback AI Model". These dropdowns are populated with model names from `AVAILABLE_AI_MODELS` (in `config.js`). The current selections are based on `userAiChatSettings` from the application state.
    *   **System Prompts Configuration:**
        *   Iterates through `AI_FUNCTION_KEYS` (from `ai_prompts.js`).
        *   For each key, it displays:
            *   The friendly name of the AI function.
            *   The source of the currently effective prompt ("User Custom," "Global Default," or "Application Default").
            *   A textarea showing the effective system prompt. This textarea is initially read-only.
            *   Buttons: "Edit," "Save This Prompt" (initially hidden), "Cancel Edit" (initially hidden), and "Reset This Prompt" (initially hidden).
*   `window.handleEditPrompt(key)`: Called when an "Edit" button is clicked for a system prompt. Makes the corresponding textarea writable, highlights it, and shows the Save/Cancel/Reset buttons for that prompt. Stores the pre-edit value for cancellation.
*   `window.handleSavePromptChange(key)`: Called when "Save This Prompt" is clicked.
    *   Updates the `userAiChatSettings.customSystemPrompts` in the local application state with the new value from the textarea.
    *   If the new prompt is empty or identical to the effective default (global or application), it removes the custom prompt for that key, effectively reverting to the default.
    *   Re-renders the entire settings form to reflect the change and update the "source" indicator.
    *   **Note:** This function only updates the *local state*. The actual saving to persistent storage (Firestore/localStorage) happens via `saveAllAiSettingsToCloud`.
*   `window.handleCancelPromptEdit(key)`: Restores the textarea's content to its pre-edit value and reverts the UI to read-only mode for that prompt.
*   `window.handleResetPromptToDefault(key)`: Removes the custom prompt for the given `key` from `userAiChatSettings.customSystemPrompts` in the local state, effectively reverting it to the global or application default. Re-renders the form.
*   `window.saveAllAiSettingsToCloud()`:
    *   Collects the selected primary and fallback AI models from the dropdowns.
    *   Takes the `customSystemPrompts` directly from the (potentially modified) `userAiChatSettings` in the local state.
    *   Calls `simulatedSaveUserAiSettingsToFirestore` to save these settings.
    *   After successful save, it reloads the settings (via `simulatedLoadUserAiSettingsFromFirestore`), updates the local `userAiChatSettings` state with the loaded data (to ensure consistency with the "source of truth"), and then re-renders the entire form.
*   `showAiChatSettings()`:
    *   The main entry point to display the AI Settings page.
    *   Sets the active sidebar link.
    *   Loads the user's AI settings from the (simulated) Firestore if not already up-to-date in the local state.
    *   Calls `renderAiSettingsForm()` to display the UI.

**Role within the Application:** `ui_ai_settings.js` empowers users to customize their interaction with the platform's AI features. By allowing selection of different AI models and overriding default system prompts, users can tailor the AI's behavior, tone, and output format to their preferences or specific needs for various tasks (like chat, exam marking, content generation). The local state updates provide immediate UI feedback, while a global "Save All" button persists these customizations.

---

### `ui_answer_submission.js`

**Purpose:** This file manages the UI and logic for users to submit answers to exams, offering two methods: manual text entry (with LaTeX support for problems) and experimental PDF upload with Optical Character Recognition (OCR) for handwritten answers.

**Key Functions/Variables:**

*   Module State:
    *   `currentOcrExamId`: Stores the ID of the exam for which answers are being submitted.
    *   `currentOcrQuestions`: An array of the original exam question objects.
    *   `currentOcrPagesData`: An array where each element represents a page from an uploaded PDF. Each page object stores `{ pageNum, imageDataUrl, ocrText, userCorrectedText, questionMappings }`. `questionMappings` links parts of the OCR text to specific exam questions.
    *   `currentOcrPageIndex`: Tracks the currently viewed page in the OCR review process.
*   `showAnswerSubmissionOptions(examId, examQuestionsArray)`: (Exposed on `window`) The initial entry point. Displays options to either "Enter Answers Manually" or "Upload Answer PDF". Stores `examId` and `examQuestionsArray` in module state.
*   **Manual Answer Entry:**
    *   `showManualAnswerEntryFormWrapper()`: (Exposed on `window`) Wrapper that calls `showManualAnswerEntryForm` with stored exam context.
    *   `showManualAnswerEntryForm(examId, questions)`: Renders a form with input fields for each question.
        *   For problems (`q.isProblem`), it provides a textarea for the solution and integrates the LaTeX toolbar (`generateLatexToolbar`, `insertLatexSnippetForProblem`) with a live preview area (`updateLatexPreviewManual`).
        *   For MCQs, it renders radio buttons for the options.
    *   `window.updateLatexPreviewManual(questionIdSuffix)`: Updates the MathJax preview for a manually entered LaTeX solution.
    *   `window.submitManualAnswers()`: Collects all manually entered answers. Constructs a temporary `examState` object (similar to the one used in online tests). Calls `storeExamResult` (from `exam_storage.js`) to save and mark the answers. Redirects to the exam review UI upon success.
*   **PDF Upload and OCR (Experimental):**
    *   `showPdfUploadFormWrapper()`: (Exposed on `window`) Wrapper for `showPdfUploadForm`.
    *   `showPdfUploadForm(examId, questions)`: Renders a form for uploading a PDF file containing answers.
    *   `handleAnswerPdfUploadWrapper()`: (Exposed on `window`) Wrapper for `handleAnswerPdfUpload`.
    *   `handleAnswerPdfUpload(examId, questions)`:
        *   Handles the PDF file selection. Validates file size (max 10MB) and number of pages (max 20).
        *   Uses `pdfjsLib` to render each page of the PDF onto a canvas and converts it to a JPEG `imageDataUrl`.
        *   Populates `currentOcrPagesData` with objects for each page, storing the image data.
        *   Calls `renderOcrReviewPage()` to start the review process.
    *   `performOcrForCurrentPageWrapper()`: (Exposed on `window`) Wrapper for `performOcrForCurrentPage`.
    *   `performOcrForCurrentPage()`:
        *   If OCR hasn't been performed for the current page yet:
        *   Sends the page's `imageDataUrl` (base64 encoded) to `callGeminiVisionAPI` (from `ai_integration.js`) with a prompt to extract text and math.
        *   Stores the OCR result in `pageData.ocrText` and initializes `pageData.userCorrectedText`.
        *   Re-renders the OCR review page.
    *   `renderOcrReviewPage()`: Displays the current PDF page image, a textarea for the (corrected) OCR text, and a section for mapping parts of this text to specific exam questions. Includes navigation buttons (Previous/Next Page) and a "Finalize & Submit" button on the last page.
    *   `window.updateCorrectedOcrText(pageNum, newText)`: Updates `userCorrectedText` for a page as the user edits the OCR result.
    *   `renderOcrQuestionMappingInputs(pageData)`: Renders read-only textareas for each exam question, where mapped OCR text will be shown. Includes "Map Selected Text" buttons.
    *   `window.mapSelectedOcrToQuestion(pageNum, questionIndex, questionId)`: When "Map Selected Text" is clicked, it takes the currently selected text from the main OCR textarea and assigns it as the answer for the specified `questionIndex` on the current `pageNum`. Updates `pageData.questionMappings`.
    *   `window.navigateOcrPage(direction)`: Handles navigation between pages in the OCR review UI.
    *   `window.finalizeOcrAndSubmitAnswers()`:
        *   Collects all mapped answer texts from `currentOcrPagesData`, combining texts mapped to the same question from different pages.
        *   Constructs a temporary `examState` object.
        *   Calls `storeExamResult` to save and mark the OCR'd answers.
        *   Redirects to the exam review UI.

**Role within the Application:** `ui_answer_submission.js` provides flexibility for users to submit answers for exams generated as PDFs (e.g., from TestGen). The manual entry form is a straightforward way to type in answers, with good support for mathematical content via LaTeX. The PDF/OCR workflow, while experimental, offers a path for users who prefer to handwrite their answers on a printed exam and then submit a scan. This module bridges the gap between an offline/printed exam experience and the platform's online marking and review capabilities.

---

### `ui_background_management.js`

**Purpose:** This file is responsible for loading and applying user preferences for the application's background image and UI card opacity. It primarily interacts with `localStorage` to retrieve these settings and then calls core styling functions (now expected to be in `ui_settings_panel.js`) to apply them.

**Key Functions/Variables:**

*   Configuration Imports: Imports `DEFAULT_APP_BACKGROUND_IMAGE_URL`, `LOCALSTORAGE_KEY_BACKGROUND`, `LOCALSTORAGE_KEY_OPACITY`, `DEFAULT_CARD_OPACITY` from `config.js`.
*   Styling Function Imports: Imports `applyBackground` and `applyCardOpacity` from `ui_settings_panel.js`. This indicates a refactoring where the actual DOM manipulation logic for these settings resides in `ui_settings_panel.js`, and this module (`ui_background_management.js`) is now focused only on loading preferences.
*   `loadAndApplyBackgroundPreference()`:
    *   Retrieves the saved background preference (an object `{ type, value }`) from `localStorage` using `LOCALSTORAGE_KEY_BACKGROUND`.
    *   Gets the main application background layer DOM element (`#app-background-layer`).
    *   If a valid preference is found, it calls `applyBackground(bgLayer, type, value)` to set the background.
    *   If no preference is found or it's malformed, it applies the `DEFAULT_APP_BACKGROUND_IMAGE_URL` by calling `applyBackground(bgLayer, 'default')`.
    *   Handles potential errors during loading and applies a default background as a fallback.
*   `loadAndApplyCardOpacityPreference()`:
    *   Retrieves the saved card opacity value (a float string) from `localStorage` using `LOCALSTORAGE_KEY_OPACITY`.
    *   If a valid opacity value is found, it calls `applyCardOpacity(parseFloat(savedOpacity))` to set the UI card opacity.
    *   If no preference is found, it applies the `DEFAULT_CARD_OPACITY`.
    *   Handles potential errors and applies the default opacity as a fallback.

**Role within the Application:** `ui_background_management.js` ensures that the user's chosen visual customizations (background and card opacity) are loaded and applied when the application starts or when these settings are changed. After a likely refactoring, its role has become more focused: it primarily acts as a loader for these preferences from `localStorage` and then delegates the actual application of these styles to functions imported from `ui_settings_panel.js`. The original UI for selecting these preferences (the "Background Management" dashboard/modal itself) has been moved to `ui_settings_panel.js`. This module is now about persistence and initial application of these specific visual settings.

---
### `ui_chat.js`

**Purpose:** This file implements the global chat feature of the application. It handles real-time message display, sending new messages, user mentions, message deletion (by owner or admin), message pinning (admin-only), and replying to messages.

**Key Functions/Variables:**

*   `CHAT_COLLECTION`: Constant for the Firestore collection name where chat messages are stored (e.g., "globalChatMessages").
*   `MESSAGES_LIMIT`: Constant defining how many recent messages to load initially (e.g., 50).
*   `unsubscribeChat`: A variable to hold the function returned by Firestore's `onSnapshot` listener, used to unsubscribe from real-time updates when the chat is closed.
*   Reply State Variables (`replyingToMessageId`, `replyingToSenderName`, `replyingToPreview`): Store context when a user is replying to a specific message.
*   Mention Suggestion State Variables (`mentionSuggestions`, `activeSuggestionIndex`, `currentMentionQuery`, `currentMentionTriggerPosition`, `mentionPopup`, `mentionListElement`, `isFetchingSuggestions`, `suggestionFetchTimeout`): Manage the state and UI for the @mention user suggestion feature.
*   `applyMarkdown(escapedText)`: Converts specific Markdown patterns (code blocks, inline code, bold, italic, underline, strikethrough, newlines) within HTML-escaped text into HTML tags. Applied after initial escaping of user input.
*   `highlightMentions(htmlString, currentUserForHighlight)`: Finds @everyone and @username patterns in an HTML string and wraps them in `<span>` tags with specific classes for styling. It also highlights mentions of the current user differently.
*   `renderChatMessage(messageData, messageId)`: Generates the HTML for a single chat message. Includes sender's avatar, name, timestamp, and the message text (processed by `escapeHtml`, `applyMarkdown`, and `highlightMentions`). Adds action buttons: "Reply", "Pin/Unpin" (admin), and "Delete" (owner/admin). Displays reply context if the message is a reply. Visually distinguishes pinned messages.
*   `loadChatMessages(chatContentElement)`: Fetches the initial batch of messages from Firestore and renders them. (Less critical with `onSnapshot` but can be used for initial load).
*   `startReply(messageId, senderName, previewText)`: Sets the reply context state and updates the chat input placeholder and a reply indicator UI to show which message is being replied to.
*   `cancelReply()`: Clears the reply context state and resets the UI.
*   `sendChatMessage(textInputId)`:
    *   Called when the user submits a message.
    *   Gets message text, performs basic validation (not empty, length limit).
    *   Extracts @mentions (usernames and "everyone").
    *   Constructs a message object including sender details, text, timestamp, mentions list, `isPinned: false`, and reply context if active.
    *   Adds the message to the `CHAT_COLLECTION` in Firestore.
    *   Clears the input field and resets the reply state.
*   `deleteChatMessage(messageId)`: Allows the message owner or an admin to delete a message. Confirms before deletion and then removes the message document from Firestore.
*   `togglePinMessage(messageId)`: (Admin only) Toggles the `isPinned` boolean field of a message document in Firestore.
*   `showPinnedMessages()`: Placeholder for a feature to display only pinned messages (not fully implemented in the provided code).
*   `subscribeToChatMessages(chatContentElement)`:
    *   Sets up a real-time Firestore `onSnapshot` listener for the chat message collection.
    *   Handles incoming changes (`added`, `modified`, `removed`).
    *   For added messages, it checks for mentions of the current user or "@everyone".
    *   Re-renders the entire list of messages in the `chatContentElement` upon any change to ensure correct order and display of all current messages.
    *   Manages scrolling behavior to keep the view at the bottom for new messages if the user was already near the bottom.
*   `showGlobalChat()`: The main function to create and display the global chat modal. It handles:
    *   Ensuring the user is logged in.
    *   Clearing any previous chat state (reply context, unsubscribing old listeners).
    *   Generating the modal HTML structure (header with close & pinned buttons, message display area, reply indicator, input textarea, send button, and a hidden mention suggestion popup).
    *   Attaching event listeners for sending messages, closing the modal (Escape key or close button), handling chat input for mentions and auto-resizing.
    *   Calls `subscribeToChatMessages` to listen for real-time updates.
*   Mention Suggestion Functions (`fetchUserSuggestions`, `renderMentionSuggestions`, `hideMentionSuggestions`, `updateActiveSuggestion`, `selectMentionSuggestion`, `handleChatInput`, `handleChatKeyDown`): These functions collectively implement the @mention suggestion feature. When a user types "@" followed by characters, `handleChatInput` triggers `fetchUserSuggestions` (debounced) to query Firestore for matching usernames. `renderMentionSuggestions` displays these in a popup. `handleChatKeyDown` allows navigation and selection from the popup using arrow keys, Enter, or Tab. `selectMentionSuggestion` inserts the chosen mention into the input.

**Role within the Application:** `ui_chat.js` provides the real-time global communication channel for users. It enables users to send and receive messages instantly, mention others to draw their attention, reply to specific messages for context, and allows administrators to moderate (delete messages) and highlight important messages (pinning). The @mention suggestion feature enhances usability by helping users find and correctly tag others.

---

### `ui_core.js`

**Purpose:** This file provides core UI manipulation functions that are used throughout the application. These include functions for showing and hiding the main login UI, updating user information in the header/sidebar, displaying dynamic content in main application areas, clearing content areas, and managing the active state of sidebar links.

**Key Functions/Variables:**

*   `showLoginUI()`:
    *   Makes the application layout visible and hides the public homepage container.
    *   Shows the login/signup form section (`#login-section`).
    *   Hides main content areas like `#content`, `#dashboard`, `#course-dashboard-area`, and `#online-test-area`.
    *   Hides the user information section (`#user-section`) in the header.
    *   Clears any subject-specific information (`#subject-info`).
    *   Hides UI elements that require authentication (`.auth-required`).
    *   Hides main navigation sidebars (`#sidebar-standard-nav`, `#sidebar-course-nav`).
    *   Calls `updateAdminPanelVisibility()` to ensure admin links are correctly shown/hidden.
    *   Calls `showLoginFormOnly()` to default to displaying the login form over the signup form.
*   `hideLoginUI()`:
    *   Hides the login/signup form section.
    *   Ensures the main application layout is visible and the public homepage is hidden (important for transitions after login).
    *   Shows the user information section in the header.
    *   Shows UI elements that require authentication.
    *   Shows the standard navigation sidebar (`#sidebar-standard-nav`) and ensures the course-specific navigation sidebar is hidden by default.
    *   Calls `updateAdminPanelVisibility()`.
*   `fetchAndUpdateUserInfo(user)`:
    *   Takes a Firebase user object (`user`).
    *   Fetches the user's profile data from their Firestore document (`users/{uid}`).
    *   Prioritizes data from Firestore (displayName, photoURL, isAdmin status, credits) but falls back to Auth object data if Firestore document or specific fields are missing.
    *   Constructs an `updatedUserInfo` object with all relevant details.
    *   Calls `setCurrentUser()` (from `state.js`) to update the global `currentUser` state.
    *   Updates the UI:
        *   Renders the user's profile picture and display name in the `#user-display` element in the header.
        *   Shows an admin icon next to the name if the user is an admin.
    *   Fetches and displays the count of unread messages in the user's inbox, updating a badge (`#inbox-unread-count`) and the mobile menu button's notification state.
*   `clearUserInfoUI()`: Clears the user display area in the header, hides the user section, clears subject info, and hides the inbox unread badge.
*   `updateSubjectInfo()`: Updates the `#subject-info` element (typically in the header or sidebar) to display the name and chapter count of the `currentSubject` from the application state. Shows "No Subject Selected" if `currentSubject` is null but a user is logged in.
*   `displayContent(html, targetElementId)`:
    *   A versatile function to render HTML content into a specified target DOM element.
    *   It manages the visibility of different main content areas (`#content`, `#dashboard`, `#course-dashboard-area`, `#online-test-area`), ensuring only the target area is visible.
    *   If `targetElementId` is 'content', it can optionally wrap the provided `html` in a `div.content-card` for consistent styling.
    *   After setting the HTML, it calls `renderMathIn()` (from `utils.js`) on the target element to process any LaTeX.
*   `clearContent()`: Clears and hides all main content display areas.
*   `setActiveSidebarLink(functionName, navSectionId)`:
    *   Highlights the active link in the sidebar navigation.
    *   Removes `active-link` class from all sidebar links.
    *   Adds `active-link` class to the sidebar link whose `onclick` attribute calls the specified `functionName`.
    *   Manages the visibility of the standard sidebar (`#sidebar-standard-nav`) versus the course-specific sidebar (`#sidebar-course-nav`) based on whether `activeCourseId` is set and which `navSectionId` is targeted.
*   `promptForgotPassword()`: (Exposed on `window`) Prompts the user for their email address and then calls `sendPasswordReset` (from `firebase_auth.js`).
*   `showLoginFormOnly()`: (Exposed on `window`) Shows the login form and hides the signup form within the `#login-section`. Updates button states.
*   `showSignupFormOnly()`: (Exposed on `window`) Shows the signup form and hides the login form. Updates button states.
*   `updateMenuButtonNotification()`: Updates the notification indicator on the mobile menu button based on whether there are unread inbox messages.

**Role within the Application:** `ui_core.js` provides fundamental UI manipulation capabilities that form the backbone of the user interface. It controls the overall layout visibility (login vs. authenticated app view), manages the display of user-specific information in shared UI elements like the header, and offers a centralized way to render dynamic content into the main application areas. The `setActiveSidebarLink` function is key to providing visual feedback for navigation. These functions are called by many other modules when the UI state needs to change (e.g., after login, when navigating to a new section, or when a course is selected).

---

### `ui_course_assignments_exams.js`

**Purpose:** This file is responsible for displaying the assignments and exams available within a specific course, allowing users to start them, and providing options to review or delete completed exam history.

**Key Functions/Variables:**

*   Helper Imports: Imports `currentUser`, `userCourseProgressMap`, `globalCourseDataMap`, `activeCourseId`, `data` (for TestGen subject data related to a course), `courseExamDefaults` from `state.js`. Also imports various utility and configuration constants.
*   `fetchCourseMarkdownContent(filePath)`: An asynchronous helper to fetch Markdown content from a given file path. Used for loading question definitions.
*   `renderCourseExamHistoryList(exams)`: Takes an array of completed exam objects and returns an HTML string to display them as a list, including scores, dates, and buttons to "View Review" and "Delete".
*   `confirmDeleteCompletedExamV2Wrapper(examId)`: (Exposed on `window`) A wrapper that confirms with the user and then calls `deleteCompletedExamV2` (from `exam_storage.js`) to delete an exam history entry. Refreshes the assignments/exams view on success.
*   `showCourseAssignmentsExams(courseId)`:
    *   The main function to render the assignments and exams page for a given `courseId`.
    *   Retrieves course progress (`progress`) and course definition (`courseDef`).
    *   Handles "Viewer Mode": If the user is in viewer mode for the course, it displays a message indicating assignments/exams are unavailable.
    *   Calculates `daysElapsed` since enrollment and `totalChaptersStudied`.
    *   **Assignments:** Dynamically generates a list of daily assignments. An assignment for day `i` (corresponding to chapter `i`) is available if chapter `i` has been studied (or if it's day 1). Displays completion status and score if taken, otherwise a "Start Assignment" button.
    *   **Weekly Exams:** Generates a list of weekly exams. A weekly exam `i` is available if the corresponding week has passed and the last chapter of that week (e.g., chapter `i*7`) has been studied.
    *   **Midcourse Exams:** Generates a list of midcourse exams based on quarter markers of the course's total chapters (e.g., after 1/4, 1/2, 3/4 of chapters). A midcourse exam is available if the user has studied up to the chapter threshold for that exam.
    *   **Final Exams:** Lists up to 3 final exam attempts, available only after all chapters in the course have been studied.
    *   **Completed Exams History:** Calls `getExamHistory` (from `exam_storage.js`) to fetch exams related to the current course and renders them using `renderCourseExamHistoryList`.
*   `startAssignmentOrExam(courseId, type, id)`: (Exposed on `window`)
    *   This is the core function for initiating any course-based assessment (assignment, weekly, midcourse, final, skip_exam).
    *   **Configuration:** Retrieves the exam configuration (number of questions, duration, MCQ ratio, text source ratio) for the given `type` from `courseExamDefaults` (global state) or falls back to `FALLBACK_EXAM_CONFIG`.
    *   **Chapter Scope:** Determines the range of chapters (`chaptersToInclude`) relevant to the specific activity `id` (e.g., for "assignment day5", chapter is 5; for "weekly_exam week2", chapters are 8-14).
    *   **Content Fetching:**
        *   Constructs file paths to Markdown files containing MCQs and problems, based on `courseDef.courseDirName`, `DEFAULT_COURSE_QUESTIONS_FOLDER` (now `SUBJECT_RESOURCE_FOLDER`), and filenames from the `relatedTestGenSubject` (if defined for the course) or default filenames (e.g., `DEFAULT_COURSE_TEXT_MCQ_FILENAME`).
        *   Fetches content from these Text-based and Lecture-based MCQ/Problem Markdown files.
    *   **Question Parsing & Selection:**
        *   Parses MCQs from fetched Markdown content using `extractQuestionsFromMarkdown`, filtering for `chaptersToInclude`.
        *   Parses problems by calling `parseChapterProblems` (from `test_logic.js`), which populates a cache (`subjectProblemCache`).
        *   Calculates the target number of MCQs and problems based on the exam's configured size and MCQ ratio, and further splits these targets by text vs. lecture source ratio.
        *   Adjusts these target counts based on the actual number of available questions/problems from the parsed files.
        *   Randomly selects the final set of MCQs and problems from the available pools.
    *   **Exam State Creation:** Combines selected MCQs and problems using `combineProblemsWithQuestions` (from `test_logic.js`). Creates an `onlineTestState` object containing the exam ID, questions, correct answers (for MCQs), duration, and course context.
    *   Launches the online test UI using `launchOnlineTestUI`.
*   `confirmDeleteCourseActivity(courseId, activityType, activityId)`: (Exposed on `window`) Prompts the user for confirmation before deleting a specific activity's progress.
*   `handleDeleteCourseActivity(courseId, activityType, activityId)`: (Exposed on `window`) Calls `deleteCourseActivityProgress` (from `firebase_firestore.js`) to remove the score from the user's progress document. It also finds and deletes any associated exam history records from `userExams` collection using `deleteCompletedExamV2`. Refreshes the UI.

**Role within the Application:** `ui_course_assignments_exams.js` is central to the structured learning and assessment flow within courses. It dynamically presents users with their available assignments and exams based on their progress and the course schedule. The `startAssignmentOrExam` function is a complex piece of logic that acts as a mini "test generator" specifically for course activities, pulling questions from predefined Markdown files associated with the course and its chapters, respecting configured ratios for question types and sources. It allows users to take these assessments and also manage (delete) their recorded attempts.

---

### `ui_course_content_menu.js`

**Purpose:** This file is responsible for displaying the main content menu for a course, which primarily lists all chapters and provides access to their study materials. It also shows chapter-specific progress and allows users to take "skip exams" to bypass chapters they already know.

**Key Functions/Variables:**

*   `fetchVideoDurations(videoIds)`: An asynchronous helper function (similar to one in `ui_course_study_material.js`) to fetch durations for YouTube videos using the YouTube Data API if they are not already in the `videoDurationMap` state. This is used to calculate chapter progress accurately.
*   `displayCourseContentMenu(courseId)`:
    *   The main function to render the chapter list for a given `courseId`.
    *   Retrieves the course definition (`courseDef`) and user's progress (`progress`) for that course.
    *   Handles "Viewer Mode": If the user is in viewer mode, it hides progress-related elements like skip exam buttons and progress bars.
    *   Calculates overall course completion percentage (average of individual chapter progresses) and the number of chapters marked as "studied".
    *   Iterates from 1 to `courseDef.totalChapters`:
        *   For each chapter, it determines the chapter title.
        *   Checks if the chapter is marked as "studied" in `progress.courseStudiedChapters` or by passing a skip exam (`progress.lastSkipExamScore`).
        *   **Skip Exam Logic:**
            *   Determines if a skip exam can be attempted for the chapter (checks if the course has a `relatedSubjectId` and if that subject has an `mcqFileName` configured, indicating an MCQ bank exists).
            *   Renders a "Take Skip Exam" button if the chapter isn't studied and MCQs are available. If a skip exam was taken but failed, it shows "Retake Skip Exam" with the last score. If passed, it indicates this.
        *   **Chapter Progress Bar (Non-Viewer):**
            *   Calculates the combined progress for the chapter using `calculateChapterCombinedProgress` (from `course_logic.js`), considering video watch times (from `videoDurationMap`) and PDF reading progress.
            *   Displays a progress bar visualizing this percentage (or 100% if `isStudied`). A tooltip shows detailed progress (e.g., "Xm Ys / Zm Ws").
        *   **Action Button:** Provides a "View Chapter" (or "Review Chapter" if studied) button that calls `window.showCourseStudyMaterialWrapper` to navigate to the detailed study material view for that chapter.
    *   Renders the entire list of chapters within the `course-dashboard-area`.
*   Window-scoped Wrappers:
    *   `window.triggerSkipExamGenerationWrapper(courseId, chapterNum)`: Calls `triggerSkipExamGeneration` (from `ui_course_study_material.js`).
    *   `window.showCourseStudyMaterialWrapper(courseId, chapterNum)`: Calls `showCourseStudyMaterial` (from `ui_course_study_material.js`).
    *   `window.showCurrentCourseDashboard`: Assigned to `showMyCoursesDashboard` (from `ui_course_dashboard.js`), likely for a "Back to Dashboard" button in the course content menu's context, though typically the main dashboard is for the specific course.

**Role within the Application:** `ui_course_content_menu.js` serves as the primary navigation hub for accessing a course's learning materials. It provides a clear, chapter-by-chapter breakdown, shows users their progress within each chapter and overall, and offers the "skip exam" functionality as a way to accelerate through familiar content. It relies heavily on data from `globalCourseDataMap` (for course structure and chapter titles) and `userCourseProgressMap` (for user-specific progress and skip exam scores).

---

### `ui_course_dashboard.js`

**Purpose:** This file is responsible for rendering the main dashboards related to courses: the "My Courses" dashboard (listing all courses a user is enrolled in) and the individual course dashboard (overview page for a specific course). It handles navigation between these views and provides quick links to various sections of a course.

**Key Functions/Variables:**

*   `navigateToCourseDashboard(courseId)`: Sets the `activeCourseId` in the application state and calls `showCourseDashboard` to display the dashboard for the specified course.
*   `showMyCoursesDashboard()`:
    *   Displays a list of all courses the current user is enrolled in.
    *   For each course, it shows the course name, status (e.g., "Enrolled", "Completed"), grade (if applicable), overall progress percentage (calculated from studied chapters vs. total chapters), and attendance score.
    *   Provides buttons to "Enter Course" (calls `navigateToCourseDashboard`) or "View Progress".
    *   If the user has no enrolled courses, it displays a message prompting them to browse available courses.
    *   Handles "Viewer Mode": Displays courses in viewer mode with distinct styling and limited actions (e.g., only "View Materials").
*   `showCourseDashboard(courseId)`:
    *   Displays the main overview page for a specific `courseId`.
    *   Sets the `activeCourseId` and updates the active sidebar link.
    *   Retrieves the course definition (`courseDef`) and user's progress (`progress`).
    *   **Viewer Mode Handling:** Adapts the display if the user is in "Viewer Mode" for the course (e.g., hides today's objective, shows a viewer mode banner).
    *   **Cover Image:** Displays a cover image for the course.
    *   **Unenroll Button:** Provides an "Unenroll" button that calls `confirmUnenroll`.
    *   **Today's Objective (Non-Viewer):** Displays the `todaysObjective` (calculated by `determineTodaysObjective` from `course_logic.js`) and a button for the `nextTask` (e.g., "Start Assignment X", "Study Chapter Y"), which calls `handleCourseAction`.
    *   **Quick Links Grid:** Provides large, clickable cards for:
        *   "Study Material" (calls `window.displayCourseContentMenu`)
        *   "Next Lesson" (calls `window.showNextLesson` to go to the current target chapter)
        *   "Assignments & Exams" (calls `window.showCurrentAssignmentsExams`, hidden for viewers)
        *   "Notes & Documents" (calls `window.showCurrentNotesDocuments`)
        *   "Detailed Progress" (calls `window.showCurrentCourseProgress`, hidden for viewers)
*   `confirmUnenroll(courseId, courseName)`: (Exposed on `window`) Prompts the user for confirmation before unenrolling. If confirmed, calls `handleUnenroll`.
*   `handleUnenroll(courseId)`: Calls `unenrollFromCourse` (from `firebase_firestore.js`) to remove the user's progress. Updates local state (`userCourseProgressMap`, `activeCourseId`) and navigates back to "My Courses".
*   `handleCourseAction(courseId, actionType, actionId)`: A dispatcher function called by the "Today's Objective" button. Based on `actionType`, it navigates to the appropriate section (e.g., study material for a chapter, start an assignment).
*   Sidebar Link Wrappers (`showCurrentCourseDashboard`, `showNextLesson`, `showFullStudyMaterial`, `showCurrentAssignmentsExams`, `showCurrentCourseProgress`): These functions are typically assigned to `window` and called by the course-specific sidebar links. They ensure the correct course context (`activeCourseId`) is used when navigating to different views of the active course.

**Role within the Application:** `ui_course_dashboard.js` is the central hub for users interacting with their enrolled courses. "My Courses" gives an overview of all enrollments, while the individual course dashboard provides a focused entry point with quick links to the most relevant sections like study materials, assignments, and progress tracking. It uses logic from `course_logic.js` to personalize the experience by showing relevant objectives and tasks.

---
## HTML Files

### `index.html`

**Purpose:**
`index.html` is the main entry point for the Lyceum web application. It serves as the primary container for the entire user interface after a user logs in, and also includes the structure for the initial login/signup view. It dynamically loads different sections of the application (dashboards, course content, settings, etc.) into its main content area without full page reloads, creating a single-page application (SPA) experience.

**Structure:**

*   **`<!DOCTYPE html>` and `<html>` tag:** Standard HTML5 structure, with `lang="en"` and a default `class="light"` for theme management.
*   **`<head>`:**
    *   Meta tags: `charset`, `viewport`, and `title`.
    *   Favicons: Links different favicons for light/dark modes and a default `.ico`.
    *   **CSS Loading:**
        *   Tailwind CSS: Loaded via CDN, with a basic configuration script for dark mode.
        *   Custom CSS: Links to numerous local CSS files (`css/*.css`) provide specific styling for layout, components, typography, themes, and different application sections.
        *   Cropper.js CSS: For image cropping functionality.
    *   **JavaScript Loading (Libraries & SDKs):**
        *   MathJax: Configuration script and deferred loading of the MathJax library for rendering LaTeX.
        *   Chart.js: For drawing charts.
        *   html2pdf.js: For generating PDFs from HTML content.
        *   Mermaid: For rendering Mermaid diagrams.
        *   jsPDF: For client-side PDF generation (likely for certificates).
        *   Google Generative AI SDK: Loaded as an ES module via CDN for AI functionalities.
        *   PDF.js: For client-side PDF rendering.
    *   **Inline `<style>`:** Contains specific styles for PDF viewer elements, theme-specific logo display, sidebar dropdowns, note code blocks, login button states, AI Chat Studio sidebar, and message bubbles.
*   **`<body>`:**
    *   `#app-background-layer`: A `div` for managing the application's dynamic background.
    *   `#public-homepage-container`: A `div` initially hidden, intended to hold the content of `public_homepage.html` (injected by JavaScript).
    *   `.app-layout`: The main container for the authenticated application view, initially hidden. It's a flex container.
        *   `<aside id="sidebar">`: The main sidebar navigation for desktop users. Includes headers, standard navigation (`#sidebar-standard-nav` with links like Home, TestGen, Courses, Profile, Settings, Admin), course-specific navigation (`#sidebar-course-nav` shown when a course is active), and a theme toggle button in the footer. Navigation links use `onclick` to call JavaScript functions.
        *   `<main id="main-content">`: The primary area where dynamic content is displayed. Contains a mobile menu button, a header area for user display (`#user-section`) and subject information (`#subject-info`), and various content divs:
            *   `#login-section`: For login/signup forms and Google Sign-In.
            *   `#content`: General content area.
            *   `#dashboard`: For TestGen progress dashboard.
            *   `#course-dashboard-area`: For individual course dashboards and related views like study materials.
            *   `#online-test-area`: For displaying active online tests.
    *   `#mini-music-player`: A fixed-position UI for the music player, initially hidden.
    *   `#mobile-overlay`: Overlay for the mobile menu.
    *   `#loading-overlay`: Global loading indicator.
    *   **Firebase Initialization:** Inline script to initialize Firebase with the provided configuration.
    *   **Main Application Script:** `<script type="module" src="script.js"></script>`.
    *   `#gdrive-migration-alert-modal`: A modal for Google Drive migration alerts. (Assuming this ID would be updated if the corresponding `ui_gamification_alerts.js` is updated)

**JavaScript & CSS Usage:**

*   **CSS:** Heavily relies on Tailwind CSS for utility-first styling. A comprehensive set of custom CSS files (`css/*.css`) provide specific styling for layout, components, typography, themes, and different application sections. Inline styles are used for some dynamic properties or very specific element styling.
*   **JavaScript:**
    *   Loads several external libraries/SDKs.
    *   The main application logic is driven by `script.js` (loaded as a module).
    *   Many UI interactions are handled by inline `onclick` attributes on buttons and links, which call globally exposed functions defined in various `ui_*.js` and `admin_*.js` modules.
    *   Firebase is initialized directly.
    *   Theme toggling and sidebar dropdown logic are likely handled in `script.js` or `ui_core.js`.
    *   The content of `public_homepage.html` is dynamically injected into `#public-homepage-container`.

**Overall Role:** `index.html` is the foundational HTML document that structures the entire Lyceum application. It sets up the visual theme, loads all necessary styles and scripts, defines the main layout regions, and provides the entry point for the JavaScript application logic to render dynamic views and manage user interactions.

---

### `public_homepage.html`

**Purpose:**
This file defines the HTML content for the public-facing homepage of the Lyceum application. This is the page users see before they log in or sign up. Its primary goal is to introduce the platform, highlight its key features, explain how it works, and encourage users to get started by signing up or logging in.

**Structure:**

*   **`<!DOCTYPE html>` and `<html>` tag:** Basic HTML structure.
*   **`<head>`:**
    *   Contains an inline `<style>` block with CSS specific to the public homepage. This includes styles for:
        *   The hero section, including background images (separate for light/dark themes).
        *   Feature icons used in the "Powerful Features" section.
        *   Fade-in and fade-in-up animations with various delay utilities.
        *   Numbered step icons for the "How it Works" section.
*   **`<body>`:**
    *   `#public-home-content`: The main container for all homepage content.
        *   **Hero Section:** A prominent section with the application title ("Lyceum - Your Personal Tutor"), a descriptive tagline, a "Get Started Now" button, and a link for existing users to log in. Both the button and link trigger `window.showLoginUI()`.
        *   **Features Section:** Highlights key platform features (AI Test Generation, Structured Courses, AI Learning Tools, Progress Tracking, Notes & Documents, Global Chat) using a grid layout. Each feature has an icon, title, and short description. Elements in this section use fade-in-up animations with delays.
        *   **How it Works Section:** Explains the onboarding process in three steps ("Sign Up / Login", "Choose Your Path", "Learn & Test"), each with a custom-styled numbered icon. Includes a placeholder image for an app screenshot.
        *   **Call to Action Section:** Another section encouraging users to sign up, with a "Sign Up Free" button that also calls `window.showLoginUI()`.
        *   **Footer Section:** Contains a copyright notice (year dynamically updated by a script), links for "Follow us on X", "Privacy Policy" (placeholder), "Terms of Service" (placeholder), and a disclaimer about AI assistance.
    *   Inline `<script>`: A small script to set the current year in the footer's copyright notice.

**JavaScript & CSS Usage:**

*   **CSS:**
    *   Relies on Tailwind CSS classes (loaded by `index.html`) for most of its layout and basic styling.
    *   The inline `<style>` block provides custom styling for the hero section's background, feature icons, step icons, and defines simple CSS animations for visual appeal (fade-in, fade-in-up with delays).
*   **JavaScript:**
    *   The primary JavaScript interactions are the "Get Started Now," "Login here," and "Sign Up Free" calls, all of which execute `window.showLoginUI()`. This function is defined in `ui_core.js` and exposed globally by `script.js` (which is part of `index.html`). This confirms that `public_homepage.html`'s content is injected into `index.html` and operates within its JavaScript environment.
    *   An inline script updates the copyright year in the footer.

**Overall Role:** `public_homepage.html` serves as the marketing and informational landing page for users not yet authenticated. It's designed to attract new users by showcasing the platform's capabilities and providing clear calls to action that lead to the login/signup interface managed within `index.html`.

---
```
