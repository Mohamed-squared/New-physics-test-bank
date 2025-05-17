// --- START OF MODIFIED FILE ui_music_player.js ---
import { currentUser, musicPlayerState, setMusicPlayerState } from './state.js';
import { displayContent, setActiveSidebarLink } from './ui_core.js';
import { escapeHtml, showLoading, hideLoading } from './utils.js';
import {
    AMBIENT_SOUNDS_LIBRARY, STUDY_MUSIC_LIBRARY, BINAURAL_BEATS_LIBRARY, YOUTUBE_API_KEY,
    SPOTIFY_CLIENT_ID_PLACEHOLDER, DEEZER_APP_ID_PLACEHOLDER
} from './config.js';
import {
    playAmbientSound, stopAmbientSound, setAmbientVolume,
    playStreamableMusicTrack, pauseStreamableMusic, resumeStreamableMusic, stopStreamableMusic, setStreamableMusicVolume, seekStreamableMusic,
    playUiSound, stopCurrentMusic, getMusicAudioElement, destroyYouTubePlayers, initAudioPlayers, musicAudioPlayer, ambientAudioPlayer 
} from './audio_service.js';

// YouTube IFrame API related variables for this module (MAIN PLAYER IN THIS TAB)
// window.mainYouTubePlayer is now managed here and passed to audio_service if needed.
// Mini-player will have its own instance logic.
let isYouTubeApiReadyForMusicTab = false; // Tracks if API is ready specifically for use in this tab
let youtubeApiLoadInitiatedForMusicTab = false;
let mainYouTubePlayerInstance = null; // Specific instance for the main player in this tab
let mainPlayerYouTubeStateInterval = null;

// Element ID for the main YouTube player in the Music & Sounds tab
const MAIN_PLAYER_YT_ELEMENT_ID = 'youtube-player-main';
// Element ID for the mini-player's YouTube instance (in index.html floatie)
const MINI_PLAYER_YT_ELEMENT_ID = 'mini-youtube-player-instance';


// --- Initialization and Main UI ---
export function showMusicPlayerDashboard() {
    if (!currentUser) {
        alert("Please log in to access the Music & Sounds feature.");
        return;
    }
    setActiveSidebarLink('showMusicPlayerDashboard', 'sidebar-standard-nav');
    ensureYouTubeApiLoadedForMusicTab(); // Start loading YouTube API if not already

    // Load saved playlists from localStorage when dashboard is shown
    loadUserSavedPlaylistsFromStorage();

    const html = generateMusicPlayerDashboardHtml(); // Assumes this function is defined below
    displayContent(html, 'content');

    attachMainPlayerEventListeners();
    updateAllPlayerUIs();
    updateMiniPlayerVisibility();

    // If a track is supposed to be playing, reflect its state.
    const currentTrack = musicPlayerState.currentTrack;
    if (currentTrack) {
        if (currentTrack.source === 'youtube' || currentTrack.source === 'youtubeMusic') {
            // If the music tab is opened, the main player here should take over from the mini-player if it was playing YT
            if (musicPlayerState.miniPlayerVideoActive && musicPlayerState.miniPlayerYouTubeInstance) {
                musicPlayerState.miniPlayerYouTubeInstance.stopVideo(); // Stop mini player
                setMusicPlayerState({ miniPlayerVideoActive: false }); // It's no longer the active YT source
            }
            if (mainYouTubePlayerInstance && typeof mainYouTubePlayerInstance.getPlayerState === 'function') {
                // Player already exists, sync state
                const playerState = mainYouTubePlayerInstance.getPlayerState();
                if (playerState === YT.PlayerState.PLAYING && !musicPlayerState.isPlaying) {
                    setMusicPlayerState({ isPlaying: true });
                } else if ((playerState === YT.PlayerState.PAUSED || playerState === YT.PlayerState.ENDED) && musicPlayerState.isPlaying) {
                    setMusicPlayerState({ isPlaying: false });
                }
                if (musicPlayerState.isPlaying && playerState !== YT.PlayerState.PLAYING) {
                    mainYouTubePlayerInstance.playVideo();
                }
            } else if (isYouTubeApiReadyForMusicTab) {
                createMainYouTubePlayerForTab(currentTrack.videoId);
            }
        } else { // Streamable track
            const streamPlayer = getMusicAudioElement();
            if (streamPlayer && !streamPlayer.paused && musicPlayerState.isPlaying) {
                // Already playing, UI reflects this
            } else if (streamPlayer && musicPlayerState.isPlaying) {
                resumeStreamableMusic(); // If state says playing but HTML5 audio isn't
            }
        }
    }
    // Assign the main player instance to a global-like scope if needed by audio_service
    window.mainYouTubePlayer = mainYouTubePlayerInstance;
}
// Ensure window.showMusicPlayerDashboard is globally accessible if called from HTML
// This is typically done in script.js, but ensure it's exported if not.

function generateMusicPlayerDashboardHtml() {
    // ... (This function remains the same as in your provided code)
    // Ensure it uses MAIN_PLAYER_YT_ELEMENT_ID for the YouTube player div
    // Example for the YouTube player part:
    // <div id="${MAIN_PLAYER_YT_ELEMENT_ID}-container" class="youtube-player-container ...">
    //     <div id="${MAIN_PLAYER_YT_ELEMENT_ID}"></div>
    // </div>
    // The HTML generation functions (generateMusicSourcesHtml, etc.) are assumed to be correct.
    return `
        <div id="music-player-dashboard" class="animate-fade-in space-y-6">
            <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200">Music & Sounds Center</h2>

            <div class="music-player-grid grid grid-cols-1 lg:grid-cols-[minmax(300px,1fr)_2fr] gap-6">
                <!-- Left Column: Sources & Libraries -->
                <div class="space-y-6">
                    ${generateMusicSourcesHtml()}
                    ${generateAmbientSoundsHtml()}
                    ${generateStudyMusicHtml()}
                    ${generateBinauralBeatsHtml()}
                    ${generateUserSavedPlaylistsHtml()}
                </div>

                <!-- Right Column: Main Player & Playlist -->
                <div class="space-y-6">
                    ${generateMainPlayerAreaHtml()}
                    ${generateCurrentPlaylistHtml()}
                    ${generateSoundSettingsHtml()}
                </div>
            </div>
        </div>
    `;
}

function generateMusicSourcesHtml() {
    const ytLinked = musicPlayerState.linkedServices.youtubeMusic.linked;
    return `
        <div class="content-card music-source-section">
            <h3 class="section-title">Music Sources</h3>
            <div class="space-y-2">
                 <button id="source-youtube-btn" class="music-source-btn btn-secondary ${ytLinked ? 'linked' : ''}" onclick="window.musicPlayerActions.selectSource('youtubeMusic')" title="${ytLinked ? 'YouTube Music Linked (Paste URL to Play)' : 'Connect YouTube Music (Paste URL to Play)'}">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="text-red-500 w-5 h-5"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.722 0 12s.488 8.55 4.385 8.816c3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.278 24 12s-.488-8.55-4.385-8.816zM9.75 15.6V8.4l6 3.6-6 3.6z"/></svg>
                    YouTube Music
                    <span class="status-indicator" id="youtube-status">${ytLinked ? 'Active' : 'Connect'}</span>
                </button>
                <button class="music-source-btn btn-secondary disabled-feature" title="Spotify integration coming soon!">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="text-green-500 w-5 h-5"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.07 14.16c-.18.28-.54.36-.83.18-2.29-1.4-5.11-1.73-8.43-.94-.31.06-.54-.16-.6-.47-.06-.31.16-.54.47-.6 3.57-.85 6.64-.47 9.16 1.04.28.18.36.54.18.83zm1.1-2.55c-.22.34-.66.44-1.01.22-2.52-1.61-6.36-2.07-9.48-1.13-.37.1-.73-.12-.84-.48-.1-.37.12-.73.48-.84 3.48-.98 7.71-.48 10.57 1.33.36.22.45.66.22 1.01zm.06-2.6c-.26.41-.79.52-1.2.26-2.93-1.84-7.75-2.35-11.03-1.29-.45.13-.92-.16-1.05-.6-.13-.45.16-.92.6-1.05 3.73-1.18 8.97-.62 12.32 1.45.41.26.52.79.26 1.2z"/></svg>
                    Spotify (Soon)
                </button>
            </div>
        </div>
    `;
}
function generateAmbientSoundsHtml() {
    // ... (remains largely the same, ensure icons are correct emojis if intended)
    // Make sure class names in the SVG are correct or use `currentColor`
    let itemsHtml = AMBIENT_SOUNDS_LIBRARY.map(sound => `
        <button class="sound-item-btn btn-secondary-small" onclick="window.musicPlayerActions.playAmbient('${sound.id}')" data-sound-id="${sound.id}">
            <span class="icon">${sound.icon}</span>
            <span class="flex-grow text-left">${escapeHtml(sound.name)}</span>
            <svg class="play-indicator w-4 h-4 hidden text-primary-500" viewBox="0 0 20 20" fill="currentColor"><path d="M7 4a1 1 0 011.447.894l4 6A1 1 0 0112 12.226V15a1 1 0 11-2 0v-2.774l-4-6A1 1 0 017 4z" /></svg>
        </button>
    `).join('');

    return `
        <div class="content-card music-controls-section">
            <h3 class="section-title">Ambient Sounds</h3>
            <div id="ambient-sounds-list" class="sound-category-list custom-scrollbar">
                ${itemsHtml || '<p class="text-muted text-xs text-center">No ambient sounds available.</p>'}
            </div>
            <div class="mt-3" id="ambient-sounds-volume-control">
                <label for="ambient-volume-slider" class="text-xs text-muted">Ambient Volume:</label>
                <input type="range" id="ambient-volume-slider" min="0" max="1" step="0.01" value="${musicPlayerState.ambientVolume}" class="w-full h-1.5 mt-1">
            </div>
            <button id="stop-ambient-btn" class="btn-secondary-small text-xs mt-2 w-full ${!musicPlayerState.isAmbientPlaying ? 'hidden' : ''}" onclick="window.musicPlayerActions.stopAmbient()">Stop Ambient Sound</button>
        </div>
    `;
}
function generateStudyMusicHtml() {
    // ... (remains largely the same)
    let itemsHtml = STUDY_MUSIC_LIBRARY.map(track => `
        <button class="sound-item-btn btn-secondary-small" onclick="window.musicPlayerActions.playStudyMusic('${track.id}')" data-track-id="${track.id}">
            <span class="icon">${track.icon}</span>
            <span class="flex-grow text-left">${escapeHtml(track.name)}</span>
            <svg class="play-indicator w-4 h-4 hidden text-primary-500" viewBox="0 0 20 20" fill="currentColor"><path d="M7 4a1 1 0 011.447.894l4 6A1 1 0 0112 12.226V15a1 1 0 11-2 0v-2.774l-4-6A1 1 0 017 4z" /></svg>
        </button>
    `).join('');
    return `
        <div class="content-card music-controls-section">
            <h3 class="section-title">Study Music (Lo-fi, Chill, etc.)</h3>
            <div id="study-music-list" class="sound-category-list custom-scrollbar">
                ${itemsHtml || '<p class="text-muted text-xs text-center">No study music available.</p>'}
            </div>
            <!-- Added Volume slider for Study Music / Binaural Beats - controlled by main player volume -->
            <div class="mt-3">
                <label for="player-volume-slider-study" class="text-xs text-muted">Main Music Volume:</label>
                <input type="range" id="player-volume-slider-study" min="0" max="1" step="0.01" value="${musicPlayerState.volume}" class="w-full h-1.5 mt-1">
            </div>
        </div>
    `;
}
function generateBinauralBeatsHtml() {
    // ... (remains largely the same)
    let itemsHtml = BINAURAL_BEATS_LIBRARY.map(beat => `
        <div class="p-2 border-b dark:border-gray-700 last:border-b-0">
            <button class="sound-item-btn btn-secondary-small !mb-1" onclick="window.musicPlayerActions.playBinauralBeat('${beat.id}')" data-beat-id="${beat.id}">
                <span class="icon">${beat.icon}</span>
                <span class="flex-grow text-left">${escapeHtml(beat.name)}</span>
                <svg class="play-indicator w-4 h-4 hidden text-primary-500" viewBox="0 0 20 20" fill="currentColor"><path d="M7 4a1 1 0 011.447.894l4 6A1 1 0 0112 12.226V15a1 1 0 11-2 0v-2.774l-4-6A1 1 0 017 4z" /></svg>
            </button>
            <p class="text-xs text-muted pl-1">${escapeHtml(beat.description)}</p>
        </div>
    `).join('');
    return `
        <div class="content-card music-controls-section">
            <h3 class="section-title">Binaural Beats</h3>
            <div id="binaural-beats-list" class="sound-category-list custom-scrollbar">
                ${itemsHtml || '<p class="text-muted text-xs text-center">No binaural beats available.</p>'}
            </div>
             <!-- Volume for Binaural Beats also controlled by main player volume -->
        </div>
    `;
}
function generateMainPlayerAreaHtml() {
    // Make sure the SVG icons for play/pause, repeat, shuffle are correct.
    // Assuming MAIN_PLAYER_YT_ELEMENT_ID is correctly used for the YouTube player div.
    // ... (HTML is largely the same as your provided code, check SVGs)
     return `
        <div class="content-card music-controls-section">
            <h3 class="section-title">Now Playing</h3>
            <div class="current-track-display text-center p-4 border-b dark:border-gray-700">
                <img id="player-album-art" src="${musicPlayerState.currentTrack?.albumArtUrl || './assets/images/branding/default-album-art.png'}" alt="Album Art" class="w-32 h-32 md:w-40 md:h-40 rounded-lg shadow-lg mx-auto mb-3 object-cover">
                <p id="player-track-title" class="text-xl font-semibold truncate">${escapeHtml(musicPlayerState.currentTrack?.title || 'No Track Selected')}</p>
                <p id="player-track-artist" class="text-sm text-muted truncate">${escapeHtml(musicPlayerState.currentTrack?.artist || '')}</p>
                <p id="player-track-source" class="text-xs text-primary-500 dark:text-primary-400 mt-1 capitalize">${escapeHtml(musicPlayerState.currentTrack?.source || '')}</p>
            </div>

            <div id="${MAIN_PLAYER_YT_ELEMENT_ID}-container" class="youtube-player-container ${(musicPlayerState.currentTrack?.source === 'youtube' || musicPlayerState.currentTrack?.source === 'youtubeMusic') ? '' : 'hidden'}">
                <div id="${MAIN_PLAYER_YT_ELEMENT_ID}"></div>
            </div>

            <div class="playback-controls-bar p-3">
                <div class="progress-slider-container flex items-center gap-2 mb-2">
                    <span id="player-current-time" class="time-display">0:00</span>
                    <input type="range" id="player-progress-slider" min="0" max="100" value="0" class="w-full h-1.5">
                    <span id="player-duration" class="time-display">0:00</span>
                </div>
                <div class="main-control-buttons flex items-center justify-center gap-4">
                    <button id="player-shuffle-btn" class="control-btn" title="Shuffle">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3-3 3" />
                        </svg>
                    </button>
                    <button id="player-prev-btn" class="control-btn" title="Previous">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-6 h-6">
                            <path d="M15.25 5.25a.75.75 0 00-1.06-.04L9.931 8.397a.75.75 0 000 1.206l4.259 3.187a.75.75 0 001.06-.04V5.25zM5.75 5.25a.75.75 0 00-1.06-.04L.431 8.397a.75.75 0 000 1.206l4.259 3.187A.75.75 0 005.75 12.25V5.25z" />
                        </svg>
                    </button>
                    <button id="player-play-pause-btn" class="play-pause-btn control-btn" title="Play">
                         <svg id="player-play-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-7 h-7">
                            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84Z" />
                         </svg>
                         <svg id="player-pause-icon" xmlns="http://www.w3.org/2000/svg" class="hidden w-7 h-7" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M5.75 4.5a.75.75 0 00-.75.75v10.5a.75.75 0 001.5 0V5.25a.75.75 0 00-.75-.75Z" /><path d="M14.25 4.5a.75.75 0 00-.75.75v10.5a.75.75 0 001.5 0V5.25a.75.75 0 00-.75-.75Z" />
                         </svg>
                    </button>
                    <button id="player-next-btn" class="control-btn" title="Next">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-6 h-6">
                            <path d="M4.75 5.25a.75.75 0 011.06-.04l4.258 3.187a.75.75 0 010 1.206L5.81 12.79A.75.75 0 014.75 12.25V5.25zM14.25 5.25a.75.75 0 011.06-.04L19.57 8.397a.75.75 0 010 1.206l-4.259 3.187A.75.75 0 0114.25 12.25V5.25z" />
                        </svg>
                    </button>
                    <button id="player-repeat-btn" class="control-btn" title="Repeat Off">
                        <svg id="player-repeat-off-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                        <svg id="player-repeat-all-icon" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" class="w-5 h-5 hidden">
                           <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                        <svg id="player-repeat-one-icon" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" class="w-5 h-5 hidden">
                           <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                           <text x="10.5" y="18" font-size="10" fill="var(--text-color, #fff)" style="paint-order: stroke; stroke: var(--primary-color, #0ea5e9); stroke-width: 2px; stroke-linejoin: round; font-weight: bold;">1</text>
                           <text x="10.5" y="18" font-size="10" fill="var(--text-color, #fff)" style="font-weight: bold;">1</text>
                        </svg>
                    </button>
                </div>
                <div class="secondary-controls flex items-center justify-between mt-3">
                    <button id="toggle-mini-player-btn" class="btn-secondary-small text-xs" title="Toggle Mini Player">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15.91 15.91L15 15m-.09-2.828L12 12m3.912 3.912L12 12m3.912 3.912a1.5 1.5 0 0 1-2.122 0l-2.828-2.828a1.5 1.5 0 0 1 0-2.122l2.828-2.828a1.5 1.5 0 0 1 2.122 0L18 12.828l-2.088 2.088Z" /></svg>
                        Mini Player
                    </button>
                    <div class="volume-slider-container flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 text-muted"><path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" /></svg>
                        <input type="range" id="player-volume-slider" min="0" max="1" step="0.01" value="${musicPlayerState.volume}" class="w-24 h-1.5">
                    </div>
                </div>
            </div>
        </div>
    `;
}
function generateCurrentPlaylistHtml() {
    // ... (remains largely the same)
    const track = musicPlayerState.currentTrack; // Get current track for highlighting
    let itemsHtml = musicPlayerState.currentPlaylist.map((item, index) => `
        <div class="playlist-item ${item.id === track?.id ? 'playing' : ''}" onclick="window.musicPlayerActions.playTrackFromPlaylist(${index})" title="Play ${escapeHtml(item.title)}">
            <img src="${item.albumArtUrl || './assets/images/branding/default-album-art.png'}" alt="" class="w-8 h-8 rounded object-cover mr-2 flex-shrink-0">
            <div class="track-info flex-grow overflow-hidden">
                <span class="font-medium block truncate">${escapeHtml(item.title)}</span>
                <span class="text-xs text-muted block truncate">${escapeHtml(item.artist || 'Unknown Artist')}</span>
            </div>
            <span class="track-duration text-xs text-muted flex-shrink-0 ml-2">${item.duration ? formatTrackDuration(item.duration) : '--:--'}</span>
        </div>
    `).join('');

    return `
        <div class="content-card music-playlist-section">
            <div class="flex justify-between items-center">
                <h3 class="section-title">Current Playlist: ${escapeHtml(musicPlayerState.currentPlaylistName || 'Up Next')}</h3>
                ${musicPlayerState.currentPlaylist.length > 0 ? `
                <button onclick="window.musicPlayerActions.saveCurrentPlaylist()" class="btn-secondary-small text-xs" title="Save this playlist">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 mr-1"><path d="M8.75 3.5a.75.75 0 00-1.5 0v3.5h-3.5a.75.75 0 000 1.5h3.5v3.5a.75.75 0 001.5 0v-3.5h3.5a.75.75 0 000-1.5h-3.5V3.5Z" /></svg>
                    Save Playlist
                </button>` : ''}
            </div>
            <div id="current-playlist-display" class="max-h-80 overflow-y-auto custom-scrollbar">
                ${itemsHtml || '<p class="text-muted text-xs text-center py-4">Playlist is empty. Add music from sources.</p>'}
            </div>
        </div>
    `;
}
function generateUserSavedPlaylistsHtml() {
    let itemsHtml = musicPlayerState.userSavedPlaylists.map((playlist, index) => `
        <div class="playlist-item-saved flex justify-between items-center p-2 border-b dark:border-gray-700 last:border-b-0">
            <span class="font-medium text-sm truncate flex-grow" title="${escapeHtml(playlist.name)}">${escapeHtml(playlist.name)} (${playlist.tracks.length} tracks)</span>
            <div class="flex-shrink-0 flex gap-1">
                <button onclick="window.musicPlayerActions.loadSavedPlaylist(${index})" class="btn-secondary-small text-xs" title="Load this playlist">Load</button>
                <button onclick="window.musicPlayerActions.deleteSavedPlaylist(${index})" class="btn-danger-small text-xs" title="Delete this saved playlist">Del</button>
            </div>
        </div>
    `).join('');
    return `
        <div class="content-card">
            <h3 class="section-title">Saved Playlists</h3>
            <div id="user-saved-playlists-display" class="max-h-60 overflow-y-auto custom-scrollbar">
                ${itemsHtml || '<p class="text-muted text-xs text-center py-4">No playlists saved yet.</p>'}
            </div>
        </div>
    `;
}
function generateSoundSettingsHtml() {
    // ... (remains the same)
    return `
        <div class="content-card">
            <h3 class="section-title">Sound Settings</h3>
            <div class="space-y-3">
                <div id="ui-sounds-control" class="flex items-center justify-between">
                    <label for="ui-sounds-toggle" class="text-sm font-medium text-gray-700 dark:text-gray-300">Enable UI Sounds</label>
                    <input type="checkbox" id="ui-sounds-toggle" class="form-checkbox h-5 w-5" ${musicPlayerState.uiSoundsEnabled ? 'checked' : ''}>
                </div>
            </div>
        </div>
    `;
}

// --- Event Listeners and UI Updates ---
function attachMainPlayerEventListeners() {
    // ... (event listeners for main player buttons like play/pause, next, prev, shuffle, repeat are the same) ...
    // Ensure player-volume-slider-study also uses the same setVolume action
    document.getElementById('player-play-pause-btn')?.addEventListener('click', () => window.musicPlayerActions.togglePlayPause());
    document.getElementById('player-next-btn')?.addEventListener('click', () => window.musicPlayerActions.nextTrack());
    document.getElementById('player-prev-btn')?.addEventListener('click', () => window.musicPlayerActions.prevTrack());
    document.getElementById('player-shuffle-btn')?.addEventListener('click', () => window.musicPlayerActions.toggleShuffle());
    document.getElementById('player-repeat-btn')?.addEventListener('click', () => window.musicPlayerActions.toggleRepeat());

    const volumeSlider = document.getElementById('player-volume-slider');
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => window.musicPlayerActions.setVolume(parseFloat(e.target.value)));
        volumeSlider.value = musicPlayerState.volume;
    }
    // Link study music volume slider to the same action
    const studyVolumeSlider = document.getElementById('player-volume-slider-study');
    if (studyVolumeSlider) {
        studyVolumeSlider.addEventListener('input', (e) => window.musicPlayerActions.setVolume(parseFloat(e.target.value)));
        studyVolumeSlider.value = musicPlayerState.volume;
    }


    const progressSlider = document.getElementById('player-progress-slider');
    if (progressSlider) {
        progressSlider.addEventListener('input', (e) => {
            const time = parseFloat(e.target.value);
            window.musicPlayerActions.seek(time);
        });
    }

    const ambientVolumeSlider = document.getElementById('ambient-volume-slider');
    if (ambientVolumeSlider) {
        ambientVolumeSlider.addEventListener('input', (e) => window.musicPlayerActions.setAmbientVolume(parseFloat(e.target.value)));
        ambientVolumeSlider.value = musicPlayerState.ambientVolume;
    }

    const uiSoundsToggle = document.getElementById('ui-sounds-toggle');
    if (uiSoundsToggle) {
        uiSoundsToggle.addEventListener('change', (e) => window.musicPlayerActions.setUiSoundsEnabled(e.target.checked));
        uiSoundsToggle.checked = musicPlayerState.uiSoundsEnabled;
    }

    document.getElementById('toggle-mini-player-btn')?.addEventListener('click', () => window.musicPlayerActions.toggleMiniPlayer());

    const streamPlayer = getMusicAudioElement(); // From audio_service.js
    if (streamPlayer) {
        streamPlayer.removeEventListener('timeupdate', handleStreamTimeUpdate); // Remove first to avoid duplicates
        streamPlayer.removeEventListener('ended', handleStreamEnded);
        streamPlayer.removeEventListener('loadedmetadata', handleStreamMetadataLoaded);
        streamPlayer.removeEventListener('error', handleStreamError);

        streamPlayer.addEventListener('timeupdate', handleStreamTimeUpdate);
        streamPlayer.addEventListener('ended', handleStreamEnded);
        streamPlayer.addEventListener('loadedmetadata', handleStreamMetadataLoaded);
        streamPlayer.addEventListener('error', handleStreamError);
    }
}
// ... (Stream Player Event Handlers: handleStreamTimeUpdate, handleStreamEnded, handleStreamMetadataLoaded, handleStreamError remain the same as you provided)
function handleStreamTimeUpdate() {
    if (musicPlayerState.currentTrack?.source !== 'youtube' && musicPlayerState.currentTrack?.source !== 'youtubeMusic' && musicPlayerState.isPlaying) {
        const streamPlayer = getMusicAudioElement();
        const currentTime = streamPlayer.currentTime;
        const duration = streamPlayer.duration;
        // Only update state if current time actually changed to avoid excessive updates
        if (musicPlayerState.currentTime !== currentTime) {
            setMusicPlayerState({ currentTime });
        }

        const progressSlider = document.getElementById('player-progress-slider');
        if (progressSlider && duration) {
            progressSlider.value = currentTime;
            // Update mini-player progress bar directly if HTML5 audio is playing
            const miniProgress = document.getElementById('mini-player-progress-bar');
            if (miniProgress) miniProgress.style.width = `${(currentTime / duration) * 100}%`;
        }
        const currentTimeEl = document.getElementById('player-current-time');
        if (currentTimeEl) currentTimeEl.textContent = formatTrackDuration(currentTime);

        updateMiniPlayerTimes(currentTime, duration); // Also update mini player time displays
    }
}
function handleStreamEnded() {
    if (musicPlayerState.currentTrack?.source !== 'youtube' && musicPlayerState.currentTrack?.source !== 'youtubeMusic') {
        console.log(`Streamable track "${musicPlayerState.currentTrack?.title}" ended.`);
        window.musicPlayerActions.handleTrackEnd(); // Call the central handler
    }
}
function handleStreamMetadataLoaded() {
    if (musicPlayerState.currentTrack?.source !== 'youtube' && musicPlayerState.currentTrack?.source !== 'youtubeMusic') {
        const streamPlayer = getMusicAudioElement();
        const duration = streamPlayer.duration;
        if (duration && musicPlayerState.currentTrack) {
            // Avoid creating a new object if duration hasn't changed
            if (musicPlayerState.currentTrack.duration !== duration) {
                setMusicPlayerState({ currentTrack: { ...musicPlayerState.currentTrack, duration } });
            }
            const durationEl = document.getElementById('player-duration');
            if (durationEl) durationEl.textContent = formatTrackDuration(duration);
            const progressSlider = document.getElementById('player-progress-slider');
            if (progressSlider) progressSlider.max = duration;

            updateMiniPlayerTimes(musicPlayerState.currentTime, duration);
            updateMiniPlayerUI(); // Refresh mini player duration
        }
    }
}
function handleStreamError(e) {
    if (musicPlayerState.currentTrack?.source !== 'youtube' && musicPlayerState.currentTrack?.source !== 'youtubeMusic') {
        console.error("Error with streamable audio player:", e);
        alert(`Error playing stream: ${musicPlayerState.currentTrack?.title}. It might be unavailable.`);
        setMusicPlayerState({ isPlaying: false, currentTrack: null, currentPlaylist: [], currentPlaylistName: null });
        updateAllPlayerUIs();
    }
}

// --- UI Update Functions (Consolidated) ---
export function updateAllPlayerUIs() {
    updateMainPlayerUI();       // For the player in the Music & Sounds tab
    updateMiniPlayerUI();       // For the floatie player
    updateMiniPlayerVideoContainerVisibility(); // NEW: Show/hide YT instance in floatie
    updateAmbientSoundSelectionUI();
    updatePlayableTrackSelectionUI('study');
    updatePlayableTrackSelectionUI('binaural');
    updateUserSavedPlaylistsUI();
}
window.updateAllPlayerUIs = updateAllPlayerUIs; // Make it accessible for state changes

function updateMainPlayerUI() {
    // ... (Your existing updateMainPlayerUI logic - ensure SVGs are correct)
    // Crucially, it needs to handle the main YouTube player container visibility.
    const track = musicPlayerState.currentTrack;
    const albumArtEl = document.getElementById('player-album-art');
    if (albumArtEl) albumArtEl.src = track?.albumArtUrl || './assets/images/branding/default-album-art.png';
    const titleEl = document.getElementById('player-track-title');
    if (titleEl) titleEl.textContent = track?.title || 'No Track Selected';
    const artistEl = document.getElementById('player-track-artist');
    if (artistEl) artistEl.textContent = track?.artist || '';
    const sourceEl = document.getElementById('player-track-source');
    if (sourceEl) sourceEl.textContent = track?.source ? track.source.charAt(0).toUpperCase() + track.source.slice(1) : '';

    const playIcon = document.getElementById('player-play-icon');
    const pauseIcon = document.getElementById('player-pause-icon');
    if (playIcon && pauseIcon) {
        playIcon.classList.toggle('hidden', musicPlayerState.isPlaying);
        pauseIcon.classList.toggle('hidden', !musicPlayerState.isPlaying);
        const playPauseBtn = document.getElementById('player-play-pause-btn');
        if(playPauseBtn) playPauseBtn.title = musicPlayerState.isPlaying ? 'Pause' : 'Play';
    }

    const shuffleBtn = document.getElementById('player-shuffle-btn');
    if (shuffleBtn) shuffleBtn.classList.toggle('active-control', musicPlayerState.isShuffled);

    const repeatBtn = document.getElementById('player-repeat-btn');
    const repeatOffIcon = document.getElementById('player-repeat-off-icon');
    const repeatAllIcon = document.getElementById('player-repeat-all-icon');
    const repeatOneIcon = document.getElementById('player-repeat-one-icon');

    if (repeatBtn && repeatOffIcon && repeatAllIcon && repeatOneIcon) {
        // Reset all icons visibility
        repeatOffIcon.classList.add('hidden');
        repeatAllIcon.classList.add('hidden');
        repeatOneIcon.classList.add('hidden');
        repeatBtn.classList.remove('active-control'); // Remove active class by default

        let title = 'Repeat Off';
        if (musicPlayerState.repeatMode === 'all') {
            repeatAllIcon.classList.remove('hidden');
            title = 'Repeat All';
            repeatBtn.classList.add('active-control');
        } else if (musicPlayerState.repeatMode === 'one') {
            repeatOneIcon.classList.remove('hidden');
            title = 'Repeat One';
            repeatBtn.classList.add('active-control');
        } else { // 'none'
            repeatOffIcon.classList.remove('hidden');
        }
        repeatBtn.title = title;
    }


    const progressSlider = document.getElementById('player-progress-slider');
    const currentTimeEl = document.getElementById('player-current-time');
    const durationEl = document.getElementById('player-duration');

    if (track && typeof track.duration === 'number' && track.duration > 0 && progressSlider && currentTimeEl && durationEl) {
        progressSlider.max = track.duration;
        progressSlider.value = musicPlayerState.currentTime;
        currentTimeEl.textContent = formatTrackDuration(musicPlayerState.currentTime);
        durationEl.textContent = formatTrackDuration(track.duration);
    } else if (progressSlider && currentTimeEl && durationEl) {
        // Reset if no track or invalid duration
        progressSlider.value = 0;
        progressSlider.max = 100; // Default max if no duration
        currentTimeEl.textContent = "0:00";
        durationEl.textContent = "0:00";
    }

    const ytContainer = document.getElementById(`${MAIN_PLAYER_YT_ELEMENT_ID}-container`);
    if (ytContainer) {
        const isYouTubeTrack = track?.source === 'youtube' || track?.source === 'youtubeMusic';
        ytContainer.classList.toggle('hidden', !isYouTubeTrack);
        // If it's a YT track and the main player instance is not the mini-player one, show.
        // If it's YT and mini-player is active with video, hide main tab's YT player.
        if (isYouTubeTrack && musicPlayerState.showMiniPlayer && musicPlayerState.miniPlayerVideoActive) {
            ytContainer.classList.add('hidden');
        }
    }

    const playlistDisplay = document.getElementById('current-playlist-display');
    const currentPlaylistNameEl = document.querySelector('.music-playlist-section .section-title'); // More specific selector
    if (playlistDisplay && currentPlaylistNameEl) {
        currentPlaylistNameEl.textContent = `Current Playlist: ${escapeHtml(musicPlayerState.currentPlaylistName || 'Up Next')}`;
        let itemsHtml = musicPlayerState.currentPlaylist.map((item, index) => `
            <div class="playlist-item ${item.id === track?.id ? 'playing' : ''}" onclick="window.musicPlayerActions.playTrackFromPlaylist(${index})" title="Play ${escapeHtml(item.title)}">
                <img src="${item.albumArtUrl || './assets/images/branding/default-album-art.png'}" alt="Album art for ${escapeHtml(item.title)}" class="w-8 h-8 rounded object-cover mr-2 flex-shrink-0">
                <div class="track-info flex-grow overflow-hidden">
                    <span class="font-medium block truncate">${escapeHtml(item.title)}</span>
                    <span class="text-xs text-muted block truncate">${escapeHtml(item.artist || 'Unknown Artist')}</span>
                </div>
                <span class="track-duration text-xs text-muted flex-shrink-0 ml-2">${item.duration ? formatTrackDuration(item.duration) : '--:--'}</span>
            </div>
        `).join('');
        playlistDisplay.innerHTML = itemsHtml || '<p class="text-muted text-xs text-center py-4">Playlist is empty. Add music from sources.</p>';
    }
    const volumeSliderStudy = document.getElementById('player-volume-slider-study');
    if(volumeSliderStudy) volumeSliderStudy.value = musicPlayerState.volume;
}

function updateMiniPlayerUI() {
    // ... (Your existing updateMiniPlayerUI logic - ensure SVGs are correct)
    const miniPlayer = document.getElementById('mini-music-player');
    if (!miniPlayer || !musicPlayerState.showMiniPlayer) return; // Only update if shown

    const track = musicPlayerState.currentTrack;
    document.getElementById('mini-player-album-art').src = track?.albumArtUrl || './assets/images/branding/default-album-art.png';
    document.getElementById('mini-player-title').textContent = track?.title || 'No Song Playing';
    document.getElementById('mini-player-artist').textContent = track?.artist || '';

    const playIcon = document.getElementById('mini-player-play-icon');
    const pauseIcon = document.getElementById('mini-player-pause-icon');
    if (playIcon && pauseIcon) {
        playIcon.classList.toggle('hidden', musicPlayerState.isPlaying);
        pauseIcon.classList.toggle('hidden', !musicPlayerState.isPlaying);
        const playPauseBtn = document.getElementById('mini-player-play-pause');
        if(playPauseBtn) playPauseBtn.title = musicPlayerState.isPlaying ? 'Pause' : 'Play';
    }
    
    const shuffleBtnMini = document.getElementById('mini-player-shuffle');
    if(shuffleBtnMini) shuffleBtnMini.classList.toggle('active-control', musicPlayerState.isShuffled);
    
    const repeatBtnMini = document.getElementById('mini-player-repeat');
    const repeatOffIconMini = document.getElementById('mini-player-repeat-off-icon');
    const repeatAllIconMini = document.getElementById('mini-player-repeat-all-icon');
    const repeatOneIconMini = document.getElementById('mini-player-repeat-one-icon');

    if(repeatBtnMini && repeatOffIconMini && repeatAllIconMini && repeatOneIconMini){
        repeatOffIconMini.classList.add('hidden');
        repeatAllIconMini.classList.add('hidden');
        repeatOneIconMini.classList.add('hidden');
        repeatBtnMini.classList.remove('active-control');
        let title = 'Repeat Off';
        if (musicPlayerState.repeatMode === 'all') {
            repeatAllIconMini.classList.remove('hidden');
            title = 'Repeat All';
            repeatBtnMini.classList.add('active-control');
        } else if (musicPlayerState.repeatMode === 'one') {
            repeatOneIconMini.classList.remove('hidden');
            title = 'Repeat One';
            repeatBtnMini.classList.add('active-control');
        } else {
            repeatOffIconMini.classList.remove('hidden');
        }
        repeatBtnMini.title = title;
    }
    updateMiniPlayerTimes(musicPlayerState.currentTime, track?.duration);
}
function updateMiniPlayerTimes(currentTime, duration) {
    // ... (remains the same as your provided code)
    const progress = document.getElementById('mini-player-progress-bar');
    const currentTimeEl = document.getElementById('mini-player-current-time');
    const durationEl = document.getElementById('mini-player-duration');

    if (progress && currentTimeEl && durationEl) {
        if (duration && duration > 0) {
            progress.style.width = `${(currentTime / duration) * 100}%`;
            currentTimeEl.textContent = formatTrackDuration(currentTime);
            durationEl.textContent = formatTrackDuration(duration);
        } else {
            progress.style.width = '0%';
            currentTimeEl.textContent = '0:00';
            durationEl.textContent = '0:00';
        }
    }
}
function updateMiniPlayerVisibility() {
    // ... (remains the same as your provided code)
    const miniPlayer = document.getElementById('mini-music-player');
    if (miniPlayer) {
        if (musicPlayerState.showMiniPlayer) { // Always show if flag is true, content updates separately
            miniPlayer.classList.remove('hidden');
            setTimeout(() => { // Ensure it's not hidden before removing transition classes
                miniPlayer.classList.remove('opacity-0', 'translate-y-4');
            }, 10); // Small delay for CSS to catch up if it was just added
        } else {
            miniPlayer.classList.add('opacity-0', 'translate-y-4');
            setTimeout(() => {
                miniPlayer.classList.add('hidden');
            }, 300); // Match transition duration
        }
        updateMiniPlayerUI(); 
        updateMiniPlayerVideoContainerVisibility();
    }
}
function updateMiniPlayerVideoContainerVisibility() {
    const miniPlayerVideoContainer = document.getElementById(`${MINI_PLAYER_YT_ELEMENT_ID}-container`);
    if (miniPlayerVideoContainer) {
        miniPlayerVideoContainer.classList.toggle('hidden', !(musicPlayerState.showMiniPlayer && musicPlayerState.miniPlayerVideoActive));
        // Also hide main player if mini-player is active with video
        const mainYtContainer = document.getElementById(`${MAIN_PLAYER_YT_ELEMENT_ID}-container`);
        if(mainYtContainer && musicPlayerState.showMiniPlayer && musicPlayerState.miniPlayerVideoActive){
            mainYtContainer.classList.add('hidden');
        } else if (mainYtContainer && musicPlayerState.currentTrack && (musicPlayerState.currentTrack.source === 'youtube' || musicPlayerState.currentTrack.source === 'youtubeMusic')) {
            mainYtContainer.classList.remove('hidden'); // Show if current track is YT and mini isn't active video
        }
    }
}

function attachMiniPlayerEventListeners() {
    // ... (remains the same as your provided code)
    // Event listeners for mini-player controls (close, play/pause, next, prev, shuffle, repeat, progress bar click)
    document.getElementById('mini-player-close')?.addEventListener('click', () => window.musicPlayerActions.toggleMiniPlayer(false));
    document.getElementById('mini-player-play-pause')?.addEventListener('click', () => window.musicPlayerActions.togglePlayPause());
    document.getElementById('mini-player-next')?.addEventListener('click', () => window.musicPlayerActions.nextTrack());
    document.getElementById('mini-player-prev')?.addEventListener('click', () => window.musicPlayerActions.prevTrack());
    document.getElementById('mini-player-shuffle')?.addEventListener('click', () => window.musicPlayerActions.toggleShuffle());
    document.getElementById('mini-player-repeat')?.addEventListener('click', () => window.musicPlayerActions.toggleRepeat());

    const miniProgressBarContainer = document.getElementById('mini-player-progress-bar-container');
    if (miniProgressBarContainer) {
        miniProgressBarContainer.addEventListener('click', (e) => {
            const rect = miniProgressBarContainer.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = clickX / rect.width;
            if (musicPlayerState.currentTrack && typeof musicPlayerState.currentTrack.duration === 'number' && musicPlayerState.currentTrack.duration > 0) {
                const seekTime = percentage * musicPlayerState.currentTrack.duration;
                window.musicPlayerActions.seek(seekTime);
            }
        });
    }
}
// Attach mini-player listeners once the DOM is ready or when the mini-player is first created.
// Since it's in index.html, we can do this.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachMiniPlayerEventListeners);
} else {
    attachMiniPlayerEventListeners();
}
function updateAmbientSoundSelectionUI() {
    // ... (remains the same)
     document.querySelectorAll('#ambient-sounds-list .sound-item-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.querySelector('.play-indicator')?.classList.add('hidden');
        if (musicPlayerState.currentAmbientSound?.id === btn.dataset.soundId && musicPlayerState.isAmbientPlaying) {
            btn.classList.add('active');
            btn.querySelector('.play-indicator')?.classList.remove('hidden');
        }
    });
    const stopBtn = document.getElementById('stop-ambient-btn');
    if (stopBtn) {
        stopBtn.classList.toggle('hidden', !musicPlayerState.isAmbientPlaying);
    }
}
function updatePlayableTrackSelectionUI(libraryType) {
    // ... (remains the same)
    const listId = libraryType === 'study' ? 'study-music-list' : 'binaural-beats-list';
    const dataAttrKey = libraryType === 'study' ? 'trackId' : 'beatId'; // Correct attribute keys

    document.querySelectorAll(`#${listId} .sound-item-btn`).forEach(btn => {
        btn.classList.remove('active');
        btn.querySelector('.play-indicator')?.classList.add('hidden');
        // Check against currentTrack.id (which should be track.id from library or videoId for YT)
        if (musicPlayerState.currentTrack?.id === btn.dataset[dataAttrKey] && musicPlayerState.isPlaying) {
            btn.classList.add('active');
            btn.querySelector('.play-indicator')?.classList.remove('hidden');
        }
    });
}
function updateUiSoundsSettingsUI() {
    // ... (remains the same)
    const toggle = document.getElementById('ui-sounds-toggle');
    if (toggle) {
        toggle.checked = musicPlayerState.uiSoundsEnabled;
    }
}
function formatTrackDuration(seconds) {
    // ... (remains the same)
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

// --- YouTube API Logic (for main player in this tab) ---
function ensureYouTubeApiLoadedForMusicTab() {
    if (typeof YT === 'undefined' || typeof YT.Player === 'undefined') {
        if (!youtubeApiLoadInitiatedForMusicTab) {
            console.log("Music Player Tab: Initiating YouTube API load.");
            youtubeApiLoadInitiatedForMusicTab = true;
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            if (firstScriptTag && firstScriptTag.parentNode) {
                 firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
            } else {
                 document.head.appendChild(tag);
            }
            // This global `onYouTubeIframeAPIReady` will be called once API loads.
            // It should handle initializing players for both main tab and mini-player if needed.
            window.onYouTubeIframeAPIReady = () => {
                console.log("Global onYouTubeIframeAPIReady called.");
                isYouTubeApiReadyForMusicTab = true; // Global flag
                youtubeApiLoadInitiatedForMusicTab = false;
                
                // Try to init main player if a YT track is current and music tab is potentially open
                if (musicPlayerState.currentTrack && (musicPlayerState.currentTrack.source === 'youtube' || musicPlayerState.currentTrack.source === 'youtubeMusic') && document.getElementById(MAIN_PLAYER_YT_ELEMENT_ID)) {
                    if (!mainYouTubePlayerInstance) createMainYouTubePlayerForTab(musicPlayerState.currentTrack.videoId);
                }
                // Try to init mini-player instance if needed
                if (musicPlayerState.showMiniPlayer && musicPlayerState.currentTrack && (musicPlayerState.currentTrack.source === 'youtube' || musicPlayerState.currentTrack.source === 'youtubeMusic')) {
                    if (!musicPlayerState.miniPlayerYouTubeInstance) createMiniYouTubePlayer(musicPlayerState.currentTrack.videoId);
                }
                 // Process any queued player initializations (e.g., from ui_course_study_material)
                if (typeof window.processYouTubeApiQueue === 'function') {
                    window.processYouTubeApiQueue();
                }
            };
        }
    } else if (!isYouTubeApiReadyForMusicTab) {
        isYouTubeApiReadyForMusicTab = true;
        console.log("Music Player Tab: YouTube API was already available.");
        // If API was already loaded but this flag wasn't set, try to initialize relevant players.
        if (musicPlayerState.currentTrack && (musicPlayerState.currentTrack.source === 'youtube' || musicPlayerState.currentTrack.source === 'youtubeMusic') && document.getElementById(MAIN_PLAYER_YT_ELEMENT_ID)) {
            if (!mainYouTubePlayerInstance) createMainYouTubePlayerForTab(musicPlayerState.currentTrack.videoId);
        }
        if (musicPlayerState.showMiniPlayer && musicPlayerState.currentTrack && (musicPlayerState.currentTrack.source === 'youtube' || musicPlayerState.currentTrack.source === 'youtubeMusic')) {
            if (!musicPlayerState.miniPlayerYouTubeInstance) createMiniYouTubePlayer(musicPlayerState.currentTrack.videoId);
        }
    }
}

function createMainYouTubePlayerForTab(videoId) {
    if (!isYouTubeApiReadyForMusicTab) {
        console.warn("Main YT Player: API not ready. Queuing or will be handled by global ready.");
        ensureYouTubeApiLoadedForMusicTab();
        return;
    }
    if (mainYouTubePlayerInstance && typeof mainYouTubePlayerInstance.destroy === 'function') {
        try { mainYouTubePlayerInstance.destroy(); } catch(e) {console.error("Err destroy main YT:", e);}
    }
    if (mainPlayerYouTubeStateInterval) clearInterval(mainPlayerYouTubeStateInterval);

    const playerContainer = document.getElementById(MAIN_PLAYER_YT_ELEMENT_ID);
    if (!playerContainer) {
        console.error(`Main YT Player container #${MAIN_PLAYER_YT_ELEMENT_ID} not found.`);
        return;
    }
    playerContainer.innerHTML = ''; // Clear placeholder

    console.log(`Creating Main Tab YouTube player for video ID: ${videoId}`);
    mainYouTubePlayerInstance = new YT.Player(MAIN_PLAYER_YT_ELEMENT_ID, {
        height: '100%', width: '100%', videoId: videoId,
        playerVars: { 'playsinline': 1, 'autoplay': musicPlayerState.isPlaying ? 1 : 0, 'controls': 0, 'rel': 0, 'modestbranding': 1, 'iv_load_policy': 3 },
        events: {
            'onReady': onMainYouTubePlayerReady,
            'onStateChange': onMainYouTubePlayerStateChange,
            'onError': onMainYouTubePlayerError
        }
    });
    window.mainYouTubePlayer = mainYouTubePlayerInstance; // Update global reference
}

function onMainYouTubePlayerReady(event) {
    console.log("Main Tab YouTube Player Ready. Video ID:", musicPlayerState.currentTrack?.videoId);
    if (musicPlayerState.isPlaying && event.target.getPlayerState() !== YT.PlayerState.PLAYING) {
        event.target.playVideo();
    }
    event.target.setVolume(musicPlayerState.volume * 100);
    if (mainPlayerYouTubeStateInterval) clearInterval(mainPlayerYouTubeStateInterval);
    mainPlayerYouTubeStateInterval = setInterval(syncMainYouTubePlayerState, 1000);
    syncMainYouTubePlayerState(); // Initial sync
}

function onMainYouTubePlayerStateChange(event) {
    console.log("Main Tab YouTube Player State Change:", event.data);
    if (event.data === YT.PlayerState.PLAYING) {
        if (!musicPlayerState.isPlaying) setMusicPlayerState({ isPlaying: true });
        setMusicPlayerState({miniPlayerVideoActive: false}); // Main player takes precedence over mini YT
        if (musicPlayerState.miniPlayerYouTubeInstance) {
            try { musicPlayerState.miniPlayerYouTubeInstance.stopVideo(); } catch(e){} // Stop mini player
        }
        if (!mainPlayerYouTubeStateInterval) {
            mainPlayerYouTubeStateInterval = setInterval(syncMainYouTubePlayerState, 1000);
        }
    } else if (event.data === YT.PlayerState.PAUSED) {
        if (musicPlayerState.isPlaying) setMusicPlayerState({ isPlaying: false });
    } else if (event.data === YT.PlayerState.ENDED) {
        if (musicPlayerState.isPlaying) setMusicPlayerState({ isPlaying: false, currentTime: 0 });
        window.musicPlayerActions.handleTrackEnd();
    } else if (event.data === YT.PlayerState.CUED || event.data === YT.PlayerState.BUFFERING) {
        syncMainYouTubePlayerState();
    }
    updateAllPlayerUIs();
}

function onMainYouTubePlayerError(event) {
    console.error("Main Tab YouTube Player Error:", event.data, "for video:", musicPlayerState.currentTrack?.videoId);
    alert(`Error playing YouTube video in main player (Code: ${event.data}).`);
    stopCurrentMusic();
    setMusicPlayerState({ currentTrack: null, isPlaying: false });
    updateAllPlayerUIs();
}

function syncMainYouTubePlayerState() {
    if (mainYouTubePlayerInstance && typeof mainYouTubePlayerInstance.getCurrentTime === 'function' && typeof mainYouTubePlayerInstance.getDuration === 'function') {
        const currentTime = mainYouTubePlayerInstance.getCurrentTime();
        const duration = mainYouTubePlayerInstance.getDuration();
        if (musicPlayerState.currentTrack && (musicPlayerState.currentTrack.source === 'youtube' || musicPlayerState.currentTrack.source === 'youtubeMusic')) {
            let trackChanged = false;
            if(musicPlayerState.currentTrack.duration !== duration && duration > 0) {
                const newTrackData = {...musicPlayerState.currentTrack, duration: duration};
                setMusicPlayerState({currentTime: currentTime, currentTrack: newTrackData});
                trackChanged = true;
            } else {
                 setMusicPlayerState({ currentTime: currentTime });
            }
            if(trackChanged) updateAllPlayerUIs(); else {
                updateMiniPlayerTimes(currentTime, duration); // Still update mini-player display if it's showing this track
                const progressSlider = document.getElementById('player-progress-slider');
                const currentTimeEl = document.getElementById('player-current-time');
                const durationEl = document.getElementById('player-duration');
                if(progressSlider && currentTimeEl && durationEl && duration > 0){
                    progressSlider.max = duration;
                    progressSlider.value = currentTime;
                    currentTimeEl.textContent = formatTrackDuration(currentTime);
                    durationEl.textContent = formatTrackDuration(duration);
                }
            }
        }
    }
}

// --- Mini Player YouTube Instance Logic ---
let miniYouTubePlayerStateInterval = null;

function createMiniYouTubePlayer(videoId) {
    if (!isYouTubeApiReadyForMusicTab) { // Use the same global API ready flag
        console.warn("Mini YT Player: API not ready. Will be handled by global ready.");
        ensureYouTubeApiLoadedForMusicTab();
        return;
    }
    if (musicPlayerState.miniPlayerYouTubeInstance && typeof musicPlayerState.miniPlayerYouTubeInstance.destroy === 'function') {
        try { musicPlayerState.miniPlayerYouTubeInstance.destroy(); } catch(e){}
    }
    if (miniYouTubePlayerStateInterval) clearInterval(miniYouTubePlayerStateInterval);

    const playerContainer = document.getElementById(MINI_PLAYER_YT_ELEMENT_ID);
    if (!playerContainer) {
        console.error(`Mini YT Player container #${MINI_PLAYER_YT_ELEMENT_ID} not found.`);
        return;
    }
    playerContainer.innerHTML = '';

    console.log(`Creating Mini YouTube player for video ID: ${videoId}`);
    const miniPlayerInstance = new YT.Player(MINI_PLAYER_YT_ELEMENT_ID, {
        height: '100%', width: '100%', videoId: videoId,
        playerVars: { 'playsinline': 1, 'autoplay': musicPlayerState.isPlaying ? 1 : 0, 'controls': 0, 'rel': 0, 'modestbranding': 1, 'iv_load_policy': 3, 'fs':0 /* Disable fullscreen */ },
        events: {
            'onReady': onMiniYouTubePlayerReady,
            'onStateChange': onMiniYouTubePlayerStateChange,
            'onError': onMiniYouTubePlayerError
        }
    });
    setMusicPlayerState({miniPlayerYouTubeInstance: miniPlayerInstance, miniPlayerVideoActive: true});
}

function onMiniYouTubePlayerReady(event) {
    console.log("Mini YouTube Player Ready. Video ID:", musicPlayerState.currentTrack?.videoId);
    if (musicPlayerState.isPlaying && event.target.getPlayerState() !== YT.PlayerState.PLAYING) {
        event.target.playVideo();
    }
    event.target.setVolume(musicPlayerState.volume * 100); // Sync volume
    if (miniYouTubePlayerStateInterval) clearInterval(miniYouTubePlayerStateInterval);
    miniYouTubePlayerStateInterval = setInterval(syncMiniYouTubePlayerState, 1000);
    syncMiniYouTubePlayerState();
}

function onMiniYouTubePlayerStateChange(event) {
    console.log("Mini YouTube Player State Change:", event.data);
     if (event.data === YT.PlayerState.PLAYING) {
        if (!musicPlayerState.isPlaying) setMusicPlayerState({ isPlaying: true });
        setMusicPlayerState({miniPlayerVideoActive: true}); // This player is now the active video source
        // If main tab player was playing YT, pause it
        if (mainYouTubePlayerInstance && typeof mainYouTubePlayerInstance.pauseVideo === 'function' && mainYouTubePlayerInstance.getPlayerState() === YT.PlayerState.PLAYING) {
            mainYouTubePlayerInstance.pauseVideo();
        }
        if (!miniYouTubePlayerStateInterval) {
            miniYouTubePlayerStateInterval = setInterval(syncMiniYouTubePlayerState, 1000);
        }
    } else if (event.data === YT.PlayerState.PAUSED) {
        if (musicPlayerState.isPlaying) setMusicPlayerState({ isPlaying: false });
    } else if (event.data === YT.PlayerState.ENDED) {
        if (musicPlayerState.isPlaying) setMusicPlayerState({ isPlaying: false, currentTime: 0 });
        setMusicPlayerState({miniPlayerVideoActive: false});
        window.musicPlayerActions.handleTrackEnd();
    } else if (event.data === YT.PlayerState.CUED || event.data === YT.PlayerState.BUFFERING) {
         syncMiniYouTubePlayerState();
    }
    updateAllPlayerUIs();
}

function onMiniYouTubePlayerError(event) {
    console.error("Mini YouTube Player Error:", event.data, "for video:", musicPlayerState.currentTrack?.videoId);
    // No alert, just log and stop.
    stopCurrentMusic();
    setMusicPlayerState({ currentTrack: null, isPlaying: false, miniPlayerVideoActive: false });
    updateAllPlayerUIs();
}

function syncMiniYouTubePlayerState() {
    const miniPlayer = musicPlayerState.miniPlayerYouTubeInstance;
    if (miniPlayer && typeof miniPlayer.getCurrentTime === 'function' && typeof miniPlayer.getDuration === 'function') {
        const currentTime = miniPlayer.getCurrentTime();
        const duration = miniPlayer.getDuration();

        if (musicPlayerState.currentTrack && (musicPlayerState.currentTrack.source === 'youtube' || musicPlayerState.currentTrack.source === 'youtubeMusic') && musicPlayerState.miniPlayerVideoActive) {
            let trackChanged = false;
            if(musicPlayerState.currentTrack.duration !== duration && duration > 0) {
                const newTrackData = {...musicPlayerState.currentTrack, duration: duration};
                setMusicPlayerState({currentTime: currentTime, currentTrack: newTrackData});
                trackChanged = true;
            } else {
                 setMusicPlayerState({ currentTime: currentTime });
            }
            // Update mini player UI specifically
            updateMiniPlayerTimes(currentTime, duration);
            if(trackChanged) updateMiniPlayerUI(); // Full update if track data changed

            // If the main player UI is also visible (music tab open) and showing this track, update its progress too
            const mainProgressSlider = document.getElementById('player-progress-slider');
            const mainCurrentTimeEl = document.getElementById('player-current-time');
            const mainDurationEl = document.getElementById('player-duration');
            if(mainProgressSlider && mainCurrentTimeEl && mainDurationEl && duration > 0 && !document.getElementById(MAIN_PLAYER_YT_ELEMENT_ID)?.classList.contains('hidden')){
                mainProgressSlider.max = duration;
                mainProgressSlider.value = currentTime;
                mainCurrentTimeEl.textContent = formatTrackDuration(currentTime);
                mainDurationEl.textContent = formatTrackDuration(duration);
            }
        }
    }
}

// --- User Saved Playlists (localStorage) ---
const SAVED_PLAYLISTS_STORAGE_KEY = 'lyceumUserSavedPlaylists';

function loadUserSavedPlaylistsFromStorage() {
    try {
        const storedPlaylists = localStorage.getItem(SAVED_PLAYLISTS_STORAGE_KEY);
        if (storedPlaylists) {
            setMusicPlayerState({ userSavedPlaylists: JSON.parse(storedPlaylists) });
        } else {
            setMusicPlayerState({ userSavedPlaylists: [] });
        }
    } catch (e) {
        console.error("Error loading saved playlists from localStorage:", e);
        setMusicPlayerState({ userSavedPlaylists: [] });
    }
}

function saveUserPlaylistsToStorage() {
    try {
        localStorage.setItem(SAVED_PLAYLISTS_STORAGE_KEY, JSON.stringify(musicPlayerState.userSavedPlaylists));
    } catch (e) {
        console.error("Error saving playlists to localStorage:", e);
        alert("Could not save playlist data. Local storage might be full or disabled.");
    }
}

function updateUserSavedPlaylistsUI() {
    const container = document.getElementById('user-saved-playlists-display');
    if (!container) return;

    let itemsHtml = musicPlayerState.userSavedPlaylists.map((playlist, index) => `
        <div class="playlist-item-saved flex justify-between items-center p-2 border-b dark:border-gray-700 last:border-b-0">
            <span class="font-medium text-sm truncate flex-grow" title="${escapeHtml(playlist.name)}">${escapeHtml(playlist.name)} (${playlist.tracks.length} tracks)</span>
            <div class="flex-shrink-0 flex gap-1">
                <button onclick="window.musicPlayerActions.loadSavedPlaylist(${index})" class="btn-secondary-small text-xs" title="Load this playlist">Load</button>
                <button onclick="window.musicPlayerActions.deleteSavedPlaylist(${index})" class="btn-danger-small text-xs" title="Delete this saved playlist">Del</button>
            </div>
        </div>
    `).join('');
    container.innerHTML = itemsHtml || '<p class="text-muted text-xs text-center py-4">No playlists saved yet.</p>';
}


// --- Public Actions Object (window.musicPlayerActions) ---
window.musicPlayerActions = {
    // ... (All existing actions: selectSource, playAmbient, stopAmbient, setAmbientVolume, playStudyMusic, playBinauralBeat,
    //      togglePlayPause, nextTrack, prevTrack, playTrackFromPlaylist, toggleShuffle, toggleRepeat, setVolume, seek,
    //      toggleMiniPlayer, setUiSoundsEnabled, handleTrackEnd) ...
    // Ensure all these methods are correctly defined within the new structure.

    selectSource: (sourceType) => { /* ... as before ... */
        console.log("Selected source:", sourceType);
        if (sourceType === 'youtubeMusic') {
            setMusicPlayerState({ linkedServices: { ...musicPlayerState.linkedServices, youtubeMusic: { linked: true, playlists: [] }} });
            updateMainPlayerUI();
            const url = prompt("Enter a YouTube video or playlist URL to play/add to current playlist:");
            if (url) window.musicPlayerActions.loadYouTubeUrl(url);
        } else if (sourceType === 'spotify') {
            alert("Spotify integration is a placeholder.");
        }
    },

    loadYouTubeUrl: async (url) => {
        if (!url) return;
        // If this is the first YT item or if not adding to playlist, stop other music.
        if (musicPlayerState.currentPlaylist.length === 0 || !confirm("Add to current playlist? (Cancel to replace current playlist)")) {
            stopCurrentMusic();
        }
        showLoading("Loading YouTube content...");
        try {
            let newTracks = [];
            let playlistName = "YouTube Content";

            if (url.includes("list=")) {
                const playlistId = new URL(url).searchParams.get("list");
                if (!playlistId) throw new Error("Invalid YouTube playlist URL.");

                playlistName = `YT Playlist (${playlistId.substring(0, 6)}...)`; // Placeholder name
                let nextPageToken = null;
                let fetchedItemsCount = 0;

                if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === "YOUR_API_KEY_HERE" || YOUTUBE_API_KEY.startsWith("AIzaSyB8v1IX")) {
                     alert("YouTube Data API Key not configured correctly. Cannot fetch full playlist details or video names. Limited functionality.");
                     // Attempt to extract a single video ID if playlist fetching is not possible
                     const videoIdMatchSimple = url.match(/(?:v=|youtu\.be\/|\/embed\/|\/shorts\/)([a-zA-Z0-9_-]{11})/);
                     if (videoIdMatchSimple && videoIdMatchSimple[1]) {
                         newTracks.push({
                             id: videoIdMatchSimple[1], videoId: videoIdMatchSimple[1], title: `YT Video (ID: ${videoIdMatchSimple[1]})`,
                             artist: 'YouTube', albumArtUrl: `https://i.ytimg.com/vi/${videoIdMatchSimple[1]}/mqdefault.jpg`,
                             source: 'youtube', duration: 0
                         });
                         playlistName = `YT Video (ID: ${videoIdMatchSimple[1]})`;
                     } else {
                         throw new Error("YouTube Data API Key needed for playlists. Could not extract a single video ID either.");
                     }
                } else {
                    do {
                        const playlistApiUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${YOUTUBE_API_KEY}${nextPageToken ? '&pageToken=' + nextPageToken : ''}`;
                        const response = await fetch(playlistApiUrl);
                        if (!response.ok) {
                            const errorData = await response.json();
                            console.error("YouTube API Error (playlistItems):", errorData);
                            throw new Error(`YouTube API error: ${response.status} - ${errorData.error?.message || 'Failed to fetch playlist items.'}`);
                        }
                        const data = await response.json();

                        if (data.items) {
                            fetchedItemsCount += data.items.length;
                            // Get playlist title from the first successful playlistItems response if available
                            if (fetchedItemsCount === data.items.length && data.items[0]?.snippet?.playlistId) {
                                try {
                                    const playlistDetailsUrl = `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${data.items[0].snippet.playlistId}&key=${YOUTUBE_API_KEY}`;
                                    const plResp = await fetch(playlistDetailsUrl);
                                    if(plResp.ok) {
                                        const plData = await plResp.json();
                                        if(plData.items?.[0]?.snippet?.title) playlistName = plData.items[0].snippet.title;
                                    }
                                } catch (e) { console.warn("Could not fetch playlist title, using default.", e); }
                            }

                            newTracks.push(...data.items.map(item => ({
                                id: item.snippet.resourceId.videoId,
                                videoId: item.snippet.resourceId.videoId,
                                title: item.snippet.title || `Video ${item.snippet.resourceId.videoId}`,
                                artist: item.snippet.videoOwnerChannelTitle || 'YouTube',
                                albumArtUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || './assets/images/branding/default-album-art.png',
                                source: 'youtubeMusic', // Mark as from YouTube Music
                                duration: 0 // Will be fetched by player
                            })));
                        }
                        nextPageToken = data.nextPageToken;
                    } while (nextPageToken && fetchedItemsCount < 200); // Limit playlist size
                }
            } else { // Single video URL
                const videoIdMatch = url.match(/(?:v=|youtu\.be\/|\/embed\/|\/shorts\/)([a-zA-Z0-9_-]{11})/);
                if (!videoIdMatch || !videoIdMatch[1]) throw new Error("Invalid YouTube video URL.");
                const videoId = videoIdMatch[1];
                let videoTitle = `YouTube Video (${videoId})`;
                let videoArtist = 'YouTube';
                let videoAlbumArt = `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;

                if (YOUTUBE_API_KEY && YOUTUBE_API_KEY !== "YOUR_API_KEY_HERE" && !YOUTUBE_API_KEY.startsWith("AIzaSyB8v1IX")) {
                    try {
                        const videoDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`;
                        const response = await fetch(videoDetailsUrl);
                        if (response.ok) {
                            const data = await response.json();
                            if (data.items && data.items.length > 0) {
                                videoTitle = data.items[0].snippet.title;
                                videoArtist = data.items[0].snippet.channelTitle || 'YouTube';
                                videoAlbumArt = data.items[0].snippet.thumbnails?.medium?.url || data.items[0].snippet.thumbnails?.default?.url || videoAlbumArt;
                            }
                        } else { console.warn("Failed to fetch video details for title/artist.");}
                    } catch (e) { console.warn("Error fetching video details:", e); }
                }
                newTracks.push({
                    id: videoId, videoId: videoId, title: videoTitle, artist: videoArtist,
                    albumArtUrl: videoAlbumArt, source: 'youtubeMusic', duration: 0
                });
                playlistName = videoTitle;
            }

            if (newTracks.length > 0) {
                const shouldReplace = musicPlayerState.currentPlaylist.length === 0 || !confirm("Add to current playlist? (Cancel to replace current playlist)");
                const finalPlaylist = shouldReplace ? newTracks : [...musicPlayerState.currentPlaylist, ...newTracks];
                const finalPlaylistName = shouldReplace ? playlistName : musicPlayerState.currentPlaylistName || playlistName;

                setMusicPlayerState({ currentPlaylist: finalPlaylist, currentPlaylistName: finalPlaylistName });

                if (shouldReplace || !musicPlayerState.currentTrack) { // If replacing or no track was playing
                    musicPlayerActions.playTrackFromPlaylist(shouldReplace ? 0 : musicPlayerState.currentPlaylist.length); // Play first of new or last of old+new
                }
            } else {
                alert("Could not load any videos from the provided URL.");
            }

        } catch (error) {
            console.error("Error loading YouTube content:", error);
            alert(`Failed to load YouTube content: ${error.message}`);
        } finally {
            hideLoading();
            updateAllPlayerUIs();
        }
    },

    playAmbient: (soundId) => { /* ... as before ... */
        const sound = AMBIENT_SOUNDS_LIBRARY.find(s => s.id === soundId);
        if (sound) {
            playAmbientSound(sound); // audio_service handles state update for ambient
            updateAllPlayerUIs(); // Reflect changes
        }
    },
    stopAmbient: () => { /* ... as before ... */
        stopAmbientSound();
        updateAllPlayerUIs();
    },
    setAmbientVolume: (volume) => { /* ... as before ... */
        setAmbientVolume(volume);
        // The slider itself will visually update. state.js handles saving preference.
        localStorage.setItem('lyceumAmbientVolume', volume.toString());
    },

    playStudyMusic: (trackId) => { /* ... Modified for correct source ... */
        const track = STUDY_MUSIC_LIBRARY.find(t => t.id === trackId);
        if (track) {
            stopAmbientSound();
            const trackDataForPlayer = { ...track, source: track.type === 'youtube' ? 'youtubeMusic' : 'stream' };
            if (trackDataForPlayer.source === 'youtubeMusic') {
                setMusicPlayerState({ currentTrack: trackDataForPlayer, currentPlaylist: [trackDataForPlayer], currentPlaylistName: track.name, isPlaying: true, showMiniPlayer: true, currentTime: 0 });
                window.musicPlayerActions.playYouTubeVideo(track.videoId); // Use general YT play
            } else { // stream
                playStreamableMusicTrack(trackDataForPlayer).then(() => {
                    setMusicPlayerState({ isPlaying: true, showMiniPlayer: true, currentPlaylist: [trackDataForPlayer], currentPlaylistName: track.name });
                    updateAllPlayerUIs();
                }).catch(err => updateAllPlayerUIs());
            }
            updatePlayableTrackSelectionUI('study');
        }
    },
    playBinauralBeat: (beatId) => { /* ... Modified for correct source ... */
        const beat = BINAURAL_BEATS_LIBRARY.find(b => b.id === beatId);
        if (beat && beat.type === 'stream') {
            stopAmbientSound();
            const beatDataForPlayer = { ...beat, source: 'binaural' };
            playStreamableMusicTrack(beatDataForPlayer).then(() => {
                setMusicPlayerState({ isPlaying: true, showMiniPlayer: true, currentPlaylist: [beatDataForPlayer], currentPlaylistName: beat.name });
                updateAllPlayerUIs();
            }).catch(err => updateAllPlayerUIs());
            updatePlayableTrackSelectionUI('binaural');
        }
    },
    togglePlayPause: () => { /* ... Modified to handle mini-player YT ... */
        const track = musicPlayerState.currentTrack;
        if (!track) return;
        const newIsPlaying = !musicPlayerState.isPlaying;

        if (track.source === 'youtube' || track.source === 'youtubeMusic') {
            const playerToControl = musicPlayerState.miniPlayerVideoActive ? musicPlayerState.miniPlayerYouTubeInstance : mainYouTubePlayerInstance;
            if (playerToControl) {
                newIsPlaying ? playerToControl.playVideo() : playerToControl.pauseVideo();
            } else if (newIsPlaying) { // No player instance, try to create
                if(musicPlayerState.showMiniPlayer) createMiniYouTubePlayer(track.videoId);
                else if(document.getElementById(MAIN_PLAYER_YT_ELEMENT_ID)) createMainYouTubePlayerForTab(track.videoId);
            }
        } else { // Streamable
            newIsPlaying ? resumeStreamableMusic() : pauseStreamableMusic();
        }
        setMusicPlayerState({ isPlaying: newIsPlaying, showMiniPlayer: newIsPlaying ? true : musicPlayerState.showMiniPlayer }); // Show mini if starting play
        updateAllPlayerUIs();
        playUiSound('button_click');
    },
    nextTrack: () => { /* ... as before ... */
        if (musicPlayerState.currentPlaylist.length === 0) return;
        let currentIndex = musicPlayerState.currentPlaylist.findIndex(t => t.id === musicPlayerState.currentTrack?.id);
        if (currentIndex === -1 && musicPlayerState.currentTrack) currentIndex = 0; // If current track not in playlist, start from beginning
        else if (currentIndex === -1) return; // No current track and empty playlist

        let nextIndex;
        if (musicPlayerState.isShuffled) {
            nextIndex = Math.floor(Math.random() * musicPlayerState.currentPlaylist.length);
            if (musicPlayerState.currentPlaylist.length > 1 && nextIndex === currentIndex) {
                nextIndex = (currentIndex + 1) % musicPlayerState.currentPlaylist.length;
            }
        } else {
            nextIndex = (currentIndex + 1) % musicPlayerState.currentPlaylist.length;
        }
        window.musicPlayerActions.playTrackFromPlaylist(nextIndex);
        playUiSound('button_click');
    },
    prevTrack: () => { /* ... as before ... */
        if (musicPlayerState.currentPlaylist.length === 0) return;
        let currentIndex = musicPlayerState.currentPlaylist.findIndex(t => t.id === musicPlayerState.currentTrack?.id);
        if (currentIndex === -1 && musicPlayerState.currentTrack) currentIndex = 0;
        else if (currentIndex === -1) return;
        
        let prevIndex;
        if (musicPlayerState.isShuffled) {
            prevIndex = Math.floor(Math.random() * musicPlayerState.currentPlaylist.length);
             if (musicPlayerState.currentPlaylist.length > 1 && prevIndex === currentIndex) {
                prevIndex = (currentIndex - 1 + musicPlayerState.currentPlaylist.length) % musicPlayerState.currentPlaylist.length;
            }
        } else {
            prevIndex = (currentIndex - 1 + musicPlayerState.currentPlaylist.length) % musicPlayerState.currentPlaylist.length;
        }
        window.musicPlayerActions.playTrackFromPlaylist(prevIndex);
        playUiSound('button_click');
    },
    playTrackFromPlaylist: (index) => { /* ... Modified for mini-player YT ... */
        if (index < 0 || index >= musicPlayerState.currentPlaylist.length) return;
        const trackToPlay = musicPlayerState.currentPlaylist[index];
        
        stopCurrentMusic(); // Stop everything before playing new from playlist

        setMusicPlayerState({ currentTrack: trackToPlay, isPlaying: true, showMiniPlayer: true, currentTime: 0 });

        if (trackToPlay.source === 'youtube' || trackToPlay.source === 'youtubeMusic') {
            window.musicPlayerActions.playYouTubeVideo(trackToPlay.videoId);
        } else if (trackToPlay.source === 'stream' || trackToPlay.source === 'binaural' || trackToPlay.source === 'lofi') {
            playStreamableMusicTrack(trackToPlay).catch(err => {
                updateAllPlayerUIs(); // Ensure UI resets on error
            });
        }
        updateAllPlayerUIs(); // Initial update, stream/YT ready events will refine
    },
    playYouTubeVideo: (videoId) => { // NEW Helper to decide main or mini player
        // If music tab is active, prefer main player. Otherwise, or if main player fails, use mini.
        const musicDashboardVisible = !document.getElementById('music-player-dashboard')?.classList.contains('hidden');
        
        if (musicDashboardVisible && document.getElementById(MAIN_PLAYER_YT_ELEMENT_ID)) {
            console.log("Playing YouTube video in MAIN TAB player:", videoId);
            setMusicPlayerState({ miniPlayerVideoActive: false }); // Main player takes over
            if (musicPlayerState.miniPlayerYouTubeInstance) musicPlayerState.miniPlayerYouTubeInstance.stopVideo();
            
            if (mainYouTubePlayerInstance && typeof mainYouTubePlayerInstance.loadVideoById === 'function') {
                mainYouTubePlayerInstance.loadVideoById(videoId);
                if (musicPlayerState.isPlaying) mainYouTubePlayerInstance.playVideo();
            } else {
                createMainYouTubePlayerForTab(videoId);
            }
        } else { // Music tab not open or main player element missing, use mini-player
            console.log("Playing YouTube video in MINI-PLAYER:", videoId);
            if (mainYouTubePlayerInstance) mainYouTubePlayerInstance.stopVideo(); // Stop main if it was active

            if (musicPlayerState.miniPlayerYouTubeInstance && typeof musicPlayerState.miniPlayerYouTubeInstance.loadVideoById === 'function') {
                musicPlayerState.miniPlayerYouTubeInstance.loadVideoById(videoId);
                if (musicPlayerState.isPlaying) musicPlayerState.miniPlayerYouTubeInstance.playVideo();
                setMusicPlayerState({ miniPlayerVideoActive: true });
            } else {
                createMiniYouTubePlayer(videoId); // This will set miniPlayerVideoActive to true
            }
        }
        updateMiniPlayerVideoContainerVisibility();
        updateMainPlayerUI(); // Update main player's YT container visibility too
    },
    toggleShuffle: () => { /* ... as before ... */
        setMusicPlayerState({ isShuffled: !musicPlayerState.isShuffled });
        updateAllPlayerUIs();
        playUiSound('button_click');
    },
    toggleRepeat: () => { /* ... as before ... */
        let newMode = 'none';
        if (musicPlayerState.repeatMode === 'none') newMode = 'all';
        else if (musicPlayerState.repeatMode === 'all') newMode = 'one';
        setMusicPlayerState({ repeatMode: newMode });

        const streamPlayer = getMusicAudioElement();
        const track = musicPlayerState.currentTrack;
        if (streamPlayer && track && track.source !== 'youtube' && track.source !== 'youtubeMusic') {
            streamPlayer.loop = (newMode === 'one');
        }
        // For YouTube, loop is typically handled by onStateChange ENDED logic.
        // YT.Player has setLoop(true) for whole playlist, not single track easily unless API changes.
        if(mainYouTubePlayerInstance) mainYouTubePlayerInstance.setLoop(newMode === 'all');
        if(musicPlayerState.miniPlayerYouTubeInstance) musicPlayerState.miniPlayerYouTubeInstance.setLoop(newMode ==='all');


        updateAllPlayerUIs();
        playUiSound('button_click');
    },
    setVolume: (volume) => { /* ... Modified to update both slider types ... */
        const newVolume = Math.max(0, Math.min(1, parseFloat(volume)));
        setMusicPlayerState({ volume: newVolume });

        if (mainYouTubePlayerInstance && typeof mainYouTubePlayerInstance.setVolume === 'function') {
            mainYouTubePlayerInstance.setVolume(newVolume * 100);
        }
        if (musicPlayerState.miniPlayerYouTubeInstance && typeof musicPlayerState.miniPlayerYouTubeInstance.setVolume === 'function') {
            musicPlayerState.miniPlayerYouTubeInstance.setVolume(newVolume * 100);
        }
        setStreamableMusicVolume(newVolume);

        const mainVolumeSlider = document.getElementById('player-volume-slider');
        if(mainVolumeSlider) mainVolumeSlider.value = newVolume;
        const studyVolumeSlider = document.getElementById('player-volume-slider-study');
        if(studyVolumeSlider) studyVolumeSlider.value = newVolume;
        localStorage.setItem('lyceumMusicVolume', newVolume.toString());
    },
    seek: (time) => { /* ... Modified for mini-player YT ... */
        const track = musicPlayerState.currentTrack;
        if (!track) return;
        const seekTime = parseFloat(time);

        if (track.source === 'youtube' || track.source === 'youtubeMusic') {
            const playerToControl = musicPlayerState.miniPlayerVideoActive ? musicPlayerState.miniPlayerYouTubeInstance : mainYouTubePlayerInstance;
            if (playerToControl && typeof playerToControl.seekTo === 'function') {
                playerToControl.seekTo(seekTime, true);
            }
        } else { // Streamable
            seekStreamableMusic(seekTime);
        }
        setMusicPlayerState({ currentTime: seekTime });
        updateAllPlayerUIs(); // Refresh UI progress immediately
    },
    toggleMiniPlayer: (show) => { /* ... as before ... */
        const shouldShow = typeof show === 'boolean' ? show : !musicPlayerState.showMiniPlayer;
        setMusicPlayerState({ showMiniPlayer: shouldShow });
        updateMiniPlayerVisibility(); // This handles showing/hiding and content update via updateMiniPlayerUI
        playUiSound('button_click');
        localStorage.setItem('lyceumShowMiniPlayer', shouldShow.toString());
    },
    setUiSoundsEnabled: (enabled) => { /* ... as before ... */
        setMusicPlayerState({ uiSoundsEnabled: enabled });
        localStorage.setItem('lyceumUiSoundsEnabled', enabled.toString());
        updateUiSoundsSettingsUI(); // Update checkbox in Music tab if visible
        playUiSound('button_click');
    },
    handleTrackEnd: () => { /* ... as before ... */
        const currentTrack = musicPlayerState.currentTrack;
        const repeatMode = musicPlayerState.repeatMode;
        const playlist = musicPlayerState.currentPlaylist;
        const isShuffled = musicPlayerState.isShuffled;

        if (!currentTrack) {
            setMusicPlayerState({ isPlaying: false }); updateAllPlayerUIs(); return;
        }

        if (repeatMode === 'one') {
            console.log("Repeating one track:", currentTrack.title);
            window.musicPlayerActions.seek(0); // Restart current track
            // Ensure play is re-triggered if it was a YT video that ended naturally
            if (currentTrack.source === 'youtube' || currentTrack.source === 'youtubeMusic') {
                const playerToControl = musicPlayerState.miniPlayerVideoActive ? musicPlayerState.miniPlayerYouTubeInstance : mainYouTubePlayerInstance;
                if (playerToControl) playerToControl.playVideo();
            } else {
                resumeStreamableMusic();
            }
            // isPlaying should already be true or will be set by playVideo/resume
        } else {
            // If not repeating one, try to play next (handles shuffle and repeatAll implicitly)
            let currentIndex = playlist.findIndex(t => t.id === currentTrack.id);
            if (isShuffled || repeatMode === 'all' || currentIndex < playlist.length - 1) {
                window.musicPlayerActions.nextTrack(); // nextTrack handles shuffle and wrap-around for repeatAll
            } else {
                // Repeat 'none' and end of playlist
                console.log("End of playlist, repeat is off.");
                stopCurrentMusic();
                setMusicPlayerState({ isPlaying: false, currentTrack: null, currentTime: 0 });
                // Optionally, clear playlist or keep it for user to replay
            }
        }
        updateAllPlayerUIs();
    },

    // --- NEW: User Saved Playlist Actions ---
    saveCurrentPlaylist: () => {
        if (musicPlayerState.currentPlaylist.length === 0) {
            alert("Current playlist is empty, nothing to save.");
            return;
        }
        const defaultName = musicPlayerState.currentPlaylistName || `Playlist ${new Date().toLocaleDateString()}`;
        const playlistName = prompt("Enter a name for this playlist:", defaultName);
        if (!playlistName || playlistName.trim() === "") {
            alert("Playlist name cannot be empty.");
            return;
        }
        const newSavedPlaylist = {
            name: playlistName.trim(),
            tracks: [...musicPlayerState.currentPlaylist] // Save a copy
        };
        const updatedSavedPlaylists = [...musicPlayerState.userSavedPlaylists, newSavedPlaylist];
        setMusicPlayerState({ userSavedPlaylists: updatedSavedPlaylists });
        saveUserPlaylistsToStorage();
        updateUserSavedPlaylistsUI();
        alert(`Playlist "${playlistName.trim()}" saved!`);
    },
    loadSavedPlaylist: (index) => {
        if (index < 0 || index >= musicPlayerState.userSavedPlaylists.length) {
            alert("Invalid playlist selected.");
            return;
        }
        const playlistToLoad = musicPlayerState.userSavedPlaylists[index];
        stopCurrentMusic();
        setMusicPlayerState({
            currentPlaylist: [...playlistToLoad.tracks],
            currentPlaylistName: playlistToLoad.name,
            currentTrack: null, // Will be set by playTrackFromPlaylist
            isPlaying: false,
            currentTime: 0
        });
        if (playlistToLoad.tracks.length > 0) {
            window.musicPlayerActions.playTrackFromPlaylist(0); // Start with the first track
        }
        updateAllPlayerUIs();
    },
    deleteSavedPlaylist: (index) => {
        if (index < 0 || index >= musicPlayerState.userSavedPlaylists.length) {
            alert("Invalid playlist to delete.");
            return;
        }
        const playlistName = musicPlayerState.userSavedPlaylists[index].name;
        if (confirm(`Are you sure you want to delete the playlist "${playlistName}"?`)) {
            const updatedSavedPlaylists = musicPlayerState.userSavedPlaylists.filter((_, i) => i !== index);
            setMusicPlayerState({ userSavedPlaylists: updatedSavedPlaylists });
            saveUserPlaylistsToStorage();
            updateUserSavedPlaylistsUI();
            alert(`Playlist "${playlistName}" deleted.`);
        }
    }
};


// Load preferences from localStorage on initial script load
document.addEventListener('DOMContentLoaded', () => {
    const savedVolume = localStorage.getItem('lyceumMusicVolume');
    const savedAmbientVolume = localStorage.getItem('lyceumAmbientVolume');
    const savedUiSoundsEnabled = localStorage.getItem('lyceumUiSoundsEnabled');
    const savedShowMiniPlayer = localStorage.getItem('lyceumShowMiniPlayer');

    let initialMusicState = { ...musicPlayerState }; // Start with defaults

    if (savedVolume !== null) initialMusicState.volume = parseFloat(savedVolume);
    if (savedAmbientVolume !== null) initialMusicState.ambientVolume = parseFloat(savedAmbientVolume);
    if (savedUiSoundsEnabled !== null) initialMusicState.uiSoundsEnabled = savedUiSoundsEnabled === 'true';
    if (savedShowMiniPlayer !== null) initialMusicState.showMiniPlayer = savedShowMiniPlayer === 'true';
    
    setMusicPlayerState(initialMusicState); // Apply loaded settings
    loadUserSavedPlaylistsFromStorage(); // Load saved playlists

    // Initialize players after state is potentially updated from localStorage
    initAudioPlayers();
    if (musicAudioPlayer) musicAudioPlayer.volume = musicPlayerState.volume;
    if (ambientAudioPlayer) ambientAudioPlayer.volume = musicPlayerState.ambientVolume;

    // This will run after the main script.js `DOMContentLoaded` usually
    updateAllPlayerUIs();
    updateMiniPlayerVisibility();
});
// --- END OF MODIFIED FILE ui_music_player.js ---

