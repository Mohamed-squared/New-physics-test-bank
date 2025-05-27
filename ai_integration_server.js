// ai_integration_server.js

const fs = require('fs');
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

const DEFAULT_API_KEY = 'AIzaSyAfAn-Ti1V9g2DTUi9tdjErGtddSVoa3iM';

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
  let effectiveApiKey;
  if (typeof apiKey === 'string' && apiKey.trim() !== '') {
    effectiveApiKey = apiKey.trim();
    console.log("[AI Service] Using provided API key.");
  } else {
    effectiveApiKey = DEFAULT_API_KEY;
    if (apiKey !== null && apiKey !== undefined) { // apiKey was provided but invalid
      console.log(`[AI Service] Provided API key is not a valid string or is empty. Type: ${typeof apiKey}. Falling back to default API key.`);
    } else { // apiKey was null or undefined
      console.log("[AI Service] API key not provided. Falling back to default API key.");
    }
  }

  console.log(`Calling Gemini API. Model: ${modelName}, Prompt: "${prompt.substring(0, 50)}..."`);

  if (!effectiveApiKey) {
    console.error('Google AI API Key is missing.');
    throw new Error('Google AI API Key is required.');
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
      maxOutputTokens: 2048,
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
        response.candidates[0].content.parts.length > 0) {
      const textResponse = response.candidates[0].content.parts[0].text;
      console.log(`Gemini API call successful. Response length: ${textResponse.length}`);
      return textResponse;
    } else {
      console.error('Gemini API call failed: No text content in response.', response);
       // Check for block reason in candidate if available
      if (response.candidates && response.candidates[0] && response.candidates[0].finishReason) {
        throw new Error(`Gemini API call failed: No text content. Finish reason: ${response.candidates[0].finishReason}. Safety ratings: ${JSON.stringify(response.candidates[0].safetyRatings)}`);
      }
      throw new Error('Gemini API call failed: No text content in the response.');
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
  // apiKey is the third parameter for generateImageContentResponse
  if (typeof apiKey === 'string' && apiKey.trim() !== '') {
    effectiveApiKey = apiKey.trim();
    console.log("[AI Service] Using provided API key for Vision API.");
  } else {
    effectiveApiKey = DEFAULT_API_KEY;
    if (apiKey !== null && apiKey !== undefined) { // apiKey was provided but invalid
      console.log(`[AI Service] Provided API key for Vision API is not a valid string or is empty. Type: ${typeof apiKey}. Falling back to default API key.`);
    } else { // apiKey was null or undefined
      console.log("[AI Service] API key for Vision API not provided. Falling back to default API key.");
    }
  }

  console.log(`Calling Gemini Vision API. Model: ${modelName}, Prompt: "${prompt.substring(0, 50)}...", Images: ${imagePaths.join(', ')}`);

  if (!effectiveApiKey) {
    console.error('Google AI API Key is missing.');
    throw new Error('Google AI API Key is required.');
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
      maxOutputTokens: 4096, // Vision models can sometimes return longer descriptions
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
      console.log(`Gemini Vision API call successful. Response length: ${textResponse.length}`);
      return textResponse;
    } else {
      console.error('Gemini Vision API call failed: No text content in response.', response);
      if (response.candidates && response.candidates[0] && response.candidates[0].finishReason) {
        throw new Error(`Gemini Vision API call failed: No text content. Finish reason: ${response.candidates[0].finishReason}. Safety ratings: ${JSON.stringify(response.candidates[0].safetyRatings)}`);
      }
      // If promptFeedback exists and indicates blocking, prioritize that message
      if (response.promptFeedback && response.promptFeedback.blockReason) {
        throw new Error(`Gemini Vision API call failed: Request blocked due to prompt content: ${response.promptFeedback.blockReason}. Full feedback: ${JSON.stringify(response.promptFeedback)}`);
      }
      throw new Error('Gemini Vision API call failed: No text content in the response or other unknown error.');
    }

  } catch (error) {
    console.error('Error calling Gemini Vision API:', error.message, error.stack);
    if (error.message.includes('Gemini Vision API') || error.message.includes('API Key') || error.message.includes('Image file not found')) {
        throw error;
    }
    throw new Error(`Error communicating with Google Generative AI (Vision): ${error.message}`);
  }
}
