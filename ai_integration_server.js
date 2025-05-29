// ai_integration_server.js

const fs = require('fs');
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

const DEFAULT_API_KEYS_ARRAY = [
  "AIzaSyAfAn-Ti1V9g2DTUi9tdjErGtddSVoa3iM", // Original key
  "AIzaSyAKOtEzrQWzitRJ627-iZ6v182xfb7KJLo",
  "AIzaSyDUt_A4NU4mLwiHdcP0Qr6BRaaERP97kGo",
  "AIzaSyDN52jguMN5ibjh6GyGPltxeyB9UYAxdew",
  "AIzaSyDKbDVAiHKGIgyy6bZmaY4wyBpzfgRMYhw",
  "AIzaSyCxhEq4RF8PEzQCDbineXiFhvEjzBz8CAA"
];
const DEFAULT_API_KEY = DEFAULT_API_KEYS_ARRAY; // Keep variable name for minimal diff, but it's now an array.
let defaultApiKeyIndex = 0; // Module-level index for cycling through default keys

/**
 * Extracts text content from all pages of a PDF file.
 * @param {string} pdfPath - Path to the PDF file on the local server filesystem.
 * @returns {Promise<string>} The extracted text content.
 * @throws {Error} If the file is not found or if PDF parsing fails.
 */
async function getAllPdfTextForAI(pdfPath) {
  console.log(`Starting PDF text extraction for: ${pdfPath}`);
  try {
    if (!fs.existsSync(pdfPath)) {
      console.error(`PDF file not found: ${pdfPath}`);
      throw new Error(`PDF file not found: ${pdfPath}`);
    }

    const dataBuffer = fs.readFileSync(pdfPath);
    console.log(`PDF file read successfully: ${pdfPath}`);

    const data = await pdfParse(dataBuffer);
    console.log(`PDF parsed successfully. Extracted ${data.text.length} characters.`);
    return data.text;
  } catch (error) {
    console.error(`Error during PDF processing for ${pdfPath}:`, error);
    if (error instanceof Error && error.message.includes('PDF file not found')) {
        throw error;
    }
    throw new Error(`Failed to extract text from PDF ${pdfPath}: ${error.message}`);
  }
}

/**
 * Calls the Google Generative AI (Gemini) text API.
 * @param {string} apiKey - Google AI API Key.
 * @param {string} prompt - The user's prompt.
 * @param {Array<object>} [history=null] - Optional chat history. 
 *                                         Each item: { role: "user"|"model", parts: [{ text: "..." }] }
 * @param {string} [systemInstruction=null] - Optional system instruction.
 * @param {string} [modelName='gemini-2.5-flash-preview-05-20'] - The name of the model to use.
 * @returns {Promise<string>} The text response from the API.
 * @throws {Error} If the API call fails or content is blocked.
 */
async function callGeminiTextAPI(apiKey, prompt, history = null, systemInstruction = null, modelName = 'gemini-2.5-flash-preview-05-20') {
  let processedApiKey = apiKey; // Start with the input
  let logReasonForDefault = "API key not provided or empty after processing.";

  const originalApiKeyType = typeof apiKey;
  const originalApiKeySnippet = typeof apiKey === 'string' ? apiKey.substring(0, 70) + (apiKey.length > 70 ? '...' : '') : JSON.stringify(apiKey, null, 2);
  console.log(`[AI Service - Text API] Received raw API key. Type: ${originalApiKeyType}, Snippet: ${originalApiKeySnippet}`);

  if (typeof processedApiKey === 'string' && processedApiKey.startsWith('[') && processedApiKey.endsWith(']')) {
    try {
      const parsedArray = JSON.parse(processedApiKey);
      if (Array.isArray(parsedArray)) {
        console.log(`[AI Service - Text API] API key was a stringified array. Parsed: ${JSON.stringify(parsedArray)}`);
        const firstStringKey = parsedArray.find(k => typeof k === 'string' && k.trim() !== '');
        if (firstStringKey) {
          processedApiKey = firstStringKey.trim();
          console.log(`[AI Service - Text API] Extracted key from stringified array: ${processedApiKey.substring(0,15)}...`);
        } else {
          logReasonForDefault = "Stringified array API key did not contain a valid string key.";
          processedApiKey = null; 
        }
      }
    } catch (e) {
      console.warn(`[AI Service - Text API] Failed to parse stringified array-like API key, will use string directly if valid: ${e.message}`);
      // If parsing fails, it might be a key that happens to start/end with brackets.
      // The existing string check below will handle it.
    }
  }
  
  // Fallback for other non-string types or if stringified array processing resulted in null
  if (typeof processedApiKey !== 'string' || processedApiKey.trim() === '') {
    if (Array.isArray(processedApiKey)) {
        console.log(`[AI Service - Text API] API key is an array: ${JSON.stringify(processedApiKey)}`);
        const firstStringKeyFromArray = processedApiKey.find(k => typeof k === 'string' && k.trim() !== '');
        if (firstStringKeyFromArray) {
            processedApiKey = firstStringKeyFromArray.trim();
            console.log(`[AI Service - Text API] Extracted key from array: ${processedApiKey.substring(0,15)}...`);
        } else {
            logReasonForDefault = "Array API key did not contain a valid string key.";
            processedApiKey = null;
        }
    } else if (typeof processedApiKey === 'object' && processedApiKey !== null) {
        console.log(`[AI Service - Text API] API key is an object: ${JSON.stringify(processedApiKey)}`);
        const commonKeys = ['key', 'apiKey', 'value'];
        let foundKey = null;
        for (const k of commonKeys) {
            if (typeof processedApiKey[k] === 'string' && processedApiKey[k].trim() !== '') {
                foundKey = processedApiKey[k].trim();
                break;
            }
        }
        if (foundKey) {
            processedApiKey = foundKey;
            console.log(`[AI Service - Text API] Extracted key from object: ${processedApiKey.substring(0,15)}...`);
        } else {
            logReasonForDefault = "Object API key did not contain a valid string key under common properties.";
            processedApiKey = null;
        }
    } else if (processedApiKey) { // It was some other non-empty, non-string type
        logReasonForDefault = `API key was of unexpected type: ${typeof processedApiKey}.`;
        processedApiKey = null;
    }
  } else { // It was a string, trim it.
      processedApiKey = processedApiKey.trim();
      if(processedApiKey === '') {
          logReasonForDefault = "API key was an empty string after trimming.";
          processedApiKey = null;
      }
  }

  // let effectiveApiKey = null; // This line is removed, the next declaration is kept.
  if (processedApiKey) { // A single key was successfully extracted from the input parameter
      effectiveApiKey = processedApiKey;
      console.log(`[AI Service - Text API] Using processed API key from input parameter: ${effectiveApiKey.substring(0,15)}...`);
  } else {
      console.warn(`[AI Service - Text API] ${logReasonForDefault} No valid API key from input parameter. Attempting to use default API keys.`);
      if (Array.isArray(DEFAULT_API_KEYS_ARRAY) && DEFAULT_API_KEYS_ARRAY.length > 0) {
          let foundKey = null;
          let checkedCount = 0;
          const totalKeys = DEFAULT_API_KEYS_ARRAY.length;
          while (checkedCount < totalKeys) {
              const currentIndex = defaultApiKeyIndex % totalKeys;
              const potentialKey = DEFAULT_API_KEYS_ARRAY[currentIndex];
              defaultApiKeyIndex = (currentIndex + 1) % totalKeys; // Move to next for next time, even if this one is invalid

              if (typeof potentialKey === 'string' && potentialKey.trim() !== '') {
                  foundKey = potentialKey.trim();
                  break; 
              }
              checkedCount++;
          }

          if (foundKey) {
              effectiveApiKey = foundKey;
              console.log(`[AI Service - Text API] Using default API key (index ${ (defaultApiKeyIndex -1 + totalKeys) % totalKeys}) from pool: ${effectiveApiKey.substring(0,15)}...`);
          } else {
              console.error('[AI Service - Text API] CRITICAL: Default API key array is configured but contains NO valid string keys after checking all.');
              // effectiveApiKey remains null
          }
      } else {
          console.error('[AI Service - Text API] CRITICAL: Default API key array is not configured or empty.');
          // effectiveApiKey remains null
      }
  }
  
  // The apiKeySnippet for logging should be defined AFTER effectiveApiKey is determined.
  // Moved apiKeySnippet definition down.

  const functionName = "callGeminiTextAPI";
  // const apiKeySnippet = effectiveApiKey.substring(0, 15); // Moved down
  const promptSnippet = prompt.substring(0, 100);

  console.log(`[${functionName}] Preparing API call. Model: ${modelName}, Prompt: "${promptSnippet}..."`);

  if (!effectiveApiKey || effectiveApiKey.trim() === '') { // Final check on effectiveApiKey
    const errorMsg = `[${functionName}] CRITICAL: Effective API Key is missing or empty. Prompt: "${promptSnippet}"`;
    console.error(errorMsg);
    throw new Error('Google AI API Key is required and could not be resolved for the call.');
  }
  
  const apiKeySnippet = effectiveApiKey.substring(0, 15); // Define here, now that effectiveApiKey is set.

  const MAX_RETRIES = 3;
  const INITIAL_BACKOFF_MS = 1000;
  let retries = 0;

  // Helper function to check for transient errors
  const isTransientError = (error) => {
    const errorMessage = error.message.toLowerCase();
    const transientErrorSignatures = [
      "fetch failed", "eai_again", "econnreset", "etimedout", "socket timeout",
      "service unavailable", "internal server error", "http status 500", "http status 503", "http status 429"
    ];
    return transientErrorSignatures.some(sig => errorMessage.includes(sig));
  };

  const functionName = "callGeminiTextAPI";
  const apiKeySnippet = effectiveApiKey.substring(0, 15);
  const promptSnippet = prompt.substring(0, 100);

  while (retries < MAX_RETRIES) {
    try {
      const genAI = new GoogleGenerativeAI(effectiveApiKey);
      const model = genAI.getGenerativeModel({ model: modelName });

      const contents = [];
    if (history && Array.isArray(history)) {
      history.forEach(item => {
        if (item && item.role && item.parts) {
          contents.push(item);
        }
      });
    }
    contents.push({ role: "user", parts: [{ text: prompt }] });

    const generationConfig = {
      temperature: 0.6,
      maxOutputTokens: 65536, 
      // topK, topP can also be set here if needed
    };

    // Define safety settings - adjust as per application needs
    // Example: Block none for now, but this should be configured carefully
    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ];
    
    const requestPayload = {
        contents,
        generationConfig,
        safetySettings,
    };

      if (systemInstruction) {
          requestPayload.systemInstruction = { role: "system", parts: [{ text: systemInstruction }] };
          console.log(`Using system instruction: "${systemInstruction.substring(0,100)}..."`);
      }

      console.log(`[${functionName}] Attempt ${retries + 1}/${MAX_RETRIES} Sending request to Gemini API. Key: ${apiKeySnippet}..., Prompt: "${promptSnippet}..."`);
      const result = await model.generateContent(requestPayload);
      
      console.log(`[${functionName}] Received response from Gemini API.`);
      const response = result.response;

      if (!response) {
          const logMsg = `[${functionName}] Gemini API call failed: No response object. Key: ${apiKeySnippet}..., Prompt: "${promptSnippet}"`;
          console.error(logMsg, result);
          if (result.promptFeedback && result.promptFeedback.blockReason) {
              throw new Error(`${logMsg}. Request was blocked due to prompt content: ${result.promptFeedback.blockReason}`);
          }
          // It's possible 'response' is null but candidate data exists with blocking info
          if (result.candidates && result.candidates[0] && result.candidates[0].finishReason === 'SAFETY') {
               throw new Error(`${logMsg}. Response was blocked due to safety settings. Finish reason: SAFETY. Details: ${JSON.stringify(result.candidates[0].safetyRatings)}`);
          }
          throw new Error(`${logMsg}. No response object or content blocked.`);
      }
      
      const candidate = response.candidates && response.candidates[0];
      if (candidate) {
        if (candidate.finishReason === 'RECITATION') {
          const recitationMsg = `[${functionName}] Gemini API call resulted in RECITATION. Key: ${apiKeySnippet}..., Prompt: "${promptSnippet}"`;
          console.warn(recitationMsg, candidate);
          const recitationError = new Error(`${recitationMsg}. Finish reason: ${candidate.finishReason}. Safety ratings: ${JSON.stringify(candidate.safetyRatings)}.`);
          recitationError.isRecitationError = true; // Custom property
          recitationError.details = candidate; // Attach details for further inspection if needed
          throw recitationError;
        }

        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0 && candidate.content.parts[0].text) {
          const textResponse = candidate.content.parts[0].text;
          console.log(`[AI Service - ${functionName}] Gemini Text API call successful. Response length: ${textResponse.length}`);
          if (response.usageMetadata) {
            console.log(`[AI Service - ${functionName}] Gemini Text API Usage Metadata: `, response.usageMetadata);
          } else {
            console.log(`[AI Service - ${functionName}] Gemini Text API Usage Metadata: Not available in response.`);
          }
          return textResponse; // Successful response
        }
      }
      
      // If we reach here, it means no valid text content was found or another issue occurred.
      const noContentMsg = `[${functionName}] Gemini Text API call failed: No valid text content in response. Key: ${apiKeySnippet}..., Prompt: "${promptSnippet}"`;
      console.error(noContentMsg, response);
      if (candidate && candidate.finishReason) {
        const finishReason = candidate.finishReason;
        const safetyRatings = JSON.stringify(candidate.safetyRatings);
        const usageMetadataString = response.usageMetadata ? JSON.stringify(response.usageMetadata) : "Not available";

        if (finishReason === 'MAX_TOKENS') {
          throw new Error(`${noContentMsg}. The response was truncated because the maximum output token limit was reached (MAX_TOKENS). Consider adjusting input length or output token settings. Usage: ${usageMetadataString}. Safety ratings: ${safetyRatings}`);
        }
        throw new Error(`${noContentMsg}. Finish reason: ${finishReason}. Safety ratings: ${safetyRatings}. Usage: ${usageMetadataString}`);
      }
      throw new Error(`${noContentMsg}. No text content in the response and no specific finish reason found.`);

    } catch (error) {
      const timestamp = new Date().toISOString();
      console.error(`[${functionName}] Error during API call (Attempt ${retries + 1}/${MAX_RETRIES}). Timestamp: ${timestamp}. Key: ${apiKeySnippet}..., Prompt: "${promptSnippet}". Error: ${error.message}`, error.stack);

      if (error.isRecitationError) { // Propagate recitation error for specific handling
        throw error; // This will be caught by the outer RECITATION handling wrapper
      }

      if (isTransientError(error) && retries < MAX_RETRIES - 1) {
        const backoffDelay = INITIAL_BACKOFF_MS * Math.pow(2, retries);
        console.log(`[${functionName}] Transient error detected (Attempt ${retries + 1}/${MAX_RETRIES}). Retrying in ${backoffDelay}ms... Error: ${error.message}`);
        retries++;
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      } else {
        // Non-transient error or max retries reached
        const finalErrorMsg = `[${functionName}] Failed after ${retries + 1} attempt(s) for prompt "${promptSnippet}..." with key "${apiKeySnippet}...": ${error.message}`;
        console.error(finalErrorMsg, error.stack); // Log stack for the final error as well
        throw new Error(finalErrorMsg, { cause: error });
      }
    }
  }
  // This part should ideally not be reached if loop exits due to error, as error would be thrown.
  // If loop completes without returning/throwing (e.g. if MAX_RETRIES = 0), throw error.
  const maxRetryErrorMsg = `[${functionName}] Max retries (${MAX_RETRIES}) reached without success for prompt "${promptSnippet}...".`;
  console.error(maxRetryErrorMsg);
  throw new Error(maxRetryErrorMsg);
}


// Specific RECITATION handling wrapper for callGeminiTextAPI
async function callGeminiTextAPIWithRecitationHandling(apiKey, prompt, history = null, systemInstruction = null, modelName = 'gemini-2.5-flash-preview-05-20') {
  const functionName = "callGeminiTextAPIWithRecitationHandling";
  // Resolve effectiveApiKey once here for logging and passing to the core function.
  // This duplicates some logic from the start of callGeminiTextAPI, but ensures the wrapper also has access
  // to a resolved key for consistent logging, especially if the initial call fails before even entering the retry loop.
  // For simplicity in this step, we'll pass the raw apiKey and let callGeminiTextAPI resolve it.
  // The snippet for logging here will use the raw key.
  const apiKeySnippet = typeof apiKey === 'string' ? apiKey.substring(0, 15) + "..." : "N/A (or non-string type)";
  const promptSnippet = String(prompt).substring(0, 100);

  try {
    // The actual resolution of apiKey (including defaults) happens inside callGeminiTextAPI
    return await callGeminiTextAPI(apiKey, prompt, history, systemInstruction, modelName);
  } catch (error) {
    // Check if the error was thrown by our retry logic and has our custom 'isRecitationError'
    // This check should ideally be on `error.cause` if `callGeminiTextAPI` wraps it, or directly if not.
    // Based on current `callGeminiTextAPI` structure, `isRecitationError` is on the error itself.
    if (error.isRecitationError || (error.cause && error.cause.isRecitationError)) {
      const originalError = error.cause || error; // Get the actual recitation error
      console.warn(`[${functionName}] Initial call resulted in RECITATION. Key: ${apiKeySnippet}..., Prompt: "${promptSnippet}". Details: ${originalError.message}. Attempting one retry with modified prompt.`);
      
      const modifiedPrompt = prompt + "\n\nPlease ensure the response is original and does not closely mirror the provided text.";
      
      try {
        // Retry once with the modified prompt
        console.log(`[${functionName}] Retrying with modified prompt for RECITATION. Key: ${apiKeySnippet}...`);
        // Pass the original apiKey, history, systemInstruction, modelName
        return await callGeminiTextAPI(apiKey, modifiedPrompt, history, systemInstruction, modelName);
      } catch (retryError) {
        const timestamp = new Date().toISOString();
        const retryPromptSnippet = modifiedPrompt.substring(0,150);
        console.error(`[${functionName}] Retry attempt for RECITATION also failed. Timestamp: ${timestamp}. Key: ${apiKeySnippet}..., Prompt (modified): "${retryPromptSnippet}...". Error: ${retryError.message}`, retryError.stack);
        
        // Check if the retry error is also a recitation error
        const isRetryRecitation = retryError.isRecitationError || (retryError.cause && retryError.cause.isRecitationError);
        const finalUnderlyingError = retryError.cause || retryError;

        if (isRetryRecitation) {
          throw new Error(`[${functionName}] Persistent RECITATION error after retry for prompt "${promptSnippet}...". Original error: ${originalError.message}. Retry error: ${finalUnderlyingError.message}`, { cause: finalUnderlyingError });
        }
        throw new Error(`[${functionName}] Error during retry for RECITATION for prompt "${promptSnippet}...". Original error: ${originalError.message}. Retry error: ${finalUnderlyingError.message}`, { cause: finalUnderlyingError });
      }
    } else {
      // Not a recitation error we are specifically handling here, or it's a wrapped error from the retry loop that isn't recitation.
      // The error message from callGeminiTextAPI's retry loop is already quite descriptive.
      console.error(`[${functionName}] An error occurred that is not being handled as a RECITATION case. Key: ${apiKeySnippet}, Prompt: "${promptSnippet}". Error: ${error.message}`, error.stack);
      throw error; // Rethrow the already processed error
    }
  }
}


module.exports = {
  getAllPdfTextForAI,
  callGeminiTextAPI: callGeminiTextAPIWithRecitationHandling, // Expose the wrapped version
  _callGeminiTextAPI_direct: callGeminiTextAPI, // For testing or specific internal use if needed
  generateImageContentResponse,
};

// Helper function to determine MIME type from file extension
function getMimeType(filePath) {
  const extension = filePath.split('.').pop().toLowerCase();
  switch (extension) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'heic':
      return 'image/heic';
    case 'heif':
      return 'image/heif';
    default:
      // Default to JPEG if unknown, or throw an error
      // For robustness, consider a more comprehensive MIME type library if many formats are expected
      console.warn(`Unknown image extension: ${extension}. Defaulting to image/jpeg.`);
      return 'image/jpeg'; 
  }
}

/**
 * Generates content based on images and a text prompt using Google Generative AI.
 * @param {string[]} imagePaths - An array of local file paths to the images.
 * @param {string} prompt - The text prompt to accompany the images.
 * @param {string} apiKey - Google AI API Key.
 * @param {string} [modelName='gemini-1.5-flash'] - The name of the vision model to use.
 * @returns {Promise<string>} The text response from the API.
 * @throws {Error} If the API call fails, content is blocked, or image processing fails.
 */
async function generateImageContentResponse(imagePaths, prompt, apiKey, modelName = 'gemini-1.5-flash') {
  // Comprehensive check for prompt type and existence
  if (!prompt || typeof prompt !== 'string') {
    console.error(`[AI Integration Server] Prompt is missing or not a string. Type: ${typeof prompt}, Value: ${prompt}`);
    throw new Error(`Prompt is required and must be a string. Received type: ${typeof prompt}`);
  }

  // let effectiveApiKey; // This line is removed, the next declaration is kept.
  let processedApiKey = apiKey; // Start with the input
  let logReasonForDefault = "API key not provided or empty after processing.";

  const originalApiKeyType = typeof apiKey;
  const originalApiKeySnippet = typeof apiKey === 'string' ? apiKey.substring(0, 70) + (apiKey.length > 70 ? '...' : '') : JSON.stringify(apiKey, null, 2);
  console.log(`[AI Service - Vision API] Received raw API key. Type: ${originalApiKeyType}, Snippet: ${originalApiKeySnippet}`);

  if (typeof processedApiKey === 'string' && processedApiKey.startsWith('[') && processedApiKey.endsWith(']')) {
    try {
      const parsedArray = JSON.parse(processedApiKey);
      if (Array.isArray(parsedArray)) {
        console.log(`[AI Service - Vision API] API key was a stringified array. Parsed: ${JSON.stringify(parsedArray)}`);
        const firstStringKey = parsedArray.find(k => typeof k === 'string' && k.trim() !== '');
        if (firstStringKey) {
          processedApiKey = firstStringKey.trim();
          console.log(`[AI Service - Vision API] Extracted key from stringified array: ${processedApiKey.substring(0,15)}...`);
        } else {
          logReasonForDefault = "Stringified array API key did not contain a valid string key.";
          processedApiKey = null;
        }
      }
    } catch (e) {
      console.warn(`[AI Service - Vision API] Failed to parse stringified array-like API key, will use string directly if valid: ${e.message}`);
    }
  }

  if (typeof processedApiKey !== 'string' || processedApiKey.trim() === '') {
    if (Array.isArray(processedApiKey)) {
        console.log(`[AI Service - Vision API] API key is an array: ${JSON.stringify(processedApiKey)}`);
        const firstStringKeyFromArray = processedApiKey.find(k => typeof k === 'string' && k.trim() !== '');
        if (firstStringKeyFromArray) {
            processedApiKey = firstStringKeyFromArray.trim();
            console.log(`[AI Service - Vision API] Extracted key from array: ${processedApiKey.substring(0,15)}...`);
        } else {
            logReasonForDefault = "Array API key did not contain a valid string key.";
            processedApiKey = null;
        }
    } else if (typeof processedApiKey === 'object' && processedApiKey !== null) {
        console.log(`[AI Service - Vision API] API key is an object: ${JSON.stringify(processedApiKey)}`);
        const commonKeys = ['key', 'apiKey', 'value'];
        let foundKey = null;
        for (const k of commonKeys) {
            if (typeof processedApiKey[k] === 'string' && processedApiKey[k].trim() !== '') {
                foundKey = processedApiKey[k].trim();
                break;
            }
        }
        if (foundKey) {
            processedApiKey = foundKey;
            console.log(`[AI Service - Vision API] Extracted key from object: ${processedApiKey.substring(0,15)}...`);
        } else {
            logReasonForDefault = "Object API key did not contain a valid string key under common properties.";
            processedApiKey = null;
        }
    } else if (processedApiKey) { 
        logReasonForDefault = `API key was of unexpected type: ${typeof processedApiKey}.`;
        processedApiKey = null;
    }
  } else { // It was a string, trim it.
      processedApiKey = processedApiKey.trim();
      if(processedApiKey === '') {
          logReasonForDefault = "API key was an empty string after trimming.";
          processedApiKey = null;
      }
  }
  
  let effectiveApiKey = null;
  if (processedApiKey) { // A single key was successfully extracted from the input parameter
      effectiveApiKey = processedApiKey;
      console.log(`[AI Service - Vision API] Using processed API key from input parameter: ${effectiveApiKey.substring(0,15)}...`);
  } else {
      console.warn(`[AI Service - Vision API] ${logReasonForDefault} No valid API key from input parameter. Attempting to use default API keys.`);
      if (Array.isArray(DEFAULT_API_KEYS_ARRAY) && DEFAULT_API_KEYS_ARRAY.length > 0) {
          let foundKey = null;
          let checkedCount = 0;
          const totalKeys = DEFAULT_API_KEYS_ARRAY.length;
          while (checkedCount < totalKeys) {
              const currentIndex = defaultApiKeyIndex % totalKeys;
              const potentialKey = DEFAULT_API_KEYS_ARRAY[currentIndex];
              defaultApiKeyIndex = (currentIndex + 1) % totalKeys; // Move to next for next time

              if (typeof potentialKey === 'string' && potentialKey.trim() !== '') {
                  foundKey = potentialKey.trim();
                  break;
              }
              checkedCount++;
          }

          if (foundKey) {
              effectiveApiKey = foundKey;
              console.log(`[AI Service - Vision API] Using default API key (index ${(defaultApiKeyIndex - 1 + totalKeys) % totalKeys}) from pool: ${effectiveApiKey.substring(0,15)}...`);
          } else {
              console.error('[AI Service - Vision API] CRITICAL: Default API key array is configured but contains NO valid string keys after checking all.');
              // effectiveApiKey remains null
          }
      } else {
          console.error('[AI Service - Vision API] CRITICAL: Default API key array is not configured or empty.');
          // effectiveApiKey remains null
      }
  }
  
  // Moved apiKeySnippet definition down.
  const functionName = "generateImageContentResponse";
  // const apiKeySnippet = effectiveApiKey.substring(0, 15); // Moved down
  const promptSnippet = prompt.substring(0, 100); // Using 100 chars for consistency

  console.log(`[${functionName}] Preparing API call. Model: ${modelName}, Prompt: "${promptSnippet}...", Images: ${imagePaths.join(', ')}`);

  if (!effectiveApiKey || effectiveApiKey.trim() === '') { // Final check
    const errorMsg = `[${functionName}] CRITICAL: Effective API Key is missing or empty. Prompt: "${promptSnippet}"`;
    console.error(errorMsg);
    throw new Error('Google AI API Key is required and could not be resolved for the call.');
  }
  
  const apiKeySnippet = effectiveApiKey.substring(0, 15); // Define here.

  if (!imagePaths || imagePaths.length === 0) {
    console.error(`[${functionName}] No image paths provided for prompt "${promptSnippet}".`);
    throw new Error(`[${functionName}] At least one image path is required for prompt "${promptSnippet}".`);
  }
  // Prompt check is already done.

  const MAX_RETRIES = 3;
  const INITIAL_BACKOFF_MS = 1000;
  let retries = 0;

  // Helper function to check for transient errors (already defined, ensure it's in scope or passed if modularized)
  // For this change, assuming it's defined as it was in the previous step for generateImageContentResponse
  const isTransientError = (error) => {
    const errorMessage = error.message.toLowerCase();
    const transientErrorSignatures = [
      "fetch failed", "eai_again", "econnreset", "etimedout", "socket timeout",
      "service unavailable", "internal server error", "http status 500", "http status 503", "http status 429"
    ];
    return transientErrorSignatures.some(sig => errorMessage.includes(sig));
  };


  while (retries < MAX_RETRIES) {
    try {
      const genAI = new GoogleGenerativeAI(effectiveApiKey);
      const model = genAI.getGenerativeModel({ model: modelName });

      const imageParts = [];
    for (const imagePath of imagePaths) {
      if (!fs.existsSync(imagePath)) {
        console.error(`Image file not found: ${imagePath}`);
        throw new Error(`Image file not found: ${imagePath}`);
      }
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = getMimeType(imagePath);
      imageParts.push({
        inlineData: {
          data: base64Image,
          mimeType: mimeType,
        },
      });
    }

    const contents = [{
      role: "user",
      parts: [
        { text: prompt },
        ...imageParts,
      ],
    }];

    const generationConfig = {
      temperature: 0.4, // Adjusted for potentially more factual responses from vision
      maxOutputTokens: 65536, 
      topP: 1.0, // Default from client-side vision example
      topK: 32,  // Default from client-side vision example
    };

      const safetySettings = [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      ];

      const requestPayload = {
        contents,
        generationConfig,
        safetySettings,
      };

      console.log(`[${functionName}] Attempt ${retries + 1}/${MAX_RETRIES} Sending request to Gemini Vision API. Key: ${apiKeySnippet}..., Prompt: "${promptSnippet}..."`);
      const result = await model.generateContent(requestPayload);
      
      console.log(`[${functionName}] Received response from Gemini Vision API.`);
      const response = result.response;

      if (!response) {
        const logMsg = `[${functionName}] Gemini Vision API call failed: No response object. Key: ${apiKeySnippet}..., Prompt: "${promptSnippet}"`;
        console.error(logMsg, result);
        if (result.promptFeedback && result.promptFeedback.blockReason) {
          throw new Error(`${logMsg}. Request was blocked due to prompt content: ${result.promptFeedback.blockReason}`);
        }
        if (result.candidates && result.candidates[0] && result.candidates[0].finishReason === 'SAFETY') {
             throw new Error(`${logMsg}. Response was blocked due to safety settings. Finish reason: SAFETY. Details: ${JSON.stringify(result.candidates[0].safetyRatings)}`);
        }
        throw new Error(`${logMsg}. No response object or content blocked.`);
      }

      const candidate = response.candidates && response.candidates[0];
      if (candidate && candidate.content && candidate.content.parts && candidate.content.parts.length > 0 && candidate.content.parts[0].text) {
        const textResponse = candidate.content.parts[0].text;
        console.log(`[AI Service - ${functionName}] Gemini Vision API call successful. Response length: ${textResponse.length}`);
        if (response.usageMetadata) {
          console.log(`[AI Service - ${functionName}] Gemini Vision API Usage Metadata: `, response.usageMetadata);
        } else {
          console.log(`[AI Service - ${functionName}] Gemini Vision API Usage Metadata: Not available in response.`);
        }
        return textResponse; // Successful response
      }
      
      // If we reach here, no valid text content.
      const noContentMsg = `[${functionName}] Gemini Vision API call failed: No valid text content in response. Key: ${apiKeySnippet}..., Prompt: "${promptSnippet}"`;
      console.error(noContentMsg, response);
      const usageMetadataString = response.usageMetadata ? JSON.stringify(response.usageMetadata) : "Not available";
      if (candidate && candidate.finishReason) {
        const finishReason = candidate.finishReason;
        const safetyRatings = JSON.stringify(candidate.safetyRatings);
         if (finishReason === 'MAX_TOKENS') {
            throw new Error(`${noContentMsg}. The response was truncated because MAX_TOKENS was reached. Usage: ${usageMetadataString}. Safety ratings: ${safetyRatings}`);
        }
        throw new Error(`${noContentMsg}. Finish reason: ${finishReason}. Safety ratings: ${safetyRatings}. Usage: ${usageMetadataString}`);
      }
      if (response.promptFeedback && response.promptFeedback.blockReason) { // This might be redundant if already caught by !response but good for safety
        throw new Error(`${noContentMsg}. Request blocked due to prompt content: ${response.promptFeedback.blockReason}. Full feedback: ${JSON.stringify(response.promptFeedback)}. Usage: ${usageMetadataString}`);
      }
      throw new Error(`${noContentMsg}. No text content in the response or other unknown error. Usage: ${usageMetadataString}`);

    } catch (error) {
      const timestamp = new Date().toISOString();
      // Include imagePaths in error logging for vision API for more context
      const imagePathsSnippet = imagePaths.join(', ').substring(0, 200) + (imagePaths.join(', ').length > 200 ? '...' : '');
      console.error(`[${functionName}] Error during API call (Attempt ${retries + 1}/${MAX_RETRIES}). Timestamp: ${timestamp}. Key: ${apiKeySnippet}..., Prompt: "${promptSnippet}", Images: "${imagePathsSnippet}". Error: ${error.message}`, error.stack);
      
      // Specific check for image file not found, which is not transient
      if (error.message.toLowerCase().includes('image file not found')) {
          throw new Error(`[${functionName}] Pre-flight error: ${error.message}`, {cause: error});
      }

      if (isTransientError(error) && retries < MAX_RETRIES - 1) {
        const backoffDelay = INITIAL_BACKOFF_MS * Math.pow(2, retries);
        console.log(`[${functionName}] Transient error detected (Attempt ${retries + 1}/${MAX_RETRIES}). Retrying in ${backoffDelay}ms... Error: ${error.message}`);
        retries++;
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      } else {
        const finalErrorMsg = `[${functionName}] Failed after ${retries + 1} attempt(s) for prompt "${promptSnippet}..." with key "${apiKeySnippet}...": ${error.message}`;
        console.error(finalErrorMsg, error.stack);
        throw new Error(finalErrorMsg, { cause: error });
      }
    }
  }
  const maxRetryErrorMsg = `[${functionName}] Max retries (${MAX_RETRIES}) reached without success for prompt "${promptSnippet}...".`;
  console.error(maxRetryErrorMsg);
  throw new Error(maxRetryErrorMsg);
}
