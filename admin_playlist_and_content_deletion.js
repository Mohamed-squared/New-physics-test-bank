// --- START OF FILE admin_playlist_and_content_deletion.js ---

import { db, currentUser, globalCourseDataMap } from './state.js';
import { ADMIN_UID, YOUTUBE_API_KEY } from './config.js';
import { escapeHtml, showLoading, hideLoading } from './utils.js';
import { updateCourseDefinition, deleteUserFormulaSheet, deleteUserChapterSummary } from './firebase_firestore.js';

// State specific to this module for playlist management in admin panel
let selectedVideosForAssignmentAdmin = [];
let currentLoadedPlaylistCourseIdAdmin = null;

// Helper to find user ID (can be shared or duplicated)
async function findUserIdForContentDeletion(searchTerm) {
    // ... (same implementation as findUserIdAdmin in admin_user_management.js or a shared util)
    let targetUserId = null;
    const lowerSearchTerm = searchTerm.toLowerCase();
    if (!searchTerm) return null;
    showLoading("Finding user..."); // Add loading indicator
    try {
        if (lowerSearchTerm.includes('@')) {
            const userQuery = await db.collection('users').where('email', '==', lowerSearchTerm).limit(1).get();
            if (!userQuery.empty) targetUserId = userQuery.docs[0].id;
        } else {
            const userDoc = await db.collection('users').doc(searchTerm).get(); // Try UID
            if (userDoc.exists) {
                targetUserId = userDoc.id;
            } else { // Try username
                const usernameQuery = await db.collection('usernames').doc(lowerSearchTerm).get();
                if (usernameQuery.exists) targetUserId = usernameQuery.data().userId;
            }
        }
    } catch (error) { console.error("Error in findUserIdForContentDeletion:", error); }
    finally { hideLoading(); }
    return targetUserId;
}


// --- Playlist Management ---
export function populateAdminCourseSelect() {
    const select = document.getElementById('admin-playlist-course-select'); // Assumes this ID is in admin_course_content.js now
    if (!select) return;
    select.innerHTML = '<option value="">Select Course...</option>';
    globalCourseDataMap.forEach((course, courseId) => {
        if (course.youtubePlaylistUrls?.length > 0 || course.youtubePlaylistUrl) { // Check both old and new
            const option = document.createElement('option');
            option.value = courseId;
            option.textContent = escapeHtml(course.name || courseId);
            select.appendChild(option);
        }
    });
    const loadButton = document.querySelector('#admin-playlist-course-select + button'); // More robust selector
    if (loadButton) loadButton.disabled = select.options.length <= 1;
}

function extractPlaylistIdAdmin(url) { // Renamed for admin context
    if (!url) return null;
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes('youtube.com') && urlObj.searchParams.has('list')) {
            return urlObj.searchParams.get('list');
        }
    } catch (e) { console.error("Error parsing playlist URL:", url, e); }
    return null;
}

async function fetchPlaylistItemsAdmin(playlistId, apiKey, pageToken = null) { // Renamed
    const MAX_RESULTS = 50;
    let url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=${MAX_RESULTS}&playlistId=${playlistId}&key=${apiKey}`;
    if (pageToken) url += `&pageToken=${pageToken}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`YouTube API Error: ${response.status} ${errorData?.error?.message || 'Unknown'}`);
        }
        return await response.json();
    } catch (error) { console.error("Error fetching YT playlist items:", error); throw error; }
}

export async function loadPlaylistForAdmin() {
    const select = document.getElementById('admin-playlist-course-select');
    const videosArea = document.getElementById('admin-playlist-videos-area');
    const actionArea = document.getElementById('admin-video-action-area');
    if (!select || !videosArea || !actionArea) return;

    const courseId = select.value;
    if (!courseId) {
        videosArea.innerHTML = '<p class="text-muted text-sm">Please select a course.</p>';
        actionArea.classList.add('hidden'); return;
    }
    const courseDef = globalCourseDataMap.get(courseId);
    const playlistUrls = courseDef?.youtubePlaylistUrls?.length ? courseDef.youtubePlaylistUrls : (courseDef?.youtubePlaylistUrl ? [courseDef.youtubePlaylistUrl] : []);
    if (playlistUrls.length === 0) {
        videosArea.innerHTML = `<p class="text-warning text-sm">No YouTube playlist URL defined.</p>`;
        actionArea.classList.add('hidden'); return;
    }
    if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === "YOUR_API_KEY_HERE") {
        alert("YouTube API Key not configured."); videosArea.innerHTML = `<p class="text-danger text-sm">YT API Key missing.</p>`; return;
    }

    videosArea.innerHTML = `<div class="flex justify-center items-center p-4"><div class="loader"></div><p class="ml-3 text-sm">Loading...</p></div>`;
    actionArea.classList.add('hidden');
    selectedVideosForAssignmentAdmin = []; updateSelectedVideoCountAdmin();
    currentLoadedPlaylistCourseIdAdmin = courseId;
    let allVideos = []; let fetchError = null;

    try {
        showLoading("Loading Playlist Videos...");
        for (const url of playlistUrls) {
            const playlistId = extractPlaylistIdAdmin(url);
            if (!playlistId) continue;
            let nextPageToken = null; let positionOffset = allVideos.length;
            do {
                const data = await fetchPlaylistItemsAdmin(playlistId, YOUTUBE_API_KEY, nextPageToken);
                if (data.items) {
                    allVideos.push(...data.items
                        .filter(item => item.snippet?.resourceId?.videoId)
                        .map(item => ({
                           videoId: item.snippet.resourceId.videoId, title: item.snippet.title,
                           thumbnail: item.snippet.thumbnails?.default?.url, position: (item.snippet.position ?? 0) + positionOffset
                        }))
                    );
                }
                nextPageToken = data.nextPageToken;
            } while (nextPageToken);
        }
    } catch (error) { fetchError = error; }
    finally { hideLoading(); }

    if (fetchError) videosArea.innerHTML = `<p class="text-danger text-sm">Error: ${fetchError.message}.</p>`;
    else if (allVideos.length === 0) videosArea.innerHTML = '<p class="text-muted text-sm">No videos found.</p>';
    else {
        allVideos.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        renderPlaylistVideosAdmin(allVideos, videosArea);
        actionArea.classList.remove('hidden');
    }
}

function renderPlaylistVideosAdmin(videos, container) { // Renamed
    let videosHtml = `<div class="flex justify-end mb-2"><button onclick="window.toggleSelectAllVideosAdmin(true)" class="btn-secondary-small text-xs mr-1">All</button><button onclick="window.toggleSelectAllVideosAdmin(false)" class="btn-secondary-small text-xs">None</button></div><ul class="space-y-1 list-none p-0">`;
    videos.forEach(video => {
        if (!video.videoId || !video.title) return;
        const escapedTitleJs = escapeHtml(video.title.replace(/'/g, "\\'").replace(/"/g, '\\"'));
        videosHtml += `
             <li id="admin-video-item-${video.videoId}" class="flex items-center gap-3 p-2 rounded border dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer" onclick="window.toggleVideoSelectionAdmin(this, '${video.videoId}', '${escapedTitleJs}')">
                 <input type="checkbox" class="admin-video-select flex-shrink-0 pointer-events-none form-checkbox" value="${video.videoId}" data-title="${escapeHtml(video.title)}">
                 <img src="${video.thumbnail || ''}" alt="Thumb" class="w-16 h-9 object-cover rounded flex-shrink-0 bg-gray-200 dark:bg-gray-700" onerror="this.style.display='none'">
                 <span class="text-xs flex-grow">${escapeHtml(video.title)}</span>
             </li>`;
    });
    videosHtml += '</ul>'; container.innerHTML = videosHtml;
}

export function toggleSelectAllVideosAdmin(select) { // Renamed
    document.querySelectorAll('#admin-playlist-videos-area input[type="checkbox"]').forEach(cb => {
        if (cb.checked !== select) {
            cb.checked = select;
            updateSelectionStateAdmin(cb.value, cb.dataset.title, select);
            cb.closest('li')?.classList.toggle('ring-2', select);
            cb.closest('li')?.classList.toggle('ring-primary-500', select);
        }
    });
    updateSelectedVideoCountAdmin();
}

export function toggleVideoSelectionAdmin(listItem, videoId, videoTitle) { // Renamed
    const checkbox = listItem.querySelector('input[type="checkbox"]'); if (!checkbox) return;
    checkbox.checked = !checkbox.checked;
    updateSelectionStateAdmin(videoId, checkbox.dataset.title, checkbox.checked); // Use data-title for reliability
    listItem.classList.toggle('ring-2', checkbox.checked);
    listItem.classList.toggle('ring-primary-500', checkbox.checked);
    updateSelectedVideoCountAdmin();
}

function updateSelectionStateAdmin(videoId, videoTitle, isSelected) { // Renamed
    const index = selectedVideosForAssignmentAdmin.findIndex(v => v.videoId === videoId);
    if (isSelected && index === -1) selectedVideosForAssignmentAdmin.push({ videoId, title: videoTitle });
    else if (!isSelected && index > -1) selectedVideosForAssignmentAdmin.splice(index, 1);
}

function updateSelectedVideoCountAdmin() { // Renamed
    const countArea = document.getElementById('admin-selected-video-count');
    const assignBtn = document.getElementById('admin-assign-video-btn');
    const unassignBtn = document.getElementById('admin-unassign-video-btn');
    const count = selectedVideosForAssignmentAdmin.length;
    if (countArea) countArea.textContent = `Selected Videos: ${count}`;
    const chapterNumInput = document.getElementById('admin-assign-chapter-num');
    const chapterNumValid = chapterNumInput && parseInt(chapterNumInput.value) > 0;
    if (assignBtn) assignBtn.disabled = count === 0 || !chapterNumValid;
    if (unassignBtn) unassignBtn.disabled = count === 0 || !chapterNumValid;
    if (chapterNumInput && !chapterNumInput.dataset.listenerAttachedForAids) { // Use a unique data attribute
        chapterNumInput.addEventListener('input', updateSelectedVideoCountAdmin);
        chapterNumInput.dataset.listenerAttachedForAids = 'true';
    }
}

export async function handleAssignVideoToChapter() {
    if (selectedVideosForAssignmentAdmin.length === 0 || !currentLoadedPlaylistCourseIdAdmin) {
        alert("Select videos and ensure course playlist loaded."); return;
    }
    const chapterNumInput = document.getElementById('admin-assign-chapter-num');
    const chapterNum = parseInt(chapterNumInput?.value);
    const courseDef = globalCourseDataMap.get(currentLoadedPlaylistCourseIdAdmin);
    if (!chapterNumInput || isNaN(chapterNum) || chapterNum < 1 || (courseDef?.totalChapters && chapterNum > courseDef.totalChapters)) {
        alert(`Enter valid chapter (1-${courseDef?.totalChapters || '?'}).`); chapterNumInput?.focus(); return;
    }
    showLoading(`Assigning videos to Ch ${chapterNum}...`);
    try {
        const courseDoc = await db.collection('courses').doc(currentLoadedPlaylistCourseIdAdmin).get();
        const currentCourseData = courseDoc.data() || {};
        const chapterResources = { ...(currentCourseData.chapterResources || {}) };
        chapterResources[chapterNum] = chapterResources[chapterNum] || {};
        let currentLectures = (chapterResources[chapterNum].lectureUrls || []).filter(lec => typeof lec === 'object' && lec.url && lec.title);
        let addedCount = 0;
        selectedVideosForAssignmentAdmin.forEach(video => {
            const videoUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
            if (!currentLectures.some(lec => lec.url === videoUrl)) {
                currentLectures.push({ url: videoUrl, title: video.title }); addedCount++;
            }
        });
        if (addedCount === 0) { alert("Selected video(s) already assigned."); hideLoading(); return; }
        chapterResources[chapterNum].lectureUrls = currentLectures;
        const success = await updateCourseDefinition(currentLoadedPlaylistCourseIdAdmin, { chapterResources });
        if (success) {
            alert(`${addedCount} video(s) assigned to Ch ${chapterNum}.`);
            selectedVideosForAssignmentAdmin = []; updateSelectedVideoCountAdmin();
            document.querySelectorAll('#admin-playlist-videos-area input[type="checkbox"]').forEach(cb => cb.checked = false);
            document.querySelectorAll('#admin-playlist-videos-area li').forEach(li => li.classList.remove('ring-2', 'ring-primary-500'));
        } // updateCourseDefinition alerts on its own failure
    } catch (error) { alert(`Failed to assign videos: ${error.message}`); }
    finally { hideLoading(); }
}

export async function handleUnassignVideoFromChapter() {
    if (selectedVideosForAssignmentAdmin.length === 0 || !currentLoadedPlaylistCourseIdAdmin) {
        alert("Select videos to unassign."); return;
    }
    const chapterNumInput = document.getElementById('admin-assign-chapter-num');
    const chapterNum = parseInt(chapterNumInput?.value);
    const courseDef = globalCourseDataMap.get(currentLoadedPlaylistCourseIdAdmin);
    if (!chapterNumInput || isNaN(chapterNum) || chapterNum < 1 || (courseDef?.totalChapters && chapterNum > courseDef.totalChapters)) {
        alert(`Enter valid chapter (1-${courseDef?.totalChapters || '?'}).`); chapterNumInput?.focus(); return;
    }
    if (!confirm(`Unassign ${selectedVideosForAssignmentAdmin.length} video(s) from Ch ${chapterNum}?`)) return;
    showLoading(`Unassigning videos...`);
    try {
        const courseDoc = await db.collection('courses').doc(currentLoadedPlaylistCourseIdAdmin).get();
        const currentCourseData = courseDoc.data() || {};
        const chapterResources = { ...(currentCourseData.chapterResources || {}) };
        if (!chapterResources[chapterNum]?.lectureUrls?.length) { alert("No videos assigned to this chapter."); hideLoading(); return; }
        let currentLectures = chapterResources[chapterNum].lectureUrls.filter(lec => typeof lec === 'object' && lec.url && lec.title);
        const selectedUrlsToRemove = selectedVideosForAssignmentAdmin.map(v => `https://www.youtube.com/watch?v=${v.videoId}`);
        let removedCount = 0;
        const updatedLectures = currentLectures.filter(lec => {
            if (selectedUrlsToRemove.includes(lec.url)) { removedCount++; return false; } return true;
        });
        if (removedCount === 0) { alert("Selected videos not found in this chapter."); hideLoading(); return; }
        chapterResources[chapterNum].lectureUrls = updatedLectures;
        const success = await updateCourseDefinition(currentLoadedPlaylistCourseIdAdmin, { chapterResources });
        if (success) {
            alert(`${removedCount} video(s) unassigned from Ch ${chapterNum}.`);
            selectedVideosForAssignmentAdmin = []; updateSelectedVideoCountAdmin();
            document.querySelectorAll('#admin-playlist-videos-area input[type="checkbox"]').forEach(cb => cb.checked = false);
            document.querySelectorAll('#admin-playlist-videos-area li').forEach(li => li.classList.remove('ring-2', 'ring-primary-500'));
        }
    } catch (error) { alert(`Failed to unassign videos: ${error.message}`); }
    finally { hideLoading(); }
}

// --- User-Generated Content Deletion (Admin) ---
export async function handleDeleteUserFormulaSheetAdmin() {
    if (!currentUser?.isAdmin) { alert("Admin privileges required."); return; }
    const userInput = document.getElementById('admin-delete-content-user-input')?.value.trim(); // Corrected ID
    const courseId = document.getElementById('admin-delete-content-course-input')?.value.trim(); // Corrected ID
    const chapterNum = parseInt(document.getElementById('admin-delete-content-chapter-input')?.value); // Corrected ID
    const statusArea = document.getElementById('admin-delete-content-status-text'); // Corrected ID
    if (statusArea) statusArea.innerHTML = '';

    if (!userInput || !courseId || isNaN(chapterNum) || chapterNum < 1) {
        if(statusArea) statusArea.innerHTML = '<p class="text-red-500">Please fill all fields.</p>'; return;
    }
    try {
        const targetUserId = await findUserIdForContentDeletion(userInput);
        if (!targetUserId) { if(statusArea) statusArea.innerHTML = '<p class="text-red-500">User not found.</p>'; return; }
        if (!confirm(`Delete formula sheet for User: ${userInput}, Course: ${courseId}, Ch: ${chapterNum}?`)) return;
        showLoading("Deleting formula sheet...");
        const success = await deleteUserFormulaSheet(targetUserId, courseId, chapterNum); // From firestore.js
        if(statusArea) statusArea.innerHTML = success ? '<p class="text-green-500">Formula sheet deleted.</p>' : '<p class="text-red-500">Failed to delete. Check console.</p>';
    } catch (error) { if(statusArea) statusArea.innerHTML = `<p class="text-red-500">Error: ${error.message}</p>`; }
    finally { hideLoading(); }
}

export async function handleDeleteUserChapterSummaryAdmin() {
    if (!currentUser?.isAdmin) { alert("Admin privileges required."); return; }
    const userInput = document.getElementById('admin-delete-content-user-input')?.value.trim(); // Corrected ID
    const courseId = document.getElementById('admin-delete-content-course-input')?.value.trim(); // Corrected ID
    const chapterNum = parseInt(document.getElementById('admin-delete-content-chapter-input')?.value); // Corrected ID
    const statusArea = document.getElementById('admin-delete-content-status-text'); // Corrected ID
    if (statusArea) statusArea.innerHTML = '';

    if (!userInput || !courseId || isNaN(chapterNum) || chapterNum < 1) {
        if(statusArea) statusArea.innerHTML = '<p class="text-red-500">Please fill all fields.</p>'; return;
    }
    try {
        const targetUserId = await findUserIdForContentDeletion(userInput);
        if (!targetUserId) { if(statusArea) statusArea.innerHTML = '<p class="text-red-500">User not found.</p>'; return; }
        if (!confirm(`Delete chapter summary for User: ${userInput}, Course: ${courseId}, Ch: ${chapterNum}?`)) return;
        showLoading("Deleting chapter summary...");
        const success = await deleteUserChapterSummary(targetUserId, courseId, chapterNum); // From firestore.js
        if(statusArea) statusArea.innerHTML = success ? '<p class="text-green-500">Chapter summary deleted.</p>' : '<p class="text-red-500">Failed. Check console.</p>';
    } catch (error) { if(statusArea) statusArea.innerHTML = `<p class="text-red-500">Error: ${error.message}</p>`; }
    finally { hideLoading(); }
}


// --- END OF FILE admin_playlist_and_content_deletion.js ---