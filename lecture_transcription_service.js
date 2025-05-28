const ytdl = require('ytdl-core');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
// const { initialize: megaInitialize, findFolder: megaFindFolder, createFolder: megaCreateFolder, uploadFile: megaUploadFile } = require('./mega_service.js'); // Assuming mega_service.js is in the same directory
const serverMega = require('./mega_service_server.js'); // Using the new server-side Mega service
// const { getCourseDetails, updateCourseDefinition } = require('./firebase_firestore.js'); // Assuming firebase_firestore.js

const ASSEMBLYAI_API_BASE_URL = 'https://api.assemblyai.com/v2';
const TEMP_AUDIO_DIR = path.join(__dirname, 'temp_audio'); // __dirname might not be available in all environments (e.g. Firebase Cloud Functions). For local, it's fine.

// Ensure temp directory exists
if (!fs.existsSync(TEMP_AUDIO_DIR)) {
    fs.mkdirSync(TEMP_AUDIO_DIR, { recursive: true });
}

function formatTimestamp(seconds) {
    const H = Math.floor(seconds / 3600);
    const M = Math.floor((seconds % 3600) / 60);
    const S = Math.floor(seconds % 60);
    const MS = Math.round((seconds - Math.floor(seconds)) * 1000);
    return `${String(H).padStart(2, '0')}:${String(M).padStart(2, '0')}:${String(S).padStart(2, '0')},${String(MS).padStart(3, '0')}`;
}

async function generateSrtContent(transcriptId, apiKey) {
    console.log(`[SRT] Fetching transcript ${transcriptId} for SRT generation.`);
    try {
        const response = await axios.get(`${ASSEMBLYAI_API_BASE_URL}/transcript/${transcriptId}/srt`, {
            headers: { 'authorization': apiKey }
        });
        console.log(`[SRT] SRT content successfully fetched for transcript ${transcriptId}.`);
        return response.data; // AssemblyAI directly provides SRT
    } catch (error) {
        console.error(`[SRT] Error fetching SRT from AssemblyAI for transcript ${transcriptId}:`, error.response ? error.response.data : error.message);
        // Fallback: try to generate from utterances if /srt fails or for more control
        console.log(`[SRT] Attempting fallback to generate SRT from utterances for ${transcriptId}.`);
        const transcriptResponse = await axios.get(`${ASSEMBLYAI_API_BASE_URL}/transcript/${transcriptId}`, {
            headers: { 'authorization': apiKey }
        });
        if (!transcriptResponse.data.utterances) {
            throw new Error('SRT generation failed: No utterances found in transcript and /srt endpoint failed.');
        }
        let srtContent = '';
        let count = 1;
        for (const utterance of transcriptResponse.data.utterances) {
            const start = formatTimestamp(utterance.start / 1000);
            const end = formatTimestamp(utterance.end / 1000);
            srtContent += `${count}\n`;
            srtContent += `${start} --> ${end}\n`;
            srtContent += `${utterance.text}\n\n`;
            count++;
        }
        if (!srtContent) {
             throw new Error('SRT generation failed: Utterances did not produce content.');
        }
        console.log(`[SRT] SRT content generated from utterances for transcript ${transcriptId}.`);
        return srtContent;
    }
}


async function transcribeLecture(youtubeUrl, courseId, chapterId, assemblyAiApiKey, megaEmail, megaPassword) {
    console.log(`[TranscriptionService] Starting transcription process for YouTube URL: ${youtubeUrl}, Course ID: ${courseId}, Chapter ID: ${chapterId}`);
    let audioFilePath = '';
    let srtFilePath = '';
    let videoTitle = 'Untitled_Lecture'; // Default video title

    try {
        // 1. Fetch YouTube Audio and Title
        console.log(`[YouTube] Fetching video info for URL: ${youtubeUrl}`);
        const videoInfo = await ytdl.getInfo(youtubeUrl);
        videoTitle = videoInfo.videoDetails.title.replace(/[^\w\s.-]/g, '_'); // Sanitize title for filename
        const audioFormat = ytdl.chooseFormat(videoInfo.formats, { quality: 'highestaudio', filter: 'audioonly' });
        if (!audioFormat) {
            throw new Error('No suitable audio format found for the YouTube video.');
        }
        console.log(`[YouTube] Video title: "${videoTitle}". Chosen audio format: ${audioFormat.itag}`);

        audioFilePath = path.join(TEMP_AUDIO_DIR, `${videoTitle}_${Date.now()}.mp3`); // Use a common format like mp3
        console.log(`[YouTube] Downloading audio to: ${audioFilePath}`);

        await new Promise((resolve, reject) => {
            ytdl(youtubeUrl, { format: audioFormat })
                .pipe(fs.createWriteStream(audioFilePath))
                .on('finish', resolve)
                .on('error', (err) => {
                    console.error('[YouTube] Error downloading audio:', err);
                    reject(new Error(`Failed to download audio from YouTube: ${err.message}`));
                });
        });
        console.log(`[YouTube] Audio downloaded successfully: ${audioFilePath}`);

        // 2. AssemblyAI Transcription
        console.log(`[AssemblyAI] Uploading audio file: ${audioFilePath}`);
        const audioData = fs.readFileSync(audioFilePath); // Consider streaming for very large files if AssemblyAI supports it directly
        const uploadResponse = await axios.post(`${ASSEMBLYAI_API_BASE_URL}/upload`, audioData, {
            headers: {
                'authorization': assemblyAiApiKey,
                'Content-Type': 'application/octet-stream' // Or the correct content type for your audio file
            }
        });
        const audioUploadUrl = uploadResponse.data.upload_url;
        console.log(`[AssemblyAI] Audio uploaded successfully. Upload URL: ${audioUploadUrl}`);

        console.log(`[AssemblyAI] Requesting transcription for audio URL: ${audioUploadUrl}`);
        const transcriptPayload = { audio_url: audioUploadUrl };
        // Optional: Add speaker_labels, sentiment_analysis etc. if needed
        // transcriptPayload.speaker_labels = true;
        const transcriptRequestResponse = await axios.post(`${ASSEMBLYAI_API_BASE_URL}/transcript`, transcriptPayload, {
            headers: { 'authorization': assemblyAiApiKey }
        });
        const transcriptId = transcriptRequestResponse.data.id;
        console.log(`[AssemblyAI] Transcription requested. Transcript ID: ${transcriptId}`);

        console.log(`[AssemblyAI] Polling for transcription completion (ID: ${transcriptId})...`);
        let transcriptStatus = transcriptRequestResponse.data.status;
        while (transcriptStatus === 'queued' || transcriptStatus === 'processing') {
            await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
            const statusResponse = await axios.get(`${ASSEMBLYAI_API_BASE_URL}/transcript/${transcriptId}`, {
                headers: { 'authorization': assemblyAiApiKey }
            });
            transcriptStatus = statusResponse.data.status;
            console.log(`[AssemblyAI] Current transcription status for ${transcriptId}: ${transcriptStatus}`);
        }

        if (transcriptStatus === 'error') {
            const errorDetails = await axios.get(`${ASSEMBLYAI_API_BASE_URL}/transcript/${transcriptId}`, {
                headers: { 'authorization': assemblyAiApiKey }
            });
            throw new Error(`AssemblyAI transcription failed for ID ${transcriptId}. Status: ${transcriptStatus}. Details: ${errorDetails.data.error}`);
        }
        if (transcriptStatus !== 'completed') {
            throw new Error(`AssemblyAI transcription status unknown or not completed for ID ${transcriptId}. Status: ${transcriptStatus}`);
        }
        console.log(`[AssemblyAI] Transcription completed for ID: ${transcriptId}`);

        // 3. Generate SRT File
        const srtContent = await generateSrtContent(transcriptId, assemblyAiApiKey);
        srtFilePath = path.join(TEMP_AUDIO_DIR, `${videoTitle}_${transcriptId}.srt`);
        fs.writeFileSync(srtFilePath, srtContent);
        console.log(`[SRT] SRT file generated and saved to: ${srtFilePath}`);

        // 4. MEGA Integration
        console.log(`[MEGA] Initializing MEGA service with email: ${megaEmail}`);
        // const mega = await megaInitialize(megaEmail, megaPassword); // Old call
        await serverMega.initialize(megaEmail, megaPassword); // New call
        const megaStorage = serverMega.getMegaStorage(); // Get storage instance

        if (!megaStorage || !megaStorage.root) { // Check if megaStorage.root is available
            throw new Error('MEGA initialization failed or root directory not accessible.');
        }
        console.log('[MEGA] MEGA service initialized successfully.');

        // console.log(`[Firestore] Fetching course details for Course ID: ${courseId}`);
        // const courseDetails = await getCourseDetails(courseId);
        // if (!courseDetails) {
        //     throw new Error(`Course details not found for ID: ${courseId}`);
        // }
        // const courseDirName = courseDetails.courseDirName;
        const courseDirName = `CourseDir_${courseId}`; // Placeholder after commenting out Firestore
        // if (!courseDirName) {
        //     throw new Error(`courseDirName not found for Course ID: ${courseId}. Cannot determine MEGA path.`);
        // }
        console.log(`[Placeholder] Course directory name set to: ${courseDirName}`);

        const lyceumRootFolderName = "LyceumCourses_Test";
        const transcriptionsFolderName = "Transcriptions";
        
        let lyceumRootNode = await serverMega.findFolder(lyceumRootFolderName, megaStorage.root);
        if (!lyceumRootNode) {
            console.log(`[MEGA] Creating Lyceum root folder: ${lyceumRootFolderName}`);
            lyceumRootNode = await serverMega.createFolder(lyceumRootFolderName, megaStorage.root);
        }
        if (!lyceumRootNode) throw new Error(`Failed to find or create Lyceum root folder on MEGA: ${lyceumRootFolderName}`);

        let courseMegaFolderNode = await serverMega.findFolder(courseDirName, lyceumRootNode);
        if (!courseMegaFolderNode) {
            console.log(`[MEGA] Creating course folder: ${courseDirName} in ${lyceumRootNode.name}`);
            courseMegaFolderNode = await serverMega.createFolder(courseDirName, lyceumRootNode);
        }
        if (!courseMegaFolderNode) throw new Error(`Failed to find or create course folder on MEGA: ${courseDirName}`);

        let transcriptionsMegaFolderNode = await serverMega.findFolder(transcriptionsFolderName, courseMegaFolderNode);
        if (!transcriptionsMegaFolderNode) {
            console.log(`[MEGA] Creating Transcriptions folder in: ${courseMegaFolderNode.name}`);
            transcriptionsMegaFolderNode = await serverMega.createFolder(transcriptionsFolderName, courseMegaFolderNode);
        }
        if (!transcriptionsMegaFolderNode) throw new Error(`Failed to find or create Transcriptions folder on MEGA.`);
        
        console.log(`[MEGA] Target MEGA folder: ${transcriptionsMegaFolderNode.name} (ID: ${transcriptionsMegaFolderNode.nodeId})`); // .id to .nodeId if that's what new service uses
        const srtFileNameOnMega = `${videoTitle}_${transcriptId}.srt`;
        console.log(`[MEGA] Uploading SRT file "${srtFileNameOnMega}" to MEGA...`);
        const uploadedSrtFile = await serverMega.uploadFile(srtFilePath, srtFileNameOnMega, transcriptionsMegaFolderNode);
        if (!uploadedSrtFile || !uploadedSrtFile.link) {
            throw new Error('Failed to upload SRT file to MEGA or link not returned.');
        }
        console.log(`[MEGA] SRT file uploaded successfully. Link: ${uploadedSrtFile.link}`);

        // 5. Update Firestore (Temporarily Commented Out)
        console.log(`[Firestore] Skipping Firestore update for Course ID: ${courseId}, Chapter ID: ${chapterId}`);
        // const existingCourseData = await getCourseDetails(courseId); // Re-fetch to ensure latest data
        // if (!existingCourseData) throw new Error(`Failed to re-fetch course data for ${courseId} before update.`);

        // const chapterResources = existingCourseData.chapterResources || {};
        // const chapterSpecificResources = chapterResources[chapterId] || { lectureUrls: [], otherResources: [] };
        
        // // Avoid duplicate entries based on URL
        // const newLectureResource = {
        //     title: videoTitle,
        //     url: uploadedSrtFile.link,
        //     type: "transcription",
        //     sourceUrl: youtubeUrl, // Store original YouTube URL for reference
        //     transcriptId: transcriptId, // Store AssemblyAI transcript ID
        //     uploadedAt: new Date().toISOString()
        // };

        // const existingLectureIndex = chapterSpecificResources.lectureUrls.findIndex(lec => lec.url === newLectureResource.url || (lec.sourceUrl === youtubeUrl && lec.type === "transcription"));
        // if (existingLectureIndex !== -1) {
        //     console.log(`[Firestore] Updating existing transcription entry for chapter ${chapterId}.`);
        //     chapterSpecificResources.lectureUrls[existingLectureIndex] = newLectureResource;
        // } else {
        //     console.log(`[Firestore] Adding new transcription entry for chapter ${chapterId}.`);
        //     chapterSpecificResources.lectureUrls.push(newLectureResource);
        // }
        
        // chapterResources[chapterId] = chapterSpecificResources;

        // const firestoreUpdateSuccess = await updateCourseDefinition(courseId, { chapterResources });
        // if (!firestoreUpdateSuccess) {
        //     // This might be an issue if updateCourseDefinition doesn't return a clear boolean
        //     // For now, assume it does or that an error would be thrown by it.
        //     console.warn(`[Firestore] Update to course definition for ${courseId} might not have been successful (updateCourseDefinition returned falsy).`);
        // }
        // console.log(`[Firestore] Course definition updated successfully for Course ID: ${courseId}.`);
        const firestoreUpdateSuccess = "SKIPPED"; // Placeholder

        return {
            success: true,
            message: "Transcription process completed successfully (Firestore update skipped).",
            videoTitle: videoTitle,
            srtFileName: srtFileNameOnMega,
            srtMegaLink: uploadedSrtFile.link,
            transcriptId: transcriptId,
            firestoreUpdateStatus: firestoreUpdateSuccess,
        };

    } catch (error) {
        console.error(`[TranscriptionService] CRITICAL ERROR during transcription process:`, error);
        return {
            success: false,
            message: `Transcription process failed: ${error.message}`,
            videoTitle: videoTitle, // Include title if available
            error: error.stack, // Provide stack for debugging
        };
    } finally {
        // 6. Cleanup temporary files
        if (audioFilePath && fs.existsSync(audioFilePath)) {
            try {
                fs.unlinkSync(audioFilePath);
                console.log(`[Cleanup] Temporary audio file deleted: ${audioFilePath}`);
            } catch (err) {
                console.error(`[Cleanup] Error deleting temporary audio file ${audioFilePath}:`, err);
            }
        }
        if (srtFilePath && fs.existsSync(srtFilePath)) {
            try {
                fs.unlinkSync(srtFilePath);
                console.log(`[Cleanup] Temporary SRT file deleted: ${srtFilePath}`);
            } catch (err) {
                console.error(`[Cleanup] Error deleting temporary SRT file ${srtFilePath}:`, err);
            }
        }
    }
}

module.exports = {
    transcribeLecture,
};

// Example Usage (for testing - comment out or remove in production/import scenarios)
/*
async function testTranscription() {
    const TEST_YOUTUBE_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"; // Replace with a short, real test video
    const TEST_COURSE_ID = "TEST_COURSE_001"; // Replace with a valid course ID from your Firestore
    const TEST_CHAPTER_ID = "chapter_01"; // Replace with a valid chapter ID
    const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY; // Set this environment variable
    const MEGA_EMAIL = process.env.MEGA_EMAIL; // Set this environment variable
    const MEGA_PASSWORD = process.env.MEGA_PASSWORD; // Set this environment variable

    if (!ASSEMBLYAI_API_KEY || !MEGA_EMAIL || !MEGA_PASSWORD) {
        console.error("Missing required environment variables for testing: ASSEMBLYAI_API_KEY, MEGA_EMAIL, MEGA_PASSWORD");
        return;
    }
    
    // Mock firebase_firestore for local testing if not fully set up
    // global.getCourseDetails = async (courseId) => ({ courseDirName: `CourseDir_${courseId}`, chapterResources: {} }); // Keep for testing if needed
    // global.updateCourseDefinition = async (courseId, updates) => { console.log("Mock updateCourseDefinition called:", courseId, updates); return true; }; // Keep for testing


    console.log("Starting test transcription...");
    const result = await transcribeLecture(
        TEST_YOUTUBE_URL,
        TEST_COURSE_ID,
        TEST_CHAPTER_ID,
        ASSEMBLYAI_API_KEY,
        MEGA_EMAIL,
        MEGA_PASSWORD
    );
    console.log("Test transcription result:", result);
}

// testTranscription().catch(console.error);
*/
