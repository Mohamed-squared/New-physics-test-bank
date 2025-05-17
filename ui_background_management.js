// --- START OF FILE ui_background_management.js ---

import { DEFAULT_APP_BACKGROUND_IMAGE_URL, LOCALSTORAGE_KEY_BACKGROUND, LOCALSTORAGE_KEY_OPACITY, DEFAULT_CARD_OPACITY } from '../config.js'; // Adjust path if config is in parent
// Import the core logic functions from the settings panel
import { applyBackground, applyCardOpacity } from './ui_settings_panel.js'; // Ensure correct path

export function loadAndApplyBackgroundPreference() {
    try {
        const savedPreference = localStorage.getItem(LOCALSTORAGE_KEY_BACKGROUND);
        const bgLayer = document.getElementById('app-background-layer');
        if (!bgLayer) {
            console.warn("loadAndApplyBackgroundPreference: Background layer not found. Cannot apply preference.");
            return;
        }

        if (savedPreference) {
            const { type, value } = JSON.parse(savedPreference);
             if (type && (value || type === 'default')) {
                applyBackground(bgLayer, type, value); // Apply to the main layer
            } else {
                console.warn('Malformed background preference found, applying default.');
                applyBackground(bgLayer, 'default');
            }
        } else {
            console.log('No saved background preference found, applying default.');
            applyBackground(bgLayer, 'default');
        }
    } catch (error) {
        console.error('Error loading background preference:', error);
        const bgLayerError = document.getElementById('app-background-layer');
        if(bgLayerError) applyBackground(bgLayerError, 'default'); // Fallback on error
    }
}

export function loadAndApplyCardOpacityPreference() {
    try {
        const savedOpacity = localStorage.getItem(LOCALSTORAGE_KEY_OPACITY);
        if (savedOpacity !== null) {
            applyCardOpacity(parseFloat(savedOpacity));
        } else {
            console.log('No saved card opacity preference found, applying default:', DEFAULT_CARD_OPACITY);
            applyCardOpacity(DEFAULT_CARD_OPACITY); 
        }
    } catch (error) {
        console.error('Error loading card opacity preference:', error);
        applyCardOpacity(DEFAULT_CARD_OPACITY); 
    }
}
// The main showBackgroundManagement function and other helpers specific to its UI have been moved.
// --- END OF FILE ui_background_management.js ---