// --- START OF FILE ui_background_management.js ---

import { displayContent, setActiveSidebarLink } from './ui_core.js';
import { escapeHtml, showLoading, hideLoading } from './utils.js';

const PREDEFINED_BACKGROUNDS_PATH = './assets/images/backgrounds/';
const PREDEFINED_BACKGROUND_IMAGES = [ // Example predefined images
    { name: 'Dark Night', filename: 'dark-night.jpg' },
    { name: 'Dark Stars', filename: 'dark-stars.jpg' },
    { name: 'Light View', filename: 'light-view.jpg' },
    { name: 'Steps of Light', filename: 'steps-of-light.jpg' },
    { name: 'Default', filename: 'default.png' },
];

const DEFAULT_APP_BACKGROUND_IMAGE_URL = PREDEFINED_BACKGROUNDS_PATH + 'default.png';

const APP_BACKGROUND_LAYER_ID = 'app-background-layer';
const LOCALSTORAGE_KEY_BACKGROUND = 'lyceumAppBackground';
// --- NEW: localStorage key for opacity ---
const LOCALSTORAGE_KEY_OPACITY = 'lyceumCardOpacity';
const DEFAULT_CARD_OPACITY = 0.88; // Default opacity value (0.0 to 1.0)

/**
 * Applies opacity to card-like elements using CSS variables.
 * @param {number} opacityValue - Opacity value between 0 and 1.
 */
function applyCardOpacity(opacityValue) {
    const opacity = Math.max(0.1, Math.min(1, parseFloat(opacityValue))); // Clamp between 0.1 and 1 (0 can make it invisible)
    document.documentElement.style.setProperty('--card-bg-alpha', opacity);
    console.log('Card opacity CSS variable --card-bg-alpha set to:', opacity);
    console.log(`Card opacity applied: ${opacity}`);


    // If you have other specific card types that need different base colors
    // before transparency, you might need to set their RGBA individually here,
    // or adjust their CSS to use --card-bg-alpha with their base RGB.
    // For now, styles.css will handle applying this alpha to the base colors.
}

/**
 * Saves the card opacity preference to localStorage.
 * @param {number} opacityValue - The opacity value.
 */
function saveCardOpacityPreference(opacityValue) {
    try {
        localStorage.setItem(LOCALSTORAGE_KEY_OPACITY, opacityValue.toString());
        console.log('Card opacity preference saved:', opacityValue);
    } catch (error) {
        console.error('Error saving card opacity preference:', error);
    }
}

/**
 * Loads and applies the saved card opacity from localStorage.
 * Called on application startup.
 */
export function loadAndApplyCardOpacityPreference() {
    try {
        const savedOpacity = localStorage.getItem(LOCALSTORAGE_KEY_OPACITY);
        if (savedOpacity !== null) {
            applyCardOpacity(parseFloat(savedOpacity));
        } else {
            console.log('No saved card opacity preference found, applying default:', DEFAULT_CARD_OPACITY);
            applyCardOpacity(DEFAULT_CARD_OPACITY); // Apply default if not saved
        }
    } catch (error) {
        console.error('Error loading card opacity preference:', error);
        applyCardOpacity(DEFAULT_CARD_OPACITY); // Fallback on error
    }
}


/**
 * Applies the selected background style to the app's background layer,
 * and adjusts body/main-content backgrounds for visibility.
 * @param {string} type - 'color', 'image_url', 'image_data', or 'default'.
 * @param {string} [value] - The color value, image URL, or image data URL.
 */
function applyBackground(type, value) {
    const bgLayer = document.getElementById(APP_BACKGROUND_LAYER_ID);
    const bodyElement = document.body;
    const mainContentElement = document.getElementById('main-content');

    if (!bgLayer) {
        console.error('Background layer element not found!');
        return;
    }

    // Reset all potentially conflicting styles first
    bgLayer.style.backgroundImage = '';
    bgLayer.style.backgroundColor = '';
    bgLayer.classList.remove('bg-gray-50', 'dark:bg-gray-900'); // Remove theme classes from layer

    bodyElement.classList.remove('bg-gray-50', 'dark:bg-gray-900');
    if (mainContentElement) {
        mainContentElement.classList.remove('bg-gray-100', 'dark:bg-gray-950');
    }
    // Default to transparent for body and main content when a specific background (image or color) is applied
    bodyElement.style.backgroundColor = 'transparent';
    if (mainContentElement) {
        mainContentElement.style.backgroundColor = 'transparent';
    }

    if (type === 'color' && value) {
        bgLayer.style.backgroundColor = value;
        // body and main-content are already transparent
    } else if (type === 'image_url' && value) {
        bgLayer.style.backgroundImage = `url('${value}')`;
        bgLayer.style.backgroundSize = 'cover';
        bgLayer.style.backgroundPosition = 'center';
        bgLayer.style.backgroundRepeat = 'no-repeat';
        // body and main-content are already transparent
    } else if (type === 'image_data' && value) {
        bgLayer.style.backgroundImage = `url('${value}')`;
        bgLayer.style.backgroundSize = 'cover';
        bgLayer.style.backgroundPosition = 'center';
        bgLayer.style.backgroundRepeat = 'no-repeat';
        // body and main-content are already transparent
    } else if (type === 'default') {
        // --- MODIFIED 'default' CASE ---
        // Attempt to set the default image.
        bgLayer.style.backgroundImage = `url('${DEFAULT_APP_BACKGROUND_IMAGE_URL}')`;
        bgLayer.style.backgroundSize = 'cover';
        bgLayer.style.backgroundPosition = 'center';
        bgLayer.style.backgroundRepeat = 'no-repeat';

        // Add theme classes to the bgLayer itself as a fallback.
        // If the DEFAULT_APP_BACKGROUND_IMAGE_URL is broken or the image fails to load,
        // these classes will provide the solid color background for the layer.
        // If the image loads, it will cover these class-based background colors.
        bgLayer.classList.add('bg-gray-50', 'dark:bg-gray-900');

        // body and main-content remain transparent to show the bgLayer (either image or its fallback color).
        // --- END MODIFIED 'default' CASE ---
    } else {
        // Ultimate fallback: if type is unrecognized, or value is missing for a specific type,
        // revert to application's theme-based solid background colors on body/main.
        // And ensure bgLayer doesn't interfere.
        console.warn(`Applying solid theme background to body/main due to invalid type/value: type=${type}, value=${value}`);
        
        // No styles on bgLayer (it's already cleared of inline styles and theme classes above)
        // Restore body and main-content theme backgrounds
        bodyElement.classList.add('bg-gray-50', 'dark:bg-gray-900');
        if (mainContentElement) {
            mainContentElement.classList.add('bg-gray-100', 'dark:bg-gray-950');
        }
    }
}

function saveBackgroundPreference(type, value) {
    try {
        const preference = { type, value, timestamp: Date.now() };
        localStorage.setItem(LOCALSTORAGE_KEY_BACKGROUND, JSON.stringify(preference));
        console.log('Background preference saved:', preference);
    } catch (error) {
        console.error('Error saving background preference to localStorage:', error);
        // alert('Could not save background preference. LocalStorage might be full or disabled.'); // Maybe too noisy
    }
}

export function loadAndApplyBackgroundPreference() {
    try {
        const savedPreference = localStorage.getItem(LOCALSTORAGE_KEY_BACKGROUND);
        if (savedPreference) {
            const { type, value } = JSON.parse(savedPreference);
            if (type && (value || type === 'default')) {
                applyBackground(type, value);
                console.log('Applied saved background preference:', { type, value });
            } else {
                console.warn('Malformed background preference found, applying default.');
                applyBackground('default');
            }
        } else {
            applyBackground('default');
        }
    } catch (error) {
        console.error('Error loading background preference from localStorage:', error);
        applyBackground('default');
    }
}

function handleBackgroundImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file (JPEG, PNG, GIF, WEBP).');
        return;
    }
    const maxSizeMB = 3;
    if (file.size > maxSizeMB * 1024 * 1024) {
        alert(`File is too large. Maximum size is ${maxSizeMB}MB.`);
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        const imageDataUrl = e.target?.result;
        if (imageDataUrl) {
            applyBackground('image_data', imageDataUrl);
            saveBackgroundPreference('image_data', imageDataUrl);
            const preview = document.getElementById('background-image-preview');
            if (preview) {
                preview.style.backgroundImage = `url('${imageDataUrl}')`;
                preview.style.backgroundColor = ''; // Clear color
                preview.textContent = '';
            }
            // alert('Custom background image applied and saved!'); // Can be removed if live preview is enough
        } else { alert('Failed to read image file.'); }
    };
    reader.onerror = () => { alert('Error reading image file.'); };
    reader.readAsDataURL(file);
}

function handleBackgroundColorChange(event) {
    const color = event.target.value;
    applyBackground('color', color);
    saveBackgroundPreference('color', color);
    const preview = document.getElementById('background-image-preview');
    if (preview) {
        preview.style.backgroundImage = 'none';
        preview.style.backgroundColor = color;
        preview.textContent = `Color: ${color}`;
    }
    // alert('Background color applied and saved!'); // Can be removed if live preview is enough
}

function applyPredefinedBackground(filename) {
    const imageUrl = `${PREDEFINED_BACKGROUNDS_PATH}${filename}`;
    applyBackground('image_url', imageUrl);
    saveBackgroundPreference('image_url', imageUrl);
    const preview = document.getElementById('background-image-preview');
    if (preview) {
        preview.style.backgroundImage = `url('${imageUrl}')`;
        preview.style.backgroundColor = '';
        preview.textContent = '';
    }
    // alert('Predefined background applied and saved!'); // Can be removed if live preview is enough
}
window.applyPredefinedBackground = applyPredefinedBackground;

function resetToDefaultBackground() {
    applyBackground('default'); // This will now apply the default image
    saveBackgroundPreference('default'); // Save preference as 'default'
    
    const preview = document.getElementById('background-image-preview');
    if (preview) {
        // Preview should show the default image, or the theme color if the image fails
        preview.style.backgroundImage = `url('${DEFAULT_APP_BACKGROUND_IMAGE_URL}')`;
        preview.style.backgroundSize = 'cover';
        preview.style.backgroundPosition = 'center';
        preview.style.backgroundColor = ''; // Clear explicit color to let theme classes (or image) show

        // Reset preview's classes to include theme fallback for its own background
        preview.className = 'w-full h-32 sm:h-40 md:h-48 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700';
        preview.textContent = ''; // Clear text if image is intended

        // Add an onerror to the preview's image attempt to show fallback text
        const img = new Image();
        img.src = DEFAULT_APP_BACKGROUND_IMAGE_URL;
        img.onerror = () => {
            // Check if the preview element still exists and is the one we're working with
            const currentPreview = document.getElementById('background-image-preview');
            if (currentPreview === preview) {
                preview.style.backgroundImage = 'none'; // Remove failed image attempt
                preview.textContent = 'Default Background (Theme Color Fallback)';
            }
        };
        // If the image loads successfully for the preview, the textContent will remain empty.
        // If it fails, the onerror above will set the text.
    }
    // alert('Background reset to default image and saved!'); // Optional // Removed this alert to reduce noise
}

// --- NEW: Event handler for opacity slider ---
function handleCardOpacityChange(event) {
    const opacityValue = parseFloat(event.target.value);
    applyCardOpacity(opacityValue);
    saveCardOpacityPreference(opacityValue); // Save immediately
    // Update the display value next to the slider
    const displaySpan = document.getElementById('card-opacity-value');
    if (displaySpan) {
        displaySpan.textContent = `${Math.round(opacityValue * 100)}%`;
    }
}

export function showBackgroundManagement() {
    setActiveSidebarLink('showBackgroundManagement', 'sidebar-standard-nav');

    let predefinedImagesHtml = '';
    if (PREDEFINED_BACKGROUND_IMAGES.length > 0) {
        predefinedImagesHtml = `
            <div class="mt-6">
                <h4 class="text-md font-medium mb-2 text-gray-700 dark:text-gray-300">Predefined Backgrounds</h4>
                <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    ${PREDEFINED_BACKGROUND_IMAGES.map(img => `
                        <button onclick="window.applyPredefinedBackground('${escapeHtml(img.filename)}')" class="aspect-video rounded-md border-2 border-transparent hover:border-primary-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-300 transition-all outline-none" title="Apply ${escapeHtml(img.name)}">
                            <img src="${PREDEFINED_BACKGROUNDS_PATH}${escapeHtml(img.filename)}" alt="${escapeHtml(img.name)}" class="w-full h-full object-cover rounded">
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    const currentBgPref = JSON.parse(localStorage.getItem(LOCALSTORAGE_KEY_BACKGROUND) || '{}');
    let currentPreviewStyle = '';
    let currentPreviewText = 'Default Background';
    let previewBaseClasses = 'w-full h-32 sm:h-40 md:h-48 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400 dark:text-gray-500';

    // Initialize currentPreviewStyle and currentPreviewText based on default first
    currentPreviewStyle = `background-image: url('${DEFAULT_APP_BACKGROUND_IMAGE_URL}'); background-size: cover; background-position: center;`;
    currentPreviewText = ''; // Expecting image for default
    previewBaseClasses += ' bg-gray-100 dark:bg-gray-700'; // Theme fallback for default preview

    if (currentBgPref.type === 'color' && currentBgPref.value) {
        currentPreviewStyle = `background-color: ${escapeHtml(currentBgPref.value)};`;
        currentPreviewText = `Color: ${escapeHtml(currentBgPref.value)}`;
        previewBaseClasses = previewBaseClasses.replace(' bg-gray-100 dark:bg-gray-700', ''); // Remove theme class if color is set
    } else if ((currentBgPref.type === 'image_url' || currentBgPref.type === 'image_data') && currentBgPref.value) {
        currentPreviewStyle = `background-image: url('${escapeHtml(currentBgPref.value)}'); background-size: cover; background-position: center;`;
        currentPreviewText = '';
        previewBaseClasses = previewBaseClasses.replace(' bg-gray-100 dark:bg-gray-700', ''); // Remove theme class if image is set
    } else if (currentBgPref.type === 'default') {
        // Handled by initial setup for currentPreviewStyle/Text
    }


    // --- NEW: Get current opacity for slider ---
    const currentOpacity = parseFloat(localStorage.getItem(LOCALSTORAGE_KEY_OPACITY) || DEFAULT_CARD_OPACITY.toString());

    const html = `
        <div class="content-card animate-fade-in">
            <h2 class="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200">Customize Application Appearance</h2>

            <div class="mb-6">
                <h3 class="text-lg font-medium mb-3 text-gray-700 dark:text-gray-300">Current Background Preview</h3>
                <div id="background-image-preview" class="${previewBaseClasses}" style="${currentPreviewStyle}">
                    ${currentPreviewText}
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <h4 class="text-md font-medium mb-2 text-gray-700 dark:text-gray-300">Upload Custom Image</h4>
                    <label for="background-image-upload" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Choose an image file (Max 3MB):</label>
                    <input type="file" id="background-image-upload" accept="image/jpeg,image/png,image/gif,image/webp" class="form-control text-sm">
                    <p class="form-help-text">Image will be set to cover the background.</p>
                </div>
                <div>
                    <h4 class="text-md font-medium mb-2 text-gray-700 dark:text-gray-300">Select Solid Color</h4>
                    <label for="background-color-picker" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Choose a color:</label>
                    <input type="color" id="background-color-picker" value="${(currentBgPref.type === 'color' && currentBgPref.value) ? escapeHtml(currentBgPref.value) : '#f0f9ff'}" class="w-full h-10 p-0 border-gray-300 dark:border-gray-600 rounded-md cursor-pointer">
                </div>
            </div>
            
            <!-- NEW: Card Opacity Slider Section -->
            <div class="mb-6 pt-4 border-t dark:border-gray-600">
                <h4 class="text-md font-medium mb-2 text-gray-700 dark:text-gray-300">Content Card Opacity</h4>
                <label for="card-opacity-slider" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Adjust transparency of content cards:</label>
                <div class="flex items-center space-x-3">
                    <input type="range" id="card-opacity-slider" min="0.1" max="1" step="0.01" value="${currentOpacity}" class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer">
                    <span id="card-opacity-value" class="text-sm text-gray-600 dark:text-gray-400 w-12 text-right">${Math.round(currentOpacity * 100)}%</span>
                </div>
                <p class="form-help-text">Lower values make cards more transparent, revealing more of the background. Min opacity: 10%.</p>
            </div>

            ${predefinedImagesHtml}

            <div class="mt-8 pt-6 border-t dark:border-gray-600">
                <button id="reset-background-btn" class="btn-danger w-full sm:w-auto">
                    Reset to Default Background & Opacity
                </button>
                 <p class="text-xs text-muted mt-3">Changes are applied and saved immediately.</p>
            </div>
        </div>
    `;
    displayContent(html);

    document.getElementById('background-image-upload')?.addEventListener('change', handleBackgroundImageUpload);
    document.getElementById('background-color-picker')?.addEventListener('input', handleBackgroundColorChange);
    document.getElementById('background-color-picker')?.addEventListener('change', handleBackgroundColorChange);
    // --- NEW: Add listener for opacity slider ---
    document.getElementById('card-opacity-slider')?.addEventListener('input', handleCardOpacityChange);
    // Add change listener as well for browsers that might not fire 'input' continuously
    document.getElementById('card-opacity-slider')?.addEventListener('change', handleCardOpacityChange);
    
    document.getElementById('reset-background-btn')?.addEventListener('click', () => {
        resetToDefaultBackground();
        // --- NEW: Also reset opacity ---
        applyCardOpacity(DEFAULT_CARD_OPACITY);
        saveCardOpacityPreference(DEFAULT_CARD_OPACITY);
        const slider = document.getElementById('card-opacity-slider');
        const displaySpan = document.getElementById('card-opacity-value');
        if (slider) slider.value = DEFAULT_CARD_OPACITY;
        if (displaySpan) displaySpan.textContent = `${Math.round(DEFAULT_CARD_OPACITY * 100)}%`;
    });

    // For the preview, try to load the image and set text on error
    const previewDiv = document.getElementById('background-image-preview');
    if (previewDiv && previewDiv.style.backgroundImage && previewDiv.style.backgroundImage !== 'none') {
        const imgUrlMatch = previewDiv.style.backgroundImage.match(/url\("?(.+?)"?\)/);
        if (imgUrlMatch && imgUrlMatch[1]) {
            const img = new Image();
            img.src = imgUrlMatch[1];
            img.onerror = () => {
                if (previewDiv.style.backgroundImage.includes(imgUrlMatch[1])) { // Check if it's still the same image
                    previewDiv.style.backgroundImage = 'none'; // Remove broken image
                    previewDiv.textContent = 'Background image failed to load. Showing theme color.';
                    // Ensure theme classes are present on previewDiv for fallback
                    if (!previewDiv.classList.contains('bg-gray-100')) {
                        previewDiv.classList.add('bg-gray-100', 'dark:bg-gray-700');
                    }
                }
            };
        }
    } else if (previewDiv && !currentBgPref.type && !currentBgPref.value ) { // Explicitly default case
        const img = new Image();
        img.src = DEFAULT_APP_BACKGROUND_IMAGE_URL;
        img.onerror = () => {
            previewDiv.style.backgroundImage = 'none';
            previewDiv.textContent = 'Default Background (Theme Color Fallback)';
        }
    }
}

// --- END OF FILE ui_background_management.js ---