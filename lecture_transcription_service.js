const ytdl = require('ytdl-core');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
// const { initialize: gDriveInit, findFolder: gDriveFindFolder, createFolder: gDriveCreateFolder, uploadFile: gDriveUploadFile } = require('./google_drive_service_server.js'); // Example for GDrive server service
const serverGoogleDrive = require('./google_drive_service_server.js'); // Using the server-side Google Drive service

const ASSEMBLYAI_API_BASE_URL = 'https://api.assemblyai.com/v2';
const TEMP_AUDIO_DIR = path.join(__dirname, 'temp_audio');

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
        return response.data;
    } catch (error) {
        console.error(`[SRT] Error fetching SRT from AssemblyAI for transcript ${transcriptId}:`, error.response ? error.response.data : error.message);
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
            srtContent += `${count}\n${start} --> ${end}\n${utterance.text}\n\n`;
            count++;
        }
        if (!srtContent) {
             throw new Error('SRT generation failed: Utterances did not produce content.');
        }
        console.log(`[SRT] SRT content generated from utterances for transcript ${transcriptId}.`);
        return srtContent;
    }
}

// Helper function to sanitize filenames/chapter keys
function sanitizeForPath(name) {
    if (!name) return 'untitled';
    return name.replace(/[^\w\s.-]/g, '').replace(/\s+/g, '_').substring(0, 50); // Limit length
}

async function transcribeLecture(youtubeUrl, courseId, chapterId, assemblyAiApiKey /* megaEmail, megaPassword removed */) {
    console.log(`[TranscriptionService] Starting transcription for YouTube URL: ${youtubeUrl}, Course ID: ${courseId}, Chapter ID: ${chapterId} (using Google Drive)`);
    let audioFilePath = '';
    let srtFilePath = '';
    let videoTitle = 'Untitled_Lecture';

    try {
        // 1. Fetch YouTube Audio and Title
        console.log(`[YouTube] Fetching video info for URL: ${youtubeUrl}`);
        const videoInfo = await ytdl.getInfo(youtubeUrl);
        videoTitle = videoInfo.videoDetails.title.replace(/[^\w\s.-]/g, '_');
        const audioFormat = ytdl.chooseFormat(videoInfo.formats, { quality: 'highestaudio', filter: 'audioonly' });
        if (!audioFormat) throw new Error('No suitable audio format found.');
        console.log(`[YouTube] Video title: "${videoTitle}". Chosen audio format: ${audioFormat.itag}`);
        audioFilePath = path.join(TEMP_AUDIO_DIR, `${videoTitle}_${Date.now()}.mp3`);
        console.log(`[YouTube] Downloading audio to: ${audioFilePath}`);
        await new Promise((resolve, reject) => {
            ytdl(youtubeUrl, { format: audioFormat })
                .pipe(fs.createWriteStream(audioFilePath))
                .on('finish', resolve)
                .on('error', (err) => reject(new Error(`Failed to download audio: ${err.message}`)));
        });
        console.log(`[YouTube] Audio downloaded: ${audioFilePath}`);

        // 2. AssemblyAI Transcription
        console.log(`[AssemblyAI] Uploading audio: ${audioFilePath}`);
        const audioData = fs.readFileSync(audioFilePath);
        const uploadResponse = await axios.post(`${ASSEMBLYAI_API_BASE_URL}/upload`, audioData, {
            headers: { 'authorization': assemblyAiApiKey, 'Content-Type': 'application/octet-stream' }
        });
        const audioUploadUrl = uploadResponse.data.upload_url;
        console.log(`[AssemblyAI] Audio uploaded. URL: ${audioUploadUrl}`);
        const transcriptPayload = { audio_url: audioUploadUrl };
        const transcriptRequestResponse = await axios.post(`${ASSEMBLYAI_API_BASE_URL}/transcript`, transcriptPayload, {
            headers: { 'authorization': assemblyAiApiKey }
        });
        const transcriptId = transcriptRequestResponse.data.id;
        console.log(`[AssemblyAI] Transcription requested. ID: ${transcriptId}`);
        let transcriptStatus = transcriptRequestResponse.data.status;
        while (transcriptStatus === 'queued' || transcriptStatus === 'processing') {
            await new Promise(resolve => setTimeout(resolve, 5000));
            const statusResponse = await axios.get(`${ASSEMBLYAI_API_BASE_URL}/transcript/${transcriptId}`, {
                headers: { 'authorization': assemblyAiApiKey }
            });
            transcriptStatus = statusResponse.data.status;
            console.log(`[AssemblyAI] Status for ${transcriptId}: ${transcriptStatus}`);
        }
        if (transcriptStatus === 'error') {
            const errorDetails = await axios.get(`${ASSEMBLYAI_API_BASE_URL}/transcript/${transcriptId}`, { headers: { 'authorization': assemblyAiApiKey } });
            throw new Error(`AssemblyAI transcription failed. Status: ${transcriptStatus}. Details: ${errorDetails.data.error}`);
        }
        if (transcriptStatus !== 'completed') throw new Error(`AssemblyAI status unknown or not completed: ${transcriptStatus}`);
        console.log(`[AssemblyAI] Transcription completed for ID: ${transcriptId}`);

        // 3. Generate SRT File
        const srtContent = await generateSrtContent(transcriptId, assemblyAiApiKey);
        srtFilePath = path.join(TEMP_AUDIO_DIR, `${videoTitle}_${transcriptId}.srt`);
        fs.writeFileSync(srtFilePath, srtContent);
        console.log(`[SRT] SRT file generated: ${srtFilePath}`);

        // 4. Google Drive Integration
        // Assuming serverGoogleDrive is pre-initialized (e.g., on server startup)
        console.log(`[GoogleDrive] Using pre-configured Google Drive service.`);

        const courseDirName = `CourseDir_${courseId}`;
        console.log(`[GoogleDrive] Course directory name: ${courseDirName}`);

        const lyceumRootFolderName = "LyceumCourses_GoogleDrive_Test"; // Consistent name
        const transcriptionsFolderName = "Transcriptions_Archive"; // Consistent name
        
        let lyceumRootNode = await serverGoogleDrive.findFolder(lyceumRootFolderName, 'root');
        if (!lyceumRootNode) lyceumRootNode = await serverGoogleDrive.createFolder(lyceumRootFolderName, 'root');
        if (!lyceumRootNode || !lyceumRootNode.id) throw new Error(`Failed to find/create Lyceum root folder on Google Drive: ${lyceumRootFolderName}`);

        let courseDriveFolderNode = await serverGoogleDrive.findFolder(courseDirName, lyceumRootNode.id);
        if (!courseDriveFolderNode) courseDriveFolderNode = await serverGoogleDrive.createFolder(courseDirName, lyceumRootNode.id);
        if (!courseDriveFolderNode || !courseDriveFolderNode.id) throw new Error(`Failed to find/create course folder on Google Drive: ${courseDirName}`);

        let transcriptionsDriveFolderNode = await serverGoogleDrive.findFolder(transcriptionsFolderName, courseDriveFolderNode.id);
        if (!transcriptionsDriveFolderNode) transcriptionsDriveFolderNode = await serverGoogleDrive.createFolder(transcriptionsFolderName, courseDriveFolderNode.id);
        if (!transcriptionsDriveFolderNode || !transcriptionsDriveFolderNode.id) throw new Error(`Failed to find/create Transcriptions folder on Google Drive.`);
        
        console.log(`[GoogleDrive] Target folder: ${transcriptionsDriveFolderNode.name} (ID: ${transcriptionsDriveFolderNode.id})`);
        const srtFileNameOnDrive = `${videoTitle}_${transcriptId}.srt`;
        console.log(`[GoogleDrive] Uploading SRT file "${srtFileNameOnDrive}"...`);
        const uploadedSrtFile = await serverGoogleDrive.uploadFile(srtFilePath, srtFileNameOnDrive, transcriptionsDriveFolderNode.id);
        if (!uploadedSrtFile || !uploadedSrtFile.id) {
            throw new Error('Failed to upload SRT file to Google Drive or ID not returned.');
        }
        console.log(`[GoogleDrive] SRT file uploaded. ID: ${uploadedSrtFile.id}, Link: ${uploadedSrtFile.webViewLink}`);

        // 5. Update Firestore (Placeholder - actual update logic removed for this refactor pass)
        console.log(`[Firestore] Skipping Firestore update for Course ID: ${courseId}, Chapter ID: ${chapterId}`);
        const firestoreUpdateSuccess = "SKIPPED_FIRESTORE_UPDATE";

        return {
            success: true,
            message: "Transcription process completed successfully using Google Drive (Firestore update skipped).",
            videoTitle: videoTitle,
            srtFileName: srtFileNameOnDrive,
            gdriveSrtId: uploadedSrtFile.id, // Google Drive File ID
            gdriveSrtLink: uploadedSrtFile.webViewLink, // Google Drive webViewLink
            transcriptId: transcriptId,
            firestoreUpdateStatus: firestoreUpdateSuccess,
        };

    } catch (error) {
        console.error(`[TranscriptionService] CRITICAL ERROR:`, error);
        return {
            success: false,
            message: `Transcription process failed (Google Drive): ${error.message}`,
            videoTitle: videoTitle,
            error: error.stack,
        };
    } finally {
        // 6. Cleanup temporary files
        [audioFilePath, srtFilePath].forEach(filePath => {
            if (filePath && fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                    console.log(`[Cleanup] Temporary file deleted: ${filePath}`);
                } catch (err) {
                    console.error(`[Cleanup] Error deleting temp file ${filePath}:`, err);
                }
            }
        });
    }
}

module.exports = {
    transcribeLecture,
};

// Example Usage (commented out)
/*
async function testTranscription() {
    const TEST_YOUTUBE_URL = "YOUTUBE_VIDEO_URL_HERE"; // Replace with a short, real test video
    const TEST_COURSE_ID = "TEST_COURSE_GDRIVE_001";
    const TEST_CHAPTER_ID = "chapter_gdrive_01";
    const ASSEMBLYAI_API_KEY_TEST = process.env.ASSEMBLYAI_API_KEY_TRANSCRIPTION; // Set this environment variable
    // Google Drive API Key and Service Account should be configured in serverGoogleDrive service or globally for the server

    if (!ASSEMBLYAI_API_KEY_TEST || TEST_YOUTUBE_URL === "YOUTUBE_VIDEO_URL_HERE") {
        console.error("Missing required environment variables or placeholder YouTube URL for testing.");
        return;
    }
    
    // Mock serverGoogleDrive.initialize if it's not automatically handled by the service
    // serverGoogleDrive.initialize = async () => console.log("Mock GDrive Initialized for Transcription Test");
    // serverGoogleDrive.findFolder = async (name, parent) => ({id: `mock-folder-${name}-id`, name});
    // serverGoogleDrive.createFolder = async (name, parent) => ({id: `mock-folder-${name}-id`, name});
    // serverGoogleDrive.uploadFile = async (fpath, name, parent) => ({id: `mock-file-${name}-id`, name, webViewLink: `http://mock.link/${name}`});

    console.log("Starting test transcription (Google Drive)...");
    const result = await transcribeLecture(
        TEST_YOUTUBE_URL,
        TEST_COURSE_ID,
        TEST_CHAPTER_ID,
        ASSEMBLYAI_API_KEY_TEST
        // No Mega credentials needed
    );
    console.log("Test transcription result:", JSON.stringify(result, null, 2));
}

// testTranscription().catch(console.error);
*/
