// __tests__/admin_google_drive_service.test.js

import { loadCoursesForGoogleDriveMigration, startGoogleDriveMigration, handleGoogleDriveFileDownload } from '../admin_google_drive_service'; // UPDATED_IMPORT
import { globalCourseDataMap, currentUser } from '../state';
import { showLoading, hideLoading } from '../utils';
import { updateCourseDefinition } from '../firebase_firestore';
import {
    initialize as gDriveInitialize,
    createFolder as gDriveCreateFolder,
    findFolder as gDriveFindFolder,
    uploadFile as gDriveUploadFile,
    downloadFile as gDriveDownloadFile, // Assuming this is used by handleGoogleDriveFileDownload
    getFolderContents as gDriveGetFolderContents // For explorer, if its tests were here
} from '../google_drive_service'; // UPDATED_IMPORT

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
jest.mock('../google_drive_service', () => ({ // UPDATED_MOCK_PATH
    initialize: jest.fn(),
    createFolder: jest.fn(),
    findFolder: jest.fn(),
    uploadFile: jest.fn(),
    downloadFile: jest.fn(), // Mock for download
    getFolderContents: jest.fn(), // Mock for explorer functionality
}));

// Mock displayGoogleDriveFileExplorer as it's complex and not the focus of these unit tests
// It's imported from admin_google_drive_service.js
jest.mock('../admin_google_drive_service', () => {
    const originalModule = jest.requireActual('../admin_google_drive_service');
    return {
        ...originalModule,
        displayGoogleDriveFileExplorer: jest.fn(), // Mock only this specific export
    };
});


describe('Admin Google Drive Service', () => { // RENAMED_SUITE
    let mockListContainer;
    let mockGamifiedAlertContainer;

    beforeEach(() => {
        jest.clearAllMocks();
        globalCourseDataMap.clear();

        mockListContainer = document.createElement('div');
        mockListContainer.id = 'gdrive-migration-course-list'; // RENAMED_ID
        document.body.appendChild(mockListContainer);

        mockGamifiedAlertContainer = document.createElement('div');
        mockGamifiedAlertContainer.id = 'gdrive-migration-gamified-alert'; // RENAMED_ID
        document.body.appendChild(mockGamifiedAlertContainer);

        const explorerContainer = document.createElement('div');
        explorerContainer.id = 'gdrive-file-explorer-dynamic-container'; // RENAMED_ID
        document.body.appendChild(explorerContainer);
    });

    afterEach(() => {
        document.body.removeChild(mockListContainer);
        document.body.removeChild(mockGamifiedAlertContainer);
        const explorerContainer = document.getElementById('gdrive-file-explorer-dynamic-container'); // RENAMED_ID
        if (explorerContainer) {
            document.body.removeChild(explorerContainer);
        }
    });

    describe('loadCoursesForGoogleDriveMigration', () => { // RENAMED_FUNCTION
        it('should show "Access Denied" if user is not admin', () => {
            currentUser.isAdmin = false;
            loadCoursesForGoogleDriveMigration(); // RENAMED_CALL
            expect(mockListContainer.innerHTML).toContain('Access Denied');
            currentUser.isAdmin = true;
        });

        it('should show "No courses" if globalCourseDataMap is empty', () => {
            loadCoursesForGoogleDriveMigration(); // RENAMED_CALL
            expect(showLoading).toHaveBeenCalledWith("Surveying courses for Google Drive readiness..."); // RENAMED_TEXT
            expect(mockListContainer.innerHTML).toContain('No courses charted for exploration.');
            expect(hideLoading).toHaveBeenCalled();
        });

        it('should display fully migrated courses correctly', () => {
            globalCourseDataMap.set('course1', {
                id: 'course1', name: 'Course 1', courseDirName: 'c1',
                gdriveTranscriptionsFolderId: 'id_trans', gdrivePdfFolderId: 'id_pdf', // RENAMED_FIELDS
                gdriveMcqFolderId: 'id_mcq', gdriveCourseRootFolderId: 'id_root', gdriveCourseRootWebLink: 'http://drive.google.com/root' // RENAMED_FIELDS
            });
            loadCoursesForGoogleDriveMigration(); // RENAMED_CALL
            expect(mockListContainer.innerHTML).toContain('Fully Migrated to Google Drive'); // RENAMED_TEXT
            expect(mockListContainer.innerHTML).toContain('Explore Course Vault');
        });

        it('should display partially migrated courses correctly', () => {
            globalCourseDataMap.set('course2', {
                id: 'course2', name: 'Course 2', courseDirName: 'c2',
                gdriveTranscriptionsFolderId: 'id_trans' // RENAMED_FIELD
            });
            loadCoursesForGoogleDriveMigration(); // RENAMED_CALL
            expect(mockListContainer.innerHTML).toContain('Partially Migrated to Google Drive'); // RENAMED_TEXT
            expect(mockListContainer.innerHTML).toContain('Start Migration'); // Text changed
            expect(mockGamifiedAlertContainer.innerHTML).toContain('1 course(s) are pending migration to Google Drive'); // RENAMED_TEXT
        });

        it('should display unmigrated courses correctly', () => {
            globalCourseDataMap.set('course3', {
                id: 'course3', name: 'Course 3', courseDirName: 'c3'
            });
            loadCoursesForGoogleDriveMigration(); // RENAMED_CALL
            expect(mockListContainer.innerHTML).toContain('Not Migrated (Local Only)');
            expect(mockListContainer.innerHTML).toContain('Start Migration'); // Text changed
        });
    });

    describe('startGoogleDriveMigration', () => { // RENAMED_FUNCTION
        let mockStatusContainer;
        let mockMigrateButton;

        beforeEach(() => {
            globalCourseDataMap.set('course1', { id: 'course1', name: 'Test Course 1', courseDirName: 'test_course_1_dir' });

            mockStatusContainer = document.createElement('div');
            mockStatusContainer.id = 'migration-status-gdrive-course1'; // RENAMED_ID
            document.body.appendChild(mockStatusContainer);

            mockMigrateButton = document.createElement('button');
            mockMigrateButton.id = 'migrate-gdrive-btn-course1'; // RENAMED_ID
            document.body.appendChild(mockMigrateButton);

            // Removed window.prompt mocks as Google Drive service doesn't use them
        });

        afterEach(() => {
            document.body.removeChild(mockStatusContainer);
            document.body.removeChild(mockMigrateButton);
        });

        it('should successfully migrate a course to Google Drive', async () => {
            const mockRootGFolder = { id: 'gdrive_lyceum_root_id', name: 'Lyceum_Courses_GoogleDrive', webViewLink: 'http://drive.google.com/lyceum_root' };
            const mockCourseGFolder = { id: 'gdrive_course_folder_id', name: 'test_course_1_dir', webViewLink: 'http://drive.google.com/course_folder' };
            const mockSubGFolder = { id: 'gdrive_subfolder_id', name: 'SubFolder', webViewLink: 'http://drive.google.com/sub_folder' };

            gDriveInitialize.mockResolvedValue(true); // Simulate successful initialization
            gDriveFindFolder.mockImplementation((folderName, parentId) => {
                if (folderName === "Lyceum_Courses_GoogleDrive" && parentId === 'root') return Promise.resolve(mockRootGFolder);
                if (folderName === "test_course_1_dir" && parentId === mockRootGFolder.id) return Promise.resolve(mockCourseGFolder);
                return Promise.resolve(null); // Simulate subfolders not found initially, so they get created
            });
            gDriveCreateFolder.mockImplementation((folderName, parentId) => {
                 if (folderName === "Transcriptions_Archive") return Promise.resolve({...mockSubGFolder, name: folderName, id: 'trans_id'});
                 if (folderName === "Textbook_Chapter_Vault") return Promise.resolve({...mockSubGFolder, name: folderName, id: 'pdf_id'});
                 if (folderName === "Generated_Assessments") return Promise.resolve({...mockSubGFolder, name: folderName, id: 'mcq_id'});
                 // Fallback for any other unexpected createFolder call
                 return Promise.resolve(mockSubGFolder);
            });
            gDriveUploadFile.mockResolvedValue({ name: 'README_GDrive_Archive_Log.txt', id: 'readme_file_id', webViewLink: 'http://...' });
            updateCourseDefinition.mockResolvedValue(true);

            await startGoogleDriveMigration('course1'); // RENAMED_CALL

            expect(gDriveInitialize).toHaveBeenCalled();
            expect(gDriveFindFolder).toHaveBeenCalledWith("Lyceum_Courses_GoogleDrive", 'root');
            expect(gDriveFindFolder).toHaveBeenCalledWith("test_course_1_dir", mockRootGFolder.id);
            expect(gDriveCreateFolder).toHaveBeenCalledTimes(3); // For Transcriptions, Textbook, Generated Assessments assuming they are not found
            expect(gDriveUploadFile).toHaveBeenCalledTimes(3);
            expect(updateCourseDefinition).toHaveBeenCalledWith('course1', expect.objectContaining({
                gdriveCourseRootFolderId: mockCourseGFolder.id,
                gdriveTranscriptionsFolderId: 'trans_id',
                // check other IDs as well
            }));
            expect(mockStatusContainer.innerHTML).toContain('Migration Complete: Course \'Test Course 1\' successfully migrated to Google Drive.'); // RENAMED_TEXT
        });

        it('should handle Google Drive initialization failure', async () => {
            gDriveInitialize.mockRejectedValue(new Error("G Drive init failed")); // Simulate failure

            window.alert = jest.fn(); // Mock alert
            await startGoogleDriveMigration('course1'); // RENAMED_CALL

            expect(gDriveInitialize).toHaveBeenCalled();
            expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Google Drive Migration for course course1 failed: G Drive init failed')); // RENAMED_TEXT
            expect(mockStatusContainer.innerHTML).toContain('Google Drive Migration Failed: G Drive init failed'); // RENAMED_TEXT
            window.alert.mockRestore();
        });
    });

    describe('handleGoogleDriveFileDownload', () => { // RENAMED_FUNCTION
        it('should call gDriveDownloadFile with file ID and name', async () => {
            const fileId = 'gdriveFileId123';
            const fileName = 'testFile.pdf';

            gDriveInitialize.mockResolvedValue(true); // Ensure initialize is mocked if called internally
            gDriveDownloadFile.mockResolvedValue({ name: fileName, size: 1024 }); // Simulate successful download from service

            await handleGoogleDriveFileDownload(fileId, fileName); // RENAMED_CALL

            expect(gDriveDownloadFile).toHaveBeenCalledWith(fileId, fileName);
            expect(showLoading).toHaveBeenCalledWith(`Preparing ${fileName} for download from Google Drive...`); // RENAMED_TEXT
            expect(hideLoading).toHaveBeenCalled();
        });

        it('should show alert if fileId is missing', async () => {
            window.alert = jest.fn();
            await handleGoogleDriveFileDownload(null, 'testFile.pdf'); // RENAMED_CALL
            expect(window.alert).toHaveBeenCalledWith("File ID unavailable. Cannot start download.");
            expect(gDriveDownloadFile).not.toHaveBeenCalled();
            window.alert.mockRestore();
        });

        it('should handle errors from gDriveDownloadFile', async () => {
            const fileId = 'gdriveFileId123';
            const fileName = 'testFile.pdf';
            gDriveInitialize.mockResolvedValue(true);
            gDriveDownloadFile.mockRejectedValue(new Error("Drive download failed"));
            window.alert = jest.fn();

            await handleGoogleDriveFileDownload(fileId, fileName); // RENAMED_CALL

            expect(gDriveDownloadFile).toHaveBeenCalledWith(fileId, fileName);
            expect(window.alert).toHaveBeenCalledWith(`Google Drive download error for "${fileName}": Drive download failed`); // RENAMED_TEXT
            expect(hideLoading).toHaveBeenCalled(); // Ensure loading is hidden even on error
            window.alert.mockRestore();
        });
    });
});
