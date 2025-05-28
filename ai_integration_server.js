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

  let effectiveApiKey = null;
  if (processedApiKey) { // A single key was successfully extracted from the input parameter
      effectiveApiKey = processedApiKey;
      console.log(`[AI Service - Text API] Using processed API key from input parameter: ${effectiveApiKey.substring(0,15)}...`);
  } else {
      console.warn(`[AI Service - Text API] ${logReasonForDefault} No valid API key from input parameter. Attempting to use default API keys.`);
      if (Array.isArray(DEFAULT_API_KEY) && DEFAULT_API_KEY.length > 0) {
          effectiveApiKey = DEFAULT_API_KEY.find(k => typeof k === 'string' && k.trim() !== ''); // Get first valid key
          if (effectiveApiKey) {
              console.log(`[AI Service - Text API] Using first valid key from default API key array: ${effectiveApiKey.substring(0,15)}...`);
          } else {
              console.error('[AI Service - Text API] CRITICAL: Default API key array is configured but contains no valid string keys.');
              // effectiveApiKey remains null
          }
      } else {
          console.error('[AI Service - Text API] CRITICAL: Default API key array is not configured or empty.');
          // effectiveApiKey remains null
      }
  }
  
  console.log(`Calling Gemini text API. Model: ${modelName}, Prompt: "${prompt.substring(0, 50)}..."`);

  if (!effectiveApiKey || effectiveApiKey.trim() === '') { // Final check on effectiveApiKey
    console.error('[AI Service - Text API] CRITICAL: Effective API Key is missing or empty even after processing input and default fallbacks. Throwing error.');
    throw new Error('Google AI API Key is required and could not be resolved.');
  }

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
        // For gemini-1.5-pro and newer, systemInstruction is a top-level field.
        // For gemini-2.5-flash-preview-05-20, it might need to be part of the `contents` array or handled differently.
        // The `@google/generative-ai` library version 0.9.0 and above supports `systemInstruction` as a top-level field for compatible models.
        // Let's assume we are using a version that supports it.
        requestPayload.systemInstruction = { role: "system", parts: [{ text: systemInstruction }] };
        console.log(`Using system instruction: "${systemInstruction.substring(0,100)}..."`);
    }


    console.log('Sending request to Gemini API...');
    const result = await model.generateContent(requestPayload);
    
    console.log('Received response from Gemini API.');
    const response = result.response;

    if (!response) {
        console.error('Gemini API call failed: No response object.', result);
        // Check for blocked content due to safety settings
        if (result.promptFeedback && result.promptFeedback.blockReason) {
            throw new Error(`Gemini API request was blocked due to prompt content: ${result.promptFeedback.blockReason}`);
        }
        if (response && response.candidates && response.candidates[0] && response.candidates[0].finishReason === 'SAFETY') {
             throw new Error(`Gemini API response was blocked due to safety settings. Finish reason: SAFETY. Details: ${JSON.stringify(response.candidates[0].safetyRatings)}`);
        }
        throw new Error('Gemini API call failed: No response object or content blocked.');
    }
    
    if (response.candidates && response.candidates.length > 0 &&
        response.candidates[0].content && response.candidates[0].content.parts &&
        response.candidates[0].content.parts.length > 0 &&
        response.candidates[0].content.parts[0].text // Ensure text part exists
        ) {
      const textResponse = response.candidates[0].content.parts[0].text;
      console.log(`[AI Service] Gemini Text API call successful. Response length: ${textResponse.length}`);
      if (response.usageMetadata) {
        console.log("[AI Service] Gemini Text API Usage Metadata: ", response.usageMetadata);
      } else {
        console.log("[AI Service] Gemini Text API Usage Metadata: Not available in response.");
      }
      return textResponse;
    } else {
      console.error('Gemini Text API call failed: No valid text content in response.', response);
       // Check for block reason in candidate if available
      if (response.candidates && response.candidates[0] && response.candidates[0].finishReason) {
        const finishReason = response.candidates[0].finishReason;
        const safetyRatings = JSON.stringify(response.candidates[0].safetyRatings);
        const usageMetadataString = response.usageMetadata ? JSON.stringify(response.usageMetadata) : "Not available";

        if (finishReason === 'MAX_TOKENS') {
          throw new Error(`Gemini API call failed: The response was truncated because the maximum output token limit was reached (MAX_TOKENS). Consider adjusting input length or output token settings. Usage: ${usageMetadataString}. Safety ratings: ${safetyRatings}`);
        }
        throw new Error(`Gemini API call failed: No text content. Finish reason: ${finishReason}. Safety ratings: ${safetyRatings}. Usage: ${usageMetadataString}`);
      }
      throw new Error('Gemini API call failed: No text content in the response and no specific finish reason found.');
    }

  } catch (error) {
    console.error('Error calling Gemini API:', error.message, error.stack);
    // If the error is already specific, rethrow it. Otherwise, wrap it.
    if (error.message.includes('Gemini API') || error.message.includes('API Key')) {
        throw error;
    }
    throw new Error(`Error communicating with Google Generative AI: ${error.message}`);
  }
}

module.exports = {
  getAllPdfTextForAI,
  callGeminiTextAPI,
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

  let effectiveApiKey;
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
      if (Array.isArray(DEFAULT_API_KEY) && DEFAULT_API_KEY.length > 0) {
          effectiveApiKey = DEFAULT_API_KEY.find(k => typeof k === 'string' && k.trim() !== ''); // Get first valid key
          if (effectiveApiKey) {
              console.log(`[AI Service - Vision API] Using first valid key from default API key array: ${effectiveApiKey.substring(0,15)}...`);
          } else {
              console.error('[AI Service - Vision API] CRITICAL: Default API key array is configured but contains no valid string keys.');
              // effectiveApiKey remains null
          }
      } else {
          console.error('[AI Service - Vision API] CRITICAL: Default API key array is not configured or empty.');
          // effectiveApiKey remains null
      }
  }

  console.log(`Calling Gemini Vision API. Model: ${modelName}, Prompt: "${prompt.substring(0, 50)}...", Images: ${imagePaths.join(', ')}`);

  if (!effectiveApiKey || effectiveApiKey.trim() === '') { // Final check
    console.error('[AI Service - Vision API] CRITICAL: Effective API Key is missing or empty even after processing input and default fallbacks. Throwing error.');
    throw new Error('Google AI API Key is required and could not be resolved.');
  }
  if (!imagePaths || imagePaths.length === 0) {
    console.error('No image paths provided.');
    throw new Error('At least one image path is required.');
  }
  // The comprehensive check for prompt above replaces the old one:
  // if (!prompt) {
  //   console.error('Prompt is missing.');
  //   throw new Error('Prompt is required.');
  // }

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

    console.log('Sending request to Gemini Vision API...');
    const result = await model.generateContent(requestPayload);
    
    console.log('Received response from Gemini Vision API.');
    const response = result.response;

    if (!response) {
      console.error('Gemini Vision API call failed: No response object.', result);
      if (result.promptFeedback && result.promptFeedback.blockReason) {
        throw new Error(`Gemini Vision API request was blocked due to prompt content: ${result.promptFeedback.blockReason}`);
      }
      // Check for block reason in candidate if available (though typically promptFeedback is key for request-side blocks)
      if (response && response.candidates && response.candidates[0] && response.candidates[0].finishReason === 'SAFETY') {
           throw new Error(`Gemini Vision API response was blocked due to safety settings. Finish reason: SAFETY. Details: ${JSON.stringify(response.candidates[0].safetyRatings)}`);
      }
      throw new Error('Gemini Vision API call failed: No response object or content blocked.');
    }

    if (response.candidates && response.candidates.length > 0 &&
        response.candidates[0].content && response.candidates[0].content.parts &&
        response.candidates[0].content.parts.length > 0 &&
        response.candidates[0].content.parts[0].text) {
      const textResponse = response.candidates[0].content.parts[0].text;
      console.log(`[AI Service] Gemini Vision API call successful. Response length: ${textResponse.length}`);
      if (response.usageMetadata) {
        console.log("[AI Service] Gemini Vision API Usage Metadata: ", response.usageMetadata);
      } else {
        console.log("[AI Service] Gemini Vision API Usage Metadata: Not available in response.");
      }
      return textResponse;
    } else {
      console.error('Gemini Vision API call failed: No valid text content in response.', response);
      const usageMetadataString = response.usageMetadata ? JSON.stringify(response.usageMetadata) : "Not available";
      if (response.candidates && response.candidates[0] && response.candidates[0].finishReason) {
        const finishReason = response.candidates[0].finishReason;
        const safetyRatings = JSON.stringify(response.candidates[0].safetyRatings);
         if (finishReason === 'MAX_TOKENS') { // Though less common for vision if input is fixed size image
            throw new Error(`Gemini Vision API call failed: The response was truncated because MAX_TOKENS was reached. Usage: ${usageMetadataString}. Safety ratings: ${safetyRatings}`);
        }
        throw new Error(`Gemini Vision API call failed: No text content. Finish reason: ${finishReason}. Safety ratings: ${safetyRatings}. Usage: ${usageMetadataString}`);
      }
      // If promptFeedback exists and indicates blocking, prioritize that message
      if (response.promptFeedback && response.promptFeedback.blockReason) {
        throw new Error(`Gemini Vision API call failed: Request blocked due to prompt content: ${response.promptFeedback.blockReason}. Full feedback: ${JSON.stringify(response.promptFeedback)}. Usage: ${usageMetadataString}`);
      }
      throw new Error(`Gemini Vision API call failed: No text content in the response or other unknown error. Usage: ${usageMetadataString}`);
    }

  } catch (error) {
    console.error('Error calling Gemini Vision API:', error.message, error.stack);
    if (error.message.includes('Gemini Vision API') || error.message.includes('API Key') || error.message.includes('Image file not found')) {
        throw error;
    }
    throw new Error(`Error communicating with Google Generative AI (Vision): ${error.message}`);
  }
}
