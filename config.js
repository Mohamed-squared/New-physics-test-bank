// --- Configuration ---

// Admin User ID
export const ADMIN_UID = "04amtH9UgfTWxPH0rqn2quaKiNf1";

// Google AI API Key
export const GEMINI_API_KEY = "AIzaSyAfAn-Ti1V9g2DTUi9tdjErGtddSVoa3iM"; // Keep your Gemini key separate

// !!! YouTube Data API v3 Key !!!
// WARNING: Embedding this directly in frontend code is INSECURE for production.
// Use a backend proxy or Cloud Function in a real application.
export const YOUTUBE_API_KEY = "AIzaSyB8v1IX_H3USSmBCJjee6kQBONAdTjmSuA"; // User provided key

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


export const PDF_GENERATION_OPTIONS = {
    margin: 1.5, // Margin in cm
    filename: 'exam.pdf', // Default filename, will be updated
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false, scrollX: 0, scrollY: 0, windowWidth: 1122 /* A4 width at 96dpi */ }, // Improve quality, allow cross-origin images if needed, set scroll and width
    jsPDF: { unit: 'cm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'], before: '.question-item' } // Better page breaking, target class for breaks
};

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
export const EXAM_QUESTION_COUNTS = {
    assignment: 10,
    weekly_exam: 30,
    midcourse: 50,
    final: 60,
    skip_exam: 20 // Number of MCQs for AI generation (problems added separately)
};

// Calculate durations based on question counts (e.g., 2.5 mins per question)
const calculateDuration = (count) => Math.max(15, Math.min(180, Math.round(count * 2.5)));
export const EXAM_DURATIONS_MINUTES = {
    assignment: calculateDuration(EXAM_QUESTION_COUNTS.assignment),
    weekly_exam: calculateDuration(EXAM_QUESTION_COUNTS.weekly_exam),
    midcourse: calculateDuration(EXAM_QUESTION_COUNTS.midcourse),
    final: calculateDuration(EXAM_QUESTION_COUNTS.final),
    skip_exam: Math.max(15, Math.min(60, Math.round(EXAM_QUESTION_COUNTS.skip_exam * 1.5))) // Shorter duration for skip MCQs
};

// *** NEW: Ratio for Text vs Lecture sources in course exams ***
export const COURSE_EXAM_TEXT_LECTURE_RATIO = 0.5; // 50% Text, 50% Lecture by default

// Default structure for a *new* user's subject data if none exists
export const initialSubjectData = {
    "subjects": {
        "1": { // Linked to FoP Course
            "id": "1",
            "name": "Fundamentals of Physics",
            "fileName": "chapters.md", // MCQ file name (e.g., courses/fop_physics_v1/Problems/chapters.md)
            "courseDirName": "fop_physics_v1", // Directory name for this subject's content
            "problemsFileName": "chapters.md", // Problems file name (e.g., courses/fop_physics_v1/Problems/chapters.md if same file)
            "max_questions_per_test": DEFAULT_MAX_QUESTIONS,
            "mcqProblemRatio": DEFAULT_MCQ_PROBLEM_RATIO,
            "defaultTestDurationMinutes": DEFAULT_ONLINE_TEST_DURATION_MINUTES,
            "chapters": {}, // Populated by MD parse
            "studied_chapters": [],
            "pending_exams": [],
            "status": "approved",
            "creatorUid": ADMIN_UID,
            "creatorName": "System",
            "createdAt": new Date(0).toISOString(),
        },
        "2": { // Example unrelated subject
            "id": "2",
            "name": "ABC of Aviation",
            "fileName": "ABC_Aviation_MCQ.md", // MCQ file name (e.g., courses/abc_of_aviation/Problems/ABC_Aviation_MCQ.md)
            "courseDirName": "abc_of_aviation", // Directory name for this subject's content
            "problemsFileName": "ABC_Aviation_Problems.md", // Problems file name (e.g., courses/abc_of_aviation/Problems/ABC_Aviation_Problems.md)
            "max_questions_per_test": DEFAULT_MAX_QUESTIONS,
            "mcqProblemRatio": DEFAULT_MCQ_PROBLEM_RATIO,
            "defaultTestDurationMinutes": DEFAULT_ONLINE_TEST_DURATION_MINUTES,
            "chapters": {}, // Populated by MD parse
            "studied_chapters": [],
            "pending_exams": [],
            "status": "approved",
            "creatorUid": ADMIN_UID,
            "creatorName": "System",
            "createdAt": new Date(0).toISOString(),
        }
    }
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
    extraPracticeBonusMax: 5,
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
    midcourseChapters: [11, 22, 33],
    prerequisites: [], // Example subject tags
    corequisites: [], // Example: ["calculus_1"]
    chapterResources: {}
};

// *** NEW: AI Model Configuration ***
export const AVAILABLE_AI_MODELS = ["gemini-2.5-pro-exp-03-25", "gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.0-pro"];
export const DEFAULT_PRIMARY_AI_MODEL = "gemini-2.5-pro-exp-03-25"; // Fallback if user settings are not loaded
export const DEFAULT_FALLBACK_AI_MODEL = "gemini-1.5-pro"; // Fallback if primary fails
// --- END OF FILE config.js ---