// --- START OF MODIFIED FILE audio_service.js ---

import { musicPlayerState, setMusicPlayerState } from './state.js';
import { UI_SOUND_EFFECTS } from './config.js';

// HTML Audio elements for different sound types
let ambientAudioPlayer = null;
let musicAudioPlayer = null; // For direct streams (Lo-fi, Binaural)
let uiSoundPlayer = null;
let testSoundPlayer = null; // For one-off test plays in admin

// --- Initialization ---
function initAudioPlayers() {
    if (!ambientAudioPlayer) {
        ambientAudioPlayer = new Audio();
        ambientAudioPlayer.loop = true;
        // Initial volume set when playAmbientSound is called or from state
        console.log("Ambient audio player initialized.");
    }
    if (!musicAudioPlayer) {
        musicAudioPlayer = new Audio();
        // Initial volume set when playStreamableMusicTrack is called or from state
        console.log("Music audio player (for streams) initialized.");
    }
    if (!uiSoundPlayer) {
        uiSoundPlayer = new Audio();
        uiSoundPlayer.volume = 0.4; // Default reduced volume for UI sounds
        console.log("UI sound player initialized.");
    }
    if (!testSoundPlayer) {
        testSoundPlayer = new Audio();
        console.log("Test sound player initialized.");
        testSoundPlayer.onended = () => {
            const activeTestButton = document.querySelector('button.playing-test-sound');
            if (activeTestButton) {
                activeTestButton.innerHTML = activeTestButton.dataset.originalIcon || // Restore original icon
                    '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
                activeTestButton.classList.remove('playing-test-sound', 'btn-warning-small');
                activeTestButton.classList.add('btn-secondary-small');
                activeTestButton.title = "Test Sound";
            }
            currentTestingSoundButton = null;
        };
        testSoundPlayer.onerror = (e) => {
            console.error("Error playing test sound:", e);
            alert("Could not play the test sound. Check the URL or file.");
            const activeTestButton = document.querySelector('button.playing-test-sound');
             if (activeTestButton) {
                activeTestButton.innerHTML = activeTestButton.dataset.originalIcon || 'Test'; // Restore original
                activeTestButton.classList.remove('playing-test-sound', 'btn-warning-small');
                activeTestButton.classList.add('btn-secondary-small');
                activeTestButton.title = "Test Sound";
            }
            currentTestingSoundButton = null;
        };
    }
}
initAudioPlayers(); // Initialize on script load

// --- Ambient Sound Controls ---
export function playAmbientSound(sound) {
    if (!ambientAudioPlayer) initAudioPlayers();
    if (!sound || !sound.url) {
        console.warn("Cannot play ambient sound: Invalid sound object or URL missing.", sound);
        return;
    }
    if (musicPlayerState.isAmbientPlaying && musicPlayerState.currentAmbientSound?.id === sound.id) {
        return; // Already playing this sound
    }

    stopCurrentMusic('ambient'); // Stop other music types, except if it's ambient itself

    ambientAudioPlayer.src = sound.url;
    ambientAudioPlayer.volume = musicPlayerState.ambientVolume;
    ambientAudioPlayer.play()
        .then(() => {
            setMusicPlayerState({ currentAmbientSound: sound, isAmbientPlaying: true, currentTrack: null, isPlaying: false });
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
        ambientAudioPlayer.currentTime = 0; // Reset for next play
    }
    // Only update state if it was actually playing an ambient sound
    if (musicPlayerState.currentAmbientSound) {
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
    stopCurrentMusic('stream'); // Stop other music types (YouTube, Ambient)
    stopAmbientSound(); // Explicitly stop ambient sound

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
        } else {
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
        // state `isPlaying` is usually updated by the calling function (e.g., togglePlayPause in ui_music_player.js)
    }
}

export function resumeStreamableMusic() {
    if (musicAudioPlayer && !musicPlayerState.isPlaying && musicPlayerState.currentTrack &&
        (musicPlayerState.currentTrack.source !== 'youtube' && musicPlayerState.currentTrack.source !== 'youtubeMusic')) {
        musicAudioPlayer.play().catch(error => console.error("Error resuming streamable music:", error));
        // state `isPlaying` is usually updated by the calling function
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
        musicAudioPlayer.duration) { // Ensure duration is known before seeking
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
// let currentTestingSoundButton = null; // Already defined in your provided code, ensure it's at module scope

export function playTestSoundOnce(url, buttonElement) {
    if (!testSoundPlayer) initAudioPlayers();
    if (!url) {
        alert("No URL provided for this sound.");
        return;
    }

    const originalIconHTML = buttonElement.innerHTML; // Store full HTML for icon
    buttonElement.dataset.originalIcon = originalIconHTML;

    // Stop previous test sound and reset its button
    if (!testSoundPlayer.paused) {
        testSoundPlayer.pause();
        testSoundPlayer.currentTime = 0;
        if (currentTestingSoundButton && currentTestingSoundButton !== buttonElement) {
            currentTestingSoundButton.innerHTML = currentTestingSoundButton.dataset.originalIcon || 
                '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
            currentTestingSoundButton.classList.remove('playing-test-sound', 'btn-warning-small');
            currentTestingSoundButton.classList.add('btn-secondary-small');
            currentTestingSoundButton.title = "Test Sound";
        }
    }

    if (buttonElement === currentTestingSoundButton && !testSoundPlayer.paused) { // If clicking the currently playing test button
        testSoundPlayer.pause();
        testSoundPlayer.currentTime = 0; // Stop and reset
        buttonElement.innerHTML = originalIconHTML;
        buttonElement.classList.remove('playing-test-sound', 'btn-warning-small');
        buttonElement.classList.add('btn-secondary-small');
        buttonElement.title = "Test Sound";
        currentTestingSoundButton = null;
        return;
    }
    
    currentTestingSoundButton = buttonElement;
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
            buttonElement.innerHTML = originalIconHTML; // Restore icon on error
            buttonElement.classList.remove('playing-test-sound', 'btn-warning-small');
            buttonElement.classList.add('btn-secondary-small');
            buttonElement.title = "Test Sound";
            currentTestingSoundButton = null;
            // Error is also handled by the global onerror listener on testSoundPlayer
        });
}

// --- General Control Functions ---
export function stopCurrentMusic(exceptPlayerType = null) {
    if (exceptPlayerType !== 'ambient') {
        stopAmbientSound();
    }
    if (exceptPlayerType !== 'stream') {
        stopStreamableMusic();
    }

    // Stop Main YouTube Player (if it exists in the main music tab)
    const mainYTPlayer = typeof window.mainYouTubePlayer !== 'undefined' ? window.mainYouTubePlayer : null;
    if (exceptPlayerType !== 'youtube_main' && mainYTPlayer && typeof mainYTPlayer.stopVideo === 'function') {
        try { mainYTPlayer.stopVideo(); console.log("Stopped main YouTube player."); }
        catch (e) { console.warn("Error stopping main YouTube player:", e); }
    }

    // Stop Mini YouTube Player
    const miniYTPlayer = musicPlayerState.miniPlayerYouTubeInstance;
    if (exceptPlayerType !== 'youtube_mini' && miniYTPlayer && typeof miniYTPlayer.stopVideo === 'function') {
        try { miniYTPlayer.stopVideo(); console.log("Stopped mini YouTube player."); }
        catch (e) { console.warn("Error stopping mini YouTube player:", e); }
        if (musicPlayerState.miniPlayerVideoActive) {
            setMusicPlayerState({ miniPlayerVideoActive: false });
        }
    }

    // If stopping everything, or if the current track source is not the one being excepted
    if (exceptPlayerType === null || (musicPlayerState.currentTrack && musicPlayerState.currentTrack.source !== exceptPlayerType)) {
        setMusicPlayerState({ isPlaying: false, currentTrack: null }); // Clear current track if its type is being stopped
    } else if (musicPlayerState.isPlaying && musicPlayerState.currentTrack && musicPlayerState.currentTrack.source !== exceptPlayerType) {
        // If something else was playing that wasn't the currentTrack, just ensure isPlaying is false
        setMusicPlayerState({ isPlaying: false });
    }
    // If exceptPlayerType *is* the currentTrack.source, isPlaying and currentTrack remain for the new item of that type to play.
    
    if (typeof window.updateAllPlayerUIs === 'function') window.updateAllPlayerUIs();
}

export function getMusicAudioElement() {
    if (!musicAudioPlayer) initAudioPlayers();
    return musicAudioPlayer;
}

// Function to destroy all YouTube player instances (main and mini)
export function destroyYouTubePlayers() {
    const mainYTPlayer = typeof window.mainYouTubePlayer !== 'undefined' ? window.mainYouTubePlayer : null;
    if (mainYTPlayer && typeof mainYTPlayer.destroy === 'function') {
        try {
            mainYTPlayer.destroy();
            console.log("Destroyed main YouTube player instance.");
        } catch (e) { console.error("Error destroying main YouTube player:", e); }
        window.mainYouTubePlayer = null; // Ensure it's cleared globally
    }

    const miniYTPlayer = musicPlayerState.miniPlayerYouTubeInstance;
    if (miniYTPlayer && typeof miniYTPlayer.destroy === 'function') {
        try {
            miniYTPlayer.destroy();
            console.log("Destroyed mini YouTube player instance.");
        } catch (e) { console.error("Error destroying mini YouTube player:", e); }
        // Update state directly here as setMusicPlayerState might have side effects we don't want during full destruction
        musicPlayerState.miniPlayerYouTubeInstance = null;
        musicPlayerState.miniPlayerVideoActive = false;
    }

    if (typeof window.youtubePlayerStateInterval !== 'undefined' && window.youtubePlayerStateInterval) {
        clearInterval(window.youtubePlayerStateInterval);
        window.youtubePlayerStateInterval = null;
    }
    if (typeof window.miniYouTubePlayerStateInterval !== 'undefined' && window.miniYouTubePlayerStateInterval) {
        clearInterval(window.miniYouTubePlayerStateInterval);
        window.miniYouTubePlayerStateInterval = null;
    }
}
window.destroyYouTubePlayers = destroyYouTubePlayers;

// --- END OF MODIFIED FILE audio_service.js ---