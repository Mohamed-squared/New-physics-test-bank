// --- START OF FILE state.js ---

// --- Core Data & State ---
export let auth = null;
export let db = null;

export let data = { subjects: {} };

export let currentUser = null;
export let currentSubject = null;
export let charts = {};
export let currentOnlineTestState = null;

export let globalSubjectDefinitionsMap = new Map();

import { ADMIN_UID, DEFAULT_PRIMARY_AI_MODEL, DEFAULT_FALLBACK_AI_MODEL, FALLBACK_EXAM_CONFIG,
         // --- START MODIFIED ---
         DEFAULT_UI_SOUNDS_ENABLED, DEFAULT_AMBIENT_SOUND_VOLUME, DEFAULT_MUSIC_VOLUME
         // --- END MODIFIED ---
       } from './config.js';
import {DEFAULT_AI_SYSTEM_PROMPTS} from './ai_prompts.js'

export let userCourseProgressMap = new Map();
export let globalCourseDataMap = new Map();
export let activeCourseId = null;

export let videoDurationMap = {};

export let userAiChatSettings = {
    primaryModel: DEFAULT_PRIMARY_AI_MODEL,
    fallbackModel: DEFAULT_FALLBACK_AI_MODEL,
    customSystemPrompts: {}
};
export let globalAiSystemPrompts = {};

export let courseExamDefaults = null;

// --- START MODIFIED: Updated musicPlayerState ---
export let musicPlayerState = {
    currentTrack: null,          // { id, title, artist, albumArtUrl, url, videoId, source ('stream', 'youtubeMusic', 'lofi', 'binaural'), duration }
    currentPlaylist: [],
    currentPlaylistName: null,
    isPlaying: false,
    volume: DEFAULT_MUSIC_VOLUME,         // Main music volume (0.0 to 1.0)
    isShuffled: false,
    repeatMode: 'none',          // 'none', 'all', 'one'
    currentTime: 0,              // Current playback time in seconds
    showMiniPlayer: false,       // Whether the floatie mini-player is visible
    miniPlayerVideoActive: false, // True if a YouTube video is actively playing in the *mini-player* specifically
    miniPlayerYouTubeInstance: null, // Holds the YT.Player instance for the mini-player
    linkedServices: {
        spotify: { linked: false, playlists: [] }, // Placeholder
        youtubeMusic: { linked: false, playlists: [] }, // Placeholder
    },
    currentAmbientSound: null,   // { id, name, url }
    ambientVolume: DEFAULT_AMBIENT_SOUND_VOLUME, // Ambient sound volume (0.0 to 1.0)
    isAmbientPlaying: false,
    uiSoundsEnabled: DEFAULT_UI_SOUNDS_ENABLED,
    userSavedPlaylists: [],      // Array of { name: string, tracks: Array<TrackObject> }
};
// --- END MODIFIED ---

// --- State Modifiers ---
export function setAuth(newAuth) {
    auth = newAuth;
}
export function setDb(newDb) {
    db = newDb;
}

export function setData(newData) {
    data = newData;
}

export function setCurrentUser(newUser) {
    if (newUser) {
        if (!newUser.uid) {
            console.error("setCurrentUser validation failed: Attempted to set user with missing UID. Aborting state update.", newUser);
            return;
        }
        let determinedIsAdmin = false;
        if (typeof newUser.isAdmin === 'boolean') {
            determinedIsAdmin = (newUser.uid === ADMIN_UID) || newUser.isAdmin;
        } else {
            determinedIsAdmin = (newUser.uid === ADMIN_UID);
        }
        currentUser = {
            ...newUser,
            isAdmin: determinedIsAdmin,
            username: newUser.username || null,
            displayName: newUser.displayName || newUser.email?.split('@')[0] || 'User',
            photoURL: newUser.photoURL || null,
            credits: newUser.credits !== undefined ? Number(newUser.credits) : 0,
        };
        console.log("[State] Current user set:", { uid: currentUser.uid, email: currentUser.email, displayName: currentUser.displayName, username: currentUser.username, photoURL: currentUser.photoURL, isAdmin: currentUser.isAdmin, credits: currentUser.credits });
    } else {
        currentUser = null;
        console.log("[State] Current user cleared (logged out).");
    }
}
export function setCurrentSubject(newSubject) {
    currentSubject = newSubject;
}
export function setCharts(newCharts) {
    charts = newCharts;
}
export function setCurrentOnlineTestState(newState) {
    currentOnlineTestState = newState;
}

export function setGlobalSubjectDefinitionsMap(newMap) {
    globalSubjectDefinitionsMap = newMap;
    console.log("[State] Global Subject Definitions Map updated:", globalSubjectDefinitionsMap);
}
export function updateGlobalSubjectDefinition(subjectId, subjectDef) {
    globalSubjectDefinitionsMap.set(subjectId, subjectDef);
}

export function setUserCourseProgressMap(newMap) {
    userCourseProgressMap = newMap;
}
export function setGlobalCourseDataMap(newMap) {
    globalCourseDataMap = newMap;
}
export function setActiveCourseId(newId) {
    activeCourseId = newId;
}
export function updateUserCourseProgress(courseId, progressData) {
    if (userCourseProgressMap.has(courseId)) {
        const existingProgress = userCourseProgressMap.get(courseId);
        const updatedProgress = { ...existingProgress, ...progressData };
        
        if (progressData.dailyProgress && existingProgress.dailyProgress) {
            updatedProgress.dailyProgress = { ...existingProgress.dailyProgress, ...progressData.dailyProgress };
        }
        if (progressData.watchedVideoDurations && existingProgress.watchedVideoDurations) {
            updatedProgress.watchedVideoDurations = { ...existingProgress.watchedVideoDurations, ...progressData.watchedVideoDurations };
        }
         if (progressData.pdfProgress && existingProgress.pdfProgress) {
            updatedProgress.pdfProgress = { ...existingProgress.pdfProgress, ...progressData.pdfProgress };
        }
        userCourseProgressMap.set(courseId, updatedProgress);
        // console.log(`[State] Updated progress for course ${courseId} in local map.`); // Too noisy
    } else {
        userCourseProgressMap.set(courseId, progressData);
        console.log(`[State] Set new progress for course ${courseId} in local map.`);
    }
}
export function updateGlobalCourseData(courseId, courseData) {
     globalCourseDataMap.set(courseId, courseData);
}

export function setUserAiChatSettings(settings) {
    if (settings && typeof settings.primaryModel === 'string' &&
        typeof settings.fallbackModel === 'string' &&
        typeof settings.customSystemPrompts === 'object') {
        userAiChatSettings = settings;
        console.log("[State] User AI Chat Settings updated:", userAiChatSettings);
    } else {
        console.warn("[State] Attempted to set invalid User AI Chat Settings. Using defaults.", settings);
        userAiChatSettings = {
            primaryModel: DEFAULT_PRIMARY_AI_MODEL,
            fallbackModel: DEFAULT_FALLBACK_AI_MODEL,
            customSystemPrompts: {}
        };
    }
}
export function setGlobalAiSystemPrompts(prompts) {
    if (prompts && typeof prompts === 'object') {
        globalAiSystemPrompts = prompts;
        console.log("[State] Global AI System Prompts updated:", globalAiSystemPrompts);
    } else {
        console.warn("[State] Attempted to set invalid Global AI System Prompts. Using empty object.", prompts);
        globalAiSystemPrompts = {};
    }
}

export function setCourseExamDefaults(newDefaults) {
    if (newDefaults && typeof newDefaults === 'object') {
        courseExamDefaults = newDefaults;
        console.log("[State] Course Exam Defaults set:", courseExamDefaults);
    } else {
        console.warn("[State] Attempted to set invalid Course Exam Defaults. Using fallback.", newDefaults);
        courseExamDefaults = { ...FALLBACK_EXAM_CONFIG };
    }
}

// --- START MODIFIED: Refined setMusicPlayerState logic ---
export function setMusicPlayerState(newState) {
    const oldState = { ...musicPlayerState }; // Capture old state for comparison
    musicPlayerState = { ...musicPlayerState, ...newState };
    
    // If currentTrack changed, handle YouTube player logic
    if (newState.currentTrack && (oldState.currentTrack?.id !== newState.currentTrack.id || oldState.currentTrack?.source !== newState.currentTrack.source)) {
        const isYouTubeTrack = newState.currentTrack.source === 'youtube' || newState.currentTrack.source === 'youtubeMusic';
        const musicTabPlayerElement = document.getElementById('youtube-player-main'); // Element in Music & Sounds tab

        if (isYouTubeTrack) {
            // Decide which player to use/create
            // If music tab is visible and its player element exists, prefer it. Otherwise, use mini-player.
            if (musicTabPlayerElement && !musicTabPlayerElement.closest('#music-player-dashboard.hidden')) {
                // Music tab is active
                console.log("[State Setter] New YouTube track, Music Tab active. Using main player.");
                if (typeof window.musicPlayerActions?.playYouTubeVideo === 'function') {
                    window.musicPlayerActions.playYouTubeVideo(newState.currentTrack.videoId); // This will handle main/mini logic
                } else {
                    console.warn("[State Setter] musicPlayerActions.playYouTubeVideo not available for main player.");
                }
            } else {
                // Music tab not active or main player element not found, use mini-player
                console.log("[State Setter] New YouTube track, Music Tab INACTIVE. Using mini-player.");
                 if (typeof window.musicPlayerActions?.playYouTubeVideo === 'function') { // Ensure it's available
                    window.musicPlayerActions.playYouTubeVideo(newState.currentTrack.videoId); // This will handle main/mini logic
                } else {
                    console.warn("[State Setter] musicPlayerActions.playYouTubeVideo not available for mini player.");
                }
            }
        } else {
            // Not a YouTube track, ensure YouTube players are stopped/hidden
            if (window.mainYouTubePlayer && typeof window.mainYouTubePlayer.stopVideo === 'function') window.mainYouTubePlayer.stopVideo();
            if (musicPlayerState.miniPlayerYouTubeInstance && typeof musicPlayerState.miniPlayerYouTubeInstance.stopVideo === 'function') musicPlayerState.miniPlayerYouTubeInstance.stopVideo();
            musicPlayerState.miniPlayerVideoActive = false; // Ensure this is reset
        }
    }

    // Always call UI updaters which will check current state
    if (typeof window.updateAllPlayerUIs === 'function') {
        window.updateAllPlayerUIs();
    }
    if (typeof window.updateMiniPlayerVisibility === 'function') {
        window.updateMiniPlayerVisibility();
    }
    // console.log("[State] Music player state updated:", musicPlayerState); // Can be noisy
}
// --- END MODIFIED ---

export function clearUserSession() {
    setCurrentSubject(null);
    setData({ subjects: {} });
    setCurrentOnlineTestState(null);
    setCharts({});
    setUserCourseProgressMap(new Map());
    setActiveCourseId(null);
    videoDurationMap = {};
    setUserAiChatSettings({
        primaryModel: DEFAULT_PRIMARY_AI_MODEL,
        fallbackModel: DEFAULT_FALLBACK_AI_MODEL,
        customSystemPrompts: {}
    });
    // --- START MODIFIED: Enhanced music state clearing ---
    const persistentVolume = musicPlayerState.volume;
    const persistentAmbientVolume = musicPlayerState.ambientVolume;
    const persistentUiSoundsEnabled = musicPlayerState.uiSoundsEnabled;
    const persistentShowMiniPlayer = musicPlayerState.showMiniPlayer;
    const persistentSavedPlaylists = musicPlayerState.userSavedPlaylists; // Keep user's saved playlists

    setMusicPlayerState({
        currentTrack: null,
        currentPlaylist: [],
        currentPlaylistName: null,
        isPlaying: false,
        volume: persistentVolume, // Keep user's volume preference
        isShuffled: false,
        repeatMode: 'none',
        currentTime: 0,
        showMiniPlayer: persistentShowMiniPlayer, // Persist mini-player visibility preference
        miniPlayerVideoActive: false,
        miniPlayerYouTubeInstance: null, // Will be destroyed by destroyYouTubePlayers
        linkedServices: {
            spotify: { linked: false, playlists: [] },
            youtubeMusic: { linked: false, playlists: [] },
        },
        currentAmbientSound: null,
        ambientVolume: persistentAmbientVolume, // Keep user's ambient volume preference
        isAmbientPlaying: false,
        uiSoundsEnabled: persistentUiSoundsEnabled, // Persist UI sounds preference
        userSavedPlaylists: persistentSavedPlaylists, // Restore saved playlists
    });
    // Stop any playing audio from HTML5 audio elements
    if (typeof window.stopAmbientSound === 'function') window.stopAmbientSound();
    if (typeof window.stopStreamableMusic === 'function') window.stopStreamableMusic();
    // Destroy YouTube player instances
    if (typeof window.destroyYouTubePlayers === 'function') window.destroyYouTubePlayers();
    // --- END MODIFIED ---

    document.getElementById('content')?.replaceChildren();
    document.getElementById('dashboard')?.classList.add('hidden');
    document.getElementById('online-test-area')?.classList.add('hidden');
    document.getElementById('subject-info')?.replaceChildren();

    window.cleanupPdfViewer?.();
    // window.cleanupYouTubePlayers?.(); // This is now handled by destroyYouTubePlayers above
    document.getElementById('course-dashboard-area')?.replaceChildren();
    document.getElementById('course-dashboard-area')?.classList.add('hidden');
    console.log("[State] User session data cleared.");
}

// --- END OF FILE state.js ---