// ui_latex_toolbar.js

// --- LaTeX Toolbar Snippets ---
// (display: what user sees on button, insert: what's inserted,
// selectionOffset: [cursorPositionAfterInsert, selectionLengthAfterInsert] relative to start of inserted snippet)
export const commonLatexSnippets = [
    // Basic Math
    { category: 'Basic', label: 'Fraction', display: 'a/b', insert: '\\frac{}{}', selectionOffset: [7, 0] }, // \frac{NUM}{DEN} - cursor after {
    { category: 'Basic', label: 'Exponent', display: 'xⁿ', insert: '^{}', selectionOffset: [3, 0] },
    { category: 'Basic', label: 'Subscript', display: 'xₙ', insert: '_{}', selectionOffset: [3, 0] },
    { category: 'Basic', label: 'Sqrt', display: '√x', insert: '\\sqrt{}', selectionOffset: [6, 0] },
    { category: 'Basic', label: 'Nth Root', display: 'ⁿ√x', insert: '\\sqrt[]{}', selectionOffset: [7, 0] }, // \sqrt[n]{x}

    // Symbols & Operators
    { category: 'Symbols', label: '±', display: '±', insert: '\\pm ', selectionOffset: [4, 0] },
    { category: 'Symbols', label: '≠', display: '≠', insert: '\\neq ', selectionOffset: [5, 0] },
    { category: 'Symbols', label: '≈', display: '≈', insert: '\\approx ', selectionOffset: [8, 0] },
    { category: 'Symbols', label: '×', display: '×', insert: '\\times ', selectionOffset: [7, 0] },
    { category: 'Symbols', label: '÷', display: '÷', insert: '\\div ', selectionOffset: [5, 0] },
    { category: 'Symbols', label: '·', display: '·', insert: '\\cdot ', selectionOffset: [6, 0] },
    { category: 'Symbols', label: '≤', display: '≤', insert: '\\leq ', selectionOffset: [5, 0] },
    { category: 'Symbols', label: '≥', display: '≥', insert: '\\geq ', selectionOffset: [5, 0] },
    { category: 'Symbols', label: '∞', display: '∞', insert: '\\infty ', selectionOffset: [8, 0] },
    { category: 'Symbols', label: '° (degree)', display: '°', insert: '^{\\circ}', selectionOffset: [8, 0] },


    // Greek Letters (Lowercase)
    { category: 'Greek', label: 'α', display: 'α', insert: '\\alpha ', selectionOffset: [7, 0] },
    { category: 'Greek', label: 'β', display: 'β', insert: '\\beta ', selectionOffset: [6, 0] },
    { category: 'Greek', label: 'γ', display: 'γ', insert: '\\gamma ', selectionOffset: [7, 0] },
    { category: 'Greek', label: 'δ', display: 'δ', insert: '\\delta ', selectionOffset: [7, 0] },
    { category: 'Greek', label: 'ε', display: 'ε', insert: '\\epsilon ', selectionOffset: [9, 0] },
    { category: 'Greek', label: 'ζ', display: 'ζ', insert: '\\zeta ', selectionOffset: [6,0]},
    { category: 'Greek', label: 'η', display: 'η', insert: '\\eta ', selectionOffset: [5,0]},
    { category: 'Greek', label: 'θ', display: 'θ', insert: '\\theta ', selectionOffset: [7, 0] },
    { category: 'Greek', label: 'ι', display: 'ι', insert: '\\iota ', selectionOffset: [6,0]},
    { category: 'Greek', label: 'κ', display: 'κ', insert: '\\kappa ', selectionOffset: [7,0]},
    { category: 'Greek', label: 'λ', display: 'λ', insert: '\\lambda ', selectionOffset: [8, 0] },
    { category: 'Greek', label: 'μ', display: 'μ', insert: '\\mu ', selectionOffset: [4, 0] },
    { category: 'Greek', label: 'ν', display: 'ν', insert: '\\nu ', selectionOffset: [4,0]},
    { category: 'Greek', label: 'ξ', display: 'ξ', insert: '\\xi ', selectionOffset: [4,0]},
    { category: 'Greek', label: 'π', display: 'π', insert: '\\pi ', selectionOffset: [4, 0] },
    { category: 'Greek', label: 'ρ', display: 'ρ', insert: '\\rho ', selectionOffset: [5, 0] },
    { category: 'Greek', label: 'σ', display: 'σ', insert: '\\sigma ', selectionOffset: [7, 0] },
    { category: 'Greek', label: 'τ', display: 'τ', insert: '\\tau ', selectionOffset: [5,0]},
    { category: 'Greek', label: 'φ', display: 'φ', insert: '\\phi ', selectionOffset: [5, 0] },
    { category: 'Greek', label: 'χ', display: 'χ', insert: '\\chi ', selectionOffset: [5,0]},
    { category: 'Greek', label: 'ψ', display: 'ψ', insert: '\\psi ', selectionOffset: [5,0]},
    { category: 'Greek', label: 'ω', display: 'ω', insert: '\\omega ', selectionOffset: [7, 0] },
    // Greek Letters (Uppercase)
    { category: 'GreekCaps', label: 'Γ', display: 'Γ', insert: '\\Gamma ', selectionOffset: [7, 0] },
    { category: 'GreekCaps', label: 'Δ', display: 'Δ', insert: '\\Delta ', selectionOffset: [7, 0] },
    { category: 'GreekCaps', label: 'Θ', display: 'Θ', insert: '\\Theta ', selectionOffset: [7, 0] },
    { category: 'GreekCaps', label: 'Λ', display: 'Λ', insert: '\\Lambda ', selectionOffset: [8, 0] },
    { category: 'GreekCaps', label: 'Ξ', display: 'Ξ', insert: '\\Xi ', selectionOffset: [4, 0] },
    { category: 'GreekCaps', label: 'Π', display: 'Π', insert: '\\Pi ', selectionOffset: [4, 0] },
    { category: 'GreekCaps', label: 'Σ', display: 'Σ', insert: '\\Sigma ', selectionOffset: [7, 0] },
    { category: 'GreekCaps', label: 'Φ', display: 'Φ', insert: '\\Phi ', selectionOffset: [5, 0] },
    { category: 'GreekCaps', label: 'Ψ', display: 'Ψ', insert: '\\Psi ', selectionOffset: [5, 0] },
    { category: 'GreekCaps', label: 'Ω', display: 'Ω', insert: '\\Omega ', selectionOffset: [7, 0] },


    // Calculus & Series
    { category: 'Calculus', label: 'Sum (Σ)', display: 'Σ', insert: '\\sum_{}^{} ', selectionOffset: [6, 0] }, // \sum_{LOWER}^{UPPER}
    { category: 'Calculus', label: 'Integral (∫)', display: '∫', insert: '\\int_{}^{}  \\, d', selectionOffset: [6, 0] }, // \int_{LOWER}^{UPPER} F(x) dx, cursor after d
    { category: 'Calculus', label: 'Limit (lim)', display: 'lim', insert: '\\lim_{ \\to } ', selectionOffset: [7, 0] }, // \lim_{x \to a}
    { category: 'Calculus', label: 'Derivative (d/dx)', display: 'd/dx', insert: '\\frac{d}{d} ', selectionOffset: [10, 0] }, // \frac{d}{dX}
    { category: 'Calculus', label: 'Partial (∂/∂x)', display: '∂/∂x', insert: '\\frac{\\partial}{\\partial} ', selectionOffset: [19, 0] }, // \frac{\partial}{\partial X}

    // Vectors & Matrices
    { category: 'Vectors', label: 'Vector', display: 'vec(A)', insert: '\\vec{}', selectionOffset: [5, 0] },
    { category: 'Vectors', label: 'Matrix (2x2)', display: '[■ ■; ■ ■]', insert: '\\begin{pmatrix}\n  &  \\\\\n  &  \n\\end{pmatrix}', selectionOffset: [18, 0] },
    { category: 'Vectors', label: 'Matrix (3x3)', display: '[■■■;■■■;■■■]', insert: '\\begin{pmatrix}\n  &  &  \\\\\n  &  &  \\\\\n  &  &  \n\\end{pmatrix}', selectionOffset: [18, 0] },

    // Text Styles & Accents
    { category: 'Text', label: 'Bold (Math)', display: 'mathbf', insert: '\\mathbf{}', selectionOffset: [8, 0] },
    { category: 'Text', label: 'Bar (ā)', display: 'x̄', insert: '\\bar{}', selectionOffset: [5, 0] },
    { category: 'Text', label: 'Hat (â)', display: 'x̂', insert: '\\hat{}', selectionOffset: [5, 0] },
    { category: 'Text', label: 'Dot (ȧ)', display: 'ẋ', insert: '\\dot{}', selectionOffset: [5, 0] },
    { category: 'Text', label: 'Double Dot (ä)', display: 'ẍ', insert: '\\ddot{}', selectionOffset: [6, 0] },

    // Brackets & Grouping
    { category: 'Brackets', label: '( )', display: '( )', insert: '()', selectionOffset: [1, 0] },
    { category: 'Brackets', label: '[ ]', display: '[ ]', insert: '[]', selectionOffset: [1, 0] },
    { category: 'Brackets', label: '{ } (display)', display: '\\{ \\}', insert: '\\{\\}', selectionOffset: [2, 0] }, // For displaying literal {}
    { category: 'Brackets', label: '| | (abs)', display: '|x|', insert: '\\left| \\right|', selectionOffset: [7, 0] },
    { category: 'Brackets', label: '⟨ ⟩ (angle)', display: '⟨x⟩', insert: '\\langle \\rangle', selectionOffset: [8,0]},
];

// Function to generate the toolbar dynamically
export function generateLatexToolbar(questionId) {
    const toolbar = document.getElementById(`latex-toolbar-${questionId}`);
    if (!toolbar) {
        console.error(`Toolbar element latex-toolbar-${questionId} not found.`);
        return;
    }

    toolbar.innerHTML = ''; // Clear "Loading tools..." or previous buttons

    const categories = {};
    commonLatexSnippets.forEach(snippet => {
        if (!categories[snippet.category]) {
            categories[snippet.category] = [];
        }
        categories[snippet.category].push(snippet);
    });
    
    // Create a dropdown for categories
    const categorySelect = document.createElement('select');
    categorySelect.className = 'latex-category-select btn-secondary-small text-xs px-2 py-1'; // Style as a small button/select
    categorySelect.onchange = (event) => {
        const selectedCategory = event.target.value;
        renderCategoryButtons(questionId, selectedCategory, categories[selectedCategory]);
    };
    
    const placeholderOption = document.createElement('option');
    placeholderOption.value = "";
    placeholderOption.textContent = "Symbols...";
    placeholderOption.disabled = true;
    placeholderOption.selected = true;
    categorySelect.appendChild(placeholderOption);

    for (const categoryName in categories) {
        const option = document.createElement('option');
        option.value = categoryName;
        option.textContent = categoryName;
        categorySelect.appendChild(option);
    }
    toolbar.appendChild(categorySelect);

    // Container for category-specific buttons
    const categoryButtonsContainer = document.createElement('div');
    categoryButtonsContainer.id = `latex-category-buttons-${questionId}`;
    categoryButtonsContainer.className = 'flex flex-wrap gap-x-0.5 gap-y-0.5 items-center ml-1';
    toolbar.appendChild(categoryButtonsContainer);
};

// Function to render buttons for a selected category
export function renderCategoryButtons(questionId, categoryName, snippets)  {
    const container = document.getElementById(`latex-category-buttons-${questionId}`);
    if (!container) return;
    container.innerHTML = ''; // Clear previous category buttons

    if (!snippets || snippets.length === 0) {
        // Optionally show a message if a category is selected but has no snippets (shouldn't happen with current setup)
        return;
    }

    snippets.forEach(snippet => {
        const button = document.createElement('button');
        button.type = 'button';
        // Use a more compact style for these buttons
        button.className = 'btn-secondary-small text-xs px-1.5 py-0.5 font-mono hover:bg-primary-100 dark:hover:bg-primary-700';
        button.innerHTML = snippet.display;
        button.title = snippet.label;
        button.onclick = () => window.insertLatexSnippetForProblem(questionId, snippet.insert, snippet.selectionOffset);
        container.appendChild(button);
    });
};


// Function to insert LaTeX snippet into the textarea
export function insertLatexSnippetForProblem(questionId, snippetToInsert, selectionOffset = [0, 0]) {
    const textarea = document.getElementById(`problem-answer-input-${questionId}`);
    if (!textarea) {
        console.error(`Textarea problem-answer-input-${questionId} not found.`);
        return;
    }

    const currentText = textarea.value;
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    const selectedText = currentText.substring(selectionStart, selectionEnd);

    let textToInsert = snippetToInsert;
    let finalCursorPos = selectionStart + selectionOffset[0];
    let finalSelectionLength = selectionOffset[1];

    // Smart insertion based on selection and snippet structure
    if (selectedText) {
        if (snippetToInsert.includes("{}")) { // For snippets like \cmd{} or \cmd{}{}
            const parts = snippetToInsert.split("{}");
            if (parts.length === 2) { // \cmd{}
                textToInsert = parts[0] + `{${selectedText}}` + parts[1];
                finalCursorPos = selectionStart + parts[0].length + 1 + selectedText.length; // After selected text within braces
                finalSelectionLength = 0;
            } else if (parts.length === 3 && snippetToInsert.endsWith("{}{}")) { // \cmd{}{} - put selected in first
                 textToInsert = parts[0] + `{${selectedText}}` + "{}" + parts[2];
                 finalCursorPos = selectionStart + parts[0].length + 1 + selectedText.length + 1; // Inside second {}
                 finalSelectionLength = 0;
            }
            // Add more specific logic for other structures if needed
        } else if (snippetToInsert.includes("[]{}") && selectedText) { // For \cmd[]{}
             textToInsert = snippetToInsert.replace("{}", `{${selectedText}}`);
             finalCursorPos = selectionStart + snippetToInsert.indexOf("[]") + 1; // Inside []
             finalSelectionLength = 0;
        }
    }

    textarea.value = currentText.substring(0, selectionStart) +
                     textToInsert +
                     currentText.substring(selectionEnd);

    // Set cursor position and selection
    textarea.focus();
    textarea.selectionStart = finalCursorPos;
    textarea.selectionEnd = finalCursorPos + finalSelectionLength;

    // Trigger input event to update preview and record answer
    textarea.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
};

window.generateLatexToolbar = generateLatexToolbar;
window.renderCategoryButtons = renderCategoryButtons;
window.insertLatexSnippetForProblem = insertLatexSnippetForProblem;