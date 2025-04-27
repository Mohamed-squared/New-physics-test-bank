// --- Configuration ---

// Admin User ID
export const ADMIN_UID = "04amtH9UgfTWxPH0rqn2quaKiNf1"; // Replace with your actual Admin UID

// !!! IMPORTANT: REPLACE THE VALUE BELOW WITH YOUR ACTUAL GOOGLE AI API KEY !!!
// Get your key from Google AI Studio: https://aistudio.google.com/app/apikey
export const GEMINI_API_KEY = "AIzaSyAfAn-Ti1V9g2DTUi9tdjErGtddSVoa3iM"; // <--- PASTE YOUR REAL KEY HERE

export const PDF_GENERATION_OPTIONS = {
    margin: 1.5, // Margin in cm
    filename: 'exam.pdf', // Default filename, will be updated
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false }, // Improve quality, allow cross-origin images if needed
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

export const ONLINE_TEST_DURATION_MINUTES = 120; // 2 hours

// Default structure for a *new* user's subject data if none exists
export const initialSubjectData = {
    "subjects": {
        "1": { // Linked to FoP Course
            "id": "1",
            "name": "Fundamentals of Physics",
            "fileName": "chapters.md", // Default filename for general test gen
            "max_questions_per_test": 42, // Default max for general test gen
            "chapters": {}, // Populated by MD parse
            "studied_chapters": [], // General studied chapters (can be used by course or separately)
            "pending_exams": [],
            "exam_history": []
        },
        "2": { // Example unrelated subject
            "id": "2",
            "name": "ABC of Aviation",
            "fileName": "ABC_of_Aviation.md",
            "max_questions_per_test": 42,
            "chapters": {}, // Populated by MD parse
            "studied_chapters": [],
            "pending_exams": [],
            "exam_history": []
        }
    }
};

// Default profile picture URL (relative path assumed)
export const DEFAULT_PROFILE_PIC_URL = 'default-avatar.png';

// --- Course System Configuration ---
export const FOP_COURSE_ID = "fop_physics_v1"; // Unique ID for the Fundamentals of Physics course

// Base paths for course resources (adjust as needed)
export const COURSE_PDF_BASE_PATH = "./Fundamentals_of_Physics_PDFs/"; // NOTE: Ensure this folder exists
export const COURSE_TRANSCRIPTION_BASE_PATH = "./Fundamentals of Physics Transcriptions/"; // NOTE: Ensure this folder exists

// Course Grading Weights
export const GRADING_WEIGHTS = {
    skipExams: 0.20, // Note: Scoring skip exams might need adjustment
    assignments: 0.20,
    weeklyExams: 0.15,
    midcourseExams: 0.20,
    finalExams: 0.20,
    attendance: 0.05,
    extraPracticeBonusMax: 5, // Max 5 bonus points
};

export const PASSING_GRADE_PERCENT = 65;
// NEW: Passing score specifically for Skip Exams
export const SKIP_EXAM_PASSING_PERCENT = 70; // e.g., 70% needed to mark chapter studied

// Pace multipliers
export const PACE_MULTIPLIER = {
    compact: 1.25,
    mediocre: 1.0,
    lenient: 0.75,
};

// NEW: PDF.js Worker Source (use CDN)
export const PDF_WORKER_SRC = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`; // Example CDN path, adjust version if needed


// Course structure details (can be moved to Firestore later)
// This defines the structure for the specific FoP course
export const FOP_COURSE_DEFINITION = {
    id: FOP_COURSE_ID,
    name: "Fundamentals of Physics",
    description: "A comprehensive course covering the fundamentals of physics.",
    totalChapters: 44,
    relatedSubjectId: "1", // Links to the subject in user appData for question bank
    youtubePlaylistUrl: "https://www.youtube.com/watch?v=Uo28HOrhipc&list=PLUdYlQf0_sSsb2tNcA3gtgOt8LGH6tJbr", // Example playlist
    pdfPathPattern: `${COURSE_PDF_BASE_PATH}chapter{num}.pdf`, // Pattern for PDF paths
    transcriptionPathPattern: `${COURSE_TRANSCRIPTION_BASE_PATH}chapter{num}.srt`, // Pattern for transcription files
    chapters: [ // List of chapter titles (as provided)
        "Measurement", "Motion Along a Straight Line", "Vectors", "Motion in Two and Three Dimensions",
        "Force and Motion—I", "Force and Motion—II", "Kinetic Energy and Work",
        "Potential Energy and Conservation of Energy", "Center of Mass and Linear Momentum", "Rotation",
        "Rolling, Torque, and Angular Momentum", "Equilibrium and Elasticity", "Gravitation", "Fluids",
        "Oscillations", "Waves—I", "Waves—II", "Temperature, Heat, and the First Law of Thermodynamics",
        "The Kinetic Theory of Gases", "Entropy and the Second Law of Thermodynamics", "Coulomb’s Law",
        "Electric Fields", "Gauss’ Law", "Electric Potential", "Capacitance", "Current and Resistance",
        "Circuits", "Magnetic Fields", "Magnetic Fields Due to Currents", "Induction and Inductance",
        "Electromagnetic Oscillations and Alternating Current", "Maxwell’s Equations; Magnetism of Matter",
        "Electromagnetic Waves", "Images", "Interference", "Diffraction", "Relativity",
        "Photons and Matter Waves", "More About Matter Waves", "All About Atoms",
        "Conduction of Electricity in Solids", "Nuclear Physics", "Energy from the Nucleus",
        "Quarks, Leptons, and the Big Bang"
    ],
    midcourseChapters: [11, 22, 33], // Chapters after which a midcourse occurs
    // Example chapterResources (Store this in Firestore ideally)
    chapterResources: {
      "1": {
         // Example: Multiple lecture parts for chapter 1
         "lectureUrls": [
            "https://youtu.be/GtOGurrUPmQ", // Example Video ID
            // Add more URLs for chapter 1 if needed
         ],
         // pdfPath: "./...", // Example override
         // transcriptionPath: "./..." // Example override
      }
      // Add overrides for other chapters as needed
    }
};

