console.log('[TestScript] run_mega_test.mjs started.');
import { initialize, uploadFile, createFolder, findFolder } from './mega_service.mjs';
import { readFileSync } from 'fs'; // To read dummy file contents

// Helper to simulate File object from a local file path for testing
function createFileObjectFromFile(filePath, remoteName) {
  const content = readFileSync(filePath); // Read as Buffer
  // In Node.js, megajs expects a Buffer or a path for uploads, not a Blob.
  // Since mega_service.mjs is written for browser (uses Blob/File),
  // we need to provide something that has .size and can be consumed by it.
  // The `upload` method in megajs StorageNode takes `data` which can be a String (path) or Buffer in Node.
  // Our `uploadFile` passes its `fileObject` argument as this `data`.
  // So, for Node.js testing, `fileObject` should be a Buffer or string path.
  // Let's use Buffer. Buffers have a `length` property, not `size`.
  // We need to ensure our `uploadFile` correctly gets the size.
  // `fileSize = fileObject.size;` is in `uploadFile`.
  // So the object we pass must have a `size` property.

  // Let's assume `mega_service.mjs` is intended for browser usage where `File` objects have `.size` and `.name`.
  // To test it in Node.js, we need to provide a similar structure.
  // We can pass a Buffer as the data, and provide `remoteFileName` and `fileSize` explicitly
  // if `uploadFile` was structured to take them.
  // OR, we make a "mock" File object for Node.js.

  // The current `uploadFile` in `mega_service.mjs` takes `fileObject` as the first argument,
  // and this `fileObject` is passed as the data to `megajs`.
  // It also uses `fileObject.size`.
  // So, we need to pass the Buffer and ensure it has a `size` property.
  // This is a bit hacky.
  const dataBuffer = content; // This is a Buffer
  dataBuffer.size = dataBuffer.length; // Add size property to buffer
  return { data: dataBuffer, name: remoteName || filePath, size: dataBuffer.length };
}


async function mainTest() {
  console.log('Starting MEGA upload throttling test...');
  try {
    await initialize();
    console.log('MEGA service initialized.');

    const testFolderName = `LyceumRateLimitTestFolder_${Date.now()}`;
    console.log(`Using test folder: ${testFolderName}`);

    let targetFolder = await findFolder(testFolderName);
    if (!targetFolder) {
      console.log(`Test folder not found, creating: ${testFolderName}`);
      targetFolder = await createFolder(testFolderName);
      console.log(`Test folder "${testFolderName}" created.`);
    } else {
      console.log(`Test folder "${testFolderName}" already exists.`);
    }

    if (!targetFolder) {
        console.error("Failed to create or find target folder. Aborting test.");
        return;
    }

    const filesToUpload = [
      { path: "./test_file_1.txt", remoteName: "test_upload_1.txt" },
      // { path: "./test_file_2.txt", remoteName: "test_upload_2.txt" },
      // { path: "./test_file_3.txt", remoteName: "test_upload_3.txt" },
    ];

    const uploadPromises = [];

    console.log("\nQueueing uploads...");
    for (const fileInfo of filesToUpload) {
      const fileData = readFileSync(fileInfo.path);
      // Pass the Buffer directly as fileObject.
      // Provide remoteFileName.
      // The `uploadFile` function will attempt to read `fileObject.size`.
      // We need to ensure this works or adjust.
      // Let's modify the object passed to have a 'size' property to mimic a File object.
      const fileLikeObject = {
          data: fileData, // This isn't used by uploadFile, it expects the object itself to be data
          name: fileInfo.remoteName, // Used if remoteFileName arg is null
          size: fileData.length // Crucial for `fileSize = fileObject.size;`
      };
      
      // The actual data passed to megajs `upload` is the first argument of `uploadFile`.
      // So, we pass the buffer, and ensure `remoteFileName` is given, and `fileSize` is also explicitly passed or correctly derived.
      // Current `uploadFile` is `uploadFile(fileObject, remoteFileName, targetFolderNode)`.
      // `fileSize` is `fileObject.size`.
      // So, the buffer itself (as `fileObject`) must have a `size` property.
      
      const bufferWithProperties = Buffer.from(fileData); // Create a new buffer if needed
      bufferWithProperties.size = fileData.length; // Add size property
      // bufferWithProperties.name = fileInfo.remoteName; // Add name property if remoteFileName is not passed

      console.log(`Preparing to queue: ${fileInfo.remoteName} (Size: ${bufferWithProperties.size} bytes)`);
      // Call uploadFile: pass the buffer (which now has a .size property) as fileObject,
      // and also provide remoteFileName.
      const promise = uploadFile(bufferWithProperties, fileInfo.remoteName, targetFolder)
        .then(result => {
          console.log(`SUCCESS: Uploaded "${result.name}". Link: ${result.link} (Size: ${result.size})`);
          return result; // Pass result for Promise.all
        })
        .catch(error => {
          console.error(`ERROR uploading "${fileInfo.remoteName}":`, error);
          // throw error; // Re-throw if Promise.all should fail on first error
        });
      uploadPromises.push(promise);
    }

    console.log(`\nAll ${uploadPromises.length} files have been dispatched to the upload queue.`);
    console.log("Waiting for all uploads to complete according to the queue logic...\n");

    const results = await Promise.all(uploadPromises);
    console.log("\n--------------------------------------------------");
    console.log("All upload promises resolved.");
    console.log("Test Summary:");
    results.forEach((result, index) => {
        if (result) {
            console.log(`  ${index + 1}. ${result.name} - Success`);
        } else {
            console.log(`  ${index + 1}. A file upload might have failed (see logs above).`);
        }
    });
    console.log(`Test folder: "${testFolderName}" (Please verify contents and clean up manually if needed).`);
    console.log("--------------------------------------------------\n");

  } catch (error) {
    console.error("An critical error occurred during the test:", error);
  } finally {
    // megaStorage.close() if such a method exists and is needed for graceful exit in Node.js
    // For now, the process will just exit.
    console.log("Test script finished.");
  }
}

mainTest();
