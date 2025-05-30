// server_config.js
const GEMINI_API_KEYS_ARRAY = [
  "AIzaSyAfAn-Ti1V9g2DTUi9tdjErGtddSVoa3iM", // Original key
  "AIzaSyAKOtEzrQWzitRJ627-iZ6v182xfb7KJLo",
  "AIzaSyDUt_A4NU4mLwiHdcP0Qr6BRaaERP97kGo",
  "AIzaSyDN52jguMN5ibjh6GyGPltxeyB9UYAxdew",
  "AIzaSyDKbDVAiHKGIgyy6bZmaY4wyBpzfgRMYhw",
  "AIzaSyCxhEq4RF8PEzQCDbineXiFhvEjzBz8CAA"
];

module.exports = {
    GEMINI_API_KEY: GEMINI_API_KEYS_ARRAY, // Exporting as GEMINI_API_KEY to match existing import in course_automation_service.js
                                          // OR, preferably, rename export and update import in course_automation_service.js
                                          // For now, keeping export name same to minimize changes to other files not in this step's direct focus.
                                          // The course_automation_service.js was already updated to handle an array from this.
    GOOGLE_DRIVE_API_KEY: "AIzaSyBkBeXMuIsUJb-gGDAf7nLeOJk3var_uww",
};
