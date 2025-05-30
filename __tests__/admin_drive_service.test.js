// __tests__/admin_drive_service.test.js

import { loadCoursesForDriveMigration, startDriveMigration, handleDriveFileDownload, displayDriveFileExplorer } from '../admin_drive_service'; // Adjusted path and names
import { globalCourseDataMap, currentUser } from '../state';
import { showLoading, hideLoading } from '../utils';
import { updateCourseDefinition } from '../firebase_firestore';
// Import the specific functions you want to mock from google_drive_service
import * as driveService from '../google_drive_service.js';

// Mock dependencies
jest.mock('../state', () => ({
    currentUser: { isAdmin: true, uid: 'admin123' }, // Default mock
    globalCourseDataMap: new Map(),
}));
jest.mock('../utils', () => ({
    showLoading: jest.fn(),
    hideLoading: jest.fn(),
}));
jest.mock('../firebase_firestore', () => ({
    updateCourseDefinition: jest.fn(),
}));

// Mock google_drive_service
jest.mock('../google_drive_service.js', () => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    signIn: jest.fn().mockResolvedValue({ getBasicProfile: () => ({ getEmail: () => 'admin@example.com' }) }),
    signOut: jest.fn().mockResolvedValue(undefined),
    isSignedIn: jest.fn().mockReturnValue(true), // Assume signed in for most tests after init
    findOrCreateFolder: jest.fn(),
    uploadFile: jest.fn(),
    getFolderContents: jest.fn(),
    downloadFile: jest.fn(),
    // Mock other functions from google_drive_service as needed for other tests
}));


// Mock displayDriveFileExplorer as it's complex and not the focus of these unit tests
// Ensure this path is correct for the renamed file.
jest.mock('../admin_drive_service', () => {
    const originalModule = jest.requireActual('../admin_drive_service');
    return {
        ...originalModule,
        displayDriveFileExplorer: jest.fn(), // Mock only this specific export
    };
});


describe('Admin Google Drive Service', () => { // Renamed
    let mockListContainer;
    let mockGamifiedAlertContainer;
    // Mock global API keys, assuming they are set in the HTML or similar
    let originalGoogleDriveApiKey;
    let originalGoogleDriveClientId;

    beforeEach(() => {
        jest.clearAllMocks();
        globalCourseDataMap.clear();

        // Mock global API key and Client ID
        originalGoogleDriveApiKey = window.GOOGLE_DRIVE_API_KEY;
        originalGoogleDriveClientId = window.GOOGLE_DRIVE_CLIENT_ID;
        window.GOOGLE_DRIVE_API_KEY = 'test_api_key';
        window.GOOGLE_DRIVE_CLIENT_ID = 'test_client_id';

        // Setup basic DOM elements needed by some functions
        mockListContainer = document.createElement('div');
        mockListContainer.id = 'drive-migration-course-list'; // Renamed
        document.body.appendChild(mockListContainer);

        mockGamifiedAlertContainer = document.createElement('div');
        mockGamifiedAlertContainer.id = 'drive-migration-gamified-alert'; // Renamed
        document.body.appendChild(mockGamifiedAlertContainer);

        const explorerContainer = document.createElement('div');
        explorerContainer.id = 'drive-file-explorer-dynamic-container'; // Renamed
        document.body.appendChild(explorerContainer);

        // Mock for gapi.auth2.getAuthInstance needed by updateAuthStatus
        if (!window.gapi) window.gapi = {};
        if (!window.gapi.auth2) window.gapi.auth2 = {};
        window.gapi.auth2.getAuthInstance = jest.fn().mockReturnValue({
            currentUser: {
                get: () => ({
                    getBasicProfile: () => ({
                        getEmail: () => 'testuser@example.com'
                    })
                })
            }
        });

    });

    afterEach(() => {
        document.body.removeChild(mockListContainer);
        document.body.removeChild(mockGamifiedAlertContainer);
        const explorerContainer = document.getElementById('drive-file-explorer-dynamic-container');
        if (explorerContainer) {
            document.body.removeChild(explorerContainer);
        }
        // Restore original global values
        window.GOOGLE_DRIVE_API_KEY = originalGoogleDriveApiKey;
        window.GOOGLE_DRIVE_CLIENT_ID = originalGoogleDriveClientId;
    });

    describe('loadCoursesForDriveMigration', () => { // Renamed
        it('should show "Access Denied" if user is not admin', () => {
            currentUser.isAdmin = false;
            loadCoursesForDriveMigration();
            expect(mockListContainer.innerHTML).toContain('Access Denied');
            currentUser.isAdmin = true;
        });

        it('should show "Please sign in" if user is not signed into Drive', () => {
            driveService.isSignedIn.mockReturnValueOnce(false);
            loadCoursesForDriveMigration();
            expect(mockListContainer.innerHTML).toContain('Please sign in with Google');
        });

        it('should show "No courses" if globalCourseDataMap is empty and user signed in', () => {
            driveService.isSignedIn.mockReturnValueOnce(true);
            loadCoursesForDriveMigration();
            expect(showLoading).toHaveBeenCalledWith("Surveying courses for Google Drive readiness..."); // Renamed
            expect(mockListContainer.innerHTML).toContain('No courses charted for exploration.');
            expect(hideLoading).toHaveBeenCalled();
        });

        it('should display fully migrated courses correctly', () => {
            driveService.isSignedIn.mockReturnValueOnce(true);
            globalCourseDataMap.set('course1', {
                id: 'course1', name: 'Course 1', courseDirName: 'c1',
                driveCourseRootFolderId: 'rootId1', driveTranscriptionsFolderId: 'transId1',
                drivePdfFolderId: 'pdfId1', driveMcqFolderId: 'mcqId1'
            });
            loadCoursesForDriveMigration();
            expect(mockListContainer.innerHTML).toContain('Fully Migrated to Google Drive'); // Renamed
            expect(mockListContainer.innerHTML).toContain('Explore Course Space'); // Renamed
        });

        it('should display partially migrated courses correctly', () => {
            driveService.isSignedIn.mockReturnValueOnce(true);
            globalCourseDataMap.set('course2', {
                id: 'course2', name: 'Course 2', courseDirName: 'c2',
                driveTranscriptionsFolderId: 'transId2'
            });
            loadCoursesForDriveMigration();
            expect(mockListContainer.innerHTML).toContain('Partially Migrated to Google Drive'); // Renamed
            expect(mockListContainer.innerHTML).toContain('Start Migration'); // Text changed
            expect(mockGamifiedAlertContainer.innerHTML).toContain('1 course(s) are pending migration to Google Drive'); // Renamed
        });

        it('should display unmigrated courses correctly', () => {
            driveService.isSignedIn.mockReturnValueOnce(true);
            globalCourseDataMap.set('course3', {
                id: 'course3', name: 'Course 3', courseDirName: 'c3'
            });
            loadCoursesForDriveMigration();
            expect(mockListContainer.innerHTML).toContain('Not Migrated to Google Drive (Local Only)'); // Renamed
            expect(mockListContainer.innerHTML).toContain('Start Migration');
        });
    });

    describe('startDriveMigration', () => { // Renamed
        let mockStatusContainer;
        let mockMigrateButton;

        beforeEach(() => {
            globalCourseDataMap.set('course1', { id: 'course1', name: 'Test Course 1', courseDirName: 'test_course_1_dir' });

            mockStatusContainer = document.createElement('div');
            mockStatusContainer.id = 'migration-status-drive-course1'; // Renamed
            document.body.appendChild(mockStatusContainer);

            mockMigrateButton = document.createElement('button');
            mockMigrateButton.id = 'migrate-drive-btn-course1'; // Renamed
            document.body.appendChild(mockMigrateButton);

            driveService.isSignedIn.mockReturnValue(true); // Assume signed in for migration start
        });

        afterEach(() => {
            document.body.removeChild(mockStatusContainer);
            document.body.removeChild(mockMigrateButton);
        });

        it('should successfully migrate a course to Google Drive', async () => {
            driveService.findOrCreateFolder
                .mockResolvedValueOnce('lyceumRootFolderId') // LyceumCourses_Test
                .mockResolvedValueOnce('courseMainDriveFolderId') // Course specific folder
                .mockResolvedValueOnce('textbookFullFolderId')   // Textbook_Full
                .mockResolvedValueOnce('textbookChaptersFolderId')// Textbook_Chapters
                .mockResolvedValueOnce('transcriptionsFolderId') // Transcriptions_Archive
                .mockResolvedValueOnce('assessmentsFolderId');   // Generated_Assessments

            driveService.uploadFile.mockResolvedValue({ name: 'README_Migration_Log.txt', id: 'readmeFileId', webViewLink: 'readmeLink' });
            updateCourseDefinition.mockResolvedValue(true);

            await startDriveMigration('course1');

            expect(driveService.findOrCreateFolder).toHaveBeenCalledWith("LyceumCourses_Test", 'root');
            expect(driveService.findOrCreateFolder).toHaveBeenCalledWith("test_course_1_dir", "lyceumRootFolderId");
            expect(driveService.uploadFile).toHaveBeenCalledTimes(4); // For the 4 standard subfolders
            expect(updateCourseDefinition).toHaveBeenCalledWith('course1', expect.objectContaining({
                driveCourseRootFolderId: 'courseMainDriveFolderId',
                driveTranscriptionsFolderId: 'transcriptionsFolderId',
                // Check other Drive IDs based on what startDriveMigration saves
            }));
            expect(mockStatusContainer.innerHTML).toContain('Migration Complete: Course \'Test Course 1\' successfully migrated to Google Drive.');
        });

        it('should handle Google Drive initialization/connection failure (simulated by findOrCreateFolder failing)', async () => {
            driveService.findOrCreateFolder.mockRejectedValue(new Error("Drive API error")); // Simulate failure

            window.alert = jest.fn();
            await startDriveMigration('course1');

            expect(driveService.findOrCreateFolder).toHaveBeenCalled();
            expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Google Drive Migration for course course1 failed: Drive API error'));
            expect(mockStatusContainer.innerHTML).toContain('Google Drive Migration Failed');
            window.alert.mockRestore();
        });
    });

    describe('handleDriveFileDownload', () => { // Renamed
        it('should call driveService.downloadFile with the file ID and name', async () => {
            const fileName = 'testFile.pdf';
            const fileId = 'driveFileId123';
            driveService.downloadFile.mockResolvedValueOnce(); // Simulate successful download call

            await handleDriveFileDownload(fileName, fileId);

            expect(driveService.downloadFile).toHaveBeenCalledWith(fileId, fileName);
            expect(showLoading).toHaveBeenCalledWith(`Preparing ${fileName} for download...`);
            expect(hideLoading).toHaveBeenCalled();
        });

        it('should show alert if fileId is missing', () => {
            window.alert = jest.fn();
            handleDriveFileDownload('testFile.pdf', null);
            expect(window.alert).toHaveBeenCalledWith("File ID unavailable. Cannot start download.");
            window.alert.mockRestore();
        });

        it('should show alert if user is not signed in', () => {
            driveService.isSignedIn.mockReturnValueOnce(false);
            window.alert = jest.fn();
            handleDriveFileDownload('testFile.pdf', 'fileId123');
            expect(window.alert).toHaveBeenCalledWith("Please sign in to download files.");
            window.alert.mockRestore();
        });
    });
});
