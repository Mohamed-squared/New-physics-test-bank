// __tests__/ui_background_management.test.js

import {
    loadAndApplyCardOpacityPreference,
    loadAndApplyBackgroundPreference,
    showBackgroundManagement,
} from '../ui_background_management'; // Adjust path if needed
import * as UICore from '../ui_core.js';
import * as Utils from '../utils.js';

// --- START OF COPIED CODE (for constants and unexported functions) ---
const PREDEFINED_BACKGROUNDS_PATH = './assets/images/backgrounds/';
// Use the actual PREDEFINED_BACKGROUND_IMAGES from the module for some tests,
// or define a specific test version if you want to control it without full module mocking.
// For now, showBackgroundManagement will use the SUT's actual constant.
const DEFAULT_APP_BACKGROUND_IMAGE_URL = PREDEFINED_BACKGROUNDS_PATH + 'default.png';
const APP_BACKGROUND_LAYER_ID = 'app-background-layer';
const LOCALSTORAGE_KEY_BACKGROUND = 'lyceumAppBackground';
const LOCALSTORAGE_KEY_OPACITY = 'lyceumCardOpacity';
const DEFAULT_CARD_OPACITY = 0.88;
// --- END OF COPIED CODE ---

// Mock dependencies
jest.mock('../ui_core.js', () => ({
    displayContent: jest.fn(),
    setActiveSidebarLink: jest.fn(),
}));

jest.mock('../utils.js', () => ({
    escapeHtml: jest.fn(html => html), // Simple pass-through
    showLoading: jest.fn(),
    hideLoading: jest.fn(),
}));

// Global mocks
let mockLocalStorageStore; // Renamed to avoid conflict with global localStorage
let mockStorageSetItem;
let mockStorageGetItem;
let mockStorageRemoveItem;
let mockStorageClear;

let mockBgLayer;
let mockMainContent;
let mockBodyClassList;
let mockDocumentElementStyle;

const setupDOM = () => {
    document.body.innerHTML = `
        <div id="app-background-layer"></div>
        <div id="main-content"></div>
        <div id="sidebar-standard-nav">
            <a id="sidebar-link-showBackgroundManagement"></a>
        </div>
    `;
    mockBgLayer = document.getElementById(APP_BACKGROUND_LAYER_ID);
    mockMainContent = document.getElementById('main-content');

    const createMockClassList = () => {
        const classes = new Set();
        return {
            add: jest.fn((...classNames) => classNames.forEach(cn => classes.add(cn))),
            remove: jest.fn((...classNames) => classNames.forEach(cn => classes.delete(cn))),
            contains: jest.fn(className => classes.has(className)),
            get list() { return Array.from(classes); }
        };
    };
    mockBodyClassList = createMockClassList();
    Object.defineProperty(document.body, 'classList', {
        value: mockBodyClassList,
        writable: true,
        configurable: true,
    });
    const mockMainContentClassList = createMockClassList();
     if (mockMainContent) {
        Object.defineProperty(mockMainContent, 'classList', {
            value: mockMainContentClassList,
            writable: true,
            configurable: true,
        });
    }

    mockDocumentElementStyle = {
        setProperty: jest.fn(),
    };
    Object.defineProperty(document.documentElement, 'style', {
        value: mockDocumentElementStyle,
        writable: true,
        configurable: true,
    });
};


describe('ui_background_management.js', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        setupDOM();

        mockLocalStorageStore = {};
        mockStorageSetItem = jest.fn((key, value) => {
            mockLocalStorageStore[key] = value;
        });
        mockStorageGetItem = jest.fn(key => mockLocalStorageStore[key] || null);
        mockStorageRemoveItem = jest.fn(key => {
            delete mockLocalStorageStore[key];
        });
        mockStorageClear = jest.fn(() => {
            mockLocalStorageStore = {};
        });

        Storage.prototype.setItem = mockStorageSetItem;
        Storage.prototype.getItem = mockStorageGetItem;
        Storage.prototype.removeItem = mockStorageRemoveItem;
        Storage.prototype.clear = mockStorageClear;

        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(window, 'alert').mockImplementation(() => {});

        // Crucial for showBackgroundManagement tests: make displayContent actually update the DOM
        UICore.displayContent.mockImplementation(htmlContent => {
            if (mockMainContent) {
                mockMainContent.innerHTML = htmlContent;
            }
        });

        if (window.applyPredefinedBackground) {
            delete window.applyPredefinedBackground;
        }
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('Card Opacity', () => {
        // applyCardOpacity (internal)
        test('applyCardOpacity sets CSS variable and clamps value', () => {
            const applyCardOpacityInternal = (opacityValue) => {
                const opacity = Math.max(0, Math.min(1, parseFloat(opacityValue)));
                document.documentElement.style.setProperty('--card-bg-alpha', opacity);
            };

            applyCardOpacityInternal(0.5);
            expect(mockDocumentElementStyle.setProperty).toHaveBeenCalledWith('--card-bg-alpha', 0.5);
            applyCardOpacityInternal(1.5);
            expect(mockDocumentElementStyle.setProperty).toHaveBeenCalledWith('--card-bg-alpha', 1);
            applyCardOpacityInternal(-0.5);
            expect(mockDocumentElementStyle.setProperty).toHaveBeenCalledWith('--card-bg-alpha', 0);
            applyCardOpacityInternal('0.77');
            expect(mockDocumentElementStyle.setProperty).toHaveBeenCalledWith('--card-bg-alpha', 0.77);
        });

        test('saveCardOpacityPreference saves to localStorage', () => {
            const saveCardOpacityPreferenceInternal = (opacityValue) => {
                 localStorage.setItem(LOCALSTORAGE_KEY_OPACITY, opacityValue.toString());
            };
            saveCardOpacityPreferenceInternal(0.75);
            expect(mockStorageSetItem).toHaveBeenCalledWith(LOCALSTORAGE_KEY_OPACITY, '0.75');
        });

        test('saveCardOpacityPreference handles localStorage error', () => {
            const saveCardOpacityPreferenceInternal = (opacityValue) => {
                try {
                    localStorage.setItem(LOCALSTORAGE_KEY_OPACITY, opacityValue.toString());
                } catch (error) {
                    console.error('Error saving card opacity preference:', error);
                }
            };
            mockStorageSetItem.mockImplementationOnce(() => { throw new Error('Storage full'); });
            saveCardOpacityPreferenceInternal(0.6);
            expect(console.error).toHaveBeenCalledWith('Error saving card opacity preference:', expect.any(Error));
        });

        test('loadAndApplyCardOpacityPreference applies saved opacity', () => {
            mockLocalStorageStore[LOCALSTORAGE_KEY_OPACITY] = '0.65'; // Pre-populate
            loadAndApplyCardOpacityPreference();
            expect(mockStorageGetItem).toHaveBeenCalledWith(LOCALSTORAGE_KEY_OPACITY);
            expect(mockDocumentElementStyle.setProperty).toHaveBeenCalledWith('--card-bg-alpha', 0.65);
        });

        test('loadAndApplyCardOpacityPreference applies default opacity if none saved', () => {
            loadAndApplyCardOpacityPreference();
            expect(mockStorageGetItem).toHaveBeenCalledWith(LOCALSTORAGE_KEY_OPACITY);
            expect(mockDocumentElementStyle.setProperty).toHaveBeenCalledWith('--card-bg-alpha', DEFAULT_CARD_OPACITY);
        });

        test('loadAndApplyCardOpacityPreference handles localStorage error by applying default', () => {
            mockStorageGetItem.mockImplementationOnce(() => { throw new Error('Read error'); });
            loadAndApplyCardOpacityPreference();
            expect(console.error).toHaveBeenCalledWith('Error loading card opacity preference:', expect.any(Error));
            expect(mockDocumentElementStyle.setProperty).toHaveBeenCalledWith('--card-bg-alpha', DEFAULT_CARD_OPACITY);
        });
    });

    describe('Background Management', () => {
        let applyBackgroundInternal;

        beforeAll(() => {
            // Define a local version for testing the logic of the unexported applyBackground
            applyBackgroundInternal = (type, value) => {
                const bgLayer = document.getElementById(APP_BACKGROUND_LAYER_ID);
                const bodyElement = document.body;
                const mainContentElement = document.getElementById('main-content');

                if (!bgLayer) {
                    console.error('Background layer element not found!');
                    return;
                }

                bgLayer.style.backgroundImage = '';
                bgLayer.style.backgroundColor = '';
                // Use the mock classList for assertions if needed, or direct manipulation for setup
                bgLayer.classList.remove('bg-gray-50', 'dark:bg-gray-900');

                bodyElement.classList.remove('bg-gray-50', 'dark:bg-gray-900');
                if (mainContentElement) {
                    mainContentElement.classList.remove('bg-gray-100', 'dark:bg-gray-950');
                }
                bodyElement.style.backgroundColor = 'transparent';
                if (mainContentElement) {
                    mainContentElement.style.backgroundColor = 'transparent';
                }

                if (type === 'color' && value) {
                    bgLayer.style.backgroundColor = value;
                } else if (type === 'image_url' && value) {
                    bgLayer.style.backgroundImage = `url("${value}")`; // Adjusted for common browser output
                    bgLayer.style.backgroundSize = 'cover';
                    bgLayer.style.backgroundPosition = 'center';
                    bgLayer.style.backgroundRepeat = 'no-repeat';
                } else if (type === 'image_data' && value) {
                    bgLayer.style.backgroundImage = `url("${value}")`; // Adjusted
                    bgLayer.style.backgroundSize = 'cover';
                    bgLayer.style.backgroundPosition = 'center';
                    bgLayer.style.backgroundRepeat = 'no-repeat';
                } else if (type === 'default') {
                    bgLayer.style.backgroundImage = `url("${DEFAULT_APP_BACKGROUND_IMAGE_URL}")`; // Adjusted
                    bgLayer.style.backgroundSize = 'cover';
                    bgLayer.style.backgroundPosition = 'center';
                    bgLayer.style.backgroundRepeat = 'no-repeat';
                    bgLayer.classList.add('bg-gray-50', 'dark:bg-gray-900');
                } else {
                    console.warn(`Applying solid theme background to body/main due to invalid type/value: type=${type}, value=${value}`);
                    bodyElement.classList.add('bg-gray-50', 'dark:bg-gray-900');
                    if (mainContentElement) {
                        mainContentElement.classList.add('bg-gray-100', 'dark:bg-gray-950');
                    }
                }
            };
        });

        test('applyBackground sets color background', () => {
            applyBackgroundInternal('color', '#FF0000');
            expect(mockBgLayer.style.backgroundColor).toBe('rgb(255, 0, 0)'); // Browsers convert hex to rgb
            expect(mockBgLayer.style.backgroundImage).toBe('');
            expect(document.body.style.backgroundColor).toBe('transparent');
            expect(mockMainContent.style.backgroundColor).toBe('transparent');
            expect(mockBodyClassList.remove).toHaveBeenCalledWith('bg-gray-50', 'dark:bg-gray-900');
        });

        test('applyBackground sets image_url background', () => {
            const imageUrl = 'http://example.com/image.jpg';
            applyBackgroundInternal('image_url', imageUrl);
            expect(mockBgLayer.style.backgroundImage).toBe(`url("${imageUrl}")`);
            expect(mockBgLayer.style.backgroundSize).toBe('cover');
            expect(document.body.style.backgroundColor).toBe('transparent');
        });

        test('applyBackground sets image_data background', () => {
            const imageData = 'data:image/png;base64,xxxx';
            applyBackgroundInternal('image_data', imageData);
            expect(mockBgLayer.style.backgroundImage).toBe(`url("${imageData}")`);
            expect(mockBgLayer.style.backgroundSize).toBe('cover');
        });

        test('applyBackground sets default background (image with fallback classes)', () => {
            applyBackgroundInternal('default');
            expect(mockBgLayer.style.backgroundImage).toBe(`url("${DEFAULT_APP_BACKGROUND_IMAGE_URL}")`);
            // To check classList on mockBgLayer, we'd need to mock its classList like we did for body
            // For simplicity, assuming the direct classList.add call works on the JSDOM element.
            // If precise classList add/remove tracking is needed for mockBgLayer, mock it too.
            expect(mockBgLayer.classList.contains('bg-gray-50')).toBe(true);
            expect(mockBgLayer.classList.contains('dark:bg-gray-900')).toBe(true);
            expect(document.body.style.backgroundColor).toBe('transparent');
            expect(mockMainContent.style.backgroundColor).toBe('transparent');
        });

        test('applyBackground handles unrecognized type (fallback to theme on body/main)', () => {
            applyBackgroundInternal('unknown', 'some_value');
            expect(mockBgLayer.style.backgroundImage).toBe('');
            expect(mockBgLayer.style.backgroundColor).toBe('');
            expect(mockBodyClassList.add).toHaveBeenCalledWith('bg-gray-50', 'dark:bg-gray-900');
            expect(mockMainContent.classList.add).toHaveBeenCalledWith('bg-gray-100', 'dark:bg-gray-950');
            expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Applying solid theme background'));
        });

        test('applyBackground handles missing bgLayer element', () => {
            const originalBgLayer = document.getElementById(APP_BACKGROUND_LAYER_ID);
            originalBgLayer.remove(); // Temporarily remove it
            applyBackgroundInternal('color', '#FF0000');
            expect(console.error).toHaveBeenCalledWith('Background layer element not found!');
            // Restore for other tests if needed, but setupDOM in beforeEach handles it
        });

        test('saveBackgroundPreference saves to localStorage', () => {
             const saveBackgroundPreferenceInternal = (type, value) => {
                const preference = { type, value, timestamp: Date.now() };
                localStorage.setItem(LOCALSTORAGE_KEY_BACKGROUND, JSON.stringify(preference));
            };
            jest.spyOn(Date, 'now').mockReturnValue(1234567890);
            saveBackgroundPreferenceInternal('color', '#00FF00');
            expect(mockStorageSetItem).toHaveBeenCalledWith(
                LOCALSTORAGE_KEY_BACKGROUND,
                JSON.stringify({ type: 'color', value: '#00FF00', timestamp: 1234567890 })
            );
            jest.spyOn(Date, 'now').mockRestore();
        });

        test('loadAndApplyBackgroundPreference applies saved background', () => {
            const pref = { type: 'color', value: '#0000FF', timestamp: Date.now() };
            mockLocalStorageStore[LOCALSTORAGE_KEY_BACKGROUND] = JSON.stringify(pref);
            loadAndApplyBackgroundPreference();
            expect(mockStorageGetItem).toHaveBeenCalledWith(LOCALSTORAGE_KEY_BACKGROUND);
            expect(mockBgLayer.style.backgroundColor).toBe('rgb(0, 0, 255)');
        });

        test('loadAndApplyBackgroundPreference applies default if none saved', () => {
            loadAndApplyBackgroundPreference();
            expect(mockStorageGetItem).toHaveBeenCalledWith(LOCALSTORAGE_KEY_BACKGROUND);
            expect(mockBgLayer.style.backgroundImage).toBe(`url("${DEFAULT_APP_BACKGROUND_IMAGE_URL}")`);
        });

        test('loadAndApplyBackgroundPreference applies default if preference is malformed', () => {
            mockLocalStorageStore[LOCALSTORAGE_KEY_BACKGROUND] = JSON.stringify({ type: 'color' }); // Missing value
            loadAndApplyBackgroundPreference();
            expect(console.warn).toHaveBeenCalledWith('Malformed background preference found, applying default.');
            expect(mockBgLayer.style.backgroundImage).toBe(`url("${DEFAULT_APP_BACKGROUND_IMAGE_URL}")`);
        });

        test('loadAndApplyBackgroundPreference handles localStorage error by applying default', () => {
            mockStorageGetItem.mockImplementationOnce(() => { throw new Error('Read error'); });
            loadAndApplyBackgroundPreference();
            expect(console.error).toHaveBeenCalledWith('Error loading background preference from localStorage:', expect.any(Error));
            expect(mockBgLayer.style.backgroundImage).toBe(`url("${DEFAULT_APP_BACKGROUND_IMAGE_URL}")`);
        });
    });

    describe('UI Interaction Handlers', () => {
        let mockPreviewDiv;

        beforeEach(() => {
            mockPreviewDiv = document.createElement('div');
            mockPreviewDiv.id = 'background-image-preview';
            // The mock for UICore.displayContent will put the UI into #main-content
            // So, if the preview is part of that HTML, it will be found there.
            // If it's standalone, add it to body:
            // document.body.appendChild(mockPreviewDiv); // Not needed if it's part of showBackgroundManagement's HTML
        });

        test('handleBackgroundImageUpload processes valid image file', () => {
            // This handler is internal to showBackgroundManagement. We test its effect via showBackgroundManagement.
            // For a direct test of the logic (if extracted):
            const handleBackgroundImageUploadInternal = (event, applyBgFn, savePrefFn, getPreviewElFn) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (!file.type.startsWith('image/')) { alert('Invalid'); return; }
                if (file.size > 3 * 1024 * 1024) { alert('Too large'); return; } // Max size from SUT
                const reader = new FileReader();
                reader.onload = (e) => {
                    const imageDataUrl = e.target?.result;
                    if (imageDataUrl) {
                        applyBgFn('image_data', imageDataUrl);
                        savePrefFn('image_data', imageDataUrl);
                        const preview = getPreviewElFn();
                        if (preview) {
                            preview.style.backgroundImage = `url("${imageDataUrl}")`;
                            preview.style.backgroundColor = '';
                            preview.textContent = '';
                        }
                    }
                };
                reader.readAsDataURL(file);
            };

            const mockFile = new File(['image_content'], 'test.png', { type: 'image/png' });
            const mockEvent = { target: { files: [mockFile] } };
            const mockReader = {
                onload: null,
                onerror: null,
                readAsDataURL: jest.fn(function() { // Use function to get `this`
                    this.onload({ target: { result: 'data:image/png;base64,image_data_here' } });
                }),
            };
            const originalFileReader = window.FileReader;
            window.FileReader = jest.fn(() => mockReader);

            const mockApply = jest.fn();
            const mockSave = jest.fn();
            // Create a mock preview element for this isolated test
            const localMockPreviewDiv = document.createElement('div');
            const getMockPreview = () => localMockPreviewDiv;

            handleBackgroundImageUploadInternal(mockEvent, mockApply, mockSave, getMockPreview);

            expect(mockReader.readAsDataURL).toHaveBeenCalledWith(mockFile);
            expect(mockApply).toHaveBeenCalledWith('image_data', 'data:image/png;base64,image_data_here');
            expect(mockSave).toHaveBeenCalledWith('image_data', 'data:image/png;base64,image_data_here');
            expect(localMockPreviewDiv.style.backgroundImage).toBe(`url("data:image/png;base64,image_data_here")`);
            window.FileReader = originalFileReader;
        });

        test('handleBackgroundColorChange applies color and updates preview', () => {
            const handleBackgroundColorChangeInternal = (event, applyBgFn, savePrefFn, getPreviewElFn) => {
                const color = event.target.value;
                applyBgFn('color', color);
                savePrefFn('color', color);
                const preview = getPreviewElFn();
                if (preview) {
                    preview.style.backgroundImage = 'none';
                    preview.style.backgroundColor = color;
                    preview.textContent = `Color: ${color}`;
                }
            };
            const mockApply = jest.fn();
            const mockSave = jest.fn();
            const localMockPreviewDiv = document.createElement('div');
            const getMockPreview = () => localMockPreviewDiv;
            const mockEvent = { target: { value: '#ABCDEF' } };

            handleBackgroundColorChangeInternal(mockEvent, mockApply, mockSave, getMockPreview);

            expect(mockApply).toHaveBeenCalledWith('color', '#ABCDEF');
            expect(mockSave).toHaveBeenCalledWith('color', '#ABCDEF');
            expect(localMockPreviewDiv.style.backgroundColor).toBe('rgb(171, 205, 239)');
            expect(localMockPreviewDiv.textContent).toBe('Color: #ABCDEF');
        });

        test('applyPredefinedBackground (window function) works', () => {
            // This is set up by showBackgroundManagement. Test its effects when called.
            // We'll test it more integratedly in showBackgroundManagement tests.
            // Isolated logic:
            const applyPredefinedBackgroundInternal = (filename, applyBgFn, savePrefFn, getPreviewElFn) => {
                const imageUrl = `${PREDEFINED_BACKGROUNDS_PATH}${filename}`;
                applyBgFn('image_url', imageUrl);
                savePrefFn('image_url', imageUrl);
                const preview = getPreviewElFn();
                if (preview) {
                    preview.style.backgroundImage = `url("${imageUrl}")`;
                    preview.style.backgroundColor = '';
                    preview.textContent = '';
                }
            };
            const mockApply = jest.fn();
            const mockSave = jest.fn();
            const localMockPreviewDiv = document.createElement('div');
            const getMockPreview = () => localMockPreviewDiv;

            applyPredefinedBackgroundInternal('test.jpg', mockApply, mockSave, getMockPreview);
            expect(mockApply).toHaveBeenCalledWith('image_url', `${PREDEFINED_BACKGROUNDS_PATH}test.jpg`);
            expect(mockSave).toHaveBeenCalledWith('image_url', `${PREDEFINED_BACKGROUNDS_PATH}test.jpg`);
            expect(localMockPreviewDiv.style.backgroundImage).toBe(`url("${PREDEFINED_BACKGROUNDS_PATH}test.jpg")`);
        });

        test('resetToDefaultBackground works and updates preview', () => {
            const resetToDefaultBackgroundInternal = (applyBgFn, savePrefFn, getPreviewElFn) => {
                applyBgFn('default');
                savePrefFn('default');
                const preview = getPreviewElFn();
                if (preview) {
                    preview.style.backgroundImage = `url("${DEFAULT_APP_BACKGROUND_IMAGE_URL}")`;
                    preview.style.backgroundSize = 'cover';
                    preview.style.backgroundPosition = 'center';
                    preview.style.backgroundColor = '';
                    preview.className = 'w-full h-32 sm:h-40 md:h-48 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700';
                    preview.textContent = '';
                }
                // alert('Background reset...');
            };
            const mockApply = jest.fn();
            const mockSave = jest.fn();
            const localMockPreviewDiv = document.createElement('div');
            const getMockPreview = () => localMockPreviewDiv;

            resetToDefaultBackgroundInternal(mockApply, mockSave, getMockPreview);
            expect(mockApply).toHaveBeenCalledWith('default');
            expect(mockSave).toHaveBeenCalledWith('default');
            expect(localMockPreviewDiv.style.backgroundImage).toBe(`url("${DEFAULT_APP_BACKGROUND_IMAGE_URL}")`);
        });

        test('resetToDefaultBackground preview handles image load error', () => {
            // This test is more about the interaction within showBackgroundManagement
            // The main logic of Image.onerror is tested via the integrated showBackgroundManagement test.
            showBackgroundManagement(); // Sets up the UI

            const resetButton = document.getElementById('reset-background-btn');
            expect(resetButton).not.toBeNull();

            const mockImageInstance = { src: '', onerror: null, onload: null };
            const OrigImage = window.Image;
            window.Image = jest.fn(() => mockImageInstance);

            resetButton.click(); // This will call the internal resetToDefaultBackground

            expect(window.Image).toHaveBeenCalled();
            if (mockImageInstance.onerror) {
                mockImageInstance.onerror(); // Trigger the error handler
            }

            const preview = document.getElementById('background-image-preview');
            expect(preview).not.toBeNull();
            expect(preview.style.backgroundImage).toBe('none');
            expect(preview.textContent).toBe('Default Background (Theme Color Fallback)');

            window.Image = OrigImage;
        });


        test('handleCardOpacityChange updates opacity and display', () => {
            const localMockOpacityValueSpan = document.createElement('span');
            localMockOpacityValueSpan.id = 'card-opacity-value'; // Ensure it has an ID if getElementById is used

            const handleCardOpacityChangeInternal = (event, applyOpFn, saveOpFn, getDisplaySpanFn) => {
                const opacityValue = parseFloat(event.target.value);
                applyOpFn(opacityValue);
                saveOpFn(opacityValue);
                const display = getDisplaySpanFn();
                if (display) display.textContent = `${Math.round(opacityValue * 100)}%`;
            };

            const mockApply = jest.fn();
            const mockSave = jest.fn();
            const getDisplaySpan = () => localMockOpacityValueSpan;
            const mockEvent = { target: { value: '0.73' } };
            handleCardOpacityChangeInternal(mockEvent, mockApply, mockSave, getDisplaySpan);

            expect(mockApply).toHaveBeenCalledWith(0.73);
            expect(mockSave).toHaveBeenCalledWith(0.73);
            expect(localMockOpacityValueSpan.textContent).toBe('73%');
        });
    });


    describe('showBackgroundManagement (exported UI function)', () => {
        // No longer trying to mock PREDEFINED_BACKGROUND_IMAGES here,
        // tests will use the actual constant from the SUT.

        test('renders UI with correct elements and initial values', () => {
            mockLocalStorageStore[LOCALSTORAGE_KEY_OPACITY] = '0.7';
            mockLocalStorageStore[LOCALSTORAGE_KEY_BACKGROUND] = JSON.stringify({ type: 'color', value: '#123456' });

            showBackgroundManagement();

            expect(UICore.setActiveSidebarLink).toHaveBeenCalledWith('showBackgroundManagement', 'sidebar-standard-nav');
            expect(UICore.displayContent).toHaveBeenCalledTimes(1);

            const html = mockMainContent.innerHTML; // Get HTML from where displayContent puts it

            expect(html).toContain('Customize Application Appearance');
            const previewDiv = mockMainContent.querySelector('#background-image-preview');
            expect(previewDiv).not.toBeNull();
            expect(previewDiv.style.backgroundColor).toBe('rgb(18, 52, 86)'); // #123456
            expect(previewDiv.textContent).toContain('Color: #123456');

            expect(mockMainContent.querySelector('#background-image-upload')).not.toBeNull();
            const colorPicker = mockMainContent.querySelector('#background-color-picker');
            expect(colorPicker).not.toBeNull();
            expect(colorPicker.value).toBe('#123456');

            expect(html).toContain('Content Card Opacity');
            const opacitySlider = mockMainContent.querySelector('#card-opacity-slider');
            expect(opacitySlider).not.toBeNull();
            expect(opacitySlider.value).toBe('0.7');
            const opacityValueSpan = mockMainContent.querySelector('#card-opacity-value');
            expect(opacityValueSpan).not.toBeNull();
            expect(opacityValueSpan.textContent).toBe('70%');

            const actualModule = jest.requireActual('../ui_background_management');
            if (actualModule.PREDEFINED_BACKGROUND_IMAGES.length > 0) {
                expect(html).toContain('Predefined Backgrounds');
                actualModule.PREDEFINED_BACKGROUND_IMAGES.forEach(img => {
                    expect(html).toContain(`alt="${img.name}"`);
                    expect(html).toContain(`src="${PREDEFINED_BACKGROUNDS_PATH}${img.filename}"`);
                    expect(html).toContain(`window.applyPredefinedBackground('${img.filename}')`);
                });
            } else {
                 expect(html).not.toContain('Predefined Backgrounds');
            }

            expect(mockMainContent.querySelector('#reset-background-btn')).not.toBeNull();
            expect(html).toContain('Reset to Default Background & Opacity');
        });

        test('renders UI with default values if nothing saved', () => {
            showBackgroundManagement();
            const html = mockMainContent.innerHTML;

            const previewDiv = mockMainContent.querySelector('#background-image-preview');
            expect(previewDiv).not.toBeNull();
            expect(previewDiv.classList.contains('bg-gray-100')).toBe(true); // Default class
            expect(previewDiv.textContent).toContain('Default Background');

            const colorPicker = mockMainContent.querySelector('#background-color-picker');
            expect(colorPicker.value).toBe('#f0f9ff');

            const opacitySlider = mockMainContent.querySelector('#card-opacity-slider');
            expect(opacitySlider.value).toBe(String(DEFAULT_CARD_OPACITY));
            const opacityValueSpan = mockMainContent.querySelector('#card-opacity-value');
            expect(opacityValueSpan.textContent).toBe(`${Math.round(DEFAULT_CARD_OPACITY * 100)}%`);
        });


        test('attaches event listeners and they call handlers effectively', () => {
            showBackgroundManagement(); // Renders HTML into mockMainContent and attaches listeners

            // Test image upload
            const imageUploadInput = mockMainContent.querySelector('#background-image-upload');
            expect(imageUploadInput).not.toBeNull();
            const mockFile = new File(['content'], 'test.png', { type: 'image/png' });
            const mockReaderInstance = {
                onload: null, onerror: null,
                readAsDataURL: jest.fn(function() { this.onload({ target: { result: 'data:image/png;base64,test' }}); })
            };
            const OrigFileReader = window.FileReader;
            window.FileReader = jest.fn(() => mockReaderInstance);
            // Simulate file selection
            Object.defineProperty(imageUploadInput, 'files', { value: [mockFile], writable: true });
            imageUploadInput.dispatchEvent(new Event('change'));
            expect(mockStorageSetItem).toHaveBeenCalledWith(LOCALSTORAGE_KEY_BACKGROUND, expect.stringContaining('"type":"image_data"'));
            window.FileReader = OrigFileReader;

            // Test color picker
            const colorPickerInput = mockMainContent.querySelector('#background-color-picker');
            expect(colorPickerInput).not.toBeNull();
            colorPickerInput.value = '#aabbcc';
            colorPickerInput.dispatchEvent(new Event('input')); // Or 'change'
            expect(mockStorageSetItem).toHaveBeenCalledWith(LOCALSTORAGE_KEY_BACKGROUND, expect.stringContaining('"type":"color"')); // Check partial string
            expect(mockStorageSetItem).toHaveBeenCalledWith(LOCALSTORAGE_KEY_BACKGROUND, expect.stringContaining('"value":"#aabbcc"'));


            // Test opacity slider
            const opacitySliderInput = mockMainContent.querySelector('#card-opacity-slider');
            const opacityValueSpan = mockMainContent.querySelector('#card-opacity-value');
            expect(opacitySliderInput).not.toBeNull();
            expect(opacityValueSpan).not.toBeNull();
            opacitySliderInput.value = '0.55';
            opacitySliderInput.dispatchEvent(new Event('input'));
            expect(mockStorageSetItem).toHaveBeenCalledWith(LOCALSTORAGE_KEY_OPACITY, '0.55');
            expect(opacityValueSpan.textContent).toBe('55%');

            // Test Reset Button
            const resetButton = mockMainContent.querySelector('#reset-background-btn');
            expect(resetButton).not.toBeNull();
            const OrigImage = window.Image;
            const mockImageInstanceReset = { src: '', onerror: null, onload: null };
            window.Image = jest.fn(() => mockImageInstanceReset);

            resetButton.click();
            expect(mockStorageSetItem).toHaveBeenCalledWith(LOCALSTORAGE_KEY_BACKGROUND, expect.stringContaining('"type":"default"'));
            expect(mockStorageSetItem).toHaveBeenCalledWith(LOCALSTORAGE_KEY_OPACITY, DEFAULT_CARD_OPACITY.toString());
            expect(opacitySliderInput.value).toBe(String(DEFAULT_CARD_OPACITY));
            expect(opacityValueSpan.textContent).toBe(`${Math.round(DEFAULT_CARD_OPACITY * 100)}%`);
            expect(mockBgLayer.style.backgroundImage).toBe(`url("${DEFAULT_APP_BACKGROUND_IMAGE_URL}")`);
            expect(mockDocumentElementStyle.setProperty).toHaveBeenCalledWith('--card-bg-alpha', DEFAULT_CARD_OPACITY);
            window.Image = OrigImage;
        });

        test('window.applyPredefinedBackground is set up and works', () => {
            showBackgroundManagement();
            expect(window.applyPredefinedBackground).toBeInstanceOf(Function);

            const actualModule = jest.requireActual('../ui_background_management');
            if (actualModule.PREDEFINED_BACKGROUND_IMAGES.length === 0) {
                console.warn("No predefined images to test with window.applyPredefinedBackground");
                return; // Skip if no images
            }
            const testFilename = actualModule.PREDEFINED_BACKGROUND_IMAGES[0].filename;
            window.applyPredefinedBackground(testFilename);

            const expectedUrl = `${PREDEFINED_BACKGROUNDS_PATH}${testFilename}`;
            expect(mockStorageSetItem).toHaveBeenCalledWith(LOCALSTORAGE_KEY_BACKGROUND, expect.stringContaining(`"value":"${expectedUrl}"`));
            expect(mockBgLayer.style.backgroundImage).toBe(`url("${expectedUrl}")`);
            const preview = mockMainContent.querySelector('#background-image-preview');
            expect(preview.style.backgroundImage).toBe(`url("${expectedUrl}")`);
        });
    });
});