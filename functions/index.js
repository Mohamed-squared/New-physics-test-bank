// functions/index.js
const functions = require("firebase-functions");
const {GoogleGenerativeAI} = require("@google/generative-ai");

// Load API Key securely from environment configuration
const API_KEY = functions.config().gemini?.key; // Supports optional chaining

// Initialize the Google AI Client (do this once outside the function)
let genAI;
if (API_KEY) {
  genAI = new GoogleGenerativeAI(API_KEY);
} else {
  console.error("Gemini API Key not found in Firebase function config.");
  // Consider stricter error handling in production
}

exports.getAIExplanationProxy =
functions.https.onCall(async (data, context) => {
  // 1. Check Authentication (Ensure user is logged in)
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated.",
    );
  }

  // 2. Validate Input Data (received from client)
  if (!data.questionText || !data.options || !data.correctAnswer ) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "Required question data is missing.",
    );
  }

  // 3. Check if API Key and AI Client are available
  if (!API_KEY || !genAI) {
    console.error("Gemini API Key or AI Client is not configured.");
    throw new functions.https.HttpsError(
        "internal",
        "AI service configuration error.",
    );
  }

  // 4. Construct the Prompt
  const questionData = data; // Use validated data
  const MODEL_NAME = "gemini-1.5-flash"; // Or your preferred model
  let prompt = "You are a helpful physics tutor. " +
               "Explain the following multiple-choice question" +
               "clearly and concisely:\n\n";
  prompt += `**Question:**\n${questionData.questionText}\n\n`;
  prompt += "**Options:**\n";
  questionData.options.forEach((opt) => {
    prompt += `${opt.letter}. ${opt.text}\n`;
  });
  prompt += `\n**Correct Answer:** ${questionData.correctAnswer}\n`;

  if (!questionData.isUserCorrect && questionData.userAnswer) {
    prompt += `**User's Incorrect Answer:** ${questionData.userAnswer}\n\n`;
    prompt += "Please explain step-by-step:\n" + // Line break
              `1. Why the correct answer` +
              `(${questionData.correctAnswer}) is right.\n` +
              `2. Why the user's answer` +
              `(${questionData.userAnswer}) is wrong.\n`;
  } else {
    prompt += "\nPlease explain step-by-step why " + // Line break
              `${questionData.correctAnswer} is the correct answer.\n`;
  }
  // Line break
  prompt += "\nKeep the explanation focused on" +
            "the physics concepts involved. " +
            "Format the explanation using basic Markdown" +
            "(like **bold** for emphasis). " +
            "You can include simple inline LaTeX" +
            "like $E=mc^2$ or display math like " +
            "$$ \\sum F = ma $$ if relevant.";

  console.log("Cloud Function: Sending prompt to Gemini...");

  // 5. Call the Gemini API
  try {
    const model = genAI.getGenerativeModel({model: MODEL_NAME});
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text(); // Use await

    console.log("Cloud Function: Received AI response.");
    // 6. Return the result to the client
    return {explanation: text}; // Send back as an object
  } catch (error) {
    console.error("Cloud Function: Error calling Gemini API:", error);
    // Check for specific Gemini errors (e.g., safety blocks)
    if (error.message && error.message.includes("SAFETY")) {
      throw new functions.https.HttpsError(
          "permission-denied", // Or another appropriate code
          "The AI response was blocked due to safety settings.",
      );
    }
    // Throw a generic internal error for other issues
    throw new functions.https.HttpsError(
        "internal",
        "Failed to generate AI explanation.",
        error.message,
    );
  }
});

// --- Cloud Function for Setting Admin Claim ---
// Note: Requires secure trigger mechanism (e.g., manual call, secure endpoint)
const admin = require("firebase-admin");
try {
  if (admin.apps.length === 0) {
    admin.initializeApp();
  }
} catch (e) {
  console.error("Firebase Admin SDK initialization error:", e);
}


exports.setAdminClaim = functions.https.onCall(async (data, context) => {
  // SECURITY CHECK: Implement robust authorization here.
  // Example: Check if the caller is ALREADY an admin before proceeding.
  // This example assumes secure manual invocation for initial setup.
  // DO NOT deploy without a real security check.
  // const callerUid = context.auth?.uid;
  // if (!callerUid) {
  // }
  // const callerUserRecord = await admin.auth().getUser(callerUid);
  // if (callerUserRecord.customClaims?.admin !== true) {


  const userEmail = data.email;
  if (!userEmail || typeof userEmail !== "string") {
    throw new functions.https.HttpsError("invalid-argument",
        "Email is required and must be a string.");
  }

  try {
    const user = await admin.auth().getUserByEmail(userEmail);
    // Set the custom claim. Existing claims are overwritten.
    await admin.auth().setCustomUserClaims(user.uid, {admin: true});
    console.log(`Successfully set admin claim`+
                `for ${userEmail} (UID: ${user.uid})`);
    return {message: `Success! ${userEmail} is now an admin.`};
  } catch (error) {
    console.error(`Error setting admin claim for ${userEmail}:`, error);
    // Provide more specific error messages if possible
    if (error.code === "auth/user-not-found") {
      throw new functions.https.HttpsError("not-found",
          `User with email ${userEmail} not found.`);
    }
    throw new functions.https.HttpsError("internal",
        "Failed to set admin claim.", error.message);
  }
});
