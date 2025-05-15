// --- START OF FILE admin_music_management.js ---
import {
    AMBIENT_SOUNDS_LIBRARY,
    STUDY_MUSIC_LIBRARY,
    BINAURAL_BEATS_LIBRARY,
    UI_SOUND_EFFECTS
} from '../config.js';
import { escapeHtml, showLoading, hideLoading } from '../utils.js';
import { currentUser } from '../state.js';
// NEW: Import the test sound function from audio_service
import { playTestSoundOnce, playUiSound as playUiSoundFromService } from '../audio_service.js';


// --- Module State ---
let currentAmbientSounds = [];
let currentStudyMusic = [];
let currentBinauralBeats = [];
let currentUiSounds = {};

function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function loadLibrariesFromConfig() {
    currentAmbientSounds = deepCopy(AMBIENT_SOUNDS_LIBRARY);
    currentStudyMusic = deepCopy(STUDY_MUSIC_LIBRARY);
    currentBinauralBeats = deepCopy(BINAURAL_BEATS_LIBRARY);
    currentUiSounds = deepCopy(UI_SOUND_EFFECTS);
}

export function displayMusicManagementSection(containerElement) {
    if (!currentUser || !currentUser.isAdmin) {
        containerElement.innerHTML = '<p class="text-red-500">Access Denied. Admin privileges required.</p>';
        return;
    }
    loadLibrariesFromConfig();

    containerElement.innerHTML = `
        <h3 class="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-6">Music & Sound Library Management</h3>
        <p class="text-sm text-muted mb-4">
            Manage the predefined sound libraries available to users.
            <strong>Important:</strong> Changes made here are not saved directly to the server.
            After making modifications, click "Generate Config Code" and manually update your
            <code>config.js</code> file with the generated code snippet.
        </p>

        ${renderSoundLibrarySection('Ambient Sounds', currentAmbientSounds, 'ambient')}
        ${renderSoundLibrarySection('Study Music (Lo-fi, etc.)', currentStudyMusic, 'study')}
        ${renderSoundLibrarySection('Binaural Beats', currentBinauralBeats, 'binaural')}
        ${renderUiSoundsSection()}

        <div class="mt-8 pt-6 border-t dark:border-gray-700">
            <h4 class="text-lg font-medium mb-3">Generate Configuration Code</h4>
            <p class="text-sm text-muted mb-3">
                Click the button below to generate the JavaScript code for your modified libraries.
                Copy this code and replace the corresponding sections in your <code>config.js</code> file.
            </p>
            <button onclick="window.adminMusicManagement.generateConfigCode()" class="btn-primary">
                Generate Config Code
            </button>
            <pre id="generated-config-code" class="mt-4 p-3 bg-gray-100 dark:bg-gray-900 border dark:border-gray-700 rounded-md text-xs whitespace-pre-wrap max-h-96 overflow-auto hidden"></pre>
        </div>
    `;
    attachMusicManagementEventListeners();
}

function renderSoundLibrarySection(title, libraryArray, typePrefix) {
    let itemsHtml = libraryArray.map((item, index) => `
        <tr id="${typePrefix}-item-${index}" class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
            <td class="px-3 py-2 text-sm align-top w-16">
                <input type="text" value="${escapeHtml(item.icon || '')}" class="form-control-sm library-input w-full text-center" data-index="${index}" data-library="${typePrefix}" data-field="icon" placeholder="Icon">
            </td>
            <td class="px-3 py-2 text-sm align-top min-w-[150px]">
                <input type="text" value="${escapeHtml(item.name || '')}" class="form-control-sm library-input w-full" data-index="${index}" data-library="${typePrefix}" data-field="name" placeholder="Name">
            </td>
            <td class="px-3 py-2 text-sm align-top min-w-[250px]">
                <input type="text" value="${escapeHtml(item.url || item.videoId || '')}" class="form-control-sm library-input w-full" data-index="${index}" data-library="${typePrefix}" data-field="urlOrId" placeholder="URL or YouTube Video ID">
            </td>
            <td class="px-3 py-2 text-sm align-top min-w-[120px]">
                <select class="form-control-sm library-input w-full" data-index="${index}" data-library="${typePrefix}" data-field="type">
                    <option value="stream" ${item.type === 'stream' ? 'selected' : ''}>Stream (MP3)</option>
                    <option value="youtube" ${(item.type === 'youtube' || item.type === 'youtubeMusic') ? 'selected' : ''}>YouTube</option>
                    <!-- Add other types if needed, e.g., 'binaural' might imply stream -->
                </select>
            </td>
             <td class="px-3 py-2 text-sm align-top min-w-[150px]">
                <input type="text" value="${escapeHtml(item.artist || '')}" class="form-control-sm library-input w-full" data-index="${index}" data-library="${typePrefix}" data-field="artist" placeholder="Artist (Optional)">
            </td>
            <td class="px-3 py-2 text-sm align-top min-w-[200px]">
                <input type="text" value="${escapeHtml(item.albumArtUrl || '')}" class="form-control-sm library-input w-full" data-index="${index}" data-library="${typePrefix}" data-field="albumArtUrl" placeholder="Album Art URL (Optional)">
            </td>
            <td class="px-3 py-2 text-sm align-top min-w-[200px]">
                <input type="text" value="${escapeHtml(item.description || '')}" class="form-control-sm library-input w-full" data-index="${index}" data-library="${typePrefix}" data-field="description" placeholder="Description (Optional)">
            </td>
            <td class="px-3 py-2 text-sm text-right align-top">
                <div class="flex flex-col sm:flex-row gap-1 justify-end">
                    <button onclick="window.adminMusicManagement.testSound('${typePrefix}', ${index}, this)" class="btn-secondary-small text-xs flex items-center justify-center" title="Test Sound">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </button>
                    <button onclick="window.adminMusicManagement.deleteLibraryItem('${typePrefix}', ${index})" class="btn-danger-small text-xs flex items-center justify-center" title="Delete Item">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    return `
        <section class="mb-6 p-4 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
            <h4 class="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">${title}</h4>
            <div class="overflow-x-auto custom-scrollbar">
                <table class="min-w-full w-full text-left text-sm table-fixed"> <!-- Added table-fixed -->
                    <thead class="border-b dark:border-gray-700 bg-gray-100 dark:bg-gray-900">
                        <tr>
                            <th class="px-3 py-2 w-16">Icon</th>
                            <th class="px-3 py-2 min-w-[150px] w-1/6">Name</th>
                            <th class="px-3 py-2 min-w-[250px] w-1/4">URL / YT ID</th>
                            <th class="px-3 py-2 min-w-[120px] w-[10%]">Type</th>
                            <th class="px-3 py-2 min-w-[150px] w-1/6">Artist</th>
                            <th class="px-3 py-2 min-w-[200px] w-1/5">Album Art</th>
                            <th class="px-3 py-2 min-w-[200px] w-1/5">Description</th>
                            <th class="px-3 py-2 w-28 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="${typePrefix}-library-body">
                        ${itemsHtml}
                    </tbody>
                </table>
            </div>
            <button onclick="window.adminMusicManagement.addLibraryItem('${typePrefix}')" class="btn-secondary-small text-xs mt-3">
                Add New to ${title}
            </button>
        </section>
    `;
}

function renderUiSoundsSection() {
    let itemsHtml = Object.entries(currentUiSounds).map(([key, url]) => `
        <tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
            <td class="px-3 py-2 text-sm font-mono align-top">${escapeHtml(key)}</td>
            <td class="px-3 py-2 text-sm align-top min-w-[300px]">
                <input type="text" value="${escapeHtml(url || '')}" class="form-control-sm library-input ui-sound-url w-full" data-key="${key}" placeholder="Sound File URL">
            </td>
            <td class="px-3 py-2 text-sm text-right align-top">
                <div class="flex flex-col sm:flex-row gap-1 justify-end">
                    <button onclick="window.adminMusicManagement.testUiSound('${key}', this)" class="btn-secondary-small text-xs flex items-center justify-center" title="Test Sound">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </button>
                    <button onclick="window.adminMusicManagement.deleteUiSoundItem('${key}')" class="btn-danger-small text-xs flex items-center justify-center" title="Delete Item">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    return `
        <section class="mb-6 p-4 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
            <h4 class="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">UI Sound Effects</h4>
            <div class="overflow-x-auto custom-scrollbar">
                <table class="min-w-full w-full text-left text-sm table-fixed">
                    <thead class="border-b dark:border-gray-700 bg-gray-100 dark:bg-gray-900">
                        <tr>
                            <th class="px-3 py-2 w-1/3">Key Name</th>
                            <th class="px-3 py-2 w-2/3">Sound File URL</th>
                            <th class="px-3 py-2 w-28 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="ui-sounds-library-body">
                        ${itemsHtml}
                    </tbody>
                </table>
            </div>
            <button onclick="window.adminMusicManagement.addUiSoundItem()" class="btn-secondary-small text-xs mt-3">
                Add New UI Sound
            </button>
        </section>
    `;
}


function getLibraryArray(typePrefix) {
    switch (typePrefix) {
        case 'ambient': return currentAmbientSounds;
        case 'study': return currentStudyMusic;
        case 'binaural': return currentBinauralBeats;
        default: return [];
    }
}

function updateLibraryItem(libraryType, index, field, value) {
    const library = getLibraryArray(libraryType);
    if (library[index]) {
        if (field === 'urlOrId') {
            const ytRegex = /^[a-zA-Z0-9_-]{11}$/;
            if (ytRegex.test(value) && library[index].type === 'youtube') {
                library[index].videoId = value;
                delete library[index].url;
            } else {
                library[index].url = value;
                delete library[index].videoId;
            }
        } else {
            library[index][field] = value;
        }
        if (field === 'type') {
            if (value === 'youtube') {
                library[index].videoId = library[index].url || library[index].videoId || '';
                delete library[index].url;
            } else if (value === 'stream') {
                library[index].url = library[index].videoId || library[index].url || '';
                delete library[index].videoId;
            }
        }
    }
}

function updateUiSoundItem(key, newUrl) {
    if (currentUiSounds.hasOwnProperty(key)) {
        currentUiSounds[key] = newUrl;
    }
}


function attachMusicManagementEventListeners() {
    document.querySelectorAll('.library-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const target = e.target;
            const libraryType = target.dataset.library;
            const index = parseInt(target.dataset.index);
            const field = target.dataset.field;
            const value = target.type === 'checkbox' ? target.checked : target.value;
            updateLibraryItem(libraryType, index, field, value);
        });
    });
     document.querySelectorAll('.ui-sound-url').forEach(input => {
        input.addEventListener('change', (e) => {
            const target = e.target;
            const key = target.dataset.key;
            const value = target.value;
            updateUiSoundItem(key, value);
        });
    });
}


window.adminMusicManagement = {
    addLibraryItem: (typePrefix) => {
        const library = getLibraryArray(typePrefix);
        const newItem = {
            id: `${typePrefix}_${Date.now()}`,
            name: 'New Sound/Track',
            type: 'stream',
            icon: '🎵',
        };
        if (typePrefix === 'study') {
            newItem.type = 'youtube';
        }
        library.push(newItem);
        const sectionContainer = document.getElementById(`${typePrefix}-library-body`).closest('section');
        if (sectionContainer) {
            let title = '';
            if (typePrefix === 'ambient') title = 'Ambient Sounds';
            else if (typePrefix === 'study') title = 'Study Music (Lo-fi, etc.)';
            else if (typePrefix === 'binaural') title = 'Binaural Beats';
            const newSectionHtml = renderSoundLibrarySection(title, library, typePrefix);
            const tempDiv = document.createElement('div'); tempDiv.innerHTML = newSectionHtml;
            sectionContainer.parentNode.replaceChild(tempDiv.firstChild, sectionContainer);
            attachMusicManagementEventListeners();
        }
    },
    deleteLibraryItem: (typePrefix, index) => {
        if (!confirm("Are you sure you want to delete this item?")) return;
        const library = getLibraryArray(typePrefix);
        library.splice(index, 1);
        const sectionContainer = document.getElementById(`${typePrefix}-library-body`).closest('section');
         if (sectionContainer) {
            let title = '';
            if (typePrefix === 'ambient') title = 'Ambient Sounds';
            else if (typePrefix === 'study') title = 'Study Music (Lo-fi, etc.)';
            else if (typePrefix === 'binaural') title = 'Binaural Beats';
            const newSectionHtml = renderSoundLibrarySection(title, library, typePrefix);
            const tempDiv = document.createElement('div'); tempDiv.innerHTML = newSectionHtml;
            sectionContainer.parentNode.replaceChild(tempDiv.firstChild, sectionContainer);
            attachMusicManagementEventListeners();
        }
    },
    addUiSoundItem: () => {
        const newKey = prompt("Enter new UI Sound Key (e.g., 'custom_success'):");
        if (!newKey || !/^[a-zA-Z0-9_]+$/.test(newKey) || currentUiSounds.hasOwnProperty(newKey)) {
            alert("Invalid or duplicate key."); return;
        }
        currentUiSounds[newKey] = './assets/sounds/ui/your_new_sound.mp3';
        const sectionContainer = document.getElementById('ui-sounds-library-body').closest('section');
        if (sectionContainer) {
            const tempDiv = document.createElement('div'); tempDiv.innerHTML = renderUiSoundsSection();
            sectionContainer.parentNode.replaceChild(tempDiv.firstChild, sectionContainer);
            attachMusicManagementEventListeners();
        }
    },
    deleteUiSoundItem: (key) => {
        if (!confirm(`Are you sure you want to delete UI Sound "${key}"?`)) return;
        if (currentUiSounds.hasOwnProperty(key)) {
            delete currentUiSounds[key];
            const sectionContainer = document.getElementById('ui-sounds-library-body').closest('section');
            if (sectionContainer) {
                const tempDiv = document.createElement('div'); tempDiv.innerHTML = renderUiSoundsSection();
                sectionContainer.parentNode.replaceChild(tempDiv.firstChild, sectionContainer);
                attachMusicManagementEventListeners();
            }
        }
    },
    testSound: (typePrefix, index, buttonElement) => {
        const library = getLibraryArray(typePrefix);
        const item = library[index];
        if (!item) { alert("Sound item not found."); return; }

        const urlOrId = item.url || item.videoId;
        if (!urlOrId) { alert("No URL or Video ID specified for this item."); return; }

        if (item.type === 'youtube') {
            window.open(`https://www.youtube.com/watch?v=${item.videoId}`, '_blank');
        } else if (item.type === 'stream') {
            playTestSoundOnce(item.url, buttonElement); // Pass buttonElement
        } else {
            alert(`Cannot test sound of type: ${item.type}`);
        }
    },
    testUiSound: (key, buttonElement) => {
        const url = currentUiSounds[key];
        if (!url) { alert("No URL for this UI sound."); return; }
        playTestSoundOnce(url, buttonElement); // Pass buttonElement, use generic test player
    },
    generateConfigCode: () => {
        const cleanLibrary = (libArray) => {
            return libArray.map(item => {
                const cleanedItem = {
                    id: item.id || `${item.type}_${Date.now()}_${Math.random().toString(16).slice(2,8)}`,
                    name: item.name || 'Unnamed Track',
                    type: item.type || 'stream',
                    icon: item.icon || '🎵'
                };
                if (cleanedItem.type === 'youtube') cleanedItem.videoId = item.videoId || item.url || '';
                else cleanedItem.url = item.url || item.videoId || '';
                if (item.artist) cleanedItem.artist = item.artist;
                if (item.albumArtUrl) cleanedItem.albumArtUrl = item.albumArtUrl;
                if (item.description) cleanedItem.description = item.description;
                return cleanedItem;
            }).filter(item => item.name && (item.url || item.videoId));
        };

        const finalAmbient = cleanLibrary(currentAmbientSounds);
        const finalStudy = cleanLibrary(currentStudyMusic);
        const finalBinaural = cleanLibrary(currentBinauralBeats);
        const finalUiSounds = {};
        for(const key in currentUiSounds){
            if(currentUiSounds[key] && currentUiSounds[key].trim() !== "") finalUiSounds[key] = currentUiSounds[key].trim();
        }

        const code = `
// --- Updated Music & Sound Libraries ---
export const AMBIENT_SOUNDS_LIBRARY = ${JSON.stringify(finalAmbient, null, 4)};
export const STUDY_MUSIC_LIBRARY = ${JSON.stringify(finalStudy, null, 4)};
export const BINAURAL_BEATS_LIBRARY = ${JSON.stringify(finalBinaural, null, 4)};
export const UI_SOUND_EFFECTS = ${JSON.stringify(finalUiSounds, null, 4)};
// --- End Updated Music & Sound Libraries ---`;
        const codeArea = document.getElementById('generated-config-code');
        if (codeArea) {
            codeArea.textContent = code.trim();
            codeArea.classList.remove('hidden');
            codeArea.scrollIntoView({behavior: "smooth", block: "nearest"});
            alert("Configuration code generated. Copy and paste into config.js.");
        }
    }
};
// --- END OF FILE admin_music_management.js ---