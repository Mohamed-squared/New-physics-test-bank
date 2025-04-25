// --- Configuration ---

// NEW: Admin User ID
export const ADMIN_UID = "04amtH9UgfTWxPH0rqn2quaKiNf1"; // Replace with your actual Admin UID
export const GEMINI_API_KEY = "AIzaSyAfAn-Ti1V9g2DTUi9tdjErGtddSVoa3iM"; // Replace with your actual Gemini API Key

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
        "1": {
            "id": "1",
            "name": "Fundamentals of Physics",
            "fileName": "chapters.md", // Default filename
            "max_questions_per_test": 42,
            "chapters": {}, // Populated by MD parse
            "studied_chapters": [],
            "pending_exams": [],
            "exam_history": []
        },
        "2": {
            "id": "2",
            "name": "ABC of Aviation",
            "fileName": "ABC_of_Aviation.md", // Example second subject filename
            "max_questions_per_test": 42,
            "chapters": {}, // Populated by MD parse
            "studied_chapters": [],
            "pending_exams": [],
            "exam_history": []
        }
        // Other subjects would need a 'fileName' property too
    }
    // enrolledCourses: [] // Managed globally, not per-user in this structure
};

// Default profile picture URL (relative path assumed)
export const DEFAULT_PROFILE_PIC_URL = 'default-avatar.png';