// __tests__/google_drive_service_server.test.js
const { initialize, findOrCreateFolder, uploadFile, getFolderContents, getFileLink, isRetryableError } = require('../google_drive_service_server');
const { google } = require('googleapis');
const fs = require('fs');
const stream = require('stream');

// Mock googleapis
jest.mock('googleapis', () => {
    const mockFiles = {
        list: jest.fn(),
        create: jest.fn(),
        get: jest.fn(),
        update: jest.fn(), // Added for potential use in getFileLink or future functions
    };
    const mockPermissions = {
        create: jest.fn(),
        list: jest.fn(), // Added for potential use in getFileLink
    };
    const mockDrive = {
        files: jest.fn(() => mockFiles), // Return the mockFiles object
        permissions: jest.fn(() => mockPermissions), // Return the mockPermissions object
    };
    return {
        google: {
            drive: jest.fn(() => mockDrive),
            auth: {
                GoogleAuth: jest.fn().mockImplementation(() => ({
                    getClient: jest.fn().mockResolvedValue({}), // Mock getClient
                })),
            },
        },
        // Export specific error types if needed for more granular error mocking
        // Common: { GoogleApisError: class GoogleApisError extends Error { constructor(message, options) { super(message); this.errors = options?.errors; this.code = options?.code; } } }
    };
});

// Mock fs
jest.mock('fs', () => ({
    createReadStream: jest.fn(),
    existsSync: jest.fn(),
}));

describe('Google Drive Server Service', () => {
    let mockDriveClient;
    let mockFilesList;
    let mockFilesCreate;
    let mockFilesGet;
    let mockPermissionsCreate;

    beforeEach(() => {
        jest.clearAllMocks();

        // Retrieve mocks from the googleapis mock
        // The way googleapis is mocked, google.drive() returns a function,
        // that when called, returns the object with 'files' and 'permissions' properties.
        // So, we need to call google.drive()() to get to the 'files' and 'permissions' functions.
        const driveInstance = google.drive(); // This is the object { files: jest.fn(), permissions: jest.fn() }
        mockDriveClient = driveInstance; // Not strictly needed if using below, but good for clarity
        mockFilesList = driveInstance.files().list;
        mockFilesCreate = driveInstance.files().create;
        mockFilesGet = driveInstance.files().get;
        mockPermissionsCreate = driveInstance.permissions().create;

        // Default mock implementations
        fs.existsSync.mockReturnValue(true);
        fs.createReadStream.mockReturnValue(new stream.Readable({ read() {} }));
    });

    describe('initialize', () => {
        it('should initialize the Google Drive client with API key', async () => {
            await initialize('test_api_key');
            expect(google.drive).toHaveBeenCalledWith({ version: 'v3', auth: 'test_api_key' });
        });

        it('should throw error if API key is missing', async () => {
            await expect(initialize(null)).rejects.toThrow('Google Drive API key is missing.');
        });
    });

    describe('isRetryableError', () => {
        it('should identify 429 as retryable', () => {
            expect(isRetryableError({ code: 429 })).toBe(true);
        });
        it('should identify 500 as retryable', () => {
            expect(isRetryableError({ code: 500 })).toBe(true);
        });
        it('should identify network error message as retryable', () => {
            expect(isRetryableError({ message: 'network error something' })).toBe(true);
        });
        it('should identify other errors as not retryable', () => {
            expect(isRetryableError({ code: 400 })).toBe(false);
            expect(isRetryableError({ message: 'bad request' })).toBe(false);
        });
    });

    describe('findOrCreateFolder', () => {
        beforeEach(async () => {
            await initialize('test_api_key'); // Ensure 'drive' is initialized
        });

        it('should find an existing folder', async () => {
            mockFilesList.mockResolvedValueOnce({
                data: { files: [{ id: 'folder123', name: 'ExistingFolder' }] },
            });
            const folderId = await findOrCreateFolder('ExistingFolder', 'root');
            expect(folderId).toBe('folder123');
            expect(mockFilesList).toHaveBeenCalledWith(expect.objectContaining({
                q: "mimeType='application/vnd.google-apps.folder' and name='ExistingFolder' and 'root' in parents and trashed=false",
            }));
            expect(mockFilesCreate).not.toHaveBeenCalled();
        });

        it('should create a folder if not found', async () => {
            mockFilesList.mockResolvedValueOnce({ data: { files: [] } }); // Not found
            mockFilesCreate.mockResolvedValueOnce({ data: { id: 'newFolder456' } }); // Created

            const folderId = await findOrCreateFolder('NewFolder', 'parent123');
            expect(folderId).toBe('newFolder456');
            expect(mockFilesList).toHaveBeenCalledWith(expect.objectContaining({
                q: "mimeType='application/vnd.google-apps.folder' and name='NewFolder' and 'parent123' in parents and trashed=false",
            }));
            expect(mockFilesCreate).toHaveBeenCalledWith({
                resource: { name: 'NewFolder', mimeType: 'application/vnd.google-apps.folder', parents: ['parent123'] },
                fields: 'id',
            });
        });

        it('should retry on retryable API errors for list', async () => {
            mockFilesList
                .mockRejectedValueOnce({ code: 500, message: 'Server error' }) // First call fails
                .mockResolvedValueOnce({ data: { files: [{ id: 'folder123', name: 'ExistingFolder' }] } }); // Second call succeeds

            const folderId = await findOrCreateFolder('ExistingFolder', 'root');
            expect(folderId).toBe('folder123');
            expect(mockFilesList).toHaveBeenCalledTimes(2);
        });
         it('should retry on retryable API errors for create', async () => {
            mockFilesList.mockResolvedValueOnce({ data: { files: [] } }); // Not found
            mockFilesCreate
                .mockRejectedValueOnce({ code: 429, message: 'Rate limit' }) // First create fails
                .mockResolvedValueOnce({ data: { id: 'newFolder789' } }); // Second create succeeds

            const folderId = await findOrCreateFolder('AnotherNewFolder', 'root');
            expect(folderId).toBe('newFolder789');
            expect(mockFilesList).toHaveBeenCalledTimes(1);
            expect(mockFilesCreate).toHaveBeenCalledTimes(2);
        });

        it('should throw error after max retries', async () => {
            mockFilesList.mockRejectedValue({ code: 503, message: 'Service unavailable' }); // Persistent error

            await expect(findOrCreateFolder('FailFolder', 'root')).rejects.toThrow('Failed to find or create folder "FailFolder" after 5 retries: Service unavailable');
            expect(mockFilesList).toHaveBeenCalledTimes(6); // 1 initial + 5 retries
        });
    });

    describe('uploadFile', () => {
        beforeEach(async () => {
            await initialize('test_api_key');
        });

        it('should upload a file successfully', async () => {
            mockFilesCreate.mockResolvedValueOnce({
                data: { id: 'fileId789', webViewLink: 'http://example.com/file789' },
            });
            const result = await uploadFile('local/path/to/file.txt', 'remoteFile.txt', 'folderIdAbc');
            expect(result).toEqual({ id: 'fileId789', webViewLink: 'http://example.com/file789' });
            expect(fs.existsSync).toHaveBeenCalledWith('local/path/to/file.txt');
            expect(fs.createReadStream).toHaveBeenCalledWith('local/path/to/file.txt');
            expect(mockFilesCreate).toHaveBeenCalledWith({
                resource: { name: 'remoteFile.txt', parents: ['folderIdAbc'] },
                media: { mimeType: 'application/octet-stream', body: expect.any(stream.Readable) },
                fields: 'id, webViewLink',
            });
        });

        it('should throw if local file does not exist', async () => {
            fs.existsSync.mockReturnValueOnce(false);
            await expect(uploadFile('nonexistent.txt', 'remote.txt', 'folder123'))
                .rejects.toThrow('Local file not found: nonexistent.txt');
        });
    });

    describe('getFolderContents', () => {
        beforeEach(async () => {
            await initialize('test_api_key');
        });

        it('should return list of files and folders', async () => {
            const mockFiles = [
                { id: 'id1', name: 'file1.txt', mimeType: 'text/plain', webViewLink: 'link1' },
                { id: 'id2', name: 'subfolder', mimeType: 'application/vnd.google-apps.folder', webViewLink: 'link2' },
            ];
            mockFilesList.mockResolvedValueOnce({ data: { files: mockFiles } });

            const contents = await getFolderContents('folderIdXyz');
            expect(contents).toEqual(mockFiles.map(f => ({ id: f.id, name: f.name, mimeType: f.mimeType, webViewLink: f.webViewLink })));
            expect(mockFilesList).toHaveBeenCalledWith({
                q: "'folderIdXyz' in parents and trashed=false",
                fields: 'files(id, name, mimeType, webViewLink)',
                spaces: 'drive',
            });
        });
         it('should return empty array if no files found', async () => {
            mockFilesList.mockResolvedValueOnce({ data: { files: [] } });
            const contents = await getFolderContents('emptyFolderId');
            expect(contents).toEqual([]);
        });
    });

    describe('getFileLink', () => {
        beforeEach(async () => {
            await initialize('test_api_key');
        });

        it('should return webViewLink and ensure public permission', async () => {
            mockFilesGet.mockResolvedValueOnce({
                data: {
                    id: 'file123', name: 'TestFile', webViewLink: 'http://example.com/file123',
                    permissions: [{ type: 'user', role: 'owner' }] // Not public yet
                }
            });
            mockPermissionsCreate.mockResolvedValueOnce({}); // Permission creation succeeds

            const link = await getFileLink('file123');
            expect(link).toBe('http://example.com/file123');
            expect(mockFilesGet).toHaveBeenCalledWith({ fileId: 'file123', fields: 'id, name, webViewLink, permissions(type, role)' });
            expect(mockPermissionsCreate).toHaveBeenCalledWith({
                fileId: 'file123',
                requestBody: { role: 'reader', type: 'anyone' },
            });
        });

        it('should return webViewLink if already publicly readable', async () => {
            mockFilesGet.mockResolvedValueOnce({
                data: {
                    id: 'filePublic', name: 'PublicFile', webViewLink: 'http://example.com/filePublic',
                    permissions: [{ type: 'anyone', role: 'reader' }]
                }
            });
            const link = await getFileLink('filePublic');
            expect(link).toBe('http://example.com/filePublic');
            expect(mockPermissionsCreate).not.toHaveBeenCalled();
        });

        it('should log warning if permission creation fails but still return link', async () => {
            mockFilesGet.mockResolvedValueOnce({
                data: {
                    id: 'filePermFail', name: 'PermFailFile', webViewLink: 'http://example.com/filePermFail',
                    permissions: []
                }
            });
            mockPermissionsCreate.mockRejectedValueOnce(new Error('Permission API error'));

            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
            const link = await getFileLink('filePermFail');
            expect(link).toBe('http://example.com/filePermFail');
            expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Could not set public read permission for file filePermFail: Permission API error.'));
            consoleWarnSpy.mockRestore();
        });
    });
});
