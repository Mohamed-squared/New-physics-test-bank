// ui_courses.js
import { currentUser, db} from './state.js';
import { ADMIN_UID } from './config.js';
import { displayContent, setActiveSidebarLink } from './ui_core.js';
import { showLoading, hideLoading } from './utils.js';
import { getAIExplanation } from './ai_integration.js'; // Placeholder for potential AI use

// --- Course Data Functions (Firestore interaction) ---

async function fetchCourses(searchTerm = '', searchTag = '') {
    let query = db.collection('courses');

    // Only show approved courses to regular users
    if (currentUser?.uid !== ADMIN_UID) {
        query = query.where('status', '==', 'approved');
    }

    // Basic tag filtering (can be expanded)
    if (searchTag) {
        // Assuming tags are stored like majorTag: "Physics" or subjectTag: "Quantum"
        // This requires exact match. More complex search needs better indexing/functions.
        query = query.where('majorTag', '==', searchTag).orderBy('name'); // Example filter
        // Or: query = query.where('subjectTag', '==', searchTag);
        // Or allow searching in an array: query = query.where('tags', 'array-contains', searchTag)
    } else {
       query = query.orderBy('name'); // Default sort
    }

    // Simple text search (client-side filtering after fetching)
    // Firestore native text search is limited. For complex search, use Algolia/Elasticsearch.
    try {
        const snapshot = await query.limit(100).get(); // Limit results for performance
        let courses = [];
        snapshot.forEach(doc => {
            courses.push({ id: doc.id, ...doc.data() });
        });

        // Client-side filtering for searchTerm (case-insensitive)
        if (searchTerm) {
             const lowerSearchTerm = searchTerm.toLowerCase();
             courses = courses.filter(course =>
                 course.name?.toLowerCase().includes(lowerSearchTerm) ||
                 course.majorTag?.toLowerCase().includes(lowerSearchTerm) ||
                 course.subjectTag?.toLowerCase().includes(lowerSearchTerm)
             );
        }
        return courses;
    } catch (error) {
        console.error("Error fetching courses:", error);
        return []; // Return empty array on error
    }
}

async function fetchCourseDetails(courseId) {
     try {
         const docRef = db.collection('courses').doc(courseId);
         const doc = await docRef.get();
         if (doc.exists) {
             return { id: doc.id, ...doc.data() };
         } else {
             console.log("No such course document!");
             return null;
         }
     } catch (error) {
         console.error("Error fetching course details:", error);
         return null;
     }
}


async function addCourseToFirestore(courseData) {
     if (!currentUser) return { success: false, message: "User not logged in." };

     const isAdmin = currentUser.uid === ADMIN_UID;
     const status = isAdmin ? 'approved' : 'pending';

     try {
         const docRef = await db.collection('courses').add({
             ...courseData,
             creatorUid: currentUser.uid,
             creatorName: currentUser.displayName || currentUser.email, // Use display name if available
             createdAt: firebase.firestore.FieldValue.serverTimestamp(),
             status: status,
             reportedBy: [], // Initialize reporting fields
             reportReason: null
         });
         return { success: true, id: docRef.id, status: status };
     } catch (error) {
         console.error("Error adding course:", error);
         return { success: false, message: error.message };
     }
}

async function reportCourseInFirestore(courseId, reason) {
     if (!currentUser || !courseId) return false;
     const courseRef = db.collection('courses').doc(courseId);
     try {
         await courseRef.update({
             status: 'reported',
             reportReason: reason || 'No reason provided.',
             reportedBy: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
         });
         return true;
     } catch (error) {
         console.error("Error reporting course:", error);
         return false;
     }
}


// --- UI Functions ---

export function showBrowseCourses() {
    setActiveSidebarLink('showBrowseCourses'); // Assuming this will be the function name used in sidebar
    displayContent(`
        <div class="animate-fade-in space-y-6">
            <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200">Browse Courses</h2>

             <!-- Search and Filter -->
            <div class="flex flex-wrap gap-4 mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border dark:border-gray-600">
                <div class="flex-grow">
                    <label for="course-search" class="sr-only">Search Courses</label>
                    <input type="search" id="course-search" placeholder="Search by name or tag..." class="w-full">
                </div>
                <div class="flex-shrink-0">
                     <label for="course-tag-filter" class="sr-only">Filter by Tag</label>
                     <input type="text" id="course-tag-filter" placeholder="Filter by Major Tag..." class="w-full sm:w-auto">
                </div>
                <button onclick="window.handleCourseSearch()" class="btn-secondary flex-shrink-0">Search</button>
                 <button onclick="window.showAddCourseForm()" class="btn-primary flex-shrink-0">
                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 mr-1"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg>
                    Add Course
                </button>
            </div>

            <!-- Course List -->
            <div id="course-list-container" class="space-y-4">
                <p class="text-center text-muted p-6">Loading courses...</p>
                 <div class="loader animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
            </div>
        </div>
    `);
    handleCourseSearch(); // Initial load
}

export function handleCourseSearch() {
    const searchTerm = document.getElementById('course-search')?.value || '';
    const searchTag = document.getElementById('course-tag-filter')?.value || '';
    const container = document.getElementById('course-list-container');
    if (!container) return;

    container.innerHTML = `<p class="text-center text-muted p-6">Searching...</p><div class="loader animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500 mx-auto"></div>`;

    fetchCourses(searchTerm, searchTag).then(courses => {
        renderCourseList(courses, container);
    });
}

function renderCourseList(courses, container) {
    if (!container) return;

    if (!courses || courses.length === 0) {
        container.innerHTML = '<p class="text-center text-muted p-6">No courses found matching your criteria.</p>';
        return;
    }

    const isAdmin = currentUser?.uid === ADMIN_UID;

    container.innerHTML = courses.map(course => {
        const statusClass = course.status === 'pending' ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/30' : course.status === 'reported' ? 'border-red-400 bg-red-50 dark:bg-red-900/30' : 'border-gray-200 dark:border-gray-600';
        const statusText = course.status === 'pending' ? 'Pending Approval' : course.status === 'reported' ? 'Reported' : '';

        return `
        <div class="course-card border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200 ${statusClass}">
            <div class="flex justify-between items-start gap-2">
                 <div class="flex-grow">
                     <h3 class="text-lg font-semibold text-primary-600 dark:text-primary-400 hover:underline cursor-pointer" onclick="window.showCourseDetails('${course.id}')">
                        ${course.name || 'Unnamed Course'}
                     </h3>
                     <div class="text-xs mt-1 space-x-2">
                         ${course.majorTag ? `<span class="inline-block bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-200 px-2 py-0.5 rounded-full">${course.majorTag}</span>` : ''}
                         ${course.subjectTag ? `<span class="inline-block bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-200 px-2 py-0.5 rounded-full">${course.subjectTag}</span>` : ''}
                    </div>
                    <p class="text-xs text-muted mt-2">Created by: ${course.creatorName || 'Unknown'}</p>
                 </div>
                 <div class="flex-shrink-0 text-right">
                     ${statusText ? `<p class="text-xs font-bold ${course.status === 'pending' ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'} mb-2">${statusText}</p>` : ''}
                     <button onclick="window.showCourseDetails('${course.id}')" class="btn-secondary-small">View Details</button>
                 </div>
            </div>
             ${isAdmin && (course.status === 'pending' || course.status === 'reported') ? `
                <div class="mt-3 pt-3 border-t dark:border-gray-600 text-right space-x-2">
                    ${course.status === 'pending' ? `<button onclick="window.handleCourseApproval('${course.id}', true)" class="btn-success-small">Approve</button><button onclick="window.handleCourseApproval('${course.id}', false)" class="btn-danger-small">Reject</button>` : ''}
                    ${course.status === 'reported' ? `<button onclick="window.handleCourseApproval('${course.id}', true)" class="btn-success-small">Approve (Clear Report)</button><button onclick="alert('Report Reason: ${course.reportReason?.replace(/'/g, "\\'") || 'None provided'}')" class="btn-warning-small">View Report</button><button onclick="window.handleCourseApproval('${course.id}', false, true)" class="btn-danger-small">Delete Course</button>` : ''}
                </div>
             ` : ''}
        </div>
        `;
    }).join('');
}


export function showAddCourseForm() {
    setActiveSidebarLink('showBrowseCourses'); // Keep Courses link active
    const html = `
    <div class="max-w-lg mx-auto animate-fade-in">
         <h2 class="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200">Add New Course</h2>
         <form id="add-course-form" onsubmit="window.submitNewCourse(event)" class="space-y-4 content-card">
              <div>
                  <label for="course-name">Course Name</label>
                  <input id="course-name" type="text" placeholder="e.g., Introduction to Quantum Mechanics" required>
              </div>
              <div>
                  <label for="course-major-tag">Major Tag</label>
                  <input id="course-major-tag" type="text" placeholder="e.g., Physics, Mathematics" required>
                  <p class="form-help-text">The main field of study.</p>
              </div>
               <div>
                  <label for="course-subject-tag">Subject Tag</label>
                  <input id="course-subject-tag" type="text" placeholder="e.g., Quantum Mechanics, Calculus I">
                  <p class="form-help-text">A specific topic within the major.</p>
              </div>

              <hr class="my-4 dark:border-gray-600"/>
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Optional Resources (Provide URLs)</p>

              <div>
                  <label for="course-lecture-url">Lecture Playlist URL (YouTube)</label>
                  <input id="course-lecture-url" type="url" placeholder="https://www.youtube.com/playlist?list=...">
              </div>
              <div>
                  <label for="course-textbook-url">Textbook URL (Link to PDF)</label>
                  <input id="course-textbook-url" type="url" placeholder="https://example.com/textbook.pdf">
              </div>

              <!-- Add more fields for other resources later -->
               <div class="pt-4 mt-2 border-t dark:border-gray-700">
                  <button type="submit" class="btn-primary w-full">Submit Course</button>
                   <button type="button" onclick="window.showBrowseCourses()" class="btn-secondary w-full mt-2">Cancel</button>
              </div>
         </form>
    </div>
    `;
    displayContent(html);
}

export async function submitNewCourse(event) {
    event.preventDefault();
    if (!currentUser) { alert("Please log in to add a course."); return; }

    const courseData = {
        name: document.getElementById('course-name')?.value.trim(),
        majorTag: document.getElementById('course-major-tag')?.value.trim(),
        subjectTag: document.getElementById('course-subject-tag')?.value.trim() || null, // Optional
        lecturePlaylistUrl: document.getElementById('course-lecture-url')?.value.trim() || null,
        textbookUrl: document.getElementById('course-textbook-url')?.value.trim() || null,
        // Add other fields as needed
    };

    if (!courseData.name || !courseData.majorTag) {
        alert("Course Name and Major Tag are required.");
        return;
    }

    showLoading("Submitting course...");
    const result = await addCourseToFirestore(courseData);
    hideLoading();

    if (result.success) {
        const message = currentUser.uid === ADMIN_UID
            ? `Course "${courseData.name}" added and approved successfully!`
            : `Course "${courseData.name}" submitted for approval.`;
        alert(message);
        showBrowseCourses(); // Refresh the browse view
    } else {
        alert("Failed to add course: " + result.message);
    }
}

export async function showCourseDetails(courseId) {
     setActiveSidebarLink('showBrowseCourses'); // Keep Courses link active
     showLoading("Loading course details...");
     const course = await fetchCourseDetails(courseId);
     hideLoading();

     if (!course) {
         displayContent('<p class="text-red-500 p-4">Could not load course details.</p><button onclick="window.showBrowseCourses()" class="btn-secondary mt-2">Back to Courses</button>');
         return;
     }

     const isAdmin = currentUser?.uid === ADMIN_UID;
     const canReport = currentUser && currentUser.uid !== course.creatorUid && course.status === 'approved';

     // Basic rendering - can be greatly expanded
     let resourcesHtml = `
        <ul class="space-y-2 text-sm">
            ${course.lecturePlaylistUrl ? `<li><strong>Lectures:</strong> <a href="${course.lecturePlaylistUrl}" target="_blank" rel="noopener noreferrer" class="link">View Playlist on YouTube</a></li>` : ''}
            ${course.textbookUrl ? `<li><strong>Textbook:</strong> <a href="${course.textbookUrl}" target="_blank" rel="noopener noreferrer" class="link">Open PDF Link</a></li>` : ''}
            ${!course.lecturePlaylistUrl && !course.textbookUrl ? '<li class="text-muted">No external resources linked yet.</li>' : ''}
            <!-- Add sections for AI generated content, practice problems etc. here -->
            <li><strong class="text-muted">(More resource types coming soon)</strong></li>
        </ul>
     `;

      const statusText = course.status === 'pending' ? 'Pending Approval' : course.status === 'reported' ? 'Reported' : 'Approved';
      const statusClass = course.status === 'pending' ? 'text-yellow-600 dark:text-yellow-400' : course.status === 'reported' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400';


     const html = `
        <div class="animate-fade-in space-y-6">
            <div class="flex justify-between items-center">
                <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200">${course.name || 'Unnamed Course'}</h2>
                <button onclick="window.showBrowseCourses()" class="btn-secondary-small">Back to Courses</button>
            </div>

            <div class="content-card">
                 <div class="flex justify-between items-start mb-4 pb-4 border-b dark:border-gray-600">
                     <div>
                         <p class="text-sm text-muted">Major: <span class="font-medium text-gray-700 dark:text-gray-300">${course.majorTag || 'N/A'}</span></p>
                         ${course.subjectTag ? `<p class="text-sm text-muted">Subject: <span class="font-medium text-gray-700 dark:text-gray-300">${course.subjectTag}</span></p>` : ''}
                         <p class="text-xs text-muted mt-1">Created by: ${course.creatorName || 'Unknown'} on ${course.createdAt ? new Date(course.createdAt.toDate()).toLocaleDateString() : 'N/A'}</p>
                     </div>
                     <div class="text-right">
                         <p class="text-sm font-bold ${statusClass}">${statusText}</p>
                         ${course.status === 'reported' ? `<p class="text-xs text-red-500 cursor-pointer hover:underline" onclick="alert('Report Reason: ${course.reportReason?.replace(/'/g, "\\'") || 'None provided'}')">(View Report)</p>` : ''}
                     </div>
                 </div>

                <h3 class="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">Resources</h3>
                ${resourcesHtml}

                <div class="mt-6 pt-4 border-t dark:border-gray-600 flex justify-end gap-3">
                    ${canReport ? `<button onclick="window.handleReportCourse('${course.id}')" class="btn-warning-small">Report Course</button>` : ''}
                    <!-- Add buttons for 'Start Studying', 'Generate Practice Test', etc. -->
                </div>
            </div>
        </div>
     `;
     displayContent(html);
}

export async function handleReportCourse(courseId) {
    if (!currentUser) { alert("Please log in to report."); return; }
    const reason = prompt(`Please provide a brief reason for reporting this course (ID: ${courseId}):`);
    if (reason === null) return; // User cancelled

    showLoading("Submitting report...");
    const success = await reportCourseInFirestore(courseId, reason);
    hideLoading();

    if (success) {
        alert("Course reported successfully. An admin will review it.");
        showCourseDetails(courseId); // Refresh the details view
    } else {
        alert("Failed to submit report. Please try again.");
    }
}

// This function would be called by admin buttons in renderCourseList
// Needs to be on window scope (assigned in script.js)
export async function handleCourseApproval(courseId, approve, deleteCourse = false) {
     if (!currentUser || currentUser.uid !== ADMIN_UID) {
         alert("Action requires admin privileges.");
         return;
     }

     const action = deleteCourse ? 'delete' : approve ? 'approve' : 'reject';
     const confirmationMessage = `Are you sure you want to ${action} course ${courseId}?`
         + (deleteCourse ? '\n\nTHIS ACTION IS PERMANENT AND CANNOT BE UNDONE.' : '');

     if (!confirm(confirmationMessage)) return;

     showLoading(`Processing course ${action}...`);
     const courseRef = db.collection('courses').doc(courseId);

     try {
         if (deleteCourse) {
             await courseRef.delete();
             alert(`Course ${courseId} deleted successfully.`);
         } else {
             await courseRef.update({
                 status: approve ? 'approved' : 'rejected', // Or maybe delete rejected ones?
                 reportReason: null, // Clear report fields on approval/rejection
                 reportedBy: []
             });
             alert(`Course ${courseId} ${approve ? 'approved' : 'rejected'} successfully.`);
         }
         hideLoading();
         handleCourseSearch(); // Refresh the list in the main browse view
     } catch (error) {
         console.error(`Error ${action}ing course ${courseId}:`, error);
         hideLoading();
         alert(`Failed to ${action} course: ${error.message}`);
     }
}