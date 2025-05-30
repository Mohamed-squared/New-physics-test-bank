// __tests__/google_drive_service.test.js

import * as driveService from '../google_drive_service.js';

// Mock the global gapi object
global.gapi = {
    load: jest.fn((libs, callback) => callback()),
    client: {
        init: jest.fn().mockResolvedValue(undefined),
        load: jest.fn().mockResolvedValue(undefined),
        drive: {
            files: {
                list: jest.fn(),
                create: jest.fn(),
                get: jest.fn(),
            },
            permissions: {
                create: jest.fn(),
            },
        },
        request: jest.fn(),
    },
    auth2: {
        getAuthInstance: jest.fn(() => ({
            isSignedIn: {
                get: jest.fn().mockReturnValue(false), // Default to not signed in
                listen: jest.fn(),
            },
            currentUser: {
                get: jest.fn(() => ({
                    hasGrantedScopes: jest.fn().mockReturnValue(true),
                    getBasicProfile: () => ({
                        getEmail: () => 'test@example.com',
                        getName: () => 'Test User',
                    }),
                })),
            },
            signIn: jest.fn().mockResolvedValue({}),
            signOut: jest.fn().mockResolvedValue({}),
        })),
        init: jest.fn().mockResolvedValue({}), // Mock gapi.auth2.init as well if needed
    },
};


describe('Google Drive Client Service (google_drive_service.js)', () => {
    const API_KEY = 'test-api-key';
    const CLIENT_ID = 'test-client-id.apps.googleusercontent.com';

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset sign-in state for auth2.getAuthInstance().isSignedIn.get()
        const authInstance = gapi.auth2.getAuthInstance();
        if (authInstance) {
            authInstance.isSignedIn.get.mockReturnValue(false);
        }
    });

    describe('initialize', () => {
        it('should initialize gapi.client and load drive API', async () => {
            await driveService.initialize(API_KEY, CLIENT_ID);
            expect(gapi.load).toHaveBeenCalledWith('client:auth2', expect.any(Function));
            expect(gapi.client.init).toHaveBeenCalledWith({
                apiKey: API_KEY,
                clientId: CLIENT_ID,
                discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
                scope: 'https://www.googleapis.com/auth/drive',
            });
            expect(gapi.client.load).toHaveBeenCalledWith('drive', 'v3');
        });

        it('should handle initialization with API key only', async () => {
            await driveService.initialize(API_KEY, null); // No clientId
            expect(gapi.client.init).toHaveBeenCalledWith({
                apiKey: API_KEY,
                clientId: null,
                discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
                scope: 'https://www.googleapis.com/auth/drive',
            });
            expect(gapi.auth2.getAuthInstance).toHaveBeenCalled(); // It's called, but googleAuth might be null/less functional
        });
         it('should reject if gapi is not loaded', async () => {
            const originalGapi = global.gapi;
            global.gapi = undefined; // Simulate gapi not being loaded
            await expect(driveService.initialize(API_KEY, CLIENT_ID))
                .rejects
                .toThrow('gapi is not loaded.');
            global.gapi = originalGapi; // Restore gapi
        });
    });

    describe('Authentication (signIn, signOut, isSignedIn)', () => {
        beforeEach(async () => {
            // Ensure initialized for auth tests
            await driveService.initialize(API_KEY, CLIENT_ID);
        });

        it('isSignedIn should reflect gapi.auth2 state', () => {
            gapi.auth2.getAuthInstance().isSignedIn.get.mockReturnValueOnce(true);
            expect(driveService.isSignedIn()).toBe(true);

            gapi.auth2.getAuthInstance().isSignedIn.get.mockReturnValueOnce(false);
            expect(driveService.isSignedIn()).toBe(false);
        });

        it('signIn should call gapi.auth2.getAuthInstance().signIn()', async () => {
            await driveService.signIn();
            expect(gapi.auth2.getAuthInstance().signIn).toHaveBeenCalled();
        });

        it('signOut should call gapi.auth2.getAuthInstance().signOut()', async () => {
            await driveService.signOut();
            expect(gapi.auth2.getAuthInstance().signOut).toHaveBeenCalled();
        });
    });

    describe('findOrCreateFolder', () => {
        beforeEach(async () => {
            await driveService.initialize(API_KEY, CLIENT_ID);
        });

        it('should find an existing folder', async () => {
            gapi.client.drive.files.list.mockResolvedValueOnce({
                result: { files: [{ id: 'folder123', name: 'ExistingFolder' }] },
            });
            const folderId = await driveService.findOrCreateFolder('ExistingFolder', 'root');
            expect(folderId).toBe('folder123');
            expect(gapi.client.drive.files.list).toHaveBeenCalledWith(expect.objectContaining({
                q: "mimeType='application/vnd.google-apps.folder' and name='ExistingFolder' and 'root' in parents and trashed=false",
            }));
        });

        it('should create a folder if not found', async () => {
            gapi.client.drive.files.list.mockResolvedValueOnce({ result: { files: [] } });
            gapi.client.drive.files.create.mockResolvedValueOnce({ result: { id: 'newFolder456' } });

            const folderId = await driveService.findOrCreateFolder('NewFolder', 'parent123');
            expect(folderId).toBe('newFolder456');
            expect(gapi.client.drive.files.create).toHaveBeenCalledWith(expect.objectContaining({
                resource: { name: 'NewFolder', mimeType: 'application/vnd.google-apps.folder', parents: ['parent123'] },
            }));
        });
    });

    describe('uploadFile', () => {
        let mockFileObject;

        beforeEach(async () => {
            await driveService.initialize(API_KEY, CLIENT_ID);
            mockFileObject = new File(["file content"], "test.txt", { type: "text/plain" });

            // Mock FileReader
            global.FileReader = jest.fn(() => ({
                readAsDataURL: jest.fn(),
                onload: null,
                onerror: null,
                result: 'data:text/plain;base64,ZmlsZSBjb250ZW50', // "file content" base64 encoded
            }));
        });

        it('should upload a file using multipart request', async () => {
            gapi.client.request.mockResolvedValueOnce({
                result: { id: 'fileId789', webViewLink: 'http://example.com/file789' },
            });

            // Trigger onload manually for FileReader mock
            const promise = driveService.uploadFile(mockFileObject, 'remoteTest.txt', 'folderAbc');
            const readerInstance = FileReader.mock.instances[0];
            readerInstance.onload({ target: { result: readerInstance.result } }); // Simulate successful read

            const result = await promise;

            expect(result).toEqual({ id: 'fileId789', webViewLink: 'http://example.com/file789' });
            expect(gapi.client.request).toHaveBeenCalledWith(expect.objectContaining({
                path: '/upload/drive/v3/files',
                method: 'POST',
                params: { uploadType: 'multipart' },
                headers: expect.objectContaining({
                    'Content-Type': expect.stringContaining('multipart/related; boundary='),
                }),
                body: expect.stringContaining('Content-Type: application/json'),
            }));
        });
         it('should throw error if fileObject is missing', async () => {
            await expect(driveService.uploadFile(null, 'remote.txt', 'folder123'))
                .rejects.toThrow('File object is required for upload.');
        });
    });

    describe('getFolderContents', () => {
        beforeEach(async () => {
            await driveService.initialize(API_KEY, CLIENT_ID);
        });

        it('should return formatted list of folder contents', async () => {
            const apiResponse = {
                result: {
                    files: [
                        { id: 'id1', name: 'file1.txt', mimeType: 'text/plain', webViewLink: 'link1' },
                        { id: 'id2', name: 'subfolder', mimeType: 'application/vnd.google-apps.folder', webViewLink: 'link2' },
                    ],
                },
            };
            gapi.client.drive.files.list.mockResolvedValueOnce(apiResponse);
            const contents = await driveService.getFolderContents('folderId123');
            expect(contents).toEqual([
                { id: 'id1', name: 'file1.txt', mimeType: 'text/plain', webViewLink: 'link1' },
                { id: 'id2', name: 'subfolder', mimeType: 'application/vnd.google-apps.folder', webViewLink: 'link2' },
            ]);
            expect(gapi.client.drive.files.list).toHaveBeenCalledWith(expect.objectContaining({
                q: "'folderId123' in parents and trashed=false",
            }));
        });
    });

    describe('getFileLink', () => {
        beforeEach(async () => {
            await driveService.initialize(API_KEY, CLIENT_ID);
        });

        it('should get file metadata and attempt to set public permission if needed', async () => {
            gapi.client.drive.files.get.mockResolvedValueOnce({
                result: { id: 'fileAbc', name: 'TestFile', webViewLink: 'http://example.com/fileAbc', permissions: [] },
            });
            gapi.client.drive.permissions.create.mockResolvedValueOnce({}); // Permission creation success

            const link = await driveService.getFileLink('fileAbc');
            expect(link).toBe('http://example.com/fileAbc');
            expect(gapi.client.drive.files.get).toHaveBeenCalledWith({ fileId: 'fileAbc', fields: 'id, name, webViewLink, permissions(type, role)' });
            expect(gapi.client.drive.permissions.create).toHaveBeenCalledWith({
                fileId: 'fileAbc',
                resource: { role: 'reader', type: 'anyone' },
            });
        });
    });

    describe('downloadFile', () => {
        let createElementSpy, appendChildSpy, clickSpy, removeChildSpy, revokeObjectURLSpy;

        beforeEach(async () => {
            await driveService.initialize(API_KEY, CLIENT_ID);
            // Mock DOM manipulation for download
            createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue({ href: '', download: '', click: jest.fn(), style: {} });
            appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(() => {});
            removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation(() => {});
            // Mock URL.createObjectURL and URL.revokeObjectURL
            global.URL.createObjectURL = jest.fn().mockReturnValue('blob:http://localhost/mock-blob-url');
            global.URL.revokeObjectURL = jest.fn();
        });
         afterEach(() => {
            createElementSpy.mockRestore();
            appendChildSpy.mockRestore();
            removeChildSpy.mockRestore();
            global.URL.createObjectURL.mockRestore();
            global.URL.revokeObjectURL.mockRestore();
        });

        it('should fetch file media and trigger browser download', async () => {
            gapi.client.drive.files.get.mockResolvedValueOnce({
                body: 'file content here', // Raw file content
                headers: { 'Content-Type': 'text/plain' },
            });

            await driveService.downloadFile('fileIdXyz', 'downloadedFile.txt');

            expect(gapi.client.drive.files.get).toHaveBeenCalledWith({ fileId: 'fileIdXyz', alt: 'media' });
            expect(createElementSpy).toHaveBeenCalledWith('a');
            expect(appendChildSpy).toHaveBeenCalled();
            expect(global.URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
            // Check if the mocked anchor's click was called
            const mockAnchor = createElementSpy.mock.results[0].value;
            expect(mockAnchor.click).toHaveBeenCalled();
            expect(removeChildSpy).toHaveBeenCalled();
            expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/mock-blob-url');
        });
    });
});
