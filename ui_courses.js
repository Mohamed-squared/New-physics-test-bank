// --- START OF FILE ui_courses.js ---

// ui_courses.js
import { currentUser, db, userCourseProgressMap, globalCourseDataMap, activeCourseId, setActiveCourseId, updateGlobalCourseData } from './state.js';
import { ADMIN_UID, FOP_COURSE_ID, FOP_COURSE_DEFINITION } from './config.js'; // Import FoP constants
import { displayContent, setActiveSidebarLink } from './ui_core.js';
import { showLoading, hideLoading, escapeHtml } from './utils.js';
import { showCourseEnrollment } from './ui_course_enrollment.js';
import { updateCourseDefinition } from './firebase_firestore.js';
// Import navigateToCourseDashboard from ui_course_dashboard
import { navigateToCourseDashboard } from './ui_course_dashboard.js';

// --- Course Data Functions (Firestore interaction) ---
async function fetchCourses(searchTerm = '', searchTag = '') {
    let query = db.collection('courses');
    // Only show 'approved' courses to non-admins
    if (currentUser?.uid !== ADMIN_UID) {
        query = query.where('status', 'in', ['approved']); // Show only approved
    } else {
        // Admins see all statuses except 'rejected', might want ordering later
        query = query.where('status', 'in', ['approved', 'pending', 'reported']);
    }
    query = query.orderBy('name');

    try {
        const snapshot = await query.limit(100).get();
        let courses = [];
        snapshot.forEach(doc => {
            const courseData = { id: doc.id, ...doc.data() };
            // Ensure necessary fields are present, especially playlist URLs array
            if (!courseData.youtubePlaylistUrls && courseData.youtubePlaylistUrl) {
                courseData.youtubePlaylistUrls = [courseData.youtubePlaylistUrl];
            } else {
                courseData.youtubePlaylistUrls = courseData.youtubePlaylistUrls || [];
            }
            courseData.chapterResources = courseData.chapterResources || {};
            // --- NEW: Initialize Image URLs ---
            courseData.imageUrl = courseData.imageUrl || null;
            courseData.coverUrl = courseData.coverUrl || null;
            // --- End NEW ---
            courses.push(courseData);
        });

        // --- START: FoP Injection Logic (If *still* not found after Firestore check in loadGlobalCourseDefinitions) ---
        // This logic primarily helps if loadGlobalCourseDefinitions failed or hasn't run yet.
        const fopInList = courses.some(c => c.id === FOP_COURSE_ID);
        const fopInGlobalMap = globalCourseDataMap.has(FOP_COURSE_ID);

        if (!fopInList && !fopInGlobalMap) {
             // This scenario should be rare if loadGlobalCourseDefinitions ran correctly and created FoP if missing.
             // Add FoP from local config as a last resort for display in this list.
             console.warn(`FoP course ${FOP_COURSE_ID} not found in fetched courses or global map. Adding from local config for display.`);
            const fopDef = {
                ...FOP_COURSE_DEFINITION,
                id: FOP_COURSE_ID, // Ensure ID is set
                status: 'approved' // Treat as approved locally
            };
             // Ensure expected fields are present like in Firestore fetch
             if (!fopDef.youtubePlaylistUrls && fopDef.youtubePlaylistUrl) {
                 fopDef.youtubePlaylistUrls = [fopDef.youtubePlaylistUrl];
             } else {
                 fopDef.youtubePlaylistUrls = fopDef.youtubePlaylistUrls || [];
             }
             fopDef.chapterResources = fopDef.chapterResources || {};
             fopDef.totalChapters = fopDef.totalChapters ?? (Array.isArray(fopDef.chapters) ? fopDef.chapters.length : 0); // Ensure totalChapters exists
             // --- NEW: Initialize Image URLs for FoP injection ---
             fopDef.imageUrl = fopDef.imageUrl || null;
             fopDef.coverUrl = fopDef.coverUrl || null;
             // --- End NEW ---


            // Check if the manually added FoP matches the search term (if any)
            const lowerSearchTerm = searchTerm.toLowerCase();
            const matchesSearch = (!searchTerm ||
                                  fopDef.name?.toLowerCase().includes(lowerSearchTerm) ||
                                  fopDef.majorTag?.toLowerCase().includes(lowerSearchTerm) ||
                                  fopDef.subjectTag?.toLowerCase().includes(lowerSearchTerm) ||
                                  fopDef.description?.toLowerCase().includes(lowerSearchTerm));

            if (matchesSearch) {
                courses.push(fopDef);
                // Re-sort if FoP added manually to maintain order
                courses.sort((a, b) => a.name.localeCompare(b.name));
                 // Also update the global map if it was missing there too
                updateGlobalCourseData(FOP_COURSE_ID, fopDef);
            }
        } else if (!fopInList && fopInGlobalMap) {
             // If FoP is in the global map but not in the filtered list (e.g., admin view excluded 'rejected' if it got set that way), add it back from the map.
             const fopFromMap = globalCourseDataMap.get(FOP_COURSE_ID);
              // Check if it matches the search term
             const lowerSearchTerm = searchTerm.toLowerCase();
             const matchesSearch = (!searchTerm ||
                                  fopFromMap.name?.toLowerCase().includes(lowerSearchTerm) ||
                                  fopFromMap.majorTag?.toLowerCase().includes(lowerSearchTerm) ||
                                  fopFromMap.subjectTag?.toLowerCase().includes(lowerSearchTerm) ||
                                  fopFromMap.description?.toLowerCase().includes(lowerSearchTerm));
             if (matchesSearch) {
                 courses.push(fopFromMap);
                 courses.sort((a, b) => a.name.localeCompare(b.name));
                 console.log(`FoP course ${FOP_COURSE_ID} added back to list from global map.`);
             }
        }
        // --- END: FoP Injection Logic ---

        // Filter by search term (applied after potentially adding FoP)
        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            courses = courses.filter(course =>
                course.name?.toLowerCase().includes(lowerSearchTerm) ||
                course.majorTag?.toLowerCase().includes(lowerSearchTerm) ||
                course.subjectTag?.toLowerCase().includes(lowerSearchTerm) ||
                course.description?.toLowerCase().includes(lowerSearchTerm)
            );
        }

        // Update global state map with fetched/filtered courses (redundant if loadGlobal already did it, but safe)
        courses.forEach(course => {
            // Only update if status is NOT rejected (or if admin viewing) OR if it's FoP
            if (course.status !== 'rejected' || currentUser?.uid === ADMIN_UID || course.id === FOP_COURSE_ID) {
                updateGlobalCourseData(course.id, course);
            } else {
                // Ensure rejected courses are removed from non-admin view's cache
                if (globalCourseDataMap.has(course.id)) {
                    globalCourseDataMap.delete(course.id);
                }
            }
        });

        // Filter out rejected courses for non-admins AFTER updating cache for admins
        // This filter might remove FoP if its status somehow became 'rejected' and user is not admin.
        if (currentUser?.uid !== ADMIN_UID) {
             courses = courses.filter(course => course.status !== 'rejected');
        }

        return courses;
    } catch (error) { console.error("Error fetching courses:", error); return []; }
}

/**
 * Fetches course details, prioritizing Firestore, then cache, then local config for FoP.
 * **MODIFIED:** Implements the Firestore-first strategy for FoP.
 * **MODIFIED:** Ensures imageUrl and coverUrl are initialized.
 */
async function fetchCourseDetails(courseId) {
    // 1. Check cache first (for potential immediate return)
    if (globalCourseDataMap.has(courseId)) {
        const cachedCourse = globalCourseDataMap.get(courseId);
        // Access control check
        if (currentUser?.uid !== ADMIN_UID && cachedCourse.status !== 'approved' && courseId !== FOP_COURSE_ID) {
            console.warn(`Access denied from cache for non-admin to view course ${courseId} with status ${cachedCourse.status}`);
            // Don't return yet, try Firestore in case cache is stale regarding status
        } else {
             console.log(`Returning course ${courseId} details from cache.`);
             // Ensure structure consistency before returning from cache
             if (!cachedCourse.youtubePlaylistUrls && cachedCourse.youtubePlaylistUrl) cachedCourse.youtubePlaylistUrls = [cachedCourse.youtubePlaylistUrl];
             else cachedCourse.youtubePlaylistUrls = cachedCourse.youtubePlaylistUrls || [];
             cachedCourse.chapterResources = cachedCourse.chapterResources || {};
             cachedCourse.totalChapters = cachedCourse.totalChapters ?? (Array.isArray(cachedCourse.chapters) ? cachedCourse.chapters.length : 0);
             // --- NEW: Ensure Image URLs ---
             cachedCourse.imageUrl = cachedCourse.imageUrl || null;
             cachedCourse.coverUrl = cachedCourse.coverUrl || null;
             // --- End NEW ---
             return cachedCourse;
        }
    }

    // 2. Try fetching from Firestore
    try {
        console.log(`Fetching course ${courseId} details from Firestore...`);
        const docRef = db.collection('courses').doc(courseId);
        const doc = await docRef.get();

        if (doc.exists) {
            console.log(`Course ${courseId} found in Firestore.`);
            const courseData = { id: doc.id, ...doc.data() };
            // Access control check
            if (currentUser?.uid !== ADMIN_UID && courseData.status !== 'approved' && courseId !== FOP_COURSE_ID) {
                console.warn(`Access denied for non-admin to view course ${courseId} with status ${courseData.status} from Firestore`);
                return null; // Deny access based on Firestore status
            }
            // Ensure expected fields exist & update cache
            courseData.chapterResources = courseData.chapterResources || {};
            if (!courseData.youtubePlaylistUrls && courseData.youtubePlaylistUrl) courseData.youtubePlaylistUrls = [courseData.youtubePlaylistUrl];
            else courseData.youtubePlaylistUrls = courseData.youtubePlaylistUrls || [];
            courseData.chapters = courseData.chapters || [];
            courseData.midcourseChapters = courseData.midcourseChapters || [];
            courseData.totalChapters = courseData.totalChapters ?? (Array.isArray(courseData.chapters) ? courseData.chapters.length : 0);
            // --- NEW: Ensure Image URLs ---
            courseData.imageUrl = courseData.imageUrl || null;
            courseData.coverUrl = courseData.coverUrl || null;
            // --- End NEW ---

            updateGlobalCourseData(courseId, courseData);
            return courseData;
        } else {
             console.log(`Course ${courseId} not found in Firestore.`);
            // Document doesn't exist in Firestore
            if (courseId === FOP_COURSE_ID) {
                // 3. Fallback to local config ONLY for FoP if not found in Firestore
                console.warn(`Course ${courseId} (FoP) not found in Firestore, using local config fallback.`);
                const fopDef = {...FOP_COURSE_DEFINITION};
                // Ensure consistent structure when loading from config
                fopDef.id = FOP_COURSE_ID;
                fopDef.status = 'approved'; // Treat as approved when falling back
                fopDef.youtubePlaylistUrls = fopDef.youtubePlaylistUrls || (fopDef.youtubePlaylistUrl ? [fopDef.youtubePlaylistUrl] : []);
                fopDef.chapterResources = fopDef.chapterResources || {};
                fopDef.totalChapters = fopDef.totalChapters ?? (Array.isArray(fopDef.chapters) ? fopDef.chapters.length : 0);
                fopDef.chapters = fopDef.chapters || [];
                fopDef.midcourseChapters = fopDef.midcourseChapters || [];
                // --- NEW: Ensure Image URLs for FoP fallback ---
                fopDef.imageUrl = fopDef.imageUrl || null;
                fopDef.coverUrl = fopDef.coverUrl || null;
                // --- End NEW ---
                updateGlobalCourseData(courseId, fopDef); // Update cache with config data
                return fopDef;
            } else {
                // If not FoP and not in Firestore, it doesn't exist
                console.log(`No course document found for ID: ${courseId}`);
                 // Remove from cache if it somehow existed there but not in FS
                 if (globalCourseDataMap.has(courseId)) { globalCourseDataMap.delete(courseId); }
                return null;
            }
        }
    } catch (error) {
        console.error(`Error fetching course details for ${courseId} from Firestore:`, error);
         // Handle potential error during fetch, maybe fallback for FoP?
         if (courseId === FOP_COURSE_ID) {
             console.warn(`Error fetching FoP from Firestore (${error.message}), using local config fallback.`);
             const fopDef = {...FOP_COURSE_DEFINITION};
             fopDef.id = FOP_COURSE_ID; fopDef.status = 'approved';
             fopDef.youtubePlaylistUrls = fopDef.youtubePlaylistUrls || (fopDef.youtubePlaylistUrl ? [fopDef.youtubePlaylistUrl] : []);
             fopDef.chapterResources = fopDef.chapterResources || {};
             fopDef.totalChapters = fopDef.totalChapters ?? (Array.isArray(fopDef.chapters) ? fopDef.chapters.length : 0);
             fopDef.chapters = fopDef.chapters || [];
             fopDef.midcourseChapters = fopDef.midcourseChapters || [];
             // --- NEW: Ensure Image URLs for FoP error fallback ---
             fopDef.imageUrl = fopDef.imageUrl || null;
             fopDef.coverUrl = fopDef.coverUrl || null;
             // --- End NEW ---
             updateGlobalCourseData(courseId, fopDef); return fopDef;
         }
         return null; // Error fetching non-FoP course
    }
}


// Modified to enforce role-based field inclusion and status setting
async function addCourseToFirestore(courseData) {
    if (!currentUser) return { success: false, message: "User not logged in." };

    const isAdmin = currentUser.uid === ADMIN_UID;
    const finalStatus = isAdmin ? 'approved' : 'pending'; // Determine status based on current user role

    // Prepare the data object to be saved, enforcing role restrictions
    let dataToSave = {
        name: courseData.name || 'Untitled Course',
        description: courseData.description || null,
        majorTag: courseData.majorTag || null,
        subjectTag: courseData.subjectTag || null,
        youtubePlaylistUrls: courseData.youtubePlaylistUrls || [],
        creatorUid: currentUser.uid,
        creatorName: currentUser.displayName || currentUser.email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        status: finalStatus, // Use the definitively calculated status
        reportedBy: [],
        reportReason: null,
        chapterResources: {}, // Always initialize as empty for new courses
        // --- NEW: Add Image URLs (can be set by anyone initially, maybe review later) ---
        imageUrl: courseData.imageUrl || null,
        coverUrl: courseData.coverUrl || null,
        // --- End NEW ---
    };

    let finalTotalChapters = 0;
    let finalChapters = [];
    let finalRelatedSubjectId = null;
    let finalPdfPathPattern = null;
    let finalTransPathPattern = null;

    if (isAdmin) {
        // Admin can set these fields based on validated input from courseData
        finalTotalChapters = parseInt(courseData.totalChapters) || 0; // Use provided value, default 0 if invalid
         if (isNaN(finalTotalChapters) || finalTotalChapters < 0) finalTotalChapters = 0; // Ensure it's a non-negative number
        finalChapters = finalTotalChapters > 0
            ? Array.from({ length: finalTotalChapters }, (_, i) => `Chapter ${i + 1}`)
            : [];
        finalRelatedSubjectId = courseData.relatedSubjectId || null; // Use provided value (already validated in submitNewCourse)
        finalPdfPathPattern = courseData.pdfPathPattern || null;
        finalTransPathPattern = courseData.transcriptionPathPattern || null;
    } else {
        // Non-admin: Force defaults, ignore any passed values for these fields
        finalTotalChapters = 0;
        finalChapters = [];
        finalRelatedSubjectId = null;
        finalPdfPathPattern = null;
        finalTransPathPattern = null;
        // Status is already set to 'pending'
    }

    // Add the role-dependent fields to the data object
    dataToSave.totalChapters = finalTotalChapters;
    dataToSave.chapters = finalChapters;
    dataToSave.relatedSubjectId = finalRelatedSubjectId;
    dataToSave.pdfPathPattern = finalPdfPathPattern;
    dataToSave.transcriptionPathPattern = finalTransPathPattern;

    try {
        const docRef = await db.collection('courses').add(dataToSave);

        // Prepare data for local state update (use the actual data saved)
        // Firestore timestamp needs conversion for immediate use
        // Note: Using a client-side date for the local cache is an approximation.
        const localStateData = {
             id: docRef.id,
             name: dataToSave.name,
             description: dataToSave.description,
             majorTag: dataToSave.majorTag,
             subjectTag: dataToSave.subjectTag,
             relatedSubjectId: dataToSave.relatedSubjectId,
             totalChapters: dataToSave.totalChapters,
             chapters: dataToSave.chapters,
             creatorUid: dataToSave.creatorUid,
             creatorName: dataToSave.creatorName,
             createdAt: new Date(), // Approximation for local state
             status: dataToSave.status,
             reportedBy: dataToSave.reportedBy,
             reportReason: dataToSave.reportReason,
             youtubePlaylistUrls: dataToSave.youtubePlaylistUrls,
             pdfPathPattern: dataToSave.pdfPathPattern,
             transcriptionPathPattern: dataToSave.transcriptionPathPattern,
             chapterResources: dataToSave.chapterResources,
             // --- NEW: Add Image URLs to local state ---
             imageUrl: dataToSave.imageUrl,
             coverUrl: dataToSave.coverUrl,
             // --- End NEW ---
        };

        // Add to global map only if it's not rejected (which it won't be on creation)
        updateGlobalCourseData(docRef.id, localStateData);

        return { success: true, id: docRef.id, status: finalStatus }; // Return the actual status set
    } catch (error) {
        console.error("Error adding course:", error);
        return { success: false, message: error.message };
    }
}


async function reportCourseInFirestore(courseId, reason) {
     if (!currentUser || !courseId) return false;
     // Prevent reporting FoP
     if (courseId === FOP_COURSE_ID) {
        alert("The Fundamentals of Physics course cannot be reported.");
        return false;
     }
     const courseRef = db.collection('courses').doc(courseId);
     try {
         await courseRef.update({
             status: 'reported', reportReason: reason || 'No reason provided.',
             reportedBy: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
         });
         // Update local cache ONLY if admin, otherwise non-admins shouldn't see reported state usually
         if (currentUser.uid === ADMIN_UID) {
             const currentData = globalCourseDataMap.get(courseId);
             if (currentData) {
                 updateGlobalCourseData(courseId, { ...currentData, status: 'reported', reportReason: reason });
             }
         } else {
             // If non-admin reported, remove from their view if cached
             if (globalCourseDataMap.has(courseId)) {
                 globalCourseDataMap.delete(courseId);
             }
         }
         return true;
     } catch (error) { console.error("Error reporting course:", error); return false; }
}

// --- UI Functions ---

export function showBrowseCourses() {
    setActiveSidebarLink('showBrowseCourses', 'sidebar-standard-nav');
    setActiveCourseId(null);
    displayContent(`
        <div class="animate-fade-in space-y-6">
            <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200">Browse Courses</h2>
             <!-- Search -->
            <div class="flex flex-wrap gap-4 mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border dark:border-gray-600">
                <div class="flex-grow"><label for="course-search" class="sr-only">Search Courses</label><input type="search" id="course-search" placeholder="Search by name, tag, description..." class="w-full"></div>
                <button onclick="window.handleCourseSearch()" class="btn-secondary flex-shrink-0">Search</button>
                ${currentUser ? // Only show add/suggest if logged in
                    (currentUser.uid === ADMIN_UID ?
                        `<button onclick="window.showAddCourseForm()" class="btn-primary flex-shrink-0"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 mr-1"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg>Add Course</button>`
                    :
                        `<button onclick="window.showAddCourseForm()" class="btn-secondary flex-shrink-0"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 mr-1"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" clip-rule="evenodd" /></svg>Suggest Course</button>`
                    )
                : '' // Don't show button if not logged in
                }
            </div>
            <!-- Course List -->
            <div id="course-list-container" class="space-y-4"><p class="text-center text-muted p-6">Loading courses...</p><div class="loader animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500 mx-auto"></div></div>
        </div>
    `);
    handleCourseSearch();
}

export function handleCourseSearch() {
    const searchTerm = document.getElementById('course-search')?.value || '';
    const container = document.getElementById('course-list-container');
    if (!container) return;
    container.innerHTML = `<p class="text-center text-muted p-6">Searching...</p><div class="loader animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500 mx-auto"></div>`;
    fetchCourses(searchTerm, '').then(courses => { renderCourseList(courses, container); });
}

/**
 * Renders the list of courses with thumbnails.
 * @param {Array} courses - Array of course objects.
 * @param {HTMLElement} container - The container element to render into.
 */
function renderCourseList(courses, container) {
     if (!container) return;
    if (!courses || courses.length === 0) { container.innerHTML = '<p class="text-center text-muted p-6">No courses found matching your criteria.</p>'; return; }
    const isAdmin = currentUser?.uid === ADMIN_UID;
    const enrolledCourseIds = Array.from(userCourseProgressMap.keys());

    container.innerHTML = courses.map(course => {
        // Only render if course has an ID and name (basic sanity check)
        if (!course || !course.id || !course.name) return '';

        // Skip rejected courses entirely unless admin (FoP won't be rejected due to fetch logic unless manually set)
        if (course.status === 'rejected' && !isAdmin) return '';

        // FoP is always treated as approved for display purposes regarding borders/status text unless admin
        const displayStatus = (course.id === FOP_COURSE_ID && !isAdmin) ? 'approved' : course.status;
        const statusClass = displayStatus === 'pending' ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/30'
                          : displayStatus === 'reported' ? 'border-red-400 bg-red-50 dark:bg-red-900/30'
                          : displayStatus === 'rejected' ? 'border-gray-400 bg-gray-100 dark:bg-gray-800/50 opacity-60'
                          : 'border-gray-200 dark:border-gray-600'; // Approved or FoP default
        const statusText = displayStatus === 'pending' ? 'Pending Approval'
                         : displayStatus === 'reported' ? 'Reported'
                         : displayStatus === 'rejected' ? 'Rejected' : '';
        const isEnrolled = enrolledCourseIds.includes(course.id);
        const numChapters = course.totalChapters ?? (Array.isArray(course.chapters) ? course.chapters.length : 0);
        let actionButtonHtml = '';
        if (isEnrolled) { actionButtonHtml = `<button onclick="window.navigateToCourseDashboard('${course.id}')" class="btn-success-small">Go to Course</button>`; }
        // *** MODIFIED: Allow enrollment only if approved OR it's the FoP course ***
        else if (course.status === 'approved' || course.id === FOP_COURSE_ID) { actionButtonHtml = `<button onclick="window.showCourseEnrollment('${course.id}')" class="btn-primary-small">Enroll</button>`; }
        else { actionButtonHtml = `<button class="btn-secondary-small" disabled>Unavailable</button>`; }

        // Admin Actions: Show based on *actual* course status (from Firestore or injected 'approved' for FoP if not in FS)
        const showAdminActions = isAdmin && course.id !== FOP_COURSE_ID && (course.status === 'pending' || course.status === 'reported' || course.status === 'rejected');
        // Admin actions for FoP: Edit always shown, Clear Report/Delete shown only if reported/rejected
        const showFopAdminActions = isAdmin && course.id === FOP_COURSE_ID;

        // --- NEW: Thumbnail HTML ---
        const thumbnailUrl = course.imageUrl; // Get URL from course data
        const thumbnailHtml = thumbnailUrl ? `
            <img src="${escapeHtml(thumbnailUrl)}"
                 alt="${escapeHtml(course.name || 'Course')} thumbnail"
                 class="w-20 h-16 object-cover rounded float-left mr-4 mb-2 border border-gray-200 dark:border-gray-600"
                 onerror="this.style.display='none'; this.onerror=null;">
            ` : `
            <div class="w-20 h-16 bg-gray-100 dark:bg-gray-700 rounded float-left mr-4 mb-2 flex items-center justify-center border border-gray-200 dark:border-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 text-gray-400">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm16.5-5.818H18" />
                </svg>
            </div>
            `;
        // --- End NEW ---

        return `
        <div class="course-card border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200 ${statusClass} overflow-hidden"> <!-- Added overflow-hidden for float containment -->
            <div class="flex flex-col sm:flex-row justify-between items-start gap-3">
                 <div class="flex-grow min-w-0">
                     <!-- NEW: Insert Thumbnail -->
                     ${thumbnailHtml}
                     <!-- End NEW -->
                     <h3 class="text-lg font-semibold text-primary-600 dark:text-primary-400 hover:underline cursor-pointer" onclick="window.showCourseDetails('${course.id}')">
                        ${escapeHtml(course.name || 'Unnamed Course')} ${isEnrolled ? '<span class="text-xs text-green-600 dark:text-green-400">(Enrolled)</span>': ''}
                     </h3>
                     <p class="text-sm text-muted mt-1">${escapeHtml(course.description || 'No description available.')}</p>
                     <div class="text-xs mt-2 space-x-2 clear-left"> <!-- Added clear-left -->
                         ${course.majorTag ? `<span class="inline-block bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-200 px-2 py-0.5 rounded-full">${escapeHtml(course.majorTag)}</span>` : ''}
                         ${course.subjectTag ? `<span class="inline-block bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-200 px-2 py-0.5 rounded-full">${escapeHtml(course.subjectTag)}</span>` : ''}
                         <span class="inline-block bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200 px-2 py-0.5 rounded-full">${numChapters} Chapters</span>
                    </div>
                    ${isAdmin ? `<p class="text-xs text-muted mt-2">ID: ${escapeHtml(course.id)} | Creator: ${escapeHtml(course.creatorName || 'Unknown')} | Status: ${escapeHtml(course.status || 'N/A')}</p>` : ''}
                 </div>
                 <div class="flex-shrink-0 text-right space-y-2 mt-2 sm:mt-0">
                     ${statusText && !(course.id === FOP_COURSE_ID && !isAdmin) ? `<p class="text-xs font-bold ${course.status === 'pending' ? 'text-yellow-600 dark:text-yellow-400' : course.status === 'reported' ? 'text-red-600 dark:text-red-400' : course.status === 'rejected' ? 'text-gray-600 dark:text-gray-400' : ''} mb-1">${statusText}</p>` : ''}
                     <button onclick="window.showCourseDetails('${course.id}')" class="btn-secondary-small w-full sm:w-auto">View Details</button>
                     ${actionButtonHtml}
                 </div>
            </div>
             ${showAdminActions ? `
                <div class="mt-3 pt-3 border-t dark:border-gray-600 text-right space-x-2 clear-left"> <!-- Added clear-left -->
                    ${course.status === 'pending' ? `<button onclick="window.handleCourseApproval('${course.id}', true)" class="btn-success-small">Approve</button><button onclick="window.handleCourseApproval('${course.id}', false)" class="btn-danger-small">Reject</button>` : ''}
                    ${course.status === 'reported' ? `<button onclick="window.handleCourseApproval('${course.id}', true)" class="btn-success-small">Clear Report</button><button type="button" onclick="alert('Report Reason: ${escapeHtml(course.reportReason || 'None provided')}')" class="btn-warning-small">View Report</button><button onclick="window.handleCourseApproval('${course.id}', false, true)" class="btn-danger-small">Delete Course</button>` : ''}
                    ${course.status === 'rejected' ? `<button onclick="window.handleCourseApproval('${course.id}', true)" class="btn-success-small">Approve</button><button onclick="window.handleCourseApproval('${course.id}', false, true)" class="btn-danger-small">Delete Course</button>` : ''}
                    <button onclick="window.showEditCourseForm('${course.id}')" class="btn-secondary-small">Edit</button>
                </div>
             ` : ''}
             ${showFopAdminActions ? `
                 <div class="mt-3 pt-3 border-t dark:border-gray-600 text-right space-x-2 clear-left"> <!-- Added clear-left -->
                      <button onclick="window.showEditCourseForm('${course.id}')" class="btn-secondary-small">Edit FoP</button>
                      ${course.status === 'reported' ? `
                          <button onclick="window.handleCourseApproval('${course.id}', true)" class="btn-success-small">Clear Report</button>
                          <button type="button" onclick="alert('Report Reason: ${escapeHtml(course.reportReason || 'None provided')}')" class="btn-warning-small">View Report</button>
                          <button onclick="window.handleCourseApproval('${course.id}', false, true)" class="btn-danger-small">Delete FoP Record</button>
                      ` : ''}
                      ${course.status === 'rejected' ? `
                          <button onclick="window.handleCourseApproval('${course.id}', false, true)" class="btn-danger-small">Delete FoP Record</button>
                      ` : ''}
                      ${course.status !== 'reported' && course.status !== 'rejected' ? `
                          <span class="text-xs text-muted italic">(FoP cannot be approved/rejected here)</span>
                      ` : ''}
                  </div>
             `: ''}
        </div>`;
    }).join('');
}


// Modified to allow non-admins access but hide specific fields
export function showAddCourseForm() {
    // Check if user is logged in, as adding needs a creator UID.
    if (!currentUser) {
        alert("Please log in to suggest a course.");
        displayContent('<p class="text-center text-muted p-6">Please log in to suggest a new course.</p>');
        return;
    }

    setActiveSidebarLink('showBrowseCourses');
    const isAdmin = currentUser?.uid === ADMIN_UID; // Use this flag for conditional rendering

    const html = `
    <div class="max-w-lg mx-auto animate-fade-in">
         <h2 class="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200">${isAdmin ? 'Add New Course' : 'Suggest New Course'}</h2>
         <form id="add-course-form" onsubmit="window.submitNewCourse(event)" class="space-y-4 content-card">
              <div><label for="course-name">Course Name</label><input id="course-name" type="text" required></div>
              <div><label for="course-desc">Description</label><textarea id="course-desc" rows="3"></textarea></div>
              <div><label for="course-major-tag">Major Tag</label><input id="course-major-tag" type="text" placeholder="e.g., Physics"></div>
              <div><label for="course-subject-tag">Subject Tag</label><input id="course-subject-tag" type="text" placeholder="e.g., Quantum Mechanics"></div>

              ${isAdmin ? `
                <div><label for="course-subject-id">Related Subject ID (for Questions)</label><input id="course-subject-id" type="text" placeholder="e.g., 1" required><p class="form-help-text">Links to Subject ID in User Data for question bank.</p></div>
                <div><label for="course-total-chapters">Total Chapters</label><input id="course-total-chapters" type="number" min="1" required><p class="form-help-text">Number of chapters in the course.</p></div>
              ` : `
                <!-- Non-admins don't set these directly, hidden inputs provide default values -->
                <input type="hidden" id="course-subject-id" value=""> <!-- addCourseToFirestore will set to null for non-admins -->
                <input type="hidden" id="course-total-chapters" value="0"> <!-- addCourseToFirestore will set to 0 for non-admins -->
              `}

              <hr class="my-4 dark:border-gray-600"/>
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Image URLs (Optional)</p>
              <div><label for="course-image-url">Thumbnail Image URL</label><input id="course-image-url" type="url" placeholder="https://.../thumbnail.png"><p class="form-help-text">Small image for course lists (e.g., 100x80px).</p></div>
              <div><label for="course-cover-url">Cover Image URL</label><input id="course-cover-url" type="url" placeholder="https://.../cover.jpg"><p class="form-help-text">Larger image for the course dashboard banner (e.g., 800x200px).</p></div>

              <hr class="my-4 dark:border-gray-600"/>
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Resource URLs (Optional)</p>
              <div><label for="course-playlist-urls">Main YouTube Playlist URL(s)</label><textarea id="course-playlist-urls" rows="2" placeholder="Enter one full YouTube playlist URL per line..."></textarea><p class="form-help-text">Enter full playlist URLs, one per line.</p></div>

              ${isAdmin ? `
                <hr class="my-4 dark:border-gray-600"/>
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Resource Path Patterns (Admin Only)</p>
                <div><label for="course-pdf-pattern">PDF Path Pattern</label><input id="course-pdf-pattern" type="text" placeholder="./Course PDFs/chapter{num}.pdf"><p class="form-help-text">Use '{num}' as placeholder for chapter number.</p></div>
                <div><label for="course-trans-pattern">Transcription Base Path</label><input id="course-trans-pattern" type="text" placeholder="./Course Transcriptions/"><p class="form-help-text">Path to folder containing .srt files named after video titles.</p></div>
              ` : `
                <!-- Non-admins don't set these directly -->
                <input type="hidden" id="course-pdf-pattern" value=""> <!-- addCourseToFirestore will set to null -->
                <input type="hidden" id="course-trans-pattern" value=""> <!-- addCourseToFirestore will set to null -->
              `}

              <div class="pt-4 mt-2 border-t dark:border-gray-700"><button type="submit" class="btn-primary w-full">${isAdmin ? 'Submit Course' : 'Submit Suggestion'}</button><button type="button" onclick="window.showBrowseCourses()" class="btn-secondary w-full mt-2">Cancel</button></div>
         </form>
         ${!isAdmin ? '<p class="text-xs text-muted text-center mt-4">Your suggestion will be submitted for review by an administrator.</p>' : ''}
    </div>`;
    displayContent(html);
}


export async function showEditCourseForm(courseId) {
    if (currentUser?.uid !== ADMIN_UID) { alert("Permission denied."); return; }
    setActiveSidebarLink('showBrowseCourses');
    showLoading("Loading course data for editing...");
    // Use fetchCourseDetails to prioritize Firestore, handle FoP fallback, etc.
    let course = await fetchCourseDetails(courseId);

    hideLoading();
    if (!course) { displayContent('<p class="text-red-500 p-4">Could not load course details for editing.</p><button onclick="window.showBrowseCourses()" class="btn-secondary mt-2">Back to Courses</button>'); return; }

    // Join playlist URLs into a string for the textarea
    const playlistUrlsString = (course.youtubePlaylistUrls || []).join('\n');
    const isFoPCourse = courseId === FOP_COURSE_ID;

    const html = `
    <div class="max-w-lg mx-auto animate-fade-in">
         <h2 class="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200">Edit Course: ${escapeHtml(course.name)}</h2>
         <p class="text-sm text-muted mb-4">Current Status: ${escapeHtml(course.status || 'N/A')} ${isFoPCourse ? '<span class="text-xs italic">(Status managed by config/admin actions)</span>' : ''}</p>
         <form id="edit-course-form" onsubmit="window.handleUpdateCourse(event, '${courseId}')" class="space-y-4 content-card">
              <div><label for="edit-course-name">Course Name</label><input id="edit-course-name" type="text" required value="${escapeHtml(course.name || '')}"></div>
              <div><label for="edit-course-desc">Description</label><textarea id="edit-course-desc" rows="3">${escapeHtml(course.description || '')}</textarea></div>
              <div><label for="edit-course-major-tag">Major Tag</label><input id="edit-course-major-tag" type="text" value="${escapeHtml(course.majorTag || '')}"></div>
              <div><label for="edit-course-subject-tag">Subject Tag</label><input id="edit-course-subject-tag" type="text" value="${escapeHtml(course.subjectTag || '')}"></div>
              <div><label for="edit-course-subject-id">Related Subject ID</label><input id="edit-course-subject-id" type="text" required value="${escapeHtml(course.relatedSubjectId || '')}"><p class="form-help-text">Links to Subject ID in User Data for question bank.</p></div>
              <div><label for="edit-course-total-chapters">Total Chapters</label><input id="edit-course-total-chapters" type="number" min="0" required value="${course.totalChapters ?? 0}"><p class="form-help-text">Number of chapters (can be 0).</p></div>

              <hr class="my-4 dark:border-gray-600"/>
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Image URLs</p>
              <div><label for="edit-course-image-url">Thumbnail Image URL</label><input id="edit-course-image-url" type="url" value="${escapeHtml(course.imageUrl || '')}" placeholder="https://.../thumbnail.png"><p class="form-help-text">Small image for course lists (e.g., 100x80px).</p></div>
              <div><label for="edit-course-cover-url">Cover Image URL</label><input id="edit-course-cover-url" type="url" value="${escapeHtml(course.coverUrl || '')}" placeholder="https://.../cover.jpg"><p class="form-help-text">Larger image for the course dashboard banner (e.g., 800x200px).</p></div>

              <hr class="my-4 dark:border-gray-600"/>
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Resource URLs & Paths</p>
              <div><label for="edit-course-playlist-urls">YouTube Playlist URL(s)</label><textarea id="edit-course-playlist-urls" rows="2" placeholder="Enter one URL per line...">${escapeHtml(playlistUrlsString)}</textarea><p class="form-help-text">Enter full playlist URLs, one per line.</p></div>
              <div><label for="edit-course-pdf-pattern">PDF Path Pattern</label><input id="edit-course-pdf-pattern" type="text" value="${escapeHtml(course.pdfPathPattern || '')}" placeholder="./Course PDFs/chapter{num}.pdf"><p class="form-help-text">Use '{num}' as placeholder for chapter number.</p></div>
              <div><label for="edit-course-trans-pattern">Transcription Base Path</label><input id="edit-course-trans-pattern" type="text" value="${escapeHtml(course.transcriptionPathPattern || '')}" placeholder="./Course Transcriptions/"><p class="form-help-text">Path to folder containing .srt files named after video titles.</p></div>
              <p class="text-xs text-muted">(Editing specific chapter resource overrides via Admin->Playlist Assignment)</p>
              <div class="pt-4 mt-2 border-t dark:border-gray-700"><button type="submit" class="btn-primary w-full">Save Changes</button><button type="button" onclick="window.showBrowseCourses()" class="btn-secondary w-full mt-2">Cancel</button></div>
         </form>
    </div>`;
    displayContent(html);
}

// Modified to prepare data and call addCourseToFirestore, which handles status/fields based on role.
export async function submitNewCourse(event) {
    event.preventDefault();
    if (!currentUser) {
        alert("Please log in to submit a course.");
        return;
    }
    const isAdmin = currentUser.uid === ADMIN_UID;

    const playlistUrlsText = document.getElementById('course-playlist-urls')?.value.trim() || '';
    const playlistUrls = playlistUrlsText ? playlistUrlsText.split('\n').map(url => url.trim()).filter(url => url) : [];

    // Get values based on form inputs (including hidden ones for non-admins)
    const nameValue = document.getElementById('course-name')?.value.trim();
    const descValue = document.getElementById('course-desc')?.value.trim() || null;
    const majorTagValue = document.getElementById('course-major-tag')?.value.trim() || null;
    const subjectTagValue = document.getElementById('course-subject-tag')?.value.trim() || null;
    // Values below might come from visible (admin) or hidden (non-admin) inputs
    const subjectIdValue = document.getElementById('course-subject-id')?.value.trim() || null;
    const totalChaptersValue = document.getElementById('course-total-chapters')?.value;
    const pdfPatternValue = document.getElementById('course-pdf-pattern')?.value.trim() || null;
    const transPatternValue = document.getElementById('course-trans-pattern')?.value.trim() || null;
    // --- NEW: Get Image URLs ---
    const imageUrlValue = document.getElementById('course-image-url')?.value.trim() || null;
    const coverUrlValue = document.getElementById('course-cover-url')?.value.trim() || null;
    // --- End NEW ---


    // --- Validation ---
    if (!nameValue) {
        alert("Course Name is required.");
        document.getElementById('course-name')?.focus();
        return;
    }

    const totalChaptersNum = parseInt(totalChaptersValue || '0');
    if (isNaN(totalChaptersNum)) {
         alert("Invalid input for 'Total Chapters'. Please enter a valid number.");
         document.getElementById('course-total-chapters')?.focus();
         return; // Stop execution if totalChapters is NaN
    }
     // Ensure totalChapters is not negative (though min="1" should prevent this for admins usually)
     if (totalChaptersNum < 0) {
        alert("Total Chapters cannot be negative.");
        document.getElementById('course-total-chapters')?.focus();
        return;
     }


    // Admins also require relatedSubjectId and usually totalChapters > 0 for a meaningful course.
    // Non-admins will submit '0' or '' for these from hidden fields, failing this check correctly if required.
    if (isAdmin && (!subjectIdValue /*|| totalChaptersNum <= 0*/)) { // Allowing 0 chapters for admin flexibility initially
        alert("Admin requires: Course Name and Related Subject ID."); // Removed chapter requirement check here, handled by form `min`
        if (!subjectIdValue) document.getElementById('course-subject-id')?.focus();
        // else document.getElementById('course-total-chapters')?.focus(); // No longer need focus on chapters here
        return;
    }
    // --- End Validation ---


    // Construct the courseData object to pass to addCourseToFirestore
    // addCourseToFirestore will handle setting the correct status ('approved'/'pending')
    // and ensure fields like totalChapters, chapters, relatedSubjectId are set correctly based on role.
    const courseData = {
        name: nameValue,
        description: descValue,
        majorTag: majorTagValue,
        subjectTag: subjectTagValue,
        relatedSubjectId: subjectIdValue, // Pass value from form ('0' or admin input)
        totalChapters: totalChaptersNum, // Pass parsed number (0 or admin input)
        youtubePlaylistUrls: playlistUrls,
        pdfPathPattern: pdfPatternValue, // Pass value from form ('' or admin input)
        transcriptionPathPattern: transPatternValue, // Pass value from form ('' or admin input)
        // --- NEW: Pass Image URLs ---
        imageUrl: imageUrlValue,
        coverUrl: coverUrlValue,
        // --- End NEW ---
        // chapters and chapterResources will be initialized in addCourseToFirestore
        // status will be determined in addCourseToFirestore
    };

    showLoading(isAdmin ? "Submitting course..." : "Submitting suggestion...");

    // Pass the prepared data object. addCourseToFirestore determines final status and fields.
    const result = await addCourseToFirestore(courseData);
    hideLoading();

    if (result.success) {
        // Use the status returned by addCourseToFirestore which reflects the actual status set
        const finalStatusMessage = result.status === 'approved' ? 'added and approved' : 'suggested and pending review';
        alert(`Course "${courseData.name}" ${finalStatusMessage} successfully!`);
        showBrowseCourses();
    } else {
        alert("Failed to submit course: " + result.message);
    }
}

/**
 * Handles updating course details, including FoP.
 * **MODIFIED:** Ensures updateCourseDefinition is called without special FoP handling.
 * **MODIFIED:** Includes imageUrl and coverUrl fields.
 */
export async function handleUpdateCourse(event, courseId) {
    event.preventDefault();
    if (currentUser?.uid !== ADMIN_UID) { alert("Permission denied."); return; }

    const playlistUrlsText = document.getElementById('edit-course-playlist-urls')?.value.trim() || '';
    const playlistUrls = playlistUrlsText ? playlistUrlsText.split('\n').map(url => url.trim()).filter(url => url) : [];

    const updates = {
        name: document.getElementById('edit-course-name')?.value.trim(),
        description: document.getElementById('edit-course-desc')?.value.trim() || null,
        majorTag: document.getElementById('edit-course-major-tag')?.value.trim() || null,
        subjectTag: document.getElementById('edit-course-subject-tag')?.value.trim() || null,
        relatedSubjectId: document.getElementById('edit-course-subject-id')?.value.trim(),
        totalChapters: parseInt(document.getElementById('edit-course-total-chapters')?.value || '0'),
        youtubePlaylistUrls: playlistUrls, // Use parsed array
        pdfPathPattern: document.getElementById('edit-course-pdf-pattern')?.value.trim() || null,
        transcriptionPathPattern: document.getElementById('edit-course-trans-pattern')?.value.trim() || null,
        // --- NEW: Add Image URLs ---
        imageUrl: document.getElementById('edit-course-image-url')?.value.trim() || null,
        coverUrl: document.getElementById('edit-course-cover-url')?.value.trim() || null,
        // --- End NEW ---
    };

    // --- Add NaN check ---
    if (isNaN(updates.totalChapters)) {
        alert("Invalid input for 'Total Chapters'. Please enter a valid number.");
        document.getElementById('edit-course-total-chapters')?.focus();
        return; // Stop execution if totalChapters is NaN
    }
    // --- End NaN check ---
     // Ensure totalChapters is not negative
     if (updates.totalChapters < 0) {
        alert("Total Chapters cannot be negative.");
        document.getElementById('edit-course-total-chapters')?.focus();
        return;
     }


     if (!updates.name || !updates.relatedSubjectId /* || updates.totalChapters <= 0 */ ) { // Allow 0 chapters
         alert("Course Name and Related Subject ID are required.");
         if (!updates.name) document.getElementById('edit-course-name')?.focus();
         else if (!updates.relatedSubjectId) document.getElementById('edit-course-subject-id')?.focus();
         // else document.getElementById('edit-course-total-chapters')?.focus();
         return;
     }

    // Fetch current data JUST BEFORE update to compare chapter count accurately
    let currentTotalChapters = 0;
    let currentChaptersArrayExists = false;
    let currentDocData = null; // Store current data
    try {
        // Use fetchCourseDetails to leverage caching and FoP fallback logic
        const currentCourse = await fetchCourseDetails(courseId);
        if (currentCourse) {
             currentDocData = currentCourse; // Use data from cache/FS/config
             currentTotalChapters = currentCourse.totalChapters || 0;
             currentChaptersArrayExists = Array.isArray(currentCourse.chapters);
        }
    } catch (fetchError) {
        console.error("Could not fetch current course data before update:", fetchError);
        // Proceed with caution, might overwrite chapters array unnecessarily
    }

    // Check if totalChapters changed OR chapters array doesn't exist or is wrong length
    // Only create new chapter names if the count *changes* or if the array is missing/malformed.
    // Preserve existing names if count is the same.
    let currentChapterNames = currentDocData?.chapters || [];
    if (updates.totalChapters !== currentTotalChapters || !currentChaptersArrayExists || currentChapterNames.length !== currentTotalChapters) {
         updates.chapters = Array.from({ length: updates.totalChapters }, (_, i) => `Chapter ${i + 1}`);
         console.log(`Chapter count changed or chapters array missing/mismatched. Updating chapters array for course ${courseId}. New count: ${updates.totalChapters}`);
    } else {
         // If chapter count is the same and chapters array exists and matches count, don't overwrite it.
         console.log(`Chapter count unchanged (${updates.totalChapters}). Preserving existing chapters array structure for course ${courseId}.`);
         // No need to add `updates.chapters = currentChapterNames;` because Firestore `set` with `merge: true` only updates fields present in `updates`.
         // If `updates.chapters` is not set, the existing `chapters` array in Firestore remains untouched.
    }

    // If editing FoP, we update Firestore if it exists. The message clarifies.
    const isFoP = courseId === FOP_COURSE_ID;
    let messageAction = isFoP ? "FoP course data" : `course "${updates.name}"`;


    // --- Add Logging ---
    console.log(`Attempting to update ${messageAction} (${courseId}) in Firestore with data:`, JSON.stringify(updates, null, 2));
    // --- End Logging ---

    showLoading(`Updating ${messageAction}...`);
    // Call updateCourseDefinition - it handles both regular courses and FoP the same way now (set merge)
    const success = await updateCourseDefinition(courseId, updates);
    hideLoading();
    if (success) {
        alert(`${isFoP ? 'FoP course data' : `Course "${updates.name}"`} updated successfully in Firestore!`);
        // Force refresh details from Firestore after update by clearing local cache entry
        globalCourseDataMap.delete(courseId);
        showBrowseCourses(); // Refresh the list view
    }
    // No else needed, updateCourseDefinition shows an alert on failure
}


export async function showCourseDetails(courseId) {
     setActiveSidebarLink('showBrowseCourses', 'sidebar-standard-nav');
     setActiveCourseId(null);
     showLoading("Loading course details...");
     // Use fetchCourseDetails which prioritizes Firestore, then cache, then config for FoP
     const course = await fetchCourseDetails(courseId);
     hideLoading();
     // Handle case where non-admin tries to view non-approved course (already handled in fetchCourseDetails)
     if (!course) {
         displayContent('<p class="text-red-500 p-4">Could not load course details or access denied.</p><button onclick="window.showBrowseCourses()" class="btn-secondary mt-2">Back to Courses</button>'); return;
     }
     const isAdmin = currentUser?.uid === ADMIN_UID;
     const isEnrolled = userCourseProgressMap.has(courseId);
     // FoP cannot be reported
     const canReport = currentUser && currentUser.uid !== course.creatorUid && course.status === 'approved' && course.id !== FOP_COURSE_ID;
     // *** MODIFIED: Allow enrollment if approved OR it's FoP ***
     const canEnroll = currentUser && !isEnrolled && (course.status === 'approved' || course.id === FOP_COURSE_ID);
     const numChapters = course.totalChapters ?? (Array.isArray(course.chapters) ? course.chapters.length : 0);

     // Determine display status (FoP always shows as approved for non-admins unless status is reported/rejected in FS)
     const displayStatus = (course.id === FOP_COURSE_ID && !isAdmin && course.status !== 'reported' && course.status !== 'rejected') ? 'approved' : course.status;
     const displayStatusText = displayStatus ? displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1) : 'N/A';

     let chaptersHtml = '';
     if (numChapters > 0 && Array.isArray(course.chapters) && course.chapters.length > 0) {
         // Use actual chapter names if available and match totalChapters count, otherwise generate generic ones
         const chapterTitles = (course.chapters.length === numChapters && course.chapters.every(ch => typeof ch === 'string' || (typeof ch === 'object' && ch !== null && ch.name))) // Check for simple string array or object array with name
             ? course.chapters.map(ch => (typeof ch === 'string' ? ch : ch.name)) // Extract name if object
             : Array.from({ length: numChapters }, (_, i) => `Chapter ${i + 1}`);

         chaptersHtml = `<ol class="list-decimal list-inside space-y-1 text-sm max-h-60 overflow-y-auto bg-gray-50 dark:bg-gray-700 p-3 rounded border dark:border-gray-600">` + chapterTitles.map((title, index) => `<li>${escapeHtml(title || `Chapter ${index + 1}`)}</li>`).join('') + `</ol>`;
     } else if (numChapters > 0) {
         // Fallback if chapters array is missing/empty but totalChapters > 0
         chaptersHtml = `<ol class="list-decimal list-inside space-y-1 text-sm max-h-60 overflow-y-auto bg-gray-50 dark:bg-gray-700 p-3 rounded border dark:border-gray-600">` + Array.from({ length: numChapters }, (_, i) => `<li>Chapter ${i + 1}</li>`).join('') + `</ol>`;
     } else {
         chaptersHtml = `<p class="text-sm text-muted italic">Chapter list not available or course has 0 chapters.</p>`;
     }
      let actionButtonHtml = '';
      if (isEnrolled) { actionButtonHtml = `<button onclick="window.navigateToCourseDashboard('${course.id}')" class="btn-success w-full mt-4">Go to Course Dashboard</button>`; }
      else if (canEnroll) { actionButtonHtml = `<button onclick="window.showCourseEnrollment('${course.id}')" class="btn-primary w-full mt-4">Enroll in Course</button>`; }
      else if (!currentUser) { actionButtonHtml = `<p class="text-center text-muted mt-4">Log in to enroll.</p>`; }
      // *** MODIFIED: Show unavailable message only if NOT approved AND NOT FoP ***
      else if (course.status !== 'approved' && course.id !== FOP_COURSE_ID) { actionButtonHtml = `<p class="text-center text-muted mt-4">This course is not currently available for enrollment (${escapeHtml(course.status || 'N/A')}).</p>`; }
      // Added case: if logged in, not enrolled, but cannot enroll (e.g., already enrolled or FoP if status isn't approved but user IS admin?)
      // This case should be rare now due to the canEnroll logic covering FoP.

     // Admin Actions: Show based on *actual* course status, with special handling for FoP
     const showAdminActions = isAdmin && course.id !== FOP_COURSE_ID && (course.status === 'pending' || course.status === 'reported' || course.status === 'rejected');
      // FoP Admin Actions: Edit always shown. Clear Report/Delete shown only if status is reported/rejected.
     const showFopAdminActions = isAdmin && course.id === FOP_COURSE_ID;

     const html = `
        <div class="animate-fade-in space-y-6">
            <div class="flex flex-wrap justify-between items-center gap-2"><h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200">${escapeHtml(course.name || 'Unnamed Course')}</h2><button onclick="window.showBrowseCourses()" class="btn-secondary-small flex-shrink-0">Back to Courses</button></div>
            <div class="content-card">
                 <div class="flex justify-between items-start mb-4 pb-4 border-b dark:border-gray-600"><div><p class="text-sm text-muted">Major: <span class="font-medium text-gray-700 dark:text-gray-300">${escapeHtml(course.majorTag || 'N/A')}</span></p>${course.subjectTag ? `<p class="text-sm text-muted">Subject: <span class="font-medium text-gray-700 dark:text-gray-300">${escapeHtml(course.subjectTag)}</span></p>` : ''}<p class="text-xs text-muted mt-1">Created by: ${escapeHtml(course.creatorName || 'Unknown')} ${course.createdAt?.toDate ? `on ${new Date(course.createdAt.toDate()).toLocaleDateString()}` : (course.id === FOP_COURSE_ID ? '(Built-in/Config)' : '')}</p></div><div class="text-right"><span class="text-sm font-semibold px-2 py-1 rounded ${displayStatus === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-200' : displayStatus === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-200' : displayStatus === 'reported' ? 'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-200' : displayStatus === 'rejected' ? 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'}">${escapeHtml(displayStatusText)}</span>${course.status === 'reported' && isAdmin ? `<p class="text-xs text-red-500 cursor-pointer hover:underline mt-1" onclick="alert('Report Reason: ${escapeHtml(course.reportReason || 'None provided')}')">(View Report)</p>` : ''}</div></div>
                <p class="text-base mb-4">${escapeHtml(course.description || 'No description.')}</p>
                <h3 class="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">Course Chapters (${numChapters})</h3>
                ${chaptersHtml}
                ${actionButtonHtml}
                 <div class="mt-6 pt-4 border-t dark:border-gray-600 flex flex-wrap justify-end gap-3">
                    ${canReport ? `<button onclick="window.handleReportCourse('${course.id}')" class="btn-warning-small">Report Course</button>` : ''}
                    ${isAdmin && course.id !== FOP_COURSE_ID ? `<button onclick="window.showEditCourseForm('${course.id}')" class="btn-secondary-small">Edit Course</button>` : ''}
                     ${showFopAdminActions ? `
                         <div class="flex gap-2">
                             <button onclick="window.showEditCourseForm('${course.id}')" class="btn-secondary-small">Edit FoP</button>
                             ${course.status === 'reported' ? `
                                 <button onclick="window.handleCourseApproval('${course.id}', true)" class="btn-success-small">Clear Report</button>
                                 <button onclick="window.handleCourseApproval('${course.id}', false, true)" class="btn-danger-small">Delete FoP Record</button>
                             ` : ''}
                             ${course.status === 'rejected' ? `
                                 <button onclick="window.handleCourseApproval('${course.id}', false, true)" class="btn-danger-small">Delete FoP Record</button>
                             ` : ''}
                         </div>
                     ` : ''}
                    ${showAdminActions ? `
                         <div class="flex gap-2">
                              ${course.status === 'pending' || course.status === 'rejected' ? `<button onclick="window.handleCourseApproval('${course.id}', true)" class="btn-success-small">Approve</button>` : ''}
                              ${course.status === 'pending' ? `<button onclick="window.handleCourseApproval('${course.id}', false)" class="btn-danger-small">Reject</button>` : ''}
                              ${course.status === 'reported' ? `<button onclick="window.handleCourseApproval('${course.id}', true)" class="btn-success-small">Clear Report</button>` : ''}
                              ${course.status === 'reported' || course.status === 'rejected' ? `<button onclick="window.handleCourseApproval('${course.id}', false, true)" class="btn-danger-small">Delete Course</button>` : ''}
                         </div>
                    ` : ''}

                 </div>
            </div>
        </div>`;
     displayContent(html);
}

export async function handleReportCourse(courseId) {
    if (!currentUser) { alert("Please log in to report."); return; }
    if (courseId === FOP_COURSE_ID) {
        alert("The Fundamentals of Physics course cannot be reported.");
        return;
    }
    const reason = prompt(`Please provide a brief reason for reporting this course (ID: ${courseId}):`);
    if (reason === null) return; // User cancelled
    if (!reason.trim()) { alert("A reason is required to report."); return; } // Require a reason
    showLoading("Submitting report...");
    const success = await reportCourseInFirestore(courseId, reason.trim()); hideLoading();
    if (success) { alert("Course reported successfully."); showCourseDetails(courseId); } else { alert("Failed to submit report."); }
}

// MODIFIED handleCourseApproval
export async function handleCourseApproval(courseId, approve, deleteCourse = false) {
    if (!currentUser || currentUser.uid !== ADMIN_UID) { alert("Action requires admin privileges."); return; }

    // Prevent approve/reject actions on FoP, but allow clear report and delete.
    if (courseId === FOP_COURSE_ID) {
         const isClearingReport = approve && (globalCourseDataMap.get(courseId)?.status === 'reported');
         if (!deleteCourse && !isClearingReport) {
             alert("The Fundamentals of Physics course status cannot be directly approved or rejected. Edit its config, clear reports, or delete the Firestore record if applicable.");
             return;
         }
     }

    let actionText = '';
    let newStatus = null;
    let updates = {}; // Object to hold Firestore updates

    // Fetch current details to get name and current status for confirmation message
    const courseData = await fetchCourseDetails(courseId); // Prioritizes FS, falls back for FoP
    if (!courseData && !deleteCourse) { // Allow deletion even if fetch fails (might be deleting a non-existent FS record)
         alert(`Error: Could not find course data for ID: ${courseId} to perform status change.`); return;
    }


    // Determine action text and new status based on parameters
    if (deleteCourse) {
        actionText = 'delete';
        if(courseId === FOP_COURSE_ID) actionText = 'delete the Firestore record for'; // Clarify for FoP
    } else if (approve) {
        actionText = 'approve'; // Base text
        if (courseData?.status === 'reported') {
             actionText = 'approve (clear report)'; // More specific text
        }
        newStatus = 'approved';
        updates = { status: newStatus, reportReason: null, reportedBy: [] };
    } else { // reject case (approve is false, deleteCourse is false)
        actionText = 'reject';
        newStatus = 'rejected';
        updates = { status: newStatus, reportReason: null, reportedBy: [] }; // Clear report details on reject too
    }

    const confirmationMessage = `Are you sure you want to ${actionText} course "${courseData?.name || courseId}"?` + (deleteCourse ? '\n\nTHIS ACTION IS PERMANENT AND CANNOT BE UNDONE.' : '');
    if (!confirm(confirmationMessage)) return;

    showLoading(`Processing course ${actionText}...`);
    const courseRef = db.collection('courses').doc(courseId);
    let success = false;

    try {
        if (deleteCourse) {
            await courseRef.delete();
            globalCourseDataMap.delete(courseId); // Remove from local cache
            success = true;
             alert(`Course record ${courseId} deleted successfully from Firestore.`);
            hideLoading(); // Hide loading before navigating
            // If FoP deleted, load it back from config immediately for consistency
            if(courseId === FOP_COURSE_ID) {
                console.log("FoP Firestore record deleted. Reloading from local config into cache.");
                 const fopDef = {...FOP_COURSE_DEFINITION};
                 fopDef.id = FOP_COURSE_ID; fopDef.status = 'approved'; // Treat as approved when falling back
                 fopDef.youtubePlaylistUrls = fopDef.youtubePlaylistUrls || (fopDef.youtubePlaylistUrl ? [fopDef.youtubePlaylistUrl] : []);
                 fopDef.chapterResources = fopDef.chapterResources || {};
                 fopDef.totalChapters = fopDef.totalChapters ?? (Array.isArray(fopDef.chapters) ? fopDef.chapters.length : 0);
                 fopDef.chapters = fopDef.chapters || [];
                 fopDef.midcourseChapters = fopDef.midcourseChapters || [];
                 // --- NEW: Initialize Image URLs ---
                 fopDef.imageUrl = fopDef.imageUrl || null;
                 fopDef.coverUrl = fopDef.coverUrl || null;
                 // --- End NEW ---
                 updateGlobalCourseData(courseId, fopDef);
            }
            showBrowseCourses(); // Go back to list after deletion
            return; // Exit early after deletion
        }
        else {
            // Use the updates object prepared earlier (sets status, clears report fields)
            await courseRef.update(updates);

            // Update local cache based on the new status
            // Fetch the full data after update to ensure cache is correct
            const updatedDoc = await courseRef.get();
            if (updatedDoc.exists) {
                 const updatedData = { id: courseId, ...updatedDoc.data() };
                 // Ensure structure consistency after fetch
                 if (!updatedData.youtubePlaylistUrls && updatedData.youtubePlaylistUrl) updatedData.youtubePlaylistUrls = [updatedData.youtubePlaylistUrl];
                 else updatedData.youtubePlaylistUrls = updatedData.youtubePlaylistUrls || [];
                 updatedData.chapterResources = updatedData.chapterResources || {};
                 updatedData.totalChapters = updatedData.totalChapters ?? (Array.isArray(updatedData.chapters) ? updatedData.chapters.length : 0);
                 updatedData.chapters = updatedData.chapters || [];
                 updatedData.midcourseChapters = updatedData.midcourseChapters || [];
                 // --- NEW: Initialize Image URLs ---
                 updatedData.imageUrl = updatedData.imageUrl || null;
                 updatedData.coverUrl = updatedData.coverUrl || null;
                 // --- End NEW ---

                 updateGlobalCourseData(courseId, updatedData); // Update cache with latest Firestore data
            } else {
                 // If deleted or somehow missing after update, remove from cache
                 globalCourseDataMap.delete(courseId);
                 // If FoP was somehow deleted during update, reload from config
                 if(courseId === FOP_COURSE_ID) {
                      console.warn("FoP Firestore record missing after update attempt. Reloading from local config.");
                      const fopDef = {...FOP_COURSE_DEFINITION};
                      fopDef.id = FOP_COURSE_ID; fopDef.status = 'approved';
                      fopDef.youtubePlaylistUrls = fopDef.youtubePlaylistUrls || (fopDef.youtubePlaylistUrl ? [fopDef.youtubePlaylistUrl] : []);
                      fopDef.chapterResources = fopDef.chapterResources || {};
                      fopDef.totalChapters = fopDef.totalChapters ?? (Array.isArray(fopDef.chapters) ? fopDef.chapters.length : 0);
                      fopDef.chapters = fopDef.chapters || [];
                      fopDef.midcourseChapters = fopDef.midcourseChapters || [];
                      // --- NEW: Initialize Image URLs ---
                      fopDef.imageUrl = fopDef.imageUrl || null;
                      fopDef.coverUrl = fopDef.coverUrl || null;
                      // --- End NEW ---
                      updateGlobalCourseData(courseId, fopDef);
                 }
            }


            success = true;
            // Use actionText which might be 'approve (clear report)'
            alert(`Course ${courseId} ${actionText}d successfully.`);
        }
        hideLoading(); // Ensure loading is hidden after operation (unless deleted, which hides earlier)

        if (success && !deleteCourse) { // Don't refresh if deleted, already navigated
            // Refresh the browse list after approval/rejection/clear-report
            showBrowseCourses();
        }
    } catch (error) {
        console.error(`Error ${actionText}ing course ${courseId}:`, error);
        hideLoading();
        alert(`Failed to ${actionText} course: ${error.message}`);
    }
}


// Make functions accessible globally in the browser window
window.showBrowseCourses = showBrowseCourses;
window.handleCourseSearch = handleCourseSearch;
window.showAddCourseForm = showAddCourseForm;
window.submitNewCourse = submitNewCourse;
window.showEditCourseForm = showEditCourseForm;
window.handleUpdateCourse = handleUpdateCourse;
window.showCourseDetails = showCourseDetails;
window.handleReportCourse = handleReportCourse;
window.handleCourseApproval = handleCourseApproval;
window.showCourseEnrollment = showCourseEnrollment; // From ui_course_enrollment.js via import
window.navigateToCourseDashboard = navigateToCourseDashboard; // From ui_course_dashboard.js via import

// --- END OF FILE ui_courses.js ---