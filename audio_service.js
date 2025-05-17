// --- START OF MODIFIED FILE audio_service.js ---

import { musicPlayerState, setMusicPlayerState } from './state.js';
import { UI_SOUND_EFFECTS } from './config.js';

// HTML Audio elements for different sound types
let ambientAudioPlayer = null;
let musicAudioPlayer = null; // For direct streams (Lo-fi, Binaural)
let uiSoundPlayer = null;
let testSoundPlayer = null; // For one-off test plays in admin
// --- START MODIFIED: Renamed currentTestingSoundButton to avoid conflicts with other modules if this were global ---
let currentTestingSoundButtonAudioService = null;
// --- END MODIFIED ---

// --- Initialization ---
export function initAudioPlayers() {
    if (!ambientAudioPlayer) {
        ambientAudioPlayer = new Audio();
        ambientAudioPlayer.loop = true;
        console.log("Ambient audio player initialized.");
    }
    if (!musicAudioPlayer) {
        musicAudioPlayer = new Audio();
        console.log("Music audio player (for streams) initialized.");
    }
    if (!uiSoundPlayer) {
        uiSoundPlayer = new Audio();
        uiSoundPlayer.volume = 0.4; 
        console.log("UI sound player initialized.");
    }
    if (!testSoundPlayer) {
        testSoundPlayer = new Audio();
        console.log("Test sound player initialized.");
        testSoundPlayer.onended = () => {
            // --- START MODIFIED: Use renamed button state variable ---
            if (currentTestingSoundButtonAudioService) {
                currentTestingSoundButtonAudioService.innerHTML = currentTestingSoundButtonAudioService.dataset.originalIcon || 
                    '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
                currentTestingSoundButtonAudioService.classList.remove('playing-test-sound', 'btn-warning-small');
                currentTestingSoundButtonAudioService.classList.add('btn-secondary-small');
                currentTestingSoundButtonAudioService.title = "Test Sound";
            }
            currentTestingSoundButtonAudioService = null;
            // --- END MODIFIED ---
        };
        testSoundPlayer.onerror = (e) => {
            console.error("Error playing test sound:", e);
            alert("Could not play the test sound. Check the URL or file.");
            // --- START MODIFIED: Use renamed button state variable ---
            if (currentTestingSoundButtonAudioService) {
                currentTestingSoundButtonAudioService.innerHTML = currentTestingSoundButtonAudioService.dataset.originalIcon || 'Test'; // Restore original
                currentTestingSoundButtonAudioService.classList.remove('playing-test-sound', 'btn-warning-small');
                currentTestingSoundButtonAudioService.classList.add('btn-secondary-small');
                currentTestingSoundButtonAudioService.title = "Test Sound";
            }
            currentTestingSoundButtonAudioService = null;
            // --- END MODIFIED ---
        };
    }
}
initAudioPlayers(); 

// --- Ambient Sound Controls ---
export function playAmbientSound(sound) {
    if (!ambientAudioPlayer) initAudioPlayers();
    if (!sound || !sound.url) {
        console.warn("Cannot play ambient sound: Invalid sound object or URL missing.", sound);
        return;
    }
    
    // --- START MODIFIED: Allow ambient to play with other sounds ---
    // No longer calls stopCurrentMusic() here.
    // If another ambient sound is playing, stop it first.
    if (musicPlayerState.isAmbientPlaying && musicPlayerState.currentAmbientSound?.id !== sound.id) {
        ambientAudioPlayer.pause();
        ambientAudioPlayer.currentTime = 0;
    } else if (musicPlayerState.isAmbientPlaying && musicPlayerState.currentAmbientSound?.id === sound.id) {
        return; // Already playing this sound
    }
    // --- END MODIFIED ---

    ambientAudioPlayer.src = sound.url;
    ambientAudioPlayer.volume = musicPlayerState.ambientVolume;
    ambientAudioPlayer.play()
        .then(() => {
            // --- START MODIFIED: Update state carefully to not overwrite main music ---
            setMusicPlayerState({ 
                currentAmbientSound: sound, 
                isAmbientPlaying: true 
                // DO NOT set currentTrack or isPlaying for main music here
            });
            // --- END MODIFIED ---
            console.log(`Ambient sound "${sound.name}" started.`);
            if (typeof window.updateAllPlayerUIs === 'function') window.updateAllPlayerUIs();
        })
        .catch(error => {
            console.error(`Error playing ambient sound "${sound.name}":`, error);
            setMusicPlayerState({ currentAmbientSound: null, isAmbientPlaying: false });
            if (typeof window.updateAllPlayerUIs === 'function') window.updateAllPlayerUIs();
        });
}

export function stopAmbientSound() {
    if (ambientAudioPlayer && musicPlayerState.isAmbientPlaying) {
        ambientAudioPlayer.pause();
        ambientAudioPlayer.currentTime = 0; 
    }
    if (musicPlayerState.currentAmbientSound) { // Only update state if an ambient sound was indeed current
        setMusicPlayerState({ currentAmbientSound: null, isAmbientPlaying: false });
    }
    if (typeof window.updateAmbientSoundSelectionUI === 'function') window.updateAmbientSoundSelectionUI();
}

export function setAmbientVolume(volume) {
    const newVolume = Math.max(0, Math.min(1, parseFloat(volume)));
    if (ambientAudioPlayer) {
        ambientAudioPlayer.volume = newVolume;
    }
    setMusicPlayerState({ ambientVolume: newVolume });
    localStorage.setItem('lyceumAmbientVolume', newVolume.toString());
}

// --- General Music Stream Controls (for non-YouTube audio like Binaural, direct Lo-fi streams) ---
export function playStreamableMusicTrack(track) {
    if (!musicAudioPlayer) initAudioPlayers();
    if (!track || !track.url) {
        console.error("playStreamableMusicTrack: Invalid track data or URL missing.");
        return Promise.reject(new Error("Invalid track data for streaming."));
    }
    // --- START MODIFIED: Call stopCurrentMusic for 'stream' type only if something else is playing.
    // This allows streamable music to play alongside ambient sound if desired.
    // If a YouTube video is playing, it should be stopped.
    if (musicPlayerState.currentTrack && (musicPlayerState.currentTrack.source === 'youtube' || musicPlayerState.currentTrack.source === 'youtubeMusic')) {
        stopCurrentMusic('stream'); // Stop YT if stream is starting
    } else if (musicPlayerState.currentTrack && musicPlayerState.currentTrack.id !== track.id) {
        stopStreamableMusic(); // Stop other stream if different track
    }
    // Ambient sound is not stopped by default here.
    // --- END MODIFIED ---
    
    return new Promise((resolve, reject) => {
        musicAudioPlayer.src = track.url;
        musicAudioPlayer.volume = musicPlayerState.volume;
        musicAudioPlayer.loop = musicPlayerState.repeatMode === 'one' && musicPlayerState.currentTrack?.id === track.id;
        const playPromise = musicAudioPlayer.play();

        if (playPromise !== undefined) {
            playPromise.then(() => {
                setMusicPlayerState({
                    currentTrack: { ...track, duration: musicAudioPlayer.duration || 0, source: track.source || track.type || 'stream' },
                    isPlaying: true,
                });
                console.log(`Streamable track "${track.name}" started.`);
                resolve();
            }).catch(error => {
                console.error(`Error playing streamable track "${track.name}":`, error);
                setMusicPlayerState({ currentTrack: null, isPlaying: false });
                reject(error);
            });
        } else { // Fallback for browsers not returning a promise (older or specific cases)
            setMusicPlayerState({
                currentTrack: { ...track, duration: musicAudioPlayer.duration || 0, source: track.source || track.type || 'stream' },
                isPlaying: true,
            });
            console.log(`Streamable track "${track.name}" initiated (no promise).`);
            resolve();
        }
    });
}

export function pauseStreamableMusic() {
    if (musicAudioPlayer && musicPlayerState.isPlaying && musicPlayerState.currentTrack &&
        (musicPlayerState.currentTrack.source !== 'youtube' && musicPlayerState.currentTrack.source !== 'youtubeMusic')) {
        musicAudioPlayer.pause();
    }
}

export function resumeStreamableMusic() {
    if (musicAudioPlayer && !musicPlayerState.isPlaying && musicPlayerState.currentTrack &&
        (musicPlayerState.currentTrack.source !== 'youtube' && musicPlayerState.currentTrack.source !== 'youtubeMusic')) {
        musicAudioPlayer.play().catch(error => console.error("Error resuming streamable music:", error));
    }
}

export function stopStreamableMusic() {
    if (musicAudioPlayer && musicPlayerState.currentTrack &&
        (musicPlayerState.currentTrack.source !== 'youtube' && musicPlayerState.currentTrack.source !== 'youtubeMusic')) {
        if (!musicAudioPlayer.paused) {
            musicAudioPlayer.pause();
        }
        musicAudioPlayer.currentTime = 0;
    }
}

export function setStreamableMusicVolume(volume) {
    if (musicAudioPlayer) {
        musicAudioPlayer.volume = Math.max(0, Math.min(1, parseFloat(volume)));
    }
}

export function seekStreamableMusic(time) {
    if (musicAudioPlayer && musicPlayerState.currentTrack &&
        (musicPlayerState.currentTrack.source !== 'youtube' && musicPlayerState.currentTrack.source !== 'youtubeMusic') &&
        musicAudioPlayer.duration) { 
        musicAudioPlayer.currentTime = Math.max(0, Math.min(parseFloat(time), musicAudioPlayer.duration));
    }
}

// --- UI Sound Effects ---
export function playUiSound(soundKey) {
    if (!musicPlayerState.uiSoundsEnabled) return;
    if (!uiSoundPlayer) initAudioPlayers();

    const soundUrl = UI_SOUND_EFFECTS[soundKey];
    if (soundUrl) {
        if (!uiSoundPlayer.paused) {
            uiSoundPlayer.pause();
            uiSoundPlayer.currentTime = 0;
        }
        uiSoundPlayer.src = soundUrl;
        uiSoundPlayer.play().catch(error => console.warn(`Could not play UI sound "${soundKey}" (URL: ${soundUrl}):`, error.message));
    } else {
        console.warn(`UI Sound effect for key "${soundKey}" not found in UI_SOUND_EFFECTS.`);
    }
}


// --- Test Sound Player (for Admin Panel) ---
export function playTestSoundOnce(url, buttonElement) {
    if (!testSoundPlayer) initAudioPlayers();
    if (!url) {
        alert("No URL provided for this sound.");
        return;
    }

    const originalIconHTML = buttonElement.innerHTML; 
    buttonElement.dataset.originalIcon = originalIconHTML;

    // --- START MODIFIED: Use renamed button state variable ---
    if (!testSoundPlayer.paused) {
        testSoundPlayer.pause();
        testSoundPlayer.currentTime = 0;
        if (currentTestingSoundButtonAudioService && currentTestingSoundButtonAudioService !== buttonElement) {
            currentTestingSoundButtonAudioService.innerHTML = currentTestingSoundButtonAudioService.dataset.originalIcon || 
                '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
            currentTestingSoundButtonAudioService.classList.remove('playing-test-sound', 'btn-warning-small');
            currentTestingSoundButtonAudioService.classList.add('btn-secondary-small');
            currentTestingSoundButtonAudioService.title = "Test Sound";
        }
    }

    if (buttonElement === currentTestingSoundButtonAudioService && !testSoundPlayer.paused) { 
        testSoundPlayer.pause();
        testSoundPlayer.currentTime = 0; 
        buttonElement.innerHTML = originalIconHTML;
        buttonElement.classList.remove('playing-test-sound', 'btn-warning-small');
        buttonElement.classList.add('btn-secondary-small');
        buttonElement.title = "Test Sound";
        currentTestingSoundButtonAudioService = null;
        return;
    }
    
    currentTestingSoundButtonAudioService = buttonElement;
    // --- END MODIFIED ---
    testSoundPlayer.src = url;
    testSoundPlayer.play()
        .then(() => {
            buttonElement.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path><rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" /></svg>'; // Stop icon
            buttonElement.classList.remove('btn-secondary-small');
            buttonElement.classList.add('playing-test-sound', 'btn-warning-small');
            buttonElement.title = "Stop Test Sound";
        })
        .catch(err => {
            console.error("Error initiating test sound:", err);
            buttonElement.innerHTML = originalIconHTML; 
            buttonElement.classList.remove('playing-test-sound', 'btn-warning-small');
            buttonElement.classList.add('btn-secondary-small');
            buttonElement.title = "Test Sound";
            // --- START MODIFIED: Use renamed button state variable ---
            currentTestingSoundButtonAudioService = null;
            // --- END MODIFIED ---
        });
}

// --- General Control Functions ---
// --- START MODIFIED: Granular stopCurrentMusic ---
export function stopCurrentMusic(exceptPlayerType = null) {
    console.log(`[AudioService] stopCurrentMusic called, except: ${exceptPlayerType}`);
    let wasPlayingBeforeStop = musicPlayerState.isPlaying;
    let stoppedSomething = false;

    if (exceptPlayerType !== 'ambient' && musicPlayerState.isAmbientPlaying) {
        // Do NOT stop ambient sound by default when other music starts/stops.
        // User controls ambient separately.
        // If ambient IS the `exceptPlayerType`, or if `exceptPlayerType` is null (stop all), then it's handled.
        // If this function is called *specifically* to stop ambient (e.g. `stopCurrentMusic('stream')` when stream ends),
        // then currentAmbientSound should be cleared if it was the one playing.
        // This logic needs to be careful not to clear ambient when just stopping main music.
    }

    // Stop HTML5 Streamable Music Player
    if (exceptPlayerType !== 'stream' && exceptPlayerType !== 'binaural' && exceptPlayerType !== 'lofi') {
        if (musicAudioPlayer && !musicAudioPlayer.paused) {
            musicAudioPlayer.pause();
            musicAudioPlayer.currentTime = 0;
            console.log("[AudioService] HTML5 music stream stopped.");
            stoppedSomething = true;
        }
    }

    // Stop Main Tab YouTube Player
    const mainYTPlayer = typeof window.mainYouTubePlayer !== 'undefined' ? window.mainYouTubePlayer : null;
    if (exceptPlayerType !== 'youtube_main' && mainYTPlayer && typeof mainYTPlayer.stopVideo === 'function') {
        try {
            mainYTPlayer.stopVideo();
            console.log("[AudioService] Main Tab YouTube player stopped.");
            stoppedSomething = true;
        } catch (e) {
            console.warn("[AudioService] Error stopping main YouTube player:", e);
        }
    }

    // Stop Mini YouTube Player
    const miniYTPlayer = musicPlayerState.miniPlayerYouTubeInstance;
    if (exceptPlayerType !== 'youtube_mini' && miniYTPlayer && typeof miniYTPlayer.stopVideo === 'function') {
        try {
            miniYTPlayer.stopVideo();
            console.log("[AudioService] Mini YouTube player stopped.");
            stoppedSomething = true;
        } catch (e) {
            console.warn("[AudioService] Error stopping mini YouTube player:", e);
        }
        // If the mini-player video was active, mark it as inactive
        if (musicPlayerState.miniPlayerVideoActive) {
            setMusicPlayerState({ miniPlayerVideoActive: false });
        }
    }
    
    // Update global state if something was actually stopped or current track is no longer relevant
    // If we are stopping a specific type and the current track is of that type, clear it.
    // If we are stopping "all" (exceptPlayerType is null), clear current track.
    if (exceptPlayerType === null || (musicPlayerState.currentTrack && musicPlayerState.currentTrack.source === exceptPlayerType)) {
        if (musicPlayerState.currentTrack || musicPlayerState.isPlaying) { // Only update if there was a track or it was playing
            setMusicPlayerState({ isPlaying: false, currentTrack: null, currentTime: 0 });
             console.log("[AudioService] Music track cleared and playback stopped.");
        }
    } else if (stoppedSomething && wasPlayingBeforeStop) {
        // If something was stopped, but it wasn't the 'currentTrack' type (e.g. ambient was stopped by starting main music)
        // and the main music was previously playing, ensure isPlaying reflects the new state.
        // This case is complex. Generally, setMusicPlayerState({isPlaying: false}) happens when *currentTrack* stops.
        // The logic for `isPlaying` should primarily be tied to `currentTrack`.
        // If `currentTrack` is not null and is the `exceptPlayerType`, then `isPlaying` should remain true.
        // If `currentTrack` becomes null, `isPlaying` must be false.
        if (!musicPlayerState.currentTrack) {
            setMusicPlayerState({ isPlaying: false });
        }
    }

    if (typeof window.updateAllPlayerUIs === 'function') {
        window.updateAllPlayerUIs();
    }
}
// --- END MODIFIED ---

export function getMusicAudioElement() {
    if (!musicAudioPlayer) initAudioPlayers();
    return musicAudioPlayer;
}

export function destroyYouTubePlayers() {
    const mainYTPlayer = typeof window.mainYouTubePlayer !== 'undefined' ? window.mainYouTubePlayer : null;
    if (mainYTPlayer && typeof mainYTPlayer.destroy === 'function') {
        try {
            if (mainYTPlayer.getPlayerState() === YT.PlayerState.PLAYING || mainYTPlayer.getPlayerState() === YT.PlayerState.BUFFERING) {
                mainYTPlayer.stopVideo();
            }
            mainYTPlayer.destroy();
            console.log("Destroyed main YouTube player instance.");
        } catch (e) { console.error("Error destroying main YouTube player:", e); }
        window.mainYouTubePlayer = null; 
    }

    const miniYTPlayer = musicPlayerState.miniPlayerYouTubeInstance;
    if (miniYTPlayer && typeof miniYTPlayer.destroy === 'function') {
        try {
             if (miniYTPlayer.getPlayerState() === YT.PlayerState.PLAYING || miniYTPlayer.getPlayerState() === YT.PlayerState.BUFFERING) {
                miniYTPlayer.stopVideo();
            }
            miniYTPlayer.destroy();
            console.log("Destroyed mini YouTube player instance.");
        } catch (e) { console.error("Error destroying mini YouTube player:", e); }
        musicPlayerState.miniPlayerYouTubeInstance = null;
        musicPlayerState.miniPlayerVideoActive = false;
         // Use setMusicPlayerState to ensure UI updates if necessary for miniPlayerVideoActive
        setMusicPlayerState({ miniPlayerYouTubeInstance: null, miniPlayerVideoActive: false });

    }

    if (typeof window.youtubePlayerStateInterval !== 'undefined' && window.youtubePlayerStateInterval) {
        clearInterval(window.youtubePlayerStateInterval);
        window.youtubePlayerStateInterval = null;
    }
    // --- START MODIFIED: Clear mini-player interval too ---
    const miniPlayerInterval = musicPlayerState.miniPlayerYouTubeInstance?.stateIntervalId; // Assuming we store it like this
    if (miniPlayerInterval) { // Check name of actual interval variable in your code
        clearInterval(miniPlayerInterval);
         // Also nullify it in state if you store it there. For now, assume it's not explicitly stored on the instance.
    }
    // --- END MODIFIED ---
}
window.destroyYouTubePlayers = destroyYouTubePlayers;

// --- END OF MODIFIED FILE audio_service.js ---