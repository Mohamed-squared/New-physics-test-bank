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
         DEFAULT_UI_SOUNDS_ENABLED, DEFAULT_AMBIENT_SOUND_VOLUME, DEFAULT_MUSIC_VOLUME
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

export let musicPlayerState = {
    currentTrack: null,
    currentPlaylist: [],
    currentPlaylistName: null,
    isPlaying: false,
    volume: DEFAULT_MUSIC_VOLUME,
    isShuffled: false,
    repeatMode: 'none',
    currentTime: 0,
    showMiniPlayer: false,
    miniPlayerVideoActive: false, // NEW: True if video is playing in the mini-player
    miniPlayerYouTubeInstance: null, // NEW: Holds the YT.Player instance for the mini-player
    linkedServices: {
        spotify: { linked: false, playlists: [] },
        youtubeMusic: { linked: false, playlists: [] },
    },
    currentAmbientSound: null,
    ambientVolume: DEFAULT_AMBIENT_SOUND_VOLUME,
    isAmbientPlaying: false,
    uiSoundsEnabled: DEFAULT_UI_SOUNDS_ENABLED,
    userSavedPlaylists: [], // NEW: For client-side saved playlists
};

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

export function setMusicPlayerState(newState) {
    const oldState = { ...musicPlayerState };
    musicPlayerState = { ...musicPlayerState, ...newState };
    
    // If currentTrack changed and it's a YouTube video, ensure main player is updated/created
    if (newState.currentTrack && oldState.currentTrack?.id !== newState.currentTrack.id) {
        if ((newState.currentTrack.source === 'youtube' || newState.currentTrack.source === 'youtubeMusic') && typeof window.createMainYouTubePlayer === 'function') {
            if (window.mainYouTubePlayer) {
                window.mainYouTubePlayer.loadVideoById(newState.currentTrack.videoId);
                if (musicPlayerState.isPlaying) window.mainYouTubePlayer.playVideo();
            } else {
                // Player might not be initialized if music tab isn't open
                // window.createMainYouTubePlayer(newState.currentTrack.videoId); // This will be handled by showMusicPlayerDashboard or the mini-player logic
            }
        }
    }

    if (typeof window.updateAllPlayerUIs === 'function') { // Update main player UI if visible
        window.updateAllPlayerUIs();
    }
    if (typeof window.updateMiniPlayerVisibility === 'function') { // Update mini player visibility and content
        window.updateMiniPlayerVisibility();
    }
    // console.log("[State] Music player state updated:", musicPlayerState); // Can be noisy
}

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
    setMusicPlayerState({
        currentTrack: null,
        currentPlaylist: [],
        currentPlaylistName: null,
        isPlaying: false,
        volume: DEFAULT_MUSIC_VOLUME, // Keep user's volume preference
        isShuffled: false,
        repeatMode: 'none',
        currentTime: 0,
        showMiniPlayer: musicPlayerState.showMiniPlayer, // Persist mini-player visibility preference
        miniPlayerVideoActive: false,
        miniPlayerYouTubeInstance: null, // Destroy instance on logout
        linkedServices: {
            spotify: { linked: false, playlists: [] },
            youtubeMusic: { linked: false, playlists: [] },
        },
        currentAmbientSound: null,
        ambientVolume: DEFAULT_AMBIENT_SOUND_VOLUME, // Keep user's ambient volume preference
        isAmbientPlaying: false,
        uiSoundsEnabled: musicPlayerState.uiSoundsEnabled, // Persist UI sounds preference
        userSavedPlaylists: [], // Clear user saved playlists from memory (they are in localStorage)
    });
    // Stop any playing audio from HTML5 audio elements
    if (typeof window.stopAmbientSound === 'function') window.stopAmbientSound();
    if (typeof window.stopStreamableMusic === 'function') window.stopStreamableMusic();
    // Destroy YouTube player instances
    if (typeof window.destroyYouTubePlayers === 'function') window.destroyYouTubePlayers();


    document.getElementById('content')?.replaceChildren();
    document.getElementById('dashboard')?.classList.add('hidden');
    document.getElementById('online-test-area')?.classList.add('hidden');
    document.getElementById('subject-info')?.replaceChildren();

    window.cleanupPdfViewer?.();
    window.cleanupYouTubePlayers?.(); 
    document.getElementById('course-dashboard-area')?.replaceChildren();
    document.getElementById('course-dashboard-area')?.classList.add('hidden');
    console.log("[State] User session data cleared.");
}

// --- END OF FILE state.js ---