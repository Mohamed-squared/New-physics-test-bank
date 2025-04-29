// --- START OF FILE ui_courses.js ---

// ui_courses.js
import { currentUser, db, userCourseProgressMap, globalCourseDataMap, activeCourseId, setActiveCourseId, updateGlobalCourseData } from './state.js';
import { ADMIN_UID, FOP_COURSE_ID, FOP_COURSE_DEFINITION } from './config.js';
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
        query = query.where('status', '==', 'approved');
    }
    // Admins see all statuses, might want ordering later
    query = query.orderBy('name');

    try {
        const snapshot = await query.limit(100).get();
        let courses = [];
        snapshot.forEach(doc => { courses.push({ id: doc.id, ...doc.data() }); });

        // Manually add FoP if not in Firestore or not 'approved' for non-admins
        const fopInList = courses.some(c => c.id === FOP_COURSE_ID);
        if (!fopInList) {
            const fopDef = { ...FOP_COURSE_DEFINITION, status: 'approved' }; // Treat local config as approved
            const matchesSearch = (!searchTerm || fopDef.name.toLowerCase().includes(searchTerm.toLowerCase()) || fopDef.id.toLowerCase().includes(searchTerm.toLowerCase())) &&
                                  (!searchTag || fopDef.majorTag?.toLowerCase().includes(searchTag.toLowerCase()));
            if (matchesSearch) {
                courses.push(fopDef);
                // Re-sort if FoP added manually
                courses.sort((a, b) => a.name.localeCompare(b.name));
            }
        }


        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            courses = courses.filter(course =>
                course.name?.toLowerCase().includes(lowerSearchTerm) ||
                course.majorTag?.toLowerCase().includes(lowerSearchTerm) ||
                course.subjectTag?.toLowerCase().includes(lowerSearchTerm) ||
                course.description?.toLowerCase().includes(lowerSearchTerm)
            );
        }
        // Update global state map with fetched/filtered courses
        // Clear existing non-FoP courses before adding new ones to avoid stale data
        // Keep FoP if it exists
        // const currentFoP = globalCourseDataMap.get(FOP_COURSE_ID);
        // globalCourseDataMap.clear();
        // if (currentFoP) globalCourseDataMap.set(FOP_COURSE_ID, currentFoP);
        courses.forEach(course => {
            updateGlobalCourseData(course.id, course);
        });
        return courses;
    } catch (error) { console.error("Error fetching courses:", error); return []; }
}

async function fetchCourseDetails(courseId) {
    // Check cache first
    if (globalCourseDataMap.has(courseId)) {
        return globalCourseDataMap.get(courseId);
    }
    // Fetch from Firestore if not cached
    try {
        const docRef = db.collection('courses').doc(courseId);
        const doc = await docRef.get();
        if (doc.exists) {
            const courseData = { id: doc.id, ...doc.data() };
            // Ensure expected fields exist
            courseData.chapterResources = courseData.chapterResources || {};
             if (!courseData.youtubePlaylistUrls && courseData.youtubePlaylistUrl) {
                 courseData.youtubePlaylistUrls = [courseData.youtubePlaylistUrl];
             } else {
                 courseData.youtubePlaylistUrls = courseData.youtubePlaylistUrls || [];
             }
            updateGlobalCourseData(courseId, courseData);
            return courseData;
        }
    } catch (error) { console.error(`Error fetching course details for ${courseId} from Firestore:`, error); }

    // Fallback to local config for FoP
    if (courseId === FOP_COURSE_ID) {
        console.log(`Course ${courseId} not found in Firestore or cache, using local config.`);
        const fopDef = {...FOP_COURSE_DEFINITION};
        fopDef.youtubePlaylistUrls = fopDef.youtubePlaylistUrls || (fopDef.youtubePlaylistUrl ? [fopDef.youtubePlaylistUrl] : []);
        fopDef.chapterResources = fopDef.chapterResources || {};
        updateGlobalCourseData(courseId, fopDef);
        return fopDef;
    }
    console.log(`No course document or config found for ID: ${courseId}`); return null;
}

async function addCourseToFirestore(courseData) {
     if (!currentUser) return { success: false, message: "User not logged in." };
     const isAdmin = currentUser.uid === ADMIN_UID;
     const status = isAdmin ? 'approved' : 'pending';
     try {
         // Ensure chapters array matches totalChapters
         const totalChapters = parseInt(courseData.totalChapters) || 0;
         const chapters = Array.from({ length: totalChapters }, (_, i) => `Chapter ${i + 1}`);

         const docRef = await db.collection('courses').add({
             name: courseData.name || 'Untitled Course',
             description: courseData.description || null,
             majorTag: courseData.majorTag || null,
             subjectTag: courseData.subjectTag || null,
             relatedSubjectId: courseData.relatedSubjectId || null,
             totalChapters: totalChapters,
             chapters: chapters, // Store generated chapter names
             creatorUid: currentUser.uid,
             creatorName: currentUser.displayName || currentUser.email,
             createdAt: firebase.firestore.FieldValue.serverTimestamp(),
             status: status,
             reportedBy: [],
             reportReason: null,
             // Ensure URLs are null if empty, not empty string
             youtubePlaylistUrl: courseData.youtubePlaylistUrl || null, // Keep single for backward compat? Add urls below
             youtubePlaylistUrls: courseData.youtubePlaylistUrls || (courseData.youtubePlaylistUrl ? [courseData.youtubePlaylistUrl] : []), // Store as array
             pdfPathPattern: courseData.pdfPathPattern || null,
             transcriptionPathPattern: courseData.transcriptionPathPattern || null,
             chapterResources: courseData.chapterResources || {}, // Initialize empty object
         });
         const newCourseData = {
             id: docRef.id, ...courseData, chapters, status, totalChapters,
             creatorUid: currentUser.uid, creatorName: currentUser.displayName || currentUser.email,
             createdAt: new Date(), // Use client date for immediate state update
             reportedBy: [], reportReason: null, youtubePlaylistUrls: courseData.youtubePlaylistUrls || (courseData.youtubePlaylistUrl ? [courseData.youtubePlaylistUrl] : []),
             chapterResources: courseData.chapterResources || {}
         };
         updateGlobalCourseData(docRef.id, newCourseData);
         return { success: true, id: docRef.id, status: status };
     } catch (error) { console.error("Error adding course:", error); return { success: false, message: error.message }; }
}

async function reportCourseInFirestore(courseId, reason) {
     if (!currentUser || !courseId) return false;
     const courseRef = db.collection('courses').doc(courseId);
     try {
         await courseRef.update({
             status: 'reported', reportReason: reason || 'No reason provided.',
             reportedBy: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
         });
         const currentData = globalCourseDataMap.get(courseId);
         if (currentData) {
             updateGlobalCourseData(courseId, { ...currentData, status: 'reported', reportReason: reason });
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
                ${currentUser?.uid === ADMIN_UID ? `<button onclick="window.showAddCourseForm()" class="btn-primary flex-shrink-0"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 mr-1"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg>Add Course</button>` : ''}
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

function renderCourseList(courses, container) {
     if (!container) return;
    if (!courses || courses.length === 0) { container.innerHTML = '<p class="text-center text-muted p-6">No courses found.</p>'; return; }
    const isAdmin = currentUser?.uid === ADMIN_UID;
    const enrolledCourseIds = Array.from(userCourseProgressMap.keys());
    container.innerHTML = courses.map(course => {
        // Only render if course has an ID and name (basic sanity check)
        if (!course || !course.id || !course.name) return '';

        const statusClass = course.status === 'pending' ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/30' : course.status === 'reported' ? 'border-red-400 bg-red-50 dark:bg-red-900/30' : 'border-gray-200 dark:border-gray-600';
        const statusText = course.status === 'pending' ? 'Pending Approval' : course.status === 'reported' ? 'Reported' : '';
        const isEnrolled = enrolledCourseIds.includes(course.id);
        const numChapters = course.totalChapters || (Array.isArray(course.chapters) ? course.chapters.length : 0);
        let actionButtonHtml = '';
        if (isEnrolled) { actionButtonHtml = `<button onclick="window.navigateToCourseDashboard('${course.id}')" class="btn-success-small">Go to Course</button>`; }
        else if (course.status === 'approved' || course.id === FOP_COURSE_ID) { actionButtonHtml = `<button onclick="window.showCourseEnrollment('${course.id}')" class="btn-primary-small">Enroll</button>`; }
        else { actionButtonHtml = `<button class="btn-secondary-small" disabled>Unavailable</button>`; }
        return `
        <div class="course-card border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200 ${statusClass}">
            <div class="flex flex-col sm:flex-row justify-between items-start gap-3">
                 <div class="flex-grow min-w-0">
                     <h3 class="text-lg font-semibold text-primary-600 dark:text-primary-400 hover:underline cursor-pointer" onclick="window.showCourseDetails('${course.id}')">
                        ${escapeHtml(course.name || 'Unnamed Course')} ${isEnrolled ? '<span class="text-xs text-green-600 dark:text-green-400">(Enrolled)</span>': ''}
                     </h3>
                     <p class="text-sm text-muted mt-1">${escapeHtml(course.description || 'No description available.')}</p>
                     <div class="text-xs mt-2 space-x-2">
                         ${course.majorTag ? `<span class="inline-block bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-200 px-2 py-0.5 rounded-full">${escapeHtml(course.majorTag)}</span>` : ''}
                         ${course.subjectTag ? `<span class="inline-block bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-200 px-2 py-0.5 rounded-full">${escapeHtml(course.subjectTag)}</span>` : ''}
                         <span class="inline-block bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200 px-2 py-0.5 rounded-full">${numChapters} Chapters</span>
                    </div>
                    ${isAdmin ? `<p class="text-xs text-muted mt-2">Creator: ${escapeHtml(course.creatorName || 'Unknown')} | Status: ${escapeHtml(course.status || 'N/A')}</p>` : ''}
                 </div>
                 <div class="flex-shrink-0 text-right space-y-2 mt-2 sm:mt-0">
                     ${statusText ? `<p class="text-xs font-bold ${course.status === 'pending' ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'} mb-1">${statusText}</p>` : ''}
                     <button onclick="window.showCourseDetails('${course.id}')" class="btn-secondary-small w-full sm:w-auto">View Details</button>
                     ${actionButtonHtml}
                 </div>
            </div>
             ${isAdmin && (course.status === 'pending' || course.status === 'reported') ? `
                <div class="mt-3 pt-3 border-t dark:border-gray-600 text-right space-x-2">
                    ${course.status === 'pending' ? `<button onclick="window.handleCourseApproval('${course.id}', true)" class="btn-success-small">Approve</button><button onclick="window.handleCourseApproval('${course.id}', false)" class="btn-danger-small">Reject</button>` : ''}
                    ${course.status === 'reported' ? `<button onclick="window.handleCourseApproval('${course.id}', true)" class="btn-success-small">Clear Report</button><button onclick="alert('Report Reason: ${escapeHtml(course.reportReason || 'None provided')}')" class="btn-warning-small">View Report</button><button onclick="window.handleCourseApproval('${course.id}', false, true)" class="btn-danger-small">Delete Course</button>` : ''}
                    <button onclick="window.showEditCourseForm('${course.id}')" class="btn-secondary-small">Edit</button>
                </div>
             ` : ''}
        </div>`;
    }).join('');
}

export function showAddCourseForm() {
    if (currentUser?.uid !== ADMIN_UID) { alert("Permission denied."); return; }
    setActiveSidebarLink('showBrowseCourses');
    const html = `
    <div class="max-w-lg mx-auto animate-fade-in">
         <h2 class="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200">Add New Course</h2>
         <form id="add-course-form" onsubmit="window.submitNewCourse(event)" class="space-y-4 content-card">
              <div><label for="course-name">Course Name</label><input id="course-name" type="text" required></div>
              <div><label for="course-desc">Description</label><textarea id="course-desc" rows="3"></textarea></div>
              <div><label for="course-major-tag">Major Tag</label><input id="course-major-tag" type="text" placeholder="e.g., Physics"></div>
              <div><label for="course-subject-tag">Subject Tag</label><input id="course-subject-tag" type="text" placeholder="e.g., Quantum Mechanics"></div>
              <div><label for="course-subject-id">Related Subject ID (for Questions)</label><input id="course-subject-id" type="text" placeholder="e.g., 1" required><p class="form-help-text">Links to Subject ID in User Data for question bank.</p></div>
              <div><label for="course-total-chapters">Total Chapters</label><input id="course-total-chapters" type="number" min="1" required></div>
              <hr class="my-4 dark:border-gray-600"/>
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Resource Paths/URLs (Optional)</p>
              <div><label for="course-playlist-url">Main YouTube Playlist URL(s)</label><textarea id="course-playlist-urls" rows="2" placeholder="Enter one URL per line..."></textarea><p class="form-help-text">Enter full playlist URLs, one per line.</p></div>
              <div><label for="course-pdf-pattern">PDF Path Pattern</label><input id="course-pdf-pattern" type="text" placeholder="./Course PDFs/chapter{num}.pdf"><p class="form-help-text">Use '{num}' as placeholder for chapter number.</p></div>
              <div><label for="course-trans-pattern">Transcription Base Path</label><input id="course-trans-pattern" type="text" placeholder="./Course Transcriptions/"><p class="form-help-text">Path to folder. Filenames derived from video titles (e.g., VideoTitle.srt).</p></div>
              <div class="pt-4 mt-2 border-t dark:border-gray-700"><button type="submit" class="btn-primary w-full">Submit Course</button><button type="button" onclick="window.showBrowseCourses()" class="btn-secondary w-full mt-2">Cancel</button></div>
         </form>
    </div>`;
    displayContent(html);
}

export async function showEditCourseForm(courseId) {
    if (currentUser?.uid !== ADMIN_UID) { alert("Permission denied."); return; }
    setActiveSidebarLink('showBrowseCourses');
    showLoading("Loading course data for editing...");
    const course = await fetchCourseDetails(courseId);
    hideLoading();
    if (!course) { displayContent('<p class="text-red-500 p-4">Could not load course details for editing.</p><button onclick="window.showBrowseCourses()" class="btn-secondary mt-2">Back to Courses</button>'); return; }
    // Join playlist URLs into a string for the textarea
    const playlistUrlsString = (course.youtubePlaylistUrls || []).join('\n');
    const html = `
    <div class="max-w-lg mx-auto animate-fade-in">
         <h2 class="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200">Edit Course: ${escapeHtml(course.name)}</h2>
         <form id="edit-course-form" onsubmit="window.handleUpdateCourse(event, '${courseId}')" class="space-y-4 content-card">
              <div><label for="edit-course-name">Course Name</label><input id="edit-course-name" type="text" required value="${escapeHtml(course.name || '')}"></div>
              <div><label for="edit-course-desc">Description</label><textarea id="edit-course-desc" rows="3">${escapeHtml(course.description || '')}</textarea></div>
              <div><label for="edit-course-major-tag">Major Tag</label><input id="edit-course-major-tag" type="text" value="${escapeHtml(course.majorTag || '')}"></div>
              <div><label for="edit-course-subject-tag">Subject Tag</label><input id="edit-course-subject-tag" type="text" value="${escapeHtml(course.subjectTag || '')}"></div>
              <div><label for="edit-course-subject-id">Related Subject ID</label><input id="edit-course-subject-id" type="text" required value="${escapeHtml(course.relatedSubjectId || '')}"><p class="form-help-text">Links to Subject ID in User Data for question bank.</p></div>
              <div><label for="edit-course-total-chapters">Total Chapters</label><input id="edit-course-total-chapters" type="number" min="1" required value="${course.totalChapters || 0}"></div>
              <hr class="my-4 dark:border-gray-600"/>
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Resource Paths/URLs</p>
              <div><label for="edit-course-playlist-urls">YouTube Playlist URL(s)</label><textarea id="edit-course-playlist-urls" rows="2" placeholder="Enter one URL per line...">${escapeHtml(playlistUrlsString)}</textarea><p class="form-help-text">Enter full playlist URLs, one per line.</p></div>
              <div><label for="edit-course-pdf-pattern">PDF Path Pattern</label><input id="edit-course-pdf-pattern" type="text" value="${escapeHtml(course.pdfPathPattern || '')}" placeholder="./Course PDFs/chapter{num}.pdf"></div>
              <div><label for="edit-course-trans-pattern">Transcription Base Path</label><input id="edit-course-trans-pattern" type="text" value="${escapeHtml(course.transcriptionPathPattern || '')}" placeholder="./Course Transcriptions/"><p class="form-help-text">Path to folder. Filenames derived from video titles.</p></div>
              <p class="text-xs text-muted">(Editing specific chapter resource overrides via Admin->Playlist Assignment)</p>
              <div class="pt-4 mt-2 border-t dark:border-gray-700"><button type="submit" class="btn-primary w-full">Save Changes</button><button type="button" onclick="window.showBrowseCourses()" class="btn-secondary w-full mt-2">Cancel</button></div>
         </form>
    </div>`;
    displayContent(html);
}

export async function submitNewCourse(event) {
    event.preventDefault();
    if (currentUser?.uid !== ADMIN_UID) { alert("Permission denied."); return; }
    const playlistUrlsText = document.getElementById('course-playlist-urls')?.value.trim() || '';
    const playlistUrls = playlistUrlsText ? playlistUrlsText.split('\n').map(url => url.trim()).filter(url => url) : [];

    const courseData = {
        name: document.getElementById('course-name')?.value.trim(),
        description: document.getElementById('course-desc')?.value.trim() || null,
        majorTag: document.getElementById('course-major-tag')?.value.trim() || null,
        subjectTag: document.getElementById('course-subject-tag')?.value.trim() || null,
        relatedSubjectId: document.getElementById('course-subject-id')?.value.trim(),
        totalChapters: parseInt(document.getElementById('course-total-chapters')?.value || '0'),
        youtubePlaylistUrls: playlistUrls, // Use the parsed array
        pdfPathPattern: document.getElementById('course-pdf-pattern')?.value.trim() || null,
        transcriptionPathPattern: document.getElementById('course-trans-pattern')?.value.trim() || null, // Corrected ID
        chapters: [], chapterResources: {}
    };
    if (!courseData.name || !courseData.relatedSubjectId || courseData.totalChapters <= 0) { alert("Course Name, Related Subject ID, and a valid Total Chapters count are required."); return; }
    courseData.chapters = Array.from({ length: courseData.totalChapters }, (_, i) => `Chapter ${i + 1}`);
    showLoading("Submitting course...");
    const result = await addCourseToFirestore(courseData); hideLoading();
    if (result.success) { alert(`Course "${courseData.name}" added and ${result.status} successfully!`); showBrowseCourses(); } else { alert("Failed to add course: " + result.message); }
}

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
        transcriptionPathPattern: document.getElementById('edit-course-trans-pattern')?.value.trim() || null, // Corrected ID
    };

    // --- Add NaN check ---
    if (isNaN(updates.totalChapters)) {
        alert("Invalid input for 'Total Chapters'. Please enter a valid number.");
        document.getElementById('edit-course-total-chapters')?.focus();
        return; // Stop execution if totalChapters is NaN
    }
    // --- End NaN check ---

     if (!updates.name || !updates.relatedSubjectId || updates.totalChapters <= 0) { alert("Course Name, Related Subject ID, and a valid Total Chapters count are required."); return; }

    const currentCourseData = globalCourseDataMap.get(courseId);
    // Check if totalChapters changed to update the chapters array
    if (!currentCourseData || updates.totalChapters !== currentCourseData.totalChapters) {
        // If the number of chapters changes, create a new simple array of chapter names
        updates.chapters = Array.from({ length: updates.totalChapters }, (_, i) => `Chapter ${i + 1}`);
        console.log(`Chapter count changed. Updating chapters array for course ${courseId}.`);
    }

    // --- Add Logging ---
    console.log(`Attempting to update course ${courseId} with data:`, JSON.stringify(updates, null, 2));
    // --- End Logging ---

    showLoading("Updating course...");
    const success = await updateCourseDefinition(courseId, updates); // This calls the function where the error occurs
    hideLoading();
    if (success) {
        alert(`Course "${updates.name}" updated successfully!`);
        showBrowseCourses();
    }
    // No else needed, updateCourseDefinition shows an alert on failure
}


export async function showCourseDetails(courseId) {
     setActiveSidebarLink('showBrowseCourses', 'sidebar-standard-nav');
     setActiveCourseId(null);
     showLoading("Loading course details...");
     const course = await fetchCourseDetails(courseId); hideLoading();
     if (!course) { displayContent('<p class="text-red-500 p-4">Could not load course details.</p><button onclick="window.showBrowseCourses()" class="btn-secondary mt-2">Back to Courses</button>'); return; }
     const isAdmin = currentUser?.uid === ADMIN_UID;
     const isEnrolled = userCourseProgressMap.has(courseId);
     const canReport = currentUser && currentUser.uid !== course.creatorUid && course.status === 'approved';
     const canEnroll = currentUser && !isEnrolled && (course.status === 'approved' || course.id === FOP_COURSE_ID);
     const numChapters = course.totalChapters || (Array.isArray(course.chapters) ? course.chapters.length : 0);
     let chaptersHtml = '';
     if (numChapters > 0) {
         const chapterTitles = Array.isArray(course.chapters) && course.chapters.length === numChapters ? course.chapters : Array.from({ length: numChapters }, (_, i) => `Chapter ${i + 1}`);
         chaptersHtml = `<ol class="list-decimal list-inside space-y-1 text-sm max-h-60 overflow-y-auto bg-gray-50 dark:bg-gray-700 p-3 rounded border dark:border-gray-600">` + chapterTitles.map((title, index) => `<li>${escapeHtml(title)}</li>`).join('') + `</ol>`;
     } else { chaptersHtml = `<p class="text-sm text-muted italic">Chapter list not available.</p>`; }
      let actionButtonHtml = '';
      if (isEnrolled) { actionButtonHtml = `<button onclick="window.navigateToCourseDashboard('${course.id}')" class="btn-success w-full mt-4">Go to Course Dashboard</button>`; }
      else if (canEnroll) { actionButtonHtml = `<button onclick="window.showCourseEnrollment('${course.id}')" class="btn-primary w-full mt-4">Enroll in Course</button>`; }
     const html = `
        <div class="animate-fade-in space-y-6">
            <div class="flex flex-wrap justify-between items-center gap-2"><h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200">${escapeHtml(course.name || 'Unnamed Course')}</h2><button onclick="window.showBrowseCourses()" class="btn-secondary-small flex-shrink-0">Back to Courses</button></div>
            <div class="content-card">
                 <div class="flex justify-between items-start mb-4 pb-4 border-b dark:border-gray-600"><div><p class="text-sm text-muted">Major: <span class="font-medium text-gray-700 dark:text-gray-300">${escapeHtml(course.majorTag || 'N/A')}</span></p>${course.subjectTag ? `<p class="text-sm text-muted">Subject: <span class="font-medium text-gray-700 dark:text-gray-300">${escapeHtml(course.subjectTag)}</span></p>` : ''}<p class="text-xs text-muted mt-1">Created by: ${escapeHtml(course.creatorName || 'Unknown')} ${course.createdAt ? `on ${new Date(course.createdAt.toDate()).toLocaleDateString()}` : ''}</p></div><div class="text-right"><span class="text-sm font-semibold px-2 py-1 rounded ${course.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-200'}">${escapeHtml(course.status || 'N/A')}</span>${course.status === 'reported' ? `<p class="text-xs text-red-500 cursor-pointer hover:underline mt-1" onclick="alert('Report Reason: ${escapeHtml(course.reportReason || 'None provided')}')">(View Report)</p>` : ''}</div></div>
                <p class="text-base mb-4">${escapeHtml(course.description || 'No description.')}</p>
                <h3 class="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">Course Chapters (${numChapters})</h3>
                ${chaptersHtml}
                ${actionButtonHtml}
                <div class="mt-6 pt-4 border-t dark:border-gray-600 flex justify-end gap-3">${canReport ? `<button onclick="window.handleReportCourse('${course.id}')" class="btn-warning-small">Report Course</button>` : ''}${isAdmin ? `<button onclick="window.showEditCourseForm('${course.id}')" class="btn-secondary-small">Edit Course</button>` : ''}</div>
            </div>
        </div>`;
     displayContent(html);
}

export async function handleReportCourse(courseId) {
    if (!currentUser) { alert("Please log in to report."); return; }
    const reason = prompt(`Please provide a brief reason for reporting this course (ID: ${courseId}):`);
    if (reason === null) return;
    showLoading("Submitting report...");
    const success = await reportCourseInFirestore(courseId, reason); hideLoading();
    if (success) { alert("Course reported successfully."); showCourseDetails(courseId); } else { alert("Failed to submit report."); }
}

export async function handleCourseApproval(courseId, approve, deleteCourse = false) {
     if (!currentUser || currentUser.uid !== ADMIN_UID) { alert("Action requires admin privileges."); return; }
     let actionText = deleteCourse ? 'delete' : approve ? 'approve' : 'reject';
     const courseData = globalCourseDataMap.get(courseId) || await fetchCourseDetails(courseId); // Fetch details if needed
     if (approve && !deleteCourse && courseData?.status === 'reported') { actionText = 'approve (clear report)'; }
     const confirmationMessage = `Are you sure you want to ${actionText} course "${courseData?.name || courseId}"?` + (deleteCourse ? '\n\nTHIS ACTION IS PERMANENT AND CANNOT BE UNDONE.' : '');
     if (!confirm(confirmationMessage)) return;
     showLoading(`Processing course ${actionText}...`); const courseRef = db.collection('courses').doc(courseId); let success = false;
     try {
         if (deleteCourse) { await courseRef.delete(); globalCourseDataMap.delete(courseId); success = true; alert(`Course ${courseId} deleted successfully.`); }
         else { const newStatus = approve ? 'approved' : 'rejected'; await courseRef.update({ status: newStatus, reportReason: null, reportedBy: [] }); const currentData = globalCourseDataMap.get(courseId); if (currentData) { updateGlobalCourseData(courseId, { ...currentData, status: newStatus, reportReason: null, reportedBy: [] }); } success = true; alert(`Course ${courseId} ${approve ? 'approved' : 'rejected'} successfully.`); }
         hideLoading(); if (success) { handleCourseSearch(); } // Refresh the list
     } catch (error) { console.error(`Error ${actionText}ing course ${courseId}:`, error); hideLoading(); alert(`Failed to ${actionText} course: ${error.message}`); }
}

// --- END OF FILE ui_courses.js ---