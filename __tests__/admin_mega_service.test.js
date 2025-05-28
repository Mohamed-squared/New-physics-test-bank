// __tests__/admin_mega_service.test.js

import { loadCoursesForMegaMigration, startMegaMigration, handleMegaFileDownload, displayMegaFileExplorer } from '../admin_mega_service'; // Adjust path as needed
import { globalCourseDataMap, currentUser } from '../state';
import { showLoading, hideLoading } from '../utils';
import { updateCourseDefinition } from '../firebase_firestore';
import { 
    initialize as megaInitialize, 
    createFolder as megaCreateFolder, 
    findFolder as megaFindFolder, 
    uploadFile as megaUploadFile 
} from '../mega_service';

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
jest.mock('../mega_service', () => ({
    initialize: jest.fn(),
    createFolder: jest.fn(),
    findFolder: jest.fn(),
    uploadFile: jest.fn(),
    megaStorage: { // Mock megaStorage if it's used directly for things like File.fromURL
        File: {
            fromURL: jest.fn().mockReturnValue({ // Mock the File object and its methods if needed
                loadAttributes: jest.fn().mockResolvedValue(true), // Example: if loadAttributes is called
                name: 'mocked_mega_file.pdf' 
            })
        }
    }
}));

// Mock displayMegaFileExplorer as it's complex and not the focus of these unit tests
jest.mock('../admin_mega_service', () => {
    const originalModule = jest.requireActual('../admin_mega_service');
    return {
        ...originalModule,
        displayMegaFileExplorer: jest.fn(), // Mock only this specific export
    };
});


describe('Admin MEGA Service', () => {
    let mockListContainer;
    let mockGamifiedAlertContainer;

    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();
        globalCourseDataMap.clear();

        // Setup basic DOM elements needed by some functions
        mockListContainer = document.createElement('div');
        mockListContainer.id = 'mega-migration-course-list';
        document.body.appendChild(mockListContainer);

        mockGamifiedAlertContainer = document.createElement('div');
        mockGamifiedAlertContainer.id = 'mega-migration-gamified-alert';
        document.body.appendChild(mockGamifiedAlertContainer);

        // Mock for displayMegaFileExplorer's container if needed by other functions
        const explorerContainer = document.createElement('div');
        explorerContainer.id = 'mega-file-explorer-dynamic-container';
        document.body.appendChild(explorerContainer);
    });

    afterEach(() => {
        // Clean up DOM elements
        document.body.removeChild(mockListContainer);
        document.body.removeChild(mockGamifiedAlertContainer);
        const explorerContainer = document.getElementById('mega-file-explorer-dynamic-container');
        if (explorerContainer) {
            document.body.removeChild(explorerContainer);
        }
    });

    describe('loadCoursesForMegaMigration', () => {
        it('should show "Access Denied" if user is not admin', () => {
            currentUser.isAdmin = false; // Override mock for this test
            loadCoursesForMegaMigration();
            expect(mockListContainer.innerHTML).toContain('Access Denied');
            currentUser.isAdmin = true; // Reset for other tests
        });

        it('should show "No courses" if globalCourseDataMap is empty', () => {
            loadCoursesForMegaMigration();
            expect(showLoading).toHaveBeenCalledWith("Surveying courses for MEGA readiness...");
            expect(mockListContainer.innerHTML).toContain('No courses charted for exploration.');
            expect(hideLoading).toHaveBeenCalled();
        });

        it('should display fully migrated courses correctly', () => {
            globalCourseDataMap.set('course1', {
                id: 'course1', name: 'Course 1', courseDirName: 'c1',
                megaTranscriptionsFolderLink: 'link1', megaPdfFolderLink: 'link2',
                megaMcqFolderLink: 'link3', megaCourseRootFolderLink: 'link_root'
            });
            loadCoursesForMegaMigration();
            expect(mockListContainer.innerHTML).toContain('Fully Migrated to MEGA Cloud');
            expect(mockListContainer.innerHTML).toContain('Explore Course Vault');
        });

        it('should display partially migrated courses correctly', () => {
            globalCourseDataMap.set('course2', {
                id: 'course2', name: 'Course 2', courseDirName: 'c2',
                megaTranscriptionsFolderLink: 'link1'
            });
            loadCoursesForMegaMigration();
            expect(mockListContainer.innerHTML).toContain('Partially Anchored on MEGA');
            expect(mockListContainer.innerHTML).toContain('Initiate MEGA Voyage');
            expect(mockGamifiedAlertContainer.innerHTML).toContain('1 course(s) are awaiting their voyage');
        });

        it('should display unmigrated courses correctly', () => {
            globalCourseDataMap.set('course3', {
                id: 'course3', name: 'Course 3', courseDirName: 'c3'
            });
            loadCoursesForMegaMigration();
            expect(mockListContainer.innerHTML).toContain('Awaiting Maiden Voyage (Local Only)');
            expect(mockListContainer.innerHTML).toContain('Initiate MEGA Voyage');
        });
    });

    describe('startMegaMigration', () => {
        let mockStatusContainer;
        let mockMigrateButton;

        beforeEach(() => {
            globalCourseDataMap.set('course1', { id: 'course1', name: 'Test Course 1', courseDirName: 'test_course_1_dir' });
            
            mockStatusContainer = document.createElement('div');
            mockStatusContainer.id = 'migration-status-course1';
            document.body.appendChild(mockStatusContainer);

            mockMigrateButton = document.createElement('button');
            mockMigrateButton.id = 'migrate-btn-course1';
            document.body.appendChild(mockMigrateButton);

            // Mock prompt
            window.prompt = jest.fn()
                .mockReturnValueOnce('test@example.com') // megaEmail
                .mockReturnValueOnce('password123');    // megaPassword
        });

        afterEach(() => {
            document.body.removeChild(mockStatusContainer);
            document.body.removeChild(mockMigrateButton);
            window.prompt.mockRestore();
        });

        it('should successfully migrate a course', async () => {
            const mockRootNode = { name: 'LyceumRoot', link: jest.fn().mockResolvedValue('root_link') };
            const mockCourseNode = { name: 'TestCourseNode', link: jest.fn().mockResolvedValue('course_link'), key: 'course_key' };
            const mockSubFolderNode = { name: 'SubFolder', link: jest.fn().mockResolvedValue('sub_link'), key: 'sub_key' };
            
            megaInitialize.mockResolvedValue({ root: mockRootNode });
            megaFindFolder.mockImplementation((folderName, parentNode) => {
                if (folderName === "LyceumCourses_Test" && parentNode === mockRootNode) return Promise.resolve(mockRootNode);
                if (folderName === "test_course_1_dir" && parentNode === mockRootNode) return Promise.resolve(mockCourseNode);
                return Promise.resolve(mockSubFolderNode); // For subfolders
            });
            megaCreateFolder.mockImplementation((folderName, parentNode) => {
                 if (folderName === "LyceumCourses_Test" && parentNode === mockRootNode) return Promise.resolve(mockRootNode);
                 if (folderName === "test_course_1_dir" && parentNode === mockRootNode) return Promise.resolve(mockCourseNode);
                 return Promise.resolve(mockSubFolderNode);
            });
            megaUploadFile.mockResolvedValue({ name: 'README_Archive_Log.txt' });
            updateCourseDefinition.mockResolvedValue(true);

            await startMegaMigration('course1');

            expect(megaInitialize).toHaveBeenCalledWith('test@example.com', 'password123');
            expect(megaFindFolder).toHaveBeenCalledWith("LyceumCourses_Test", mockRootNode);
            expect(megaFindFolder).toHaveBeenCalledWith("test_course_1_dir", mockRootNode);
            expect(megaCreateFolder).toHaveBeenCalledTimes(0); // Assuming folders are found
            expect(megaUploadFile).toHaveBeenCalledTimes(3); // Transcriptions, PDFs, MCQs
            expect(updateCourseDefinition).toHaveBeenCalledWith('course1', expect.any(Object));
            expect(mockStatusContainer.innerHTML).toContain('Mission Accomplished!');
        });

        it('should handle MEGA initialization failure', async () => {
            megaInitialize.mockResolvedValue(null); // Simulate failure
            
            window.alert = jest.fn(); // Mock alert
            await startMegaMigration('course1');
            
            expect(megaInitialize).toHaveBeenCalled();
            expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Migration voyage for course course1 failed: MEGA Starbase connection failed'));
            expect(mockStatusContainer.innerHTML).toContain('Mission Aborted');
            window.alert.mockRestore();
        });
    });

    describe('handleMegaFileDownload', () => {
        beforeEach(() => {
            // Mock window.open
            global.open = jest.fn();
        });

        afterEach(() => {
            global.open.mockRestore();
        });

        it('should call window.open with the correct URL for download', () => {
            const fileName = 'testFile.pdf';
            const fileLink = 'https://mega.nz/file/someLink';
            handleMegaFileDownload(fileName, fileLink);
            expect(global.open).toHaveBeenCalledWith(fileLink + '?d=1', '_blank');
        });

        it('should append &d=1 if link already has query params', () => {
            const fileName = 'testFile.pdf';
            const fileLink = 'https://mega.nz/file/someLink?param=true';
            handleMegaFileDownload(fileName, fileLink);
            expect(global.open).toHaveBeenCalledWith(fileLink + '&d=1', '_blank');
        });

        it('should show alert if fileLink is missing', () => {
            window.alert = jest.fn();
            handleMegaFileDownload('testFile.pdf', null);
            expect(window.alert).toHaveBeenCalledWith("File link unavailable. Cannot initiate download warp sequence.");
            window.alert.mockRestore();
        });
    });
});
