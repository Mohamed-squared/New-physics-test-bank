// --- START OF FILE ui_courses.js ---

// --- START OF FILE ui_courses.js ---

// ui_courses.js
import { currentUser, db, userCourseProgressMap, globalCourseDataMap, activeCourseId, setActiveCourseId, updateGlobalCourseData } from './state.js';
// *** MODIFIED: Import new path constants ***
import { ADMIN_UID, FOP_COURSE_ID, FOP_COURSE_DEFINITION, COURSE_BASE_PATH, DEFAULT_COURSE_PDF_FOLDER, DEFAULT_COURSE_TRANSCRIPTION_FOLDER } from './config.js'; // Import FoP constants & PATHS
import { displayContent, setActiveSidebarLink } from './ui_core.js';
import { showLoading, hideLoading, escapeHtml } from './utils.js';
import { showCourseEnrollment } from './ui_course_enrollment.js';
// MODIFIED: Import relevant functions from firebase_firestore.js (Removed reportCourseInFirestore)
import { addCourseToFirestore, updateCourseDefinition } from './firebase_firestore.js';
// Import navigateToCourseDashboard from ui_course_dashboard
import { navigateToCourseDashboard } from './ui_course_dashboard.js';
// *** NEW: Import filename utility ***
import { cleanTextForFilename } from './filename_utils.js'; // Assuming this exists elsewhere


// --- Helper Function to Construct Dynamic Paths ---
function getDynamicCoursePath(courseData, resourceType, chapterNum = null) {
    if (!courseData || !courseData.courseDirName) {
        console.warn(`Cannot generate dynamic path: Missing courseData or courseDirName for course ID ${courseData?.id}`);
        return null;
    }
    const basePath = COURSE_BASE_PATH;
    const dirName = courseData.courseDirName;

    switch (resourceType) {
        case 'pdf':
            if (chapterNum === null) return null; // Need chapter number for specific PDF
            // Check for override first
            const pdfOverride = courseData.chapterResources?.[chapterNum]?.pdfPath;
            if (pdfOverride) {
                console.log(`[Path Util] Using PDF override path for Ch ${chapterNum}: ${pdfOverride}`);
                return pdfOverride;
            }
            // Construct dynamic path
            return `${basePath}/${dirName}/${DEFAULT_COURSE_PDF_FOLDER}/chapter${chapterNum}.pdf`;
        case 'transcription_base':
            // Construct dynamic base path for transcriptions
            return `${basePath}/${dirName}/${DEFAULT_COURSE_TRANSCRIPTION_FOLDER}/`;
        // Add cases for 'problems_base', 'problem_text_mcq', etc. if needed later
        default:
            console.warn(`[Path Util] Unknown resource type: ${resourceType}`);
            return null;
    }
}
// --- End Helper Function ---


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
            // Ensure necessary fields are present
            if (!courseData.youtubePlaylistUrls && courseData.youtubePlaylistUrl) {
                courseData.youtubePlaylistUrls = [courseData.youtubePlaylistUrl];
            } else {
                courseData.youtubePlaylistUrls = courseData.youtubePlaylistUrls || [];
            }
            courseData.chapterResources = courseData.chapterResources || {};
            courseData.imageUrl = courseData.imageUrl || null;
            courseData.coverUrl = courseData.coverUrl || null;
            courseData.courseDirName = courseData.courseDirName || null; // Ensure courseDirName exists
            // --- MODIFIED: Ensure prereqs/coreqs are arrays of strings ---
            courseData.prerequisites = Array.isArray(courseData.prerequisites)
                                       ? courseData.prerequisites.filter(item => typeof item === 'string')
                                       : [];
            courseData.corequisites = Array.isArray(courseData.corequisites)
                                      ? courseData.corequisites.filter(item => typeof item === 'string')
                                      : [];
            // --- End MODIFICATION ---
            courses.push(courseData);
        });

        // FoP Injection Logic (If *still* not found after Firestore check)
        const fopInList = courses.some(c => c.id === FOP_COURSE_ID);
        const fopInGlobalMap = globalCourseDataMap.has(FOP_COURSE_ID);

        if (!fopInList && !fopInGlobalMap) {
             console.warn(`FoP course ${FOP_COURSE_ID} not found in fetched courses or global map. Adding from local config for display.`);
            const fopDef = {
                ...FOP_COURSE_DEFINITION,
                id: FOP_COURSE_ID,
                status: 'approved'
            };
             // Ensure structure matches Firestore fetch
             if (!fopDef.youtubePlaylistUrls && fopDef.youtubePlaylistUrl) fopDef.youtubePlaylistUrls = [fopDef.youtubePlaylistUrl];
             else fopDef.youtubePlaylistUrls = fopDef.youtubePlaylistUrls || [];
             fopDef.chapterResources = fopDef.chapterResources || {};
             fopDef.totalChapters = fopDef.totalChapters ?? (Array.isArray(fopDef.chapters) ? fopDef.chapters.length : 0);
             fopDef.imageUrl = fopDef.imageUrl || null;
             fopDef.coverUrl = fopDef.coverUrl || null;
             fopDef.courseDirName = fopDef.courseDirName || cleanTextForFilename(fopDef.name) || FOP_COURSE_ID; // Ensure courseDirName
             // --- MODIFIED: Ensure prereqs/coreqs for FoP from config are arrays of strings ---
             fopDef.prerequisites = Array.isArray(fopDef.prerequisites)
                                    ? fopDef.prerequisites.filter(item => typeof item === 'string')
                                    : [];
             fopDef.corequisites = Array.isArray(fopDef.corequisites)
                                   ? fopDef.corequisites.filter(item => typeof item === 'string')
                                   : [];
             // --- End MODIFICATION ---

            const lowerSearchTerm = searchTerm.toLowerCase();
            const matchesSearch = (!searchTerm ||
                                  fopDef.name?.toLowerCase().includes(lowerSearchTerm) ||
                                  fopDef.majorTag?.toLowerCase().includes(lowerSearchTerm) ||
                                  fopDef.subjectTag?.toLowerCase().includes(lowerSearchTerm) ||
                                  fopDef.description?.toLowerCase().includes(lowerSearchTerm));

            if (matchesSearch) {
                courses.push(fopDef);
                courses.sort((a, b) => a.name.localeCompare(b.name));
                updateGlobalCourseData(FOP_COURSE_ID, fopDef);
            }
        } else if (!fopInList && fopInGlobalMap) {
             const fopFromMap = globalCourseDataMap.get(FOP_COURSE_ID);
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

        // Filter by search term
        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            courses = courses.filter(course =>
                course.name?.toLowerCase().includes(lowerSearchTerm) ||
                course.majorTag?.toLowerCase().includes(lowerSearchTerm) ||
                course.subjectTag?.toLowerCase().includes(lowerSearchTerm) ||
                course.description?.toLowerCase().includes(lowerSearchTerm)
            );
        }

        // Update global state map
        courses.forEach(course => {
            if (course.status !== 'rejected' || currentUser?.uid === ADMIN_UID || course.id === FOP_COURSE_ID) {
                // Ensure courseDirName exists before updating cache
                course.courseDirName = course.courseDirName || cleanTextForFilename(course.name) || course.id;
                // --- MODIFIED: Ensure prereqs/coreqs in cache are arrays of strings ---
                course.prerequisites = Array.isArray(course.prerequisites)
                                       ? course.prerequisites.filter(item => typeof item === 'string')
                                       : [];
                course.corequisites = Array.isArray(course.corequisites)
                                      ? course.corequisites.filter(item => typeof item === 'string')
                                      : [];
                // --- End MODIFICATION ---
                updateGlobalCourseData(course.id, course);
            } else {
                if (globalCourseDataMap.has(course.id)) {
                    globalCourseDataMap.delete(course.id);
                }
            }
        });

        // Final filter for non-admins
        if (currentUser?.uid !== ADMIN_UID) {
             courses = courses.filter(course => course.status !== 'rejected');
        }

        return courses;
    } catch (error) { console.error("Error fetching courses:", error); return []; }
}

/**
 * Fetches course details, prioritizing Firestore, then cache, then local config for FoP.
 * Ensures courseDirName, image URLs, prerequisites (string array), and corequisites (string array) are initialized.
 */
async function fetchCourseDetails(courseId) {
    // 1. Check cache first
    if (globalCourseDataMap.has(courseId)) {
        const cachedCourse = globalCourseDataMap.get(courseId);
        if (currentUser?.uid !== ADMIN_UID && cachedCourse.status !== 'approved' && courseId !== FOP_COURSE_ID) {
            // Try Firestore if cached is not approved and user is not admin (unless it's FoP)
        } else {
             console.log(`Returning course ${courseId} details from cache.`);
             // Ensure structure consistency
             if (!cachedCourse.youtubePlaylistUrls && cachedCourse.youtubePlaylistUrl) cachedCourse.youtubePlaylistUrls = [cachedCourse.youtubePlaylistUrl];
             else cachedCourse.youtubePlaylistUrls = cachedCourse.youtubePlaylistUrls || [];
             cachedCourse.chapterResources = cachedCourse.chapterResources || {};
             cachedCourse.totalChapters = cachedCourse.totalChapters ?? (Array.isArray(cachedCourse.chapters) ? cachedCourse.chapters.length : 0);
             cachedCourse.imageUrl = cachedCourse.imageUrl || null;
             cachedCourse.coverUrl = cachedCourse.coverUrl || null;
             cachedCourse.courseDirName = cachedCourse.courseDirName || cleanTextForFilename(cachedCourse.name) || courseId; // Ensure courseDirName
             // --- MODIFIED: Ensure prereqs/coreqs from cache are arrays of strings ---
             cachedCourse.prerequisites = Array.isArray(cachedCourse.prerequisites)
                                          ? cachedCourse.prerequisites.filter(item => typeof item === 'string')
                                          : [];
             cachedCourse.corequisites = Array.isArray(cachedCourse.corequisites)
                                         ? cachedCourse.corequisites.filter(item => typeof item === 'string')
                                         : [];
             // --- End MODIFICATION ---
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
            if (currentUser?.uid !== ADMIN_UID && courseData.status !== 'approved' && courseId !== FOP_COURSE_ID) {
                console.warn(`Access denied for non-admin to view course ${courseId} with status ${courseData.status} from Firestore`);
                return null;
            }
            // Ensure expected fields exist & update cache
            courseData.chapterResources = courseData.chapterResources || {};
            if (!courseData.youtubePlaylistUrls && courseData.youtubePlaylistUrl) courseData.youtubePlaylistUrls = [courseData.youtubePlaylistUrl];
            else courseData.youtubePlaylistUrls = courseData.youtubePlaylistUrls || [];
            courseData.chapters = courseData.chapters || [];
            courseData.midcourseChapters = courseData.midcourseChapters || [];
            courseData.totalChapters = courseData.totalChapters ?? (Array.isArray(courseData.chapters) ? courseData.chapters.length : 0);
            courseData.imageUrl = courseData.imageUrl || null;
            courseData.coverUrl = courseData.coverUrl || null;
            courseData.courseDirName = courseData.courseDirName || cleanTextForFilename(courseData.name) || courseId; // Ensure courseDirName
            // --- MODIFIED: Ensure prereqs/coreqs from Firestore are arrays of strings ---
            courseData.prerequisites = Array.isArray(courseData.prerequisites)
                                       ? courseData.prerequisites.filter(item => typeof item === 'string')
                                       : [];
            courseData.corequisites = Array.isArray(courseData.corequisites)
                                      ? courseData.corequisites.filter(item => typeof item === 'string')
                                      : [];
            // --- End MODIFICATION ---

            updateGlobalCourseData(courseId, courseData);
            return courseData;
        } else {
             console.log(`Course ${courseId} not found in Firestore.`);
            if (courseId === FOP_COURSE_ID) {
                console.warn(`Course ${courseId} (FoP) not found in Firestore, using local config fallback.`);
                const fopDef = {...FOP_COURSE_DEFINITION};
                fopDef.id = FOP_COURSE_ID; fopDef.status = 'approved';
                fopDef.youtubePlaylistUrls = fopDef.youtubePlaylistUrls || (fopDef.youtubePlaylistUrl ? [fopDef.youtubePlaylistUrl] : []);
                fopDef.chapterResources = fopDef.chapterResources || {};
                fopDef.totalChapters = fopDef.totalChapters ?? (Array.isArray(fopDef.chapters) ? fopDef.chapters.length : 0);
                fopDef.chapters = fopDef.chapters || [];
                fopDef.midcourseChapters = fopDef.midcourseChapters || [];
                fopDef.imageUrl = fopDef.imageUrl || null;
                fopDef.coverUrl = fopDef.coverUrl || null;
                fopDef.courseDirName = fopDef.courseDirName || cleanTextForFilename(fopDef.name) || FOP_COURSE_ID; // Ensure courseDirName
                // --- MODIFIED: Ensure prereqs/coreqs for FoP fallback are arrays of strings ---
                fopDef.prerequisites = Array.isArray(fopDef.prerequisites)
                                       ? fopDef.prerequisites.filter(item => typeof item === 'string')
                                       : [];
                fopDef.corequisites = Array.isArray(fopDef.corequisites)
                                      ? fopDef.corequisites.filter(item => typeof item === 'string')
                                      : [];
                // --- End MODIFICATION ---

                updateGlobalCourseData(courseId, fopDef);
                return fopDef;
            } else {
                 console.log(`No course document found for ID: ${courseId}`);
                 if (globalCourseDataMap.has(courseId)) { globalCourseDataMap.delete(courseId); }
                return null;
            }
        }
    } catch (error) {
        console.error(`Error fetching course details for ${courseId} from Firestore:`, error);
         if (courseId === FOP_COURSE_ID) {
             console.warn(`Error fetching FoP from Firestore (${error.message}), using local config fallback.`);
             const fopDef = {...FOP_COURSE_DEFINITION};
             fopDef.id = FOP_COURSE_ID; fopDef.status = 'approved';
             fopDef.youtubePlaylistUrls = fopDef.youtubePlaylistUrls || (fopDef.youtubePlaylistUrl ? [fopDef.youtubePlaylistUrl] : []);
             fopDef.chapterResources = fopDef.chapterResources || {};
             fopDef.totalChapters = fopDef.totalChapters ?? (Array.isArray(fopDef.chapters) ? fopDef.chapters.length : 0);
             fopDef.chapters = fopDef.chapters || [];
             fopDef.midcourseChapters = fopDef.midcourseChapters || [];
             fopDef.imageUrl = fopDef.imageUrl || null;
             fopDef.coverUrl = fopDef.coverUrl || null;
             fopDef.courseDirName = fopDef.courseDirName || cleanTextForFilename(fopDef.name) || FOP_COURSE_ID; // Ensure courseDirName
             // --- MODIFIED: Ensure prereqs/coreqs for FoP fallback are arrays of strings ---
             fopDef.prerequisites = Array.isArray(fopDef.prerequisites)
                                     ? fopDef.prerequisites.filter(item => typeof item === 'string')
                                     : [];
             fopDef.corequisites = Array.isArray(fopDef.corequisites)
                                    ? fopDef.corequisites.filter(item => typeof item === 'string')
                                    : [];
             // --- End MODIFICATION ---
             updateGlobalCourseData(courseId, fopDef); return fopDef;
         }
         return null;
    }
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
                ${currentUser ?
                    (currentUser.uid === ADMIN_UID ?
                        `<button onclick="window.showAddCourseForm()" class="btn-primary flex-shrink-0"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 mr-1"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg>Add Course</button>`
                    :
                        `<button onclick="window.showAddCourseForm()" class="btn-secondary flex-shrink-0"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 mr-1"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" clip-rule="evenodd" /></svg>Suggest Course</button>`
                    )
                : ''
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
        if (!course || !course.id || !course.name) return '';
        if (course.status === 'rejected' && !isAdmin) return '';

        const displayStatus = (course.id === FOP_COURSE_ID && !isAdmin) ? 'approved' : course.status;
        const statusClass = displayStatus === 'pending' ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/30'
                          : displayStatus === 'reported' ? 'border-red-400 bg-red-50 dark:bg-red-900/30'
                          : displayStatus === 'rejected' ? 'border-gray-400 bg-gray-100 dark:bg-gray-800/50 opacity-60'
                          : 'border-gray-200 dark:border-gray-600';
        const statusText = displayStatus === 'pending' ? 'Pending Approval'
                         : displayStatus === 'reported' ? 'Reported'
                         : displayStatus === 'rejected' ? 'Rejected' : '';
        const isEnrolled = enrolledCourseIds.includes(course.id);
        const numChapters = course.totalChapters ?? (Array.isArray(course.chapters) ? course.chapters.length : 0);
        let actionButtonHtml = '';
        if (isEnrolled) { actionButtonHtml = `<button onclick="window.navigateToCourseDashboard('${course.id}')" class="btn-success-small">Go to Course</button>`; }
        else if (course.status === 'approved' || course.id === FOP_COURSE_ID) { actionButtonHtml = `<button onclick="window.showCourseEnrollment('${course.id}')" class="btn-primary-small">Enroll</button>`; }
        else { actionButtonHtml = `<button class="btn-secondary-small" disabled>Unavailable</button>`; }

        const showAdminActions = isAdmin && course.id !== FOP_COURSE_ID && (course.status === 'pending' || course.status === 'reported' || course.status === 'rejected');
        const showFopAdminActions = isAdmin && course.id === FOP_COURSE_ID;

        const thumbnailUrl = course.imageUrl;
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

        return `
        <div class="course-card border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200 ${statusClass} overflow-hidden">
            <div class="flex flex-col sm:flex-row justify-between items-start gap-3">
                 <div class="flex-grow min-w-0">
                     ${thumbnailHtml}
                     <h3 class="text-lg font-semibold text-primary-600 dark:text-primary-400 hover:underline cursor-pointer" onclick="window.showCourseDetails('${course.id}')">
                        ${escapeHtml(course.name || 'Unnamed Course')} ${isEnrolled ? '<span class="text-xs text-green-600 dark:text-green-400">(Enrolled)</span>': ''}
                     </h3>
                     <p class="text-sm text-muted mt-1">${escapeHtml(course.description || 'No description available.')}</p>
                     <div class="text-xs mt-2 space-x-2 clear-left">
                         ${course.majorTag ? `<span class="inline-block bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-200 px-2 py-0.5 rounded-full">${escapeHtml(course.majorTag)}</span>` : ''}
                         ${course.subjectTag ? `<span class="inline-block bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-200 px-2 py-0.5 rounded-full">${escapeHtml(course.subjectTag)}</span>` : ''}
                         <span class="inline-block bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200 px-2 py-0.5 rounded-full">${numChapters} Chapters</span>
                         <!-- *** REMOVED: courseDirName tag span removed here *** -->
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
                <div class="mt-3 pt-3 border-t dark:border-gray-600 text-right space-x-2 clear-left">
                    ${course.status === 'pending' ? `<button onclick="window.handleCourseApproval('${course.id}', true)" class="btn-success-small">Approve</button><button onclick="window.handleCourseApproval('${course.id}', false)" class="btn-danger-small">Reject</button>` : ''}
                    ${course.status === 'reported' ? `<button onclick="window.handleCourseApproval('${course.id}', true)" class="btn-success-small">Clear Report</button><button type="button" onclick="alert('Report Reason: ${escapeHtml(course.reportReason || 'None provided')}')" class="btn-warning-small">View Report</button><button onclick="window.handleCourseApproval('${course.id}', false, true)" class="btn-danger-small">Delete Course</button>` : ''}
                    ${course.status === 'rejected' ? `<button onclick="window.handleCourseApproval('${course.id}', true)" class="btn-success-small">Approve</button><button onclick="window.handleCourseApproval('${course.id}', false, true)" class="btn-danger-small">Delete Course</button>` : ''}
                    <button onclick="window.showEditCourseForm('${course.id}')" class="btn-secondary-small">Edit</button>
                </div>
             ` : ''}
             ${showFopAdminActions ? `
                 <div class="mt-3 pt-3 border-t dark:border-gray-600 text-right space-x-2 clear-left">
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


/**
 * Shows the form to add a new course (or suggest one for non-admins).
 * MODIFIED: Includes fields for prerequisites and corequisites using Subject Tags.
 */
export function showAddCourseForm() {
    if (!currentUser) {
        alert("Please log in to suggest a course.");
        displayContent('<p class="text-center text-muted p-6">Please log in to suggest a new course.</p>');
        return;
    }

    setActiveSidebarLink('showBrowseCourses');
    const isAdmin = currentUser?.uid === ADMIN_UID;

    const html = `
    <div class="max-w-lg mx-auto animate-fade-in">
         <h2 class="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200">${isAdmin ? 'Add New Course' : 'Suggest New Course'}</h2>
         <form id="add-course-form" onsubmit="window.submitNewCourse(event)" class="space-y-4 content-card">
              <div><label for="course-name">Course Name</label><input id="course-name" type="text" required></div>
              <div><label for="course-desc">Description</label><textarea id="course-desc" rows="3"></textarea></div>
              <div><label for="course-major-tag">Major Tag</label><input id="course-major-tag" type="text" placeholder="e.g., Physics"></div>
              <div><label for="course-subject-tag">Subject Tag</label><input id="course-subject-tag" type="text" placeholder="e.g., Quantum Mechanics"></div>

              ${isAdmin ? `
                <div><label for="course-dir-name">Course Directory Name (for Paths)</label><input id="course-dir-name" type="text"><p class="form-help-text">Cleaned version of name or ID used in file paths. Auto-generated if blank.</p></div>
                <div><label for="course-subject-id">Related Subject ID (for Questions)</label><input id="course-subject-id" type="text" placeholder="e.g., 1" required><p class="form-help-text">Links to Subject ID in User Data for question bank.</p></div>
                <div><label for="course-total-chapters">Total Chapters</label><input id="course-total-chapters" type="number" min="1" required><p class="form-help-text">Number of chapters in the course.</p></div>
              ` : `
                <!-- Non-admins don't set these directly -->
                <input type="hidden" id="course-dir-name" value="">
                <input type="hidden" id="course-subject-id" value="">
                <input type="hidden" id="course-total-chapters" value="0">
              `}

              <hr class="my-4 dark:border-gray-600"/>
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Course Relationships (Optional)</p>
              <div>
                <label for="course-prerequisites">Prerequisites (Subject Tags)</label>
                <textarea id="course-prerequisites" rows="2" placeholder="Enter comma-separated Subject Tags..."></textarea>
                <p class="form-help-text">Enter the Subject Tags required before taking this one (e.g., algebra, calculus_1).</p>
              </div>
              <div>
                <label for="course-corequisites">Corequisites (Subject Tags)</label>
                <textarea id="course-corequisites" rows="2" placeholder="Enter comma-separated Subject Tags..."></textarea>
                <p class="form-help-text">Enter the Subject Tags that must be taken concurrently.</p>
              </div>


              <hr class="my-4 dark:border-gray-600"/>
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Image URLs (Optional)</p>
              <div><label for="course-image-url">Thumbnail Image URL</label><input id="course-image-url" type="url" placeholder="https://.../thumbnail.png"><p class="form-help-text">Small image for course lists (e.g., 100x80px).</p></div>
              <div><label for="course-cover-url">Cover Image URL</label><input id="course-cover-url" type="url" placeholder="https://.../cover.jpg"><p class="form-help-text">Larger image for the course dashboard banner (e.g., 800x200px).</p></div>

              <hr class="my-4 dark:border-gray-600"/>
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Resource URLs (Optional)</p>
              <div><label for="course-playlist-urls">Main YouTube Playlist URL(s)</label><textarea id="course-playlist-urls" rows="2" placeholder="Enter one full YouTube playlist URL per line..."></textarea><p class="form-help-text">Enter full playlist URLs, one per line.</p></div>

              ${isAdmin ? `
                <hr class="my-4 dark:border-gray-600"/>
                <p class="text-xs text-muted">Note: Chapter-specific resource overrides (like PDF paths) can be set via Admin->Playlist Assignment after the course is created.</p>
              ` : ``}

              <div class="pt-4 mt-2 border-t dark:border-gray-700"><button type="submit" class="btn-primary w-full">${isAdmin ? 'Submit Course' : 'Submit Suggestion'}</button><button type="button" onclick="window.showBrowseCourses()" class="btn-secondary w-full mt-2">Cancel</button></div>
         </form>
         ${!isAdmin ? '<p class="text-xs text-muted text-center mt-4">Your suggestion will be submitted for review by an administrator.</p>' : ''}
    </div>`;
    displayContent(html);
}

/**
 * Shows the form to edit an existing course (Admin only).
 * MODIFIED: Includes fields for prerequisites and corequisites using Subject Tags.
 * MODIFIED: Removed deprecated path pattern fields.
 */
export async function showEditCourseForm(courseId) {
    if (currentUser?.uid !== ADMIN_UID) { alert("Permission denied."); return; }
    setActiveSidebarLink('showBrowseCourses');
    showLoading("Loading course data for editing...");
    let course = await fetchCourseDetails(courseId);
    hideLoading();
    if (!course) { displayContent('<p class="text-red-500 p-4">Could not load course details for editing.</p><button onclick="window.showBrowseCourses()" class="btn-secondary mt-2">Back to Courses</button>'); return; }

    const playlistUrlsString = (course.youtubePlaylistUrls || []).join('\n');
    // --- MODIFIED: Join Subject Tag arrays for display ---
    const prereqsString = (course.prerequisites || []).join(', ');
    const coreqsString = (course.corequisites || []).join(', ');
    // --- End MODIFICATION ---
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
              <div><label for="edit-course-dir-name">Course Directory Name (for Paths)</label><input id="edit-course-dir-name" type="text" value="${escapeHtml(course.courseDirName || '')}"><p class="form-help-text">Cleaned name used in file paths. Changing this may break existing links if files aren't moved.</p></div>
              <div><label for="edit-course-subject-id">Related Subject ID</label><input id="edit-course-subject-id" type="text" required value="${escapeHtml(course.relatedSubjectId || '')}"><p class="form-help-text">Links to Subject ID in User Data for question bank.</p></div>
              <div><label for="edit-course-total-chapters">Total Chapters</label><input id="edit-course-total-chapters" type="number" min="0" required value="${course.totalChapters ?? 0}"><p class="form-help-text">Number of chapters (can be 0).</p></div>

               <hr class="my-4 dark:border-gray-600"/>
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Course Relationships</p>
              <div>
                  <label for="edit-course-prerequisites">Prerequisites (Subject Tags)</label>
                  <textarea id="edit-course-prerequisites" rows="2" placeholder="Enter comma-separated Subject Tags...">${escapeHtml(prereqsString)}</textarea>
                  <p class="form-help-text">Enter the Subject Tags required before taking this one (e.g., algebra, calculus_1).</p>
              </div>
              <div>
                  <label for="edit-course-corequisites">Corequisites (Subject Tags)</label>
                  <textarea id="edit-course-corequisites" rows="2" placeholder="Enter comma-separated Subject Tags...">${escapeHtml(coreqsString)}</textarea>
                  <p class="form-help-text">Enter the Subject Tags that must be taken concurrently.</p>
              </div>

              <hr class="my-4 dark:border-gray-600"/>
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Image URLs</p>
              <div><label for="edit-course-image-url">Thumbnail Image URL</label><input id="edit-course-image-url" type="url" value="${escapeHtml(course.imageUrl || '')}" placeholder="https://.../thumbnail.png"><p class="form-help-text">Small image for course lists (e.g., 100x80px).</p></div>
              <div><label for="edit-course-cover-url">Cover Image URL</label><input id="edit-course-cover-url" type="url" value="${escapeHtml(course.coverUrl || '')}" placeholder="https://.../cover.jpg"><p class="form-help-text">Larger image for the course dashboard banner (e.g., 800x200px).</p></div>

              <hr class="my-4 dark:border-gray-600"/>
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Resource URLs & Paths</p>
              <div><label for="edit-course-playlist-urls">YouTube Playlist URL(s)</label><textarea id="edit-course-playlist-urls" rows="2" placeholder="Enter one URL per line...">${escapeHtml(playlistUrlsString)}</textarea><p class="form-help-text">Enter full playlist URLs, one per line.</p></div>

              <!-- *** REMOVED: Deprecated Resource Path Pattern section removed *** -->

              <p class="text-xs text-muted">(Editing specific chapter resource overrides via Admin->Playlist Assignment)</p>
              <div class="pt-4 mt-2 border-t dark:border-gray-700"><button type="submit" class="btn-primary w-full">Save Changes</button><button type="button" onclick="window.showBrowseCourses()" class="btn-secondary w-full mt-2">Cancel</button></div>
         </form>
    </div>`;
    displayContent(html);
}

/**
 * Handles submitting a new course or suggestion.
 * MODIFIED: Parses prerequisites and corequisites from input as Subject Tags (strings).
 */
export async function submitNewCourse(event) {
    event.preventDefault();
    if (!currentUser) {
        alert("Please log in to submit a course.");
        return;
    }
    const isAdmin = currentUser.uid === ADMIN_UID;

    // --- MODIFIED: Helper function to parse Subject Tags ---
    const parseSubjectTags = (inputId) => {
        const inputString = document.getElementById(inputId)?.value.trim() || '';
        if (!inputString) return [];
        return inputString.split(',')
                          .map(tag => tag.trim()) // Trim each tag
                          .filter(tag => tag); // Remove empty strings resulting from extra commas or spaces
    };
    // --- End MODIFICATION ---

    const playlistUrlsText = document.getElementById('course-playlist-urls')?.value.trim() || '';
    const playlistUrls = playlistUrlsText ? playlistUrlsText.split('\n').map(url => url.trim()).filter(url => url) : [];

    const nameValue = document.getElementById('course-name')?.value.trim();
    const descValue = document.getElementById('course-desc')?.value.trim() || null;
    const majorTagValue = document.getElementById('course-major-tag')?.value.trim() || null;
    const subjectTagValue = document.getElementById('course-subject-tag')?.value.trim() || null;
    const courseDirNameValue = isAdmin ? document.getElementById('course-dir-name')?.value.trim() : null;
    const subjectIdValue = document.getElementById('course-subject-id')?.value.trim() || null;
    const totalChaptersValue = document.getElementById('course-total-chapters')?.value;
    const imageUrlValue = document.getElementById('course-image-url')?.value.trim() || null;
    const coverUrlValue = document.getElementById('course-cover-url')?.value.trim() || null;
    // --- MODIFIED: Parse prereqs/coreqs using Subject Tag helper ---
    const prerequisitesValue = parseSubjectTags('course-prerequisites');
    const corequisitesValue = parseSubjectTags('course-corequisites');
    // --- End MODIFICATION ---

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
         return;
    }
     if (totalChaptersNum < 0) {
        alert("Total Chapters cannot be negative.");
        document.getElementById('course-total-chapters')?.focus();
        return;
     }

    if (isAdmin && (!subjectIdValue)) {
        alert("Admin requires: Course Name and Related Subject ID.");
        if (!subjectIdValue) document.getElementById('course-subject-id')?.focus();
        return;
    }
    // --- End Validation ---

    const courseData = {
        name: nameValue,
        description: descValue,
        majorTag: majorTagValue,
        subjectTag: subjectTagValue,
        courseDirName: courseDirNameValue,
        relatedSubjectId: subjectIdValue,
        totalChapters: totalChaptersNum,
        youtubePlaylistUrls: playlistUrls,
        imageUrl: imageUrlValue,
        coverUrl: coverUrlValue,
        // --- MODIFIED: Add parsed Subject Tag arrays ---
        prerequisites: prerequisitesValue,
        corequisites: corequisitesValue,
        // --- End MODIFICATION ---
    };

    showLoading(isAdmin ? "Submitting course..." : "Submitting suggestion...");

    const result = await addCourseToFirestore(courseData); // Use imported function
    hideLoading();

    if (result.success) {
        const finalStatusMessage = result.status === 'approved' ? 'added and approved' : 'suggested and pending review';
        alert(`Course "${courseData.name}" ${finalStatusMessage} successfully!`);
        showBrowseCourses();
    } else {
        alert("Failed to submit course: " + result.message);
    }
}

/**
 * Handles updating course details, including courseDirName, prereqs/coreqs (Subject Tags), and removing path patterns.
 * MODIFIED: Removes deprecated path pattern fields from updates.
 */
export async function handleUpdateCourse(event, courseId) {
    event.preventDefault();
    if (currentUser?.uid !== ADMIN_UID) { alert("Permission denied."); return; }

    // --- MODIFIED: Helper function to parse Subject Tags ---
    const parseSubjectTags = (inputId) => {
        const inputString = document.getElementById(inputId)?.value.trim() || '';
        if (!inputString) return [];
        return inputString.split(',')
                          .map(tag => tag.trim()) // Trim each tag
                          .filter(tag => tag); // Remove empty strings
    };
    // --- End MODIFICATION ---

    const playlistUrlsText = document.getElementById('edit-course-playlist-urls')?.value.trim() || '';
    const playlistUrls = playlistUrlsText ? playlistUrlsText.split('\n').map(url => url.trim()).filter(url => url) : [];

    // Clean the directory name input
    let cleanedDirName = cleanTextForFilename(document.getElementById('edit-course-dir-name')?.value.trim());
    if (!cleanedDirName) {
        // Fallback if admin clears it or it becomes empty after cleaning
        cleanedDirName = cleanTextForFilename(document.getElementById('edit-course-name')?.value.trim()) || courseId;
        alert("Course Directory Name cannot be empty. It has been reset based on the course name or ID.");
    }


    const updates = {
        name: document.getElementById('edit-course-name')?.value.trim(),
        description: document.getElementById('edit-course-desc')?.value.trim() || null,
        majorTag: document.getElementById('edit-course-major-tag')?.value.trim() || null,
        subjectTag: document.getElementById('edit-course-subject-tag')?.value.trim() || null,
        courseDirName: cleanedDirName, // Use cleaned directory name
        relatedSubjectId: document.getElementById('edit-course-subject-id')?.value.trim(),
        totalChapters: parseInt(document.getElementById('edit-course-total-chapters')?.value || '0'),
        youtubePlaylistUrls: playlistUrls,
        imageUrl: document.getElementById('edit-course-image-url')?.value.trim() || null,
        coverUrl: document.getElementById('edit-course-cover-url')?.value.trim() || null,
        // --- MODIFIED: Parse and add Subject Tag arrays ---
        prerequisites: parseSubjectTags('edit-course-prerequisites'),
        corequisites: parseSubjectTags('edit-course-corequisites'),
        // --- End MODIFICATION ---
        // REMOVE old path patterns - Explicitly delete if needed and if firebase namespace is available
        // pdfPathPattern: firebase.firestore.FieldValue.delete(),
        // transcriptionPathPattern: firebase.firestore.FieldValue.delete(),
    };

     // Check if firebase.firestore.FieldValue.delete is available and use it if needed
     if (typeof firebase !== 'undefined' && typeof firebase.firestore !== 'undefined' && typeof firebase.firestore.FieldValue !== 'undefined') {
         updates.pdfPathPattern = firebase.firestore.FieldValue.delete();
         updates.transcriptionPathPattern = firebase.firestore.FieldValue.delete();
         console.log("Including FieldValue.delete() for deprecated path patterns.");
     } else {
         console.warn("firebase.firestore.FieldValue.delete() not available. Deprecated fields might not be explicitly removed.");
     }


    if (isNaN(updates.totalChapters)) {
        alert("Invalid input for 'Total Chapters'. Please enter a valid number.");
        document.getElementById('edit-course-total-chapters')?.focus();
        return;
    }
     if (updates.totalChapters < 0) {
        alert("Total Chapters cannot be negative.");
        document.getElementById('edit-course-total-chapters')?.focus();
        return;
     }

     if (!updates.name || !updates.relatedSubjectId || !updates.courseDirName ) {
         alert("Course Name, Related Subject ID, and Course Directory Name are required.");
         // Add focus logic if needed
         return;
     }

    // Fetch current data to compare chapter count
    let currentTotalChapters = 0;
    let currentChaptersArrayExists = false;
    let currentDocData = null;
    try {
        const currentCourse = await fetchCourseDetails(courseId);
        if (currentCourse) {
             currentDocData = currentCourse;
             currentTotalChapters = currentCourse.totalChapters || 0;
             currentChaptersArrayExists = Array.isArray(currentCourse.chapters);
        }
    } catch (fetchError) { console.error("Could not fetch current course data before update:", fetchError); }

    let currentChapterNames = currentDocData?.chapters || [];
    if (updates.totalChapters !== currentTotalChapters || !currentChaptersArrayExists || currentChapterNames.length !== currentTotalChapters) {
         updates.chapters = Array.from({ length: updates.totalChapters }, (_, i) => `Chapter ${i + 1}`);
         console.log(`Chapter count changed or chapters array missing/mismatched. Updating chapters array for course ${courseId}. New count: ${updates.totalChapters}`);
    } else {
         console.log(`Chapter count unchanged (${updates.totalChapters}). Preserving existing chapters array structure for course ${courseId}.`);
    }

    const isFoP = courseId === FOP_COURSE_ID;
    let messageAction = isFoP ? "FoP course data" : `course "${updates.name}"`;

    console.log(`Attempting to update ${messageAction} (${courseId}) in Firestore with data:`, JSON.stringify(updates, null, 2));
    showLoading(`Updating ${messageAction}...`);
    const success = await updateCourseDefinition(courseId, updates); // updateCourseDefinition uses set merge
    hideLoading();
    if (success) {
        alert(`${isFoP ? 'FoP course data' : `Course "${updates.name}"`} updated successfully in Firestore!`);
        // Force refresh of local cache by removing old entry before browsing
        globalCourseDataMap.delete(courseId);
        showBrowseCourses();
    } else {
        // updateCourseDefinition already shows an alert on failure
    }
}

/**
 * Displays the details of a specific course.
 * MODIFIED: Displays prerequisites and corequisites as Subject Tags (strings).
 */
export async function showCourseDetails(courseId) {
     setActiveSidebarLink('showBrowseCourses', 'sidebar-standard-nav');
     setActiveCourseId(null);
     showLoading("Loading course details...");
     const course = await fetchCourseDetails(courseId);
     hideLoading();
     if (!course) {
         displayContent('<p class="text-red-500 p-4">Could not load course details or access denied.</p><button onclick="window.showBrowseCourses()" class="btn-secondary mt-2">Back to Courses</button>'); return;
     }
     const isAdmin = currentUser?.uid === ADMIN_UID;
     const isEnrolled = userCourseProgressMap.has(courseId);
     const canReport = currentUser && currentUser.uid !== course.creatorUid && course.status === 'approved' && course.id !== FOP_COURSE_ID;
     const canEnroll = currentUser && !isEnrolled && (course.status === 'approved' || course.id === FOP_COURSE_ID);
     const numChapters = course.totalChapters ?? (Array.isArray(course.chapters) ? course.chapters.length : 0);

     const displayStatus = (course.id === FOP_COURSE_ID && !isAdmin && course.status !== 'reported' && course.status !== 'rejected') ? 'approved' : course.status;
     const displayStatusText = displayStatus ? displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1) : 'N/A';

     let chaptersHtml = '';
     if (numChapters > 0 && Array.isArray(course.chapters) && course.chapters.length > 0) {
         const chapterTitles = (course.chapters.length === numChapters && course.chapters.every(ch => typeof ch === 'string' || (typeof ch === 'object' && ch !== null && ch.name)))
             ? course.chapters.map(ch => (typeof ch === 'string' ? ch : ch.name))
             : Array.from({ length: numChapters }, (_, i) => `Chapter ${i + 1}`);
         chaptersHtml = `<ol class="list-decimal list-inside space-y-1 text-sm max-h-60 overflow-y-auto bg-gray-50 dark:bg-gray-700 p-3 rounded border dark:border-gray-600">` + chapterTitles.map((title, index) => `<li>${escapeHtml(title || `Chapter ${index + 1}`)}</li>`).join('') + `</ol>`;
     } else if (numChapters > 0) {
         chaptersHtml = `<ol class="list-decimal list-inside space-y-1 text-sm max-h-60 overflow-y-auto bg-gray-50 dark:bg-gray-700 p-3 rounded border dark:border-gray-600">` + Array.from({ length: numChapters }, (_, i) => `<li>Chapter ${i + 1}</li>`).join('') + `</ol>`;
     } else {
         chaptersHtml = `<p class="text-sm text-muted italic">Chapter list not available or course has 0 chapters.</p>`;
     }
      let actionButtonHtml = '';
      if (isEnrolled) { actionButtonHtml = `<button onclick="window.navigateToCourseDashboard('${course.id}')" class="btn-success w-full mt-4">Go to Course Dashboard</button>`; }
      else if (canEnroll) { actionButtonHtml = `<button onclick="window.showCourseEnrollment('${course.id}')" class="btn-primary w-full mt-4">Enroll in Course</button>`; }
      else if (!currentUser) { actionButtonHtml = `<p class="text-center text-muted mt-4">Log in to enroll.</p>`; }
      else if (course.status !== 'approved' && course.id !== FOP_COURSE_ID) { actionButtonHtml = `<p class="text-center text-muted mt-4">This course is not currently available for enrollment (${escapeHtml(course.status || 'N/A')}).</p>`; }

     const showAdminActions = isAdmin && course.id !== FOP_COURSE_ID && (course.status === 'pending' || course.status === 'reported' || course.status === 'rejected');
     const showFopAdminActions = isAdmin && course.id === FOP_COURSE_ID;

     // Show courseDirName for admin
     const adminDetailsHtml = isAdmin ? `
        <p class="text-xs text-muted mt-1">Course ID: ${escapeHtml(course.id)}</p>
        <p class="text-xs text-muted">Directory Name: <code class="text-purple-600 dark:text-purple-400">${escapeHtml(course.courseDirName || 'N/A')}</code></p>
     ` : '';

    // --- MODIFIED: Display Prerequisites/Corequisites as Subject Tags ---
     const renderReqList = (reqTags, type) => {
        if (!reqTags || reqTags.length === 0) return '';
        const listItems = reqTags.map(tag => {
            // Simply display the tag string
            return `<li class="text-gray-700 dark:text-gray-300">${escapeHtml(tag)} <span class="text-xs text-muted italic">(Subject Tag)</span></li>`;
        }).join('');
        return `
            <div class="mt-4">
                <h4 class="text-md font-semibold mb-1 text-gray-600 dark:text-gray-400">${type}:</h4>
                <ul class="list-disc list-inside space-y-0.5 text-sm ml-2">
                    ${listItems}
                </ul>
            </div>
        `;
     };
     const prereqsHtml = renderReqList(course.prerequisites, 'Prerequisites');
     const coreqsHtml = renderReqList(course.corequisites, 'Corequisites');
     // --- End MODIFICATION ---

     const html = `
        <div class="animate-fade-in space-y-6">
            <div class="flex flex-wrap justify-between items-center gap-2"><h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200">${escapeHtml(course.name || 'Unnamed Course')}</h2><button onclick="window.showBrowseCourses()" class="btn-secondary-small flex-shrink-0">Back to Courses</button></div>
            <div class="content-card">
                 <div class="flex justify-between items-start mb-4 pb-4 border-b dark:border-gray-600"><div><p class="text-sm text-muted">Major: <span class="font-medium text-gray-700 dark:text-gray-300">${escapeHtml(course.majorTag || 'N/A')}</span></p>${course.subjectTag ? `<p class="text-sm text-muted">Subject: <span class="font-medium text-gray-700 dark:text-gray-300">${escapeHtml(course.subjectTag)}</span></p>` : ''}<p class="text-xs text-muted mt-1">Created by: ${escapeHtml(course.creatorName || 'Unknown')} ${course.createdAt?.toDate ? `on ${new Date(course.createdAt.toDate()).toLocaleDateString()}` : (course.id === FOP_COURSE_ID ? '(Built-in/Config)' : '')}</p>${adminDetailsHtml}</div><div class="text-right"><span class="text-sm font-semibold px-2 py-1 rounded ${displayStatus === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-200' : displayStatus === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-200' : displayStatus === 'reported' ? 'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-200' : displayStatus === 'rejected' ? 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'}">${escapeHtml(displayStatusText)}</span>${course.status === 'reported' && isAdmin ? `<p class="text-xs text-red-500 cursor-pointer hover:underline mt-1" onclick="alert('Report Reason: ${escapeHtml(course.reportReason || 'None provided')}')">(View Report)</p>` : ''}</div></div>
                <p class="text-base mb-4">${escapeHtml(course.description || 'No description.')}</p>
                ${prereqsHtml}
                ${coreqsHtml}
                <h3 class="text-lg font-semibold mb-2 mt-4 text-gray-700 dark:text-gray-300">Course Chapters (${numChapters})</h3>
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

/**
 * MODIFIED: Handles reporting a course by updating its status using updateCourseDefinition.
 */
export async function handleReportCourse(courseId) {
    if (!currentUser) { alert("Please log in to report."); return; }
    if (courseId === FOP_COURSE_ID) {
        alert("The Fundamentals of Physics course cannot be reported.");
        return;
    }
    const reason = prompt(`Please provide a brief reason for reporting this course (ID: ${courseId}):`);
    if (reason === null) return; // User cancelled
    if (!reason.trim()) { alert("A reason is required to report."); return; }

    showLoading("Submitting report...");
    try {
        let reportedByUpdate;
        // Check if firebase namespace is available for FieldValue
        if (typeof firebase !== 'undefined' && typeof firebase.firestore !== 'undefined' && typeof firebase.firestore.FieldValue !== 'undefined') {
            reportedByUpdate = firebase.firestore.FieldValue.arrayUnion(currentUser.uid);
        } else {
             console.warn("firebase.firestore.FieldValue.arrayUnion not available. Storing only current user ID for report.");
             // Fallback: Store only the current user's ID in a new array or overwrite existing
             reportedByUpdate = [currentUser.uid];
             // Or, if you need to append reliably without FieldValue, fetch existing, append, then update.
             // const existingCourse = await fetchCourseDetails(courseId);
             // const existingReportedBy = existingCourse?.reportedBy || [];
             // if (!existingReportedBy.includes(currentUser.uid)) {
             //     reportedByUpdate = [...existingReportedBy, currentUser.uid];
             // } else {
             //     reportedByUpdate = existingReportedBy; // Avoid duplicates
             // }
        }

        const updates = {
            status: 'reported',
            reportReason: reason.trim(),
            reportedBy: reportedByUpdate
        };
        // Use updateCourseDefinition to set the reported status and reason
        const success = await updateCourseDefinition(courseId, updates);
        hideLoading();

        if (success) {
            alert("Course reported successfully.");
            // Refresh the course list view instead of showing details again
            showBrowseCourses();
        } else {
            // updateCourseDefinition should show its own alert on failure
            console.error(`Failed to report course ${courseId} via updateCourseDefinition.`);
        }
    } catch (error) {
        hideLoading();
        console.error(`Error reporting course ${courseId}:`, error);
        alert(`Failed to submit report: ${error.message}`);
    }
}


// MODIFIED handleCourseApproval (logic mostly the same, message clarification)
export async function handleCourseApproval(courseId, approve, deleteCourse = false) {
    if (!currentUser || currentUser.uid !== ADMIN_UID) { alert("Action requires admin privileges."); return; }

    if (courseId === FOP_COURSE_ID) {
         const currentCourse = globalCourseDataMap.get(courseId); // Get current status from cache
         const isClearingReport = approve && (currentCourse?.status === 'reported');
         if (!deleteCourse && !isClearingReport) {
             alert("The Fundamentals of Physics course status cannot be directly approved or rejected. Edit its config, clear reports, or delete the Firestore record if applicable.");
             return;
         }
     }

    let actionText = '';
    let newStatus = null;
    let updates = {};

    const courseData = await fetchCourseDetails(courseId); // Fetch latest data before action
    if (!courseData && !deleteCourse) {
         alert(`Error: Could not find course data for ID: ${courseId} to perform status change.`); return;
    }

    if (deleteCourse) {
        actionText = 'delete';
        if(courseId === FOP_COURSE_ID) actionText = 'delete the Firestore record for';
    } else if (approve) {
        actionText = 'approve';
        if (courseData?.status === 'reported') actionText = 'approve (clear report)';
        newStatus = 'approved';
        updates = { status: newStatus, reportReason: null, reportedBy: [] }; // Clear report info on approval
    } else {
        actionText = 'reject';
        newStatus = 'rejected';
        updates = { status: newStatus, reportReason: null, reportedBy: [] }; // Clear report info on rejection too
    }

    const confirmationMessage = `Are you sure you want to ${actionText} course "${courseData?.name || courseId}"?` + (deleteCourse ? '\n\nTHIS ACTION IS PERMANENT AND CANNOT BE UNDONE.' : '');
    if (!confirm(confirmationMessage)) return;

    showLoading(`Processing course ${actionText}...`);
    const courseRef = db.collection('courses').doc(courseId);
    let success = false;

    try {
        if (deleteCourse) {
            await courseRef.delete();
            globalCourseDataMap.delete(courseId);
            success = true;
             alert(`Course record ${courseId} deleted successfully from Firestore.`);
            hideLoading();
            if(courseId === FOP_COURSE_ID) {
                console.log("FoP Firestore record deleted. Reloading from local config into cache.");
                 const fopDef = {...FOP_COURSE_DEFINITION};
                 fopDef.id = FOP_COURSE_ID; fopDef.status = 'approved';
                 fopDef.youtubePlaylistUrls = fopDef.youtubePlaylistUrls || (fopDef.youtubePlaylistUrl ? [fopDef.youtubePlaylistUrl] : []);
                 fopDef.chapterResources = fopDef.chapterResources || {};
                 fopDef.totalChapters = fopDef.totalChapters ?? (Array.isArray(fopDef.chapters) ? fopDef.chapters.length : 0);
                 fopDef.chapters = fopDef.chapters || [];
                 fopDef.midcourseChapters = fopDef.midcourseChapters || [];
                 fopDef.imageUrl = fopDef.imageUrl || null;
                 fopDef.coverUrl = fopDef.coverUrl || null;
                 fopDef.courseDirName = fopDef.courseDirName || cleanTextForFilename(fopDef.name) || FOP_COURSE_ID; // Ensure courseDirName
                 // Ensure prereqs/coreqs are arrays of strings
                 fopDef.prerequisites = Array.isArray(fopDef.prerequisites) ? fopDef.prerequisites.filter(item => typeof item === 'string') : [];
                 fopDef.corequisites = Array.isArray(fopDef.corequisites) ? fopDef.corequisites.filter(item => typeof item === 'string') : [];
                 updateGlobalCourseData(courseId, fopDef);
            }
            showBrowseCourses();
            return;
        }
        else {
            // Use updateCourseDefinition instead of direct update
            // It handles admin checks and local state update
            success = await updateCourseDefinition(courseId, updates);
            if (success) {
                alert(`Course ${courseId} ${actionText}d successfully.`);
            } else {
                // updateCourseDefinition shows its own error alert
                 console.error(`Failed to ${actionText} course ${courseId} via updateCourseDefinition.`);
            }
        }
        hideLoading();

        if (success && !deleteCourse) {
             showBrowseCourses(); // Refresh list after status change
        } else if (success && deleteCourse) {
             // Already handled showing browse courses
        }
    } catch (error) {
        console.error(`Error ${actionText}ing course ${courseId}:`, error);
        hideLoading();
        alert(`Failed to ${actionText} course: ${error.message}`);
    }
}


// Make functions accessible globally
window.showBrowseCourses = showBrowseCourses;
window.handleCourseSearch = handleCourseSearch;
window.showAddCourseForm = showAddCourseForm;
window.submitNewCourse = submitNewCourse;
window.showEditCourseForm = showEditCourseForm;
window.handleUpdateCourse = handleUpdateCourse;
window.showCourseDetails = showCourseDetails;
window.handleReportCourse = handleReportCourse;
window.handleCourseApproval = handleCourseApproval;
window.showCourseEnrollment = showCourseEnrollment;
window.navigateToCourseDashboard = navigateToCourseDashboard;

// --- END OF FILE ui_courses.js ---