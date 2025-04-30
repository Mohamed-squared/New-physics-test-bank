// --- START OF FILE config.js ---

// --- Configuration ---

// Admin User ID
export const ADMIN_UID = "04amtH9UgfTWxPH0rqn2quaKiNf1"; // Replace with your actual Admin UID

// Google AI API Key
export const GEMINI_API_KEY = "AIzaSyAfAn-Ti1V9g2DTUi9tdjErGtddSVoa3iM"; // Keep your Gemini key separate

// !!! YouTube Data API v3 Key !!!
// WARNING: Embedding this directly in frontend code is INSECURE for production.
// Use a backend proxy or Cloud Function in a real application.
export const YOUTUBE_API_KEY = "AIzaSyB8v1IX_H3USSmBCJjee6kQBONAdTjmSuA"; // User provided key

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
\\usepackage{amssymb} % More symbols
\\usepackage{xcolor}  % For colors if needed
\\usepackage{hyperref} % For clickable links if needed
\\hypersetup{colorlinks=true, linkcolor=blue, urlcolor=magenta}
`;
export const LATEX_BEGIN_DOCUMENT = "\\begin{document}";
export const LATEX_END_DOCUMENT = "\\end{document}";

// --- Test Generation Settings ---
export const DEFAULT_MAX_QUESTIONS = 42;
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


// Default structure for a *new* user's subject data if none exists
export const initialSubjectData = {
    "subjects": {
        "1": { // Linked to FoP Course
            "id": "1",
            "name": "Fundamentals of Physics",
            "fileName": "chapters.md", // Default filename for general test gen
            "max_questions_per_test": DEFAULT_MAX_QUESTIONS,
            "mcqProblemRatio": DEFAULT_MCQ_PROBLEM_RATIO, // Added ratio
            "defaultTestDurationMinutes": DEFAULT_ONLINE_TEST_DURATION_MINUTES, // Added duration
            "chapters": {}, // Populated by MD parse
            "studied_chapters": [],
            "pending_exams": [], // Old PDF pending list
            // exam_history is deprecated here, moved to userExams collection
        },
        "2": { // Example unrelated subject
            "id": "2",
            "name": "ABC of Aviation",
            "fileName": "ABC_of_Aviation.md",
            "max_questions_per_test": DEFAULT_MAX_QUESTIONS,
            "mcqProblemRatio": DEFAULT_MCQ_PROBLEM_RATIO, // Added ratio
            "defaultTestDurationMinutes": DEFAULT_ONLINE_TEST_DURATION_MINUTES, // Added duration
            "chapters": {}, // Populated by MD parse
            "studied_chapters": [],
            "pending_exams": [],
            // exam_history is deprecated here
        }
    }
};

// Default profile picture URL (relative path assumed)
export const DEFAULT_PROFILE_PIC_URL = './default-avatar.png'; // Use relative path

// --- Course System Configuration ---
export const FOP_COURSE_ID = "fop_physics_v1"; // Unique ID for the Fundamentals of Physics course

// Base paths for course resources (adjust as needed)
export const COURSE_PDF_BASE_PATH = "./Fundamentals of Physics PDFs/";
export const COURSE_TRANSCRIPTION_BASE_PATH = "./Fundamentals of Physics Transcriptions/";

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
    totalChapters: 44,
    relatedSubjectId: "1",
    youtubePlaylistUrls: [
        "https://www.youtube.com/playlist?list=PLUdYlQf0_sSsb2tNcA3gtgOt8LGH6tJbr"
    ],
    pdfPathPattern: `${COURSE_PDF_BASE_PATH}chapter{num}.pdf`,
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
    chapterResources: { }
};


// --- END OF FILE config.js ---