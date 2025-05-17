// --- START OF FILE ui_profile_picture.js ---

import Cropper from 'https://cdn.jsdelivr.net/npm/cropperjs@1.6.1/dist/cropper.esm.js';
import { showLoading, hideLoading } from './utils.js';
import { currentUser, db } from './state.js';
import { fetchAndUpdateUserInfo } from './ui_core.js';
import { DEFAULT_PROFILE_PIC_URL } from './config.js'; // Import default URL

let cropper = null;
let imageToCropElement = null;
let cropModal = null;
let onCropCompleteCallback = null;
let currentImageSrc = null; // Keep track of the src being loaded
let imageLoadSuccess = false; // Declared at the top level module scope

// --- Named Event Handlers ---
function handleImageLoad() {
    // Check if this handler is for the currently intended image source
    if (imageToCropElement && imageToCropElement.src !== currentImageSrc) {
        console.warn("Stale onload event ignored for:", imageToCropElement.src);
        return;
    }

    console.log("Image loaded successfully for cropping:", currentImageSrc.substring(0, 50) + "...");
    imageLoadSuccess = true; // Set flag *before* initializing cropper

    if (cropper) {
        console.log("Destroying previous cropper instance.");
        cropper.destroy();
        cropper = null; // Ensure it's nullified
    }

    // Delay slightly
    setTimeout(() => {
        if (!imageToCropElement || !imageToCropElement.parentNode || imageToCropElement.naturalWidth === 0) {
            console.warn("Image element detached or has no dimensions before Cropper initialization.");
            // Optionally show an error message if the image failed to load properly visually
            if (!imageLoadSuccess) { // Only show error if onload never succeeded for this attempt
                alert("Failed to load image dimensions. Please try another image.");
                hideCropModal();
            }
            return; // Element might have been removed or failed to render
        }
        try {
            const cropperOptions = {
                aspectRatio: 1 / 1,
                viewMode: 1,        // Restrict crop box to canvas
                dragMode: 'move',     // Allow moving the image behind the crop box
                autoCropArea: 0.85,   // Initial crop area size (percentage)
                responsive: true,     // Resize cropper with window
                restore: false,       // Don't restore previous crop on init
                checkOrientation: false, // Usually handled by browser
                modal: true,          // Dark overlay background
                guides: true,         // Show dashed lines in crop box
                center: true,         // Center the crop box
                highlight: false,       // Don't highlight the crop box area
                cropBoxMovable: true,  // Allow moving the crop box
                cropBoxResizable: false, // **Crucial for circle stability** - Prevent resizing
                toggleDragModeOnDblclick: false,
                ready() {
                    console.log("Cropper ready.");
                    if (imageToCropElement) {
                         imageToCropElement.style.opacity = '1'; // Show image
                         // Add a class to the container for CSS targeting AFTER cropper is ready
                         imageToCropElement.parentElement.querySelector('.cropper-container')?.classList.add('cropper-ready-container');

                    }
                }
            };
            console.log("Initializing Cropper with options:", cropperOptions);
            // *** Ensure Cropper targets the IMG element ***
            cropper = new Cropper(imageToCropElement, cropperOptions);
            console.log("Cropper initialized.");
        } catch (e) {
            console.error("Error initializing Cropper:", e);
            alert("Could not initialize image cropper. The image might be invalid or unsupported.");
            // Don't hide modal automatically here
        }
    }, 50); // Keep a small delay
}

function handleImageError() {
    // Check if this handler is for the currently intended image source
    if (imageToCropElement && imageToCropElement.src !== currentImageSrc) {
        console.warn("Stale onerror event ignored for:", imageToCropElement.src);
        return;
    }

    console.error("Failed to load image for cropping (onerror triggered).");
    // Only alert and hide if onload definitely didn't succeed for this src
    if (!imageLoadSuccess) { // Check the flag declared at the top level
         alert("Failed to load the image for cropping. Please try another image or check the image format/source.");
         hideCropModal(); // Hide modal on definite load failure
    } else {
        console.warn("Image onerror triggered AFTER successful onload detection. This might indicate a decoding issue or race condition.");
    }
}
// --- End Named Event Handlers ---


function createModal() {
    // Prevent duplicate modals
    if (document.getElementById('crop-modal')) {
        cropModal = document.getElementById('crop-modal');
        imageToCropElement = document.getElementById('image-to-crop');
        // Ensure listeners are attached if modal already exists
        if (!document.getElementById('cancel-crop-btn').dataset.listenerAttached) {
             document.getElementById('cancel-crop-btn').addEventListener('click', hideCropModal);
             document.getElementById('cancel-crop-btn').dataset.listenerAttached = 'true';
        }
        if (!document.getElementById('confirm-crop-btn').dataset.listenerAttached) {
            document.getElementById('confirm-crop-btn').addEventListener('click', handleCropConfirm);
            document.getElementById('confirm-crop-btn').dataset.listenerAttached = 'true';
        }
        return;
    }

    const modalHtml = `
        <div id="crop-modal" class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[60] hidden p-4" aria-labelledby="crop-modal-title" role="dialog" aria-modal="true">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-5 w-full max-w-md transform transition-all overflow-hidden">
                <h3 id="crop-modal-title" class="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 mb-4">Crop Profile Picture</h3>
                <!-- *** MODIFIED: Simplified wrapper div *** -->
                <div id="cropper-wrapper" class="max-h-[60vh] mb-4 min-h-[200px] bg-gray-200 dark:bg-gray-700">
                    <img id="image-to-crop" src="" alt="Image to crop" style="display: block; max-width: 100%; opacity: 0;">
                </div>
                <div class="flex justify-end space-x-3">
                    <button id="cancel-crop-btn" type="button" class="btn-secondary">Cancel</button>
                    <button id="confirm-crop-btn" type="button" class="btn-primary">Crop & Use</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    cropModal = document.getElementById('crop-modal');
    imageToCropElement = document.getElementById('image-to-crop');

    // Add listeners and mark as attached
    const cancelBtn = document.getElementById('cancel-crop-btn');
    const confirmBtn = document.getElementById('confirm-crop-btn');
    if (cancelBtn && !cancelBtn.dataset.listenerAttached) {
         cancelBtn.addEventListener('click', hideCropModal);
         cancelBtn.dataset.listenerAttached = 'true';
    }
    if (confirmBtn && !confirmBtn.dataset.listenerAttached) {
         confirmBtn.addEventListener('click', handleCropConfirm);
         confirmBtn.dataset.listenerAttached = 'true';
    }
}

export function showCropModal(imageSrc, callback) {
    createModal(); // Ensure modal exists and listeners are attached
    onCropCompleteCallback = callback;
    imageLoadSuccess = false; // Reset flag correctly (accessing the top-level variable)
    currentImageSrc = imageSrc;

    if (!imageToCropElement || !cropModal) {
        console.error("Cropper modal elements not found");
        return;
    }

    console.log("Showing crop modal for:", imageSrc.substring(0, 50) + "...");
    imageToCropElement.style.opacity = '0'; // Keep image hidden initially

    // Remove previous listeners before adding new ones
    imageToCropElement.removeEventListener('load', handleImageLoad);
    imageToCropElement.removeEventListener('error', handleImageError);

    // Add new listeners using named functions
    imageToCropElement.addEventListener('load', handleImageLoad);
    imageToCropElement.addEventListener('error', handleImageError);

    // Set src AFTER attaching listeners
    imageToCropElement.src = imageSrc;
    cropModal.classList.remove('hidden');
}


function hideCropModal() {
    if (cropper) {
        try {
            cropper.destroy();
        } catch (e) {
            console.warn("Error destroying cropper:", e);
        }
        cropper = null;
        console.log("Cropper destroyed.");
    }
    if (cropModal) {
        cropModal.classList.add('hidden');
    }
    if (imageToCropElement) {
        imageToCropElement.removeEventListener('load', handleImageLoad);
        imageToCropElement.removeEventListener('error', handleImageError);
        imageToCropElement.src = ""; // Clear src to prevent potential reload issues
        imageToCropElement.style.opacity = '0';
    }
    onCropCompleteCallback = null;
    imageLoadSuccess = false; // Reset flag
    currentImageSrc = null;
}

async function handleCropConfirm() {
    if (!cropper || !onCropCompleteCallback) {
        console.log("Crop confirm: Cropper or callback missing.");
        return;
    }

    showLoading("Processing image...");
    try {
        const canvas = cropper.getCroppedCanvas({
            width: 256,
            height: 256,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high',
        });

        if (!canvas) {
            throw new Error("Could not get cropped image canvas.");
        }
        console.log("Cropped Canvas Dimensions:", canvas.width, "x", canvas.height);

        canvas.toBlob(async (blob) => {
            if (!blob) {
                hideLoading(); // Hide loading on blob error
                throw new Error("Failed to create image blob.");
            }

            const reader = new FileReader();
            reader.onloadend = async () => {
                const dataUrl = reader.result;
                console.log("Cropped Data URL length:", dataUrl.length);
                if (!dataUrl) {
                    hideLoading(); // Hide loading on reader error
                    throw new Error("Failed to read blob as Data URL.");
                }

                // Check data URL size
                if (dataUrl.length > 10000000) { // ~1MB limit
                    hideModalAndLoading();
                    throw new Error("Cropped image is still too large (max ~1MB). Please try cropping a smaller area or use a smaller source image.");
                }

                try {
                    await onCropCompleteCallback(dataUrl);
                    hideModalAndLoading(); // Ensure modal closes and loading stops on success
                } catch (callbackError) {
                    console.error("Error in onCropCompleteCallback:", callbackError);
                    hideModalAndLoading();
                    throw new Error("Failed to update profile: " + callbackError.message);
                }
            };
            reader.onerror = (error) => {
                console.error("FileReader error:", error);
                hideModalAndLoading();
                throw new Error("Failed to read cropped image data.");
            };
            reader.readAsDataURL(blob);

        }, 'image/jpeg', 0.9); // Use JPEG with quality 0.9

    } catch (error) {
        console.error("Error during cropping or callback:", error);
        alert("Error processing image: " + error.message);
        hideLoading();
    }
}

// Helper to ensure modal and loading are hidden
function hideModalAndLoading() {
     hideLoading();
     hideCropModal();
}

export function handleProfilePictureSelect(event, callback) {
     const file = event.target.files?.[0];
     if (!file) {
         console.log("No file selected.");
         return;
     }

     if (!file.type.startsWith('image/')) {
         alert("Please select an image file (jpg, png, gif, webp).");
         return;
     }
     if (file.size > 5 * 1024 * 1024) {
         alert("Image file is too large (Max 5MB).");
         return;
     }

     const reader = new FileReader();
     reader.onload = (e) => {
         if (e.target?.result) {
            showCropModal(e.target.result, callback); // Pass the callback to showCropModal
         } else {
             alert("Failed to read file content.");
         }
     };
     reader.onerror = () => {
         alert("Failed to read the selected file.");
     };
     reader.readAsDataURL(file);
}
// --- END OF FILE ui_profile_picture.js ---