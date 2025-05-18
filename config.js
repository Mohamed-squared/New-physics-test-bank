// --- START OF FILE config.js ---

// --- Configuration ---

// Admin User ID
export const ADMIN_UID = "04amtH9UgfTWxPH0rqn2quaKiNf1";

// Google AI API Key
export const GEMINI_API_KEY = "AIzaSyAfAn-Ti1V9g2DTUi9tdjErGtddSVoa3iM"; // Keep your Gemini key separate

// !!! YouTube Data API v3 Key !!!
// WARNING: Embedding this directly in frontend code is INSECURE for production.
// Use a backend proxy or Cloud Function in a real application.
export const YOUTUBE_API_KEY = "AIzaSyAqnMhLT7e1pQJo3RpZJs1Tkz8yZji1vdc"; // User provided key

// --- File Path Configuration ---
export const COURSE_BASE_PATH = "./courses"; // Base directory for all course content
export const DEFAULT_COURSE_PDF_FOLDER = "PDFs";
export const DEFAULT_COURSE_TRANSCRIPTION_FOLDER = "Transcriptions";
// *** MODIFIED: Renamed and value changed. Folder for general subject resources (MCQs, Problems for TestGen subjects) ***
export const SUBJECT_RESOURCE_FOLDER = "Problems"; // Was DEFAULT_COURSE_QUESTIONS_FOLDER = "Questions"
// *** NEW: Default filenames within the Questions folder (now SUBJECT_RESOURCE_FOLDER) ***
export const DEFAULT_COURSE_TEXT_MCQ_FILENAME = "TextMCQ.md"; // Example, may need adjustment if structure changes
export const DEFAULT_COURSE_TEXT_PROBLEMS_FILENAME = "TextProblems.md";
export const DEFAULT_COURSE_LECTURE_MCQ_FILENAME = "LecturesMCQ.md"; // Example
export const DEFAULT_COURSE_LECTURE_PROBLEMS_FILENAME = "LecturesProblems.md"; // Example
// --- End File Path Configuration ---

// --- START MODIFIED: PDF_GENERATION_OPTIONS ---
export const PDF_GENERATION_OPTIONS = {
    margin: [1.5, 1.2, 1.5, 1.2], // Margins in cm: [top, left, bottom, right] or a single number for all
    filename: 'lyceum_document.pdf', // Default filename, will be updated
    image: { type: 'jpeg', quality: 0.95 }, // Use JPEG for smaller file sizes, quality 0.95
    html2canvas: {
        scale: 2, // Higher scale for better quality rendering
        useCORS: true, // Allow cross-origin images (important if logo or other images are external)
        logging: true, // Enable html2canvas logging for debugging
        // windowWidth and windowHeight will be set dynamically based on content
        scrollX: 0,
        scrollY: 0,
        // Setting width and height explicitly can sometimes help with complex layouts
        // width: 794, // A4 width in pixels at 96 DPI (approx 210mm) - will be overridden by tempElement.scrollWidth
        // height: 1123 // A4 height in pixels at 96 DPI (approx 297mm) - will be overridden by tempElement.scrollHeight
    },
    jsPDF: {
        unit: 'cm', // Use cm for easier margin definition
        format: 'a4',
        orientation: 'portrait'
    },
    pagebreak: {
        mode: ['avoid-all', 'css', 'legacy'], // Standard modes
        before: ['.page-break-before', '.question-item', '.note-section-start', '.solution-header', '.exam-header'], // Classes that should start on a new page
        after: ['.page-break-after'],
        avoid: ['h2', 'h3', 'h4', '.solution', '.options-list', 'pre', 'table', 'figure', 'img', '.no-page-break'] // Elements to try to keep on one page
    },
    enableLinks: true // Attempt to make links in the HTML clickable in the PDF
};
// --- END MODIFIED: PDF_GENERATION_OPTIONS ---


// Base LaTeX structure (used by generateTexSource)
export const LATEX_DOCUMENT_CLASS = "\\documentclass[12pt]{article}";
export const LATEX_PACKAGES = `\\usepackage{enumitem} % For customizing list labels
\\usepackage[margin=1.5cm]{geometry}
\\usepackage{tikz}
\\usepackage{graphicx}
\\usepackage{amsmath} % For mathematical expressions
\\usepackage{amsfonts} % Common math fonts
\\usepackage{amssymb} // More symbols
\\usepackage{xcolor}  % For colors if needed
\\usepackage{hyperref} // For clickable links if needed
\\hypersetup{colorlinks=true, linkcolor=blue, urlcolor=magenta}
`;
export const LATEX_BEGIN_DOCUMENT = "\\begin{document}";
export const LATEX_END_DOCUMENT = "\\end{document}";

// --- Test Generation Settings ---
export const DEFAULT_MAX_QUESTIONS = 42; // For TestGen only
export const DEFAULT_MCQ_PROBLEM_RATIO = 0.5; // Default 50% MCQs, 50% Problems
export const DEFAULT_ONLINE_TEST_DURATION_MINUTES = 120; // 2 hours default for TestGen

// *** NEW: Added Max Marks constants ***
export const MAX_MARKS_PER_PROBLEM = 10; // Max score for a written problem
export const MAX_MARKS_PER_MCQ = 10;     // Max score for an MCQ (usually all or nothing)

// --- Course Exam Configuration ---
// DEPRECATED: EXAM_QUESTION_COUNTS and EXAM_DURATIONS_MINUTES are now superseded by FALLBACK_EXAM_CONFIG
// export const EXAM_QUESTION_COUNTS = { ... };
// export const EXAM_DURATIONS_MINUTES = { ... };

// *** MODIFIED: COURSE_EXAM_TEXT_LECTURE_RATIO is now part of FALLBACK_EXAM_CONFIG objects ***
// export const COURSE_EXAM_TEXT_LECTURE_RATIO = 0.5; // 50% Text, 50% Lecture by default

// --- START MODIFICATION: Fallback Exam Configuration ---
export const FALLBACK_EXAM_CONFIG = {
    assignment:  { questions: 4,  durationMinutes: 40,  mcqRatio: 0.5, textSourceRatio: 0.5 },
    weekly_exam: { questions: 8,  durationMinutes: 75,  mcqRatio: 0.5, textSourceRatio: 0.5 },
    midcourse:   { questions: 12, durationMinutes: 120, mcqRatio: 0.5, textSourceRatio: 0.5 },
    final:       { questions: 16, durationMinutes: 180, mcqRatio: 0.5, textSourceRatio: 0.5 },
    skip_exam:   { questions: 20, durationMinutes: 30,  mcqRatio: 1.0, textSourceRatio: 1.0 } // Skip exams are typically all MCQs from text
};
// --- END MODIFICATION ---

// Default structure for a *new* user's subject data if none exists
export const globalSubjectBootstrapData = {
    "1": { // Key will be the document ID in /subjects
        "id": "1", // Should match the doc ID
        "name": "Fundamentals of Physics",
        "mcqFileName": "FoP_MCQs.md", // File in ./courses/fop_physics_v1/Resources/
        "textProblemsFileName": "FoP_TextProblems.md", // File in ./courses/fop_physics_v1/Resources/
        "lectureProblemsFileName": "FoP_LectureProblems.md", // Optional
        "lectureMcqFileName": null, // Optional, if lecture MCQs are separate
        "courseDirName": "fop_physics_v1", // For constructing resource paths
        "max_questions_per_test": DEFAULT_MAX_QUESTIONS,
        "mcqProblemRatio": DEFAULT_MCQ_PROBLEM_RATIO,
        "defaultTestDurationMinutes": DEFAULT_ONLINE_TEST_DURATION_MINUTES,
        "textSourceRatio": 0.7, // Example: 70% of problems from text sources, 30% from lecture (if lecture problems exist)
        "status": "approved",
        "creatorUid": ADMIN_UID,
        "creatorName": "System",
        "createdAt": new Date(0).toISOString(), // Use a fixed date for bootstrap
        // "chapters" definitions (titles, total_questions) will be populated by MD parse
        // on first load/sync by an admin or system.
        // These are NOT stored in the global subject definition, but used by MD parser.
    },
    "2": {
        "id": "2",
        "name": "ABC of Aviation",
        "mcqFileName": "ABC_Aviation_MCQs.md",
        "textProblemsFileName": "ABC_Aviation_Problems.md",
        "lectureProblemsFileName": null,
        "lectureMcqFileName": null,
        "courseDirName": "abc_of_aviation",
        "max_questions_per_test": DEFAULT_MAX_QUESTIONS,
        "mcqProblemRatio": DEFAULT_MCQ_PROBLEM_RATIO,
        "defaultTestDurationMinutes": DEFAULT_ONLINE_TEST_DURATION_MINUTES,
        "textSourceRatio": 0.8,
        "status": "approved",
        "creatorUid": ADMIN_UID,
        "creatorName": "System",
        "createdAt": new Date(0).toISOString(),
    }
    // Note: 'initialSubjectData' is now deprecated in favor of 'globalSubjectBootstrapData'.
    // Ensure old references are updated.
};

// Default profile picture URL (relative path assumed)
export const DEFAULT_PROFILE_PIC_URL = './default-avatar.png'; // Use relative path

// --- Course System Configuration ---
export const FOP_COURSE_ID = "fop_physics_v1"; // Unique ID for the Fundamentals of Physics course

// --- Course Grading Weights ---
export const GRADING_WEIGHTS = {
    chapterCompletion: 0.20,
    assignments: 0.20,
    weeklyExams: 0.15,
    midcourseExams: 0.20,
    finalExams: 0.20,
    attendance: 0.05,
    extraPracticeBonusMax: 5, // Max points for specific extra practice (managed separately)
    // testGenBonusMax: 10 // Overall cap for bonus from TestGen (applied to course totalMark)
};

export const PASSING_GRADE_PERCENT = 65;
export const SKIP_EXAM_PASSING_PERCENT = 70;

// Pace multipliers
export const PACE_MULTIPLIER = {
    compact: 1.25,
    mediocre: 1.0,
    lenient: 0.75,
};

// PDF.js Worker Source (use CDN)
export const PDF_WORKER_SRC = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

// Equivalent study time (in seconds) per PDF page for progress calculation
export const PDF_PAGE_EQUIVALENT_SECONDS = 6 * 60; // 6 minutes per page

// Course structure details (can be moved to Firestore later)
export const FOP_COURSE_DEFINITION = {
    id: FOP_COURSE_ID,
    name: "Fundamentals of Physics",
    description: "A comprehensive course covering the fundamentals of physics.",
    courseDirName: "fop_physics_v1", // Used to build resource paths
    totalChapters: 44,
    relatedSubjectId: "1",
    youtubePlaylistUrls: [
        "https://www.youtube.com/playlist?list=PLUdYlQf0_sSsb2tNcA3gtgOt8LGH6tJbr"
    ],
    imageUrl: './assets/images/course_thumbnails/fop_physics_thumb.png', // Thumbnail for lists
    coverUrl: './assets/images/course_covers/fop_physics_cover.jpg',    // Cover for dashboard
    chapters: [
        "Measurement", "Motion Along a Straight Line", "Vectors", "Motion in Two and Three Dimensions",
        "Force and Motion—I", "Force and Motion—II", "Kinetic Energy and Work",
        "Potential Energy and Conservation of Energy", "Center of Mass and Linear Momentum", "Rotation",
        "Rolling, Torque, and Angular Momentum", "Equilibrium and Elasticity", "Gravitation", "Fluids",
        "Oscillations", "Waves—I", "Waves—II", "Temperature, Heat, and the First Law of Thermodynamics",
        "The Kinetic Theory of Gases", "Entropy and the Second Law of Thermodynamics", "Coulomb's Law",
        "Electric Fields", "Gauss' Law", "Electric Potential", "Capacitance", "Current and Resistance",
        "Circuits", "Magnetic Fields", "Magnetic Fields Due to Currents", "Induction and Inductance",
        "Electromagnetic Oscillations and Alternating Current", "Maxwell's Equations; Magnetism of Matter",
        "Electromagnetic Waves", "Images", "Interference", "Diffraction", "Relativity",
        "Photons and Matter Waves", "More About Matter Waves", "All About Atoms",
        "Conduction of Electricity in Solids", "Nuclear Physics", "Energy from the Nucleus",
        "Quarks, Leptons, and the Big Bang"
    ],
    midcourseChapters: [11, 22, 33], // This will be overridden by new quarter-based logic
    prerequisites: [], // Example subject tags
    corequisites: [], // Example: ["calculus_1"]
    chapterResources: {}
};

// *** NEW: AI Model Configuration ***
export const AVAILABLE_AI_MODELS = ["gemini-2.5-flash-preview-04-17", "gemini-2.5-pro-preview-05-06", "gemini-1.5-flash", "gemini-1.0-pro"];
export const DEFAULT_PRIMARY_AI_MODEL = "gemini-2.5-flash-preview-04-17"; // Fallback if user settings are not loaded
export const DEFAULT_FALLBACK_AI_MODEL = "gemini-2.5-flash-preview-04-17"; // Fallback if primary fails

// --- START MODIFICATION: TestGen Bonus Cap ---
export const MAX_BONUS_FROM_TESTGEN = 2; // Max raw bonus points *per TestGen exam*
export const MAX_TOTAL_TESTGEN_BONUS_CAP_FOR_COURSE = 10; // Max total bonus points from all TestGen exams *for a single course*
// --- END MODIFICATION ---

// --- NEW: Music & Sounds Configuration ---
export const DEFAULT_UI_SOUNDS_ENABLED = false;
export const DEFAULT_AMBIENT_SOUND_VOLUME = 0.3; // 0.0 to 1.0

export const DEFAULT_MUSIC_VOLUME = 0.5; // 0.0 to 1.0

export const UI_SOUND_EFFECTS = {
    // Relative paths to your sound effect files
    exam_finish_success: './assets/sounds/ui/success_chime.mp3',
    exam_finish_fail: './assets/sounds/ui/fail_buzz.mp3',
    chapter_complete: './assets/sounds/ui/level_up.mp3',
    button_click: './assets/sounds/ui/click_soft.mp3',
    notification: './assets/sounds/ui/notification_simple.mp3',
    error: './assets/sounds/ui/error_short.mp3',
    // --- START: Added new UI sounds ---
    navigation: './assets/sounds/ui/navigation_subtle.mp3',
    toggle_on: './assets/sounds/ui/toggle_on.mp3',
    toggle_off: './assets/sounds/ui/toggle_off.mp3',
    save_success: './assets/sounds/ui/save_confirm.mp3',
    // --- END: Added new UI sounds ---
};

export const AMBIENT_SOUNDS_LIBRARY = [
    { id: 'forest_day', name: 'Forest Day', url: './assets/sounds/ambient/forest_day_loop.mp3', icon: '🌲' },
    { id: 'rain_gentle', name: 'Gentle Rain', url: './assets/sounds/ambient/rain_gentle_loop.mp3', icon: '🌧️' },
    { id: 'ocean_waves', name: 'Ocean Waves', url: './assets/sounds/ambient/ocean_waves_loop.mp3', icon: '🌊' },
    { id: 'campfire', name: 'Crackling Campfire', url: './assets/sounds/ambient/campfire_loop.mp3', icon: '🔥' },
    { id: 'cafe_ambience', name: 'Coffee Shop Ambience', url: './assets/sounds/ambient/cafe_ambience_loop.mp3', icon: '☕' },
];

export const STUDY_MUSIC_LIBRARY = [
    // Example: Using YouTube video IDs for Lo-fi streams.
    // For actual playback, you'd use the YouTube IFrame API.
    { id: 'lofi_stream_1', name: 'Lofi Radio 📚 - Beats to Relax/Study to', type: 'youtube', videoId: 'jfKfPfyJRdk', icon: '🎧' },
    { id: 'lofi_stream_2', name: 'Chillhop Radio - Lofi Hiphop Beats', type: 'youtube', videoId: '5yx6BWlEVcY', icon: '🎶' },
    { id: 'classical_study', name: 'Classical Music for Studying', type: 'youtube', videoId: 'y6TZHLAzg5o', icon: '🎻' }
    // You can also add direct MP3/stream URLs here if you have them
    // { id: 'your_lofi_track', name: 'My Lo-fi Track', type: 'stream', url: './assets/music/lofi/my_track.mp3', icon: '🎵' }
];

export const BINAURAL_BEATS_LIBRARY = [
    // Frequencies are illustrative. You'd need actual audio files.
    { id: 'focus_alpha', name: 'Focus (Alpha Waves)', description: 'Alpha waves (8-12 Hz) for relaxed focus and learning.', type: 'stream', url: './assets/sounds/binaural/focus_alpha_8hz_loop.mp3', icon: '🧠' },
    { id: 'deep_study_theta', name: 'Deep Study (Theta Waves)', description: 'Theta waves (4-7 Hz) for deep meditation and problem-solving.', type: 'stream', url: './assets/sounds/binaural/deep_study_theta_6hz_loop.mp3', icon: '💡' },
    { id: 'creativity_gamma', name: 'Creativity (Gamma Waves)', description: 'Gamma waves (30-100 Hz) for high-level information processing and creativity.', type: 'stream', url: './assets/sounds/binaural/creativity_gamma_40hz_loop.ogg', icon: '✨' },
    { id: 'relaxation_delta', name: 'Relaxation (Delta Waves)', description: 'Delta waves (0.5-4 Hz) for deep sleep and relaxation.', type: 'stream', url: './assets/sounds/binaural/relaxation_delta_2hz_loop.ogg', icon: '😴' }
];

// Placeholder API keys for music services (SHOULD NOT BE HARDCODED IN PRODUCTION)
export const SPOTIFY_CLIENT_ID_PLACEHOLDER = "YOUR_SPOTIFY_CLIENT_ID";
export const DEEZER_APP_ID_PLACEHOLDER = "YOUR_DEEZER_APP_ID";
// SoundCloud and Anghami might require different approaches or API keys.
// --- END NEW Music & Sounds Configuration ---

// --- NEW: Default Experimental Features ---
export const DEFAULT_EXPERIMENTAL_FEATURES = {
    globalChat: false,
    marketplace: false, // Default off for now
    musicAndSounds: false,
};
// --- END NEW ---

export const PREDEFINED_BACKGROUNDS_PATH = './assets/images/backgrounds/';
export const PREDEFINED_BACKGROUND_IMAGES = [
    { name: 'Dark Night', filename: 'dark-night.jpg' },
    { name: 'Dark Stars', filename: 'dark-stars.jpg' },
    { name: 'Light View', filename: 'light-view.jpg' },
    { name: 'Steps of Light', filename: 'steps-of-light.jpg' },
    { name: 'Default', filename: 'default.png' },
    { name: 'Al-Aqsa Mosque', filename: 'Al-aqsa.jpg' }
];
export const DEFAULT_APP_BACKGROUND_IMAGE_URL = PREDEFINED_BACKGROUNDS_PATH + 'default.png';
export const APP_BACKGROUND_LAYER_ID = 'app-background-layer';
export const LOCALSTORAGE_KEY_BACKGROUND = 'lyceumAppBackground';
export const LOCALSTORAGE_KEY_OPACITY = 'lyceumCardOpacity';
export const DEFAULT_CARD_OPACITY = 0.88;

// --- END OF FILE config.js ---