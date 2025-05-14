// --- START OF FILE admin_database_management.js ---

import { db, currentUser } from './state.js';
import { escapeHtml, showLoading, hideLoading } from './utils.js';

const COLLECTIONS_TO_BROWSE = [
    { name: "Users", id: "users", fieldsToOmit: ["appData", "userNotes", "completedCourseBadges"], subcollections: ["inbox", "userFormulaSheets", "userChapterSummaries", "creditLog", "aiChatSessions"] },
    { name: "Global Courses", id: "courses", fieldsToOmit: ["chapterResources", "chapters"], subcollections: [] },
    { name: "Global Subjects (TestGen)", id: "subjects", fieldsToOmit: [], subcollections: [] },
    { name: "User Course Progress (Root)", id: "userCourseProgress", fieldsToOmit: [], subcollectionsForDoc: "courses"}, // Special: docs are user UIDs
    { name: "User Exams (Root)", id: "userExams", fieldsToOmit: [], subcollectionsForDoc: "exams"}, // Special: docs are user UIDs
    { name: "Feedback", id: "feedback", fieldsToOmit: [], subcollections: [] },
    { name: "Exam Issues", id: "examIssues", fieldsToOmit: [], subcollections: [] },
    { name: "Admin Tasks", id: "adminTasks", fieldsToOmit: [], subcollections: [] },
    { name: "Settings", id: "settings", fieldsToOmit: [], subcollections: [] },
    { name: "Usernames", id: "usernames", fieldsToOmit: [], subcollections: [] },
    // Add more collections as needed
];

let currentDbManagementState = {
    selectedCollection: null,
    selectedDocumentId: null,
    documents: [],
    lastVisibleDoc: null,
    isLoadingMore: false,
    pathSegments: [], // For navigating subcollections: [{collection: 'users', docId: 'uid1'}, {collection: 'inbox'}]
};

function buildPathFromSegments(segments) {
    let path = '';
    segments.forEach(segment => {
        path += `/${segment.collection}`;
        if (segment.docId) {
            path += `/${segment.docId}`;
        }
    });
    return path.substring(1); // Remove leading '/'
}

function getDbRefFromPathSegments(segments) {
    let ref = db;
    segments.forEach(segment => {
        ref = ref.collection(segment.collection);
        if (segment.docId) {
            ref = ref.doc(segment.docId);
        }
    });
    return ref;
}

export function displayDatabaseManagementSection(containerElement) {
    currentDbManagementState = { // Reset state when section is displayed
        selectedCollection: null,
        selectedDocumentId: null,
        documents: [],
        lastVisibleDoc: null,
        isLoadingMore: false,
        pathSegments: [],
    };

    containerElement.innerHTML = `
        <h3 class="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-6">Database Management</h3>
        <div id="admin-db-path-breadcrumbs" class="text-sm text-muted mb-2">Path: /</div>
        <section id="admin-db-management-section" class="border dark:border-gray-700 rounded-lg">
            <div class="p-4 bg-gray-50 dark:bg-gray-700/30 border-b dark:border-gray-700">
                <h4 class="text-lg font-medium mb-3">Collection Browser</h4>
                <div class="flex flex-wrap gap-x-4 gap-y-2 items-center">
                    <select id="admin-db-collection-select" class="form-control text-sm w-full sm:w-auto sm:flex-grow mb-2 sm:mb-0">
                        <option value="">-- Select a Root Collection --</option>
                        ${COLLECTIONS_TO_BROWSE.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                    </select>
                    <button onclick="window.adminLoadSelectedRootCollection()" class="btn-secondary-small text-xs flex-shrink-0">Load Collection</button>
                    <button onclick="window.adminDbNavigateUp()" id="admin-db-navigate-up-btn" class="btn-secondary-small text-xs flex-shrink-0 hidden">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 mr-1 inline"><path fill-rule="evenodd" d="M12.79 5.23a.75.75 0 0 1-.02 1.06L8.832 10l3.938 3.71a.75.75 0 1 1-1.04 1.08l-4.5-4.25a.75.75 0 0 1 0-1.08l4.5-4.25a.75.75 0 0 1 1.06.02Z" clip-rule="evenodd" /></svg>
                        Up
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-0 border-t dark:border-gray-700 md:border-t-0">
                <div id="admin-db-doc-list-container" class="md:col-span-1 border-r-0 md:border-r dark:border-gray-700 max-h-[calc(100vh-400px)] overflow-y-auto p-3 custom-scrollbar">
                    <p class="text-muted text-sm text-center py-4">Select a collection to view documents.</p>
                </div>
                <div id="admin-db-doc-view-container" class="md:col-span-2 max-h-[calc(100vh-400px)] overflow-y-auto p-3 custom-scrollbar">
                    <p class="text-muted text-sm text-center py-4">Select a document to view its content.</p>
                </div>
            </div>
        </section>
    `;
    updatePathBreadcrumbs();
}

function updatePathBreadcrumbs() {
    const breadcrumbsEl = document.getElementById('admin-db-path-breadcrumbs');
    if (!breadcrumbsEl) return;
    let pathString = '/';
    currentDbManagementState.pathSegments.forEach((segment, index) => {
        pathString += `<button class="hover:underline text-indigo-500 dark:text-indigo-400" onclick="window.adminDbJumpToSegment(${index})">${escapeHtml(segment.collection)}</button>`;
        if (segment.docId) {
            pathString += ` / <button class="hover:underline text-indigo-500 dark:text-indigo-400" onclick="window.adminDbJumpToSegment(${index}, true)">${escapeHtml(segment.docId)}</button>`;
        }
        if (index < currentDbManagementState.pathSegments.length - 1 || !segment.docId) {
             pathString += ' / ';
        }
    });
    breadcrumbsEl.innerHTML = `Path: ${pathString}`;
    document.getElementById('admin-db-navigate-up-btn').classList.toggle('hidden', currentDbManagementState.pathSegments.length === 0);
}

window.adminDbJumpToSegment = (segmentIndex, jumpToDocView = false) => {
    currentDbManagementState.pathSegments = currentDbManagementState.pathSegments.slice(0, segmentIndex + 1);
    if (jumpToDocView && currentDbManagementState.pathSegments[segmentIndex]?.docId) {
        // If jumping to a document segment, load that document
        adminLoadDocumentContent(
            currentDbManagementState.pathSegments.slice(0, segmentIndex +1),
            currentDbManagementState.pathSegments[segmentIndex].docId
        );
    } else {
        // If jumping to a collection segment or if docId is not to be viewed, load the collection
        currentDbManagementState.selectedDocumentId = null; // Clear selected doc
        adminLoadCollectionDocuments(getDbRefFromPathSegments(currentDbManagementState.pathSegments), currentDbManagementState.pathSegments);
    }
    updatePathBreadcrumbs();
};

window.adminDbNavigateUp = () => {
    if (currentDbManagementState.pathSegments.length > 0) {
        const lastSegment = currentDbManagementState.pathSegments[currentDbManagementState.pathSegments.length - 1];
        if (lastSegment.docId) { // If current view is a document, going up means showing its parent collection
            currentDbManagementState.pathSegments[currentDbManagementState.pathSegments.length - 1].docId = null;
        } else { // If current view is a collection, going up means showing its parent document's subcollections or root
            currentDbManagementState.pathSegments.pop();
            if (currentDbManagementState.pathSegments.length > 0 && currentDbManagementState.pathSegments[currentDbManagementState.pathSegments.length -1].docId) {
                // If the new last segment is a document, we should show its subcollections
                 adminLoadDocumentContent(currentDbManagementState.pathSegments, currentDbManagementState.pathSegments[currentDbManagementState.pathSegments.length-1].docId);
                 return; // adminLoadDocumentContent will handle breadcrumbs
            }
        }
        currentDbManagementState.selectedDocumentId = null;
        document.getElementById('admin-db-doc-view-container').innerHTML = '<p class="text-muted text-sm text-center py-4">Select a document to view its content.</p>';

        if (currentDbManagementState.pathSegments.length === 0) {
            document.getElementById('admin-db-doc-list-container').innerHTML = '<p class="text-muted text-sm text-center py-4">Select a root collection.</p>';
            document.getElementById('admin-db-collection-select').value = "";
        } else {
            adminLoadCollectionDocuments(getDbRefFromPathSegments(currentDbManagementState.pathSegments), currentDbManagementState.pathSegments);
        }
        updatePathBreadcrumbs();
    }
};


window.adminLoadSelectedRootCollection = () => {
    const selectedCollectionId = document.getElementById('admin-db-collection-select').value;
    if (!selectedCollectionId) return;

    currentDbManagementState.pathSegments = [{ collection: selectedCollectionId, docId: null }];
    currentDbManagementState.selectedDocumentId = null; // Clear selected document
    document.getElementById('admin-db-doc-view-container').innerHTML = '<p class="text-muted text-sm text-center py-4">Select a document to view its content.</p>';
    adminLoadCollectionDocuments(db.collection(selectedCollectionId), currentDbManagementState.pathSegments);
    updatePathBreadcrumbs();
};


async function adminLoadCollectionDocuments(collectionRef, pathSegments) {
    const docListContainer = document.getElementById('admin-db-doc-list-container');
    if (!docListContainer) return;
    docListContainer.innerHTML = `<div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mx-auto my-4"></div>`;
    showLoading("Loading documents...");

    currentDbManagementState.documents = [];
    currentDbManagementState.lastVisibleDoc = null;

    try {
        let query = collectionRef.orderBy(firebase.firestore.FieldPath.documentId()).limit(25);
        const snapshot = await query.get();
        hideLoading();

        if (snapshot.empty) {
            docListContainer.innerHTML = '<p class="text-sm text-muted text-center py-4">No documents found in this collection.</p>';
            return;
        }
        currentDbManagementState.documents = snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));
        currentDbManagementState.lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
        renderDocumentList(pathSegments);

    } catch (error) {
        hideLoading();
        console.error("Error loading collection documents:", error);
        docListContainer.innerHTML = `<p class="text-red-500 text-sm text-center py-4">Error loading documents: ${error.message}</p>`;
    }
}

function renderDocumentList(pathSegments) {
    const docListContainer = document.getElementById('admin-db-doc-list-container');
    if (!docListContainer) return;

    let listHtml = '<ul class="space-y-1 list-none p-0">';
    currentDbManagementState.documents.forEach(doc => {
        const isSelected = doc.id === currentDbManagementState.selectedDocumentId;
        listHtml += `
            <li>
                <button onclick="window.adminLoadDocumentContentWrapper('${doc.id}')"
                        class="w-full text-left p-2 rounded text-sm truncate ${isSelected ? 'bg-primary-100 dark:bg-primary-700 text-primary-700 dark:text-primary-200 font-semibold' : 'hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'}">
                    ${escapeHtml(doc.id)}
                </button>
            </li>
        `;
    });
    listHtml += '</ul>';

    if (currentDbManagementState.lastVisibleDoc) {
        listHtml += `<button onclick="window.adminLoadMoreDocuments()" class="mt-3 w-full btn-secondary-small text-xs">Load More</button>`;
    }
    docListContainer.innerHTML = listHtml;
}

window.adminLoadMoreDocuments = async () => {
    if (currentDbManagementState.isLoadingMore || !currentDbManagementState.lastVisibleDoc || currentDbManagementState.pathSegments.length === 0) return;
    currentDbManagementState.isLoadingMore = true;
    showLoading("Loading more documents...");

    const collectionRef = getDbRefFromPathSegments(currentDbManagementState.pathSegments);

    try {
        const query = collectionRef.orderBy(firebase.firestore.FieldPath.documentId())
                                   .startAfter(currentDbManagementState.lastVisibleDoc)
                                   .limit(25);
        const snapshot = await query.get();
        hideLoading();

        if (!snapshot.empty) {
            snapshot.docs.forEach(doc => currentDbManagementState.documents.push({ id: doc.id, data: doc.data() }));
            currentDbManagementState.lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
        } else {
            currentDbManagementState.lastVisibleDoc = null; // No more documents
        }
        renderDocumentList(currentDbManagementState.pathSegments); // Re-render list with new items
    } catch (error) {
        hideLoading();
        console.error("Error loading more documents:", error);
        alert(`Error loading more: ${error.message}`);
    } finally {
        currentDbManagementState.isLoadingMore = false;
    }
};

window.adminLoadDocumentContentWrapper = (docId) => {
    adminLoadDocumentContent(currentDbManagementState.pathSegments, docId);
};

async function adminLoadDocumentContent(pathSegments, docId) {
    const docViewContainer = document.getElementById('admin-db-doc-view-container');
    if (!docViewContainer) return;
    docViewContainer.innerHTML = `<div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mx-auto my-4"></div>`;
    showLoading("Loading document content...");

    currentDbManagementState.selectedDocumentId = docId;
    renderDocumentList(pathSegments); // Re-render list to highlight selection

    const docRef = getDbRefFromPathSegments([...pathSegments.slice(0, -1), {collection: pathSegments[pathSegments.length -1].collection, docId: docId}]);

    try {
        const docSnap = await docRef.get();
        hideLoading();

        if (!docSnap.exists) {
            docViewContainer.innerHTML = `<p class="text-red-500 text-sm text-center py-4">Document ${escapeHtml(docId)} not found.</p>`;
            return;
        }
        const data = docSnap.data();
        const fullPathForDoc = buildPathFromSegments([...pathSegments.slice(0, -1), {collection: pathSegments[pathSegments.length -1].collection, docId: docId}]);

        let contentHtml = `
            <div class="flex justify-between items-center mb-3">
                <h5 class="text-md font-semibold text-gray-800 dark:text-gray-200 truncate" title="ID: ${escapeHtml(docId)}">Document: ${escapeHtml(docId)}</h5>
                <div>
                    <button onclick="window.adminToggleEditDocumentMode('${fullPathForDoc}', true)" id="admin-db-edit-doc-btn" class="btn-secondary-small text-xs">Edit</button>
                    <button onclick="window.adminSaveDocumentChanges('${fullPathForDoc}')" id="admin-db-save-doc-btn" class="btn-primary-small text-xs hidden">Save</button>
                    <button onclick="window.adminToggleEditDocumentMode('${fullPathForDoc}', false)" id="admin-db-cancel-edit-doc-btn" class="btn-secondary-small text-xs hidden">Cancel</button>
                    <button onclick="window.adminConfirmDeleteDocument('${fullPathForDoc}')" class="btn-danger-small text-xs ml-2">Delete</button>
                </div>
            </div>
            <form id="admin-db-doc-edit-form" class="space-y-3">
        `;

        const collectionConfig = COLLECTIONS_TO_BROWSE.find(c => c.id === pathSegments[0].collection);
        const fieldsToOmit = collectionConfig?.fieldsToOmit || [];

        for (const key in data) {
            if (fieldsToOmit.includes(key)) continue;

            const value = data[key];
            let valueDisplayHtml = '';
            let inputHtml = '';

            if (value === null) {
                valueDisplayHtml = '<span class="text-gray-400 dark:text-gray-500 italic">null</span>';
                inputHtml = `<span class="text-gray-400 dark:text-gray-500 italic">null (cannot edit null directly)</span>`;
            } else if (typeof value === 'string') {
                valueDisplayHtml = `<span class="whitespace-pre-wrap break-all">${escapeHtml(value)}</span>`;
                inputHtml = `<textarea name="${escapeHtml(key)}" rows="2" class="form-control text-xs font-mono">${escapeHtml(value)}</textarea>`;
            } else if (typeof value === 'number') {
                valueDisplayHtml = `<span class="text-blue-600 dark:text-blue-400">${value}</span>`;
                inputHtml = `<input type="number" name="${escapeHtml(key)}" value="${value}" class="form-control text-xs font-mono">`;
            } else if (typeof value === 'boolean') {
                valueDisplayHtml = value ? '<span class="text-green-600 dark:text-green-400">true</span>' : '<span class="text-red-600 dark:text-red-400">false</span>';
                inputHtml = `<select name="${escapeHtml(key)}" class="form-control text-xs"><option value="true" ${value ? 'selected' : ''}>True</option><option value="false" ${!value ? 'selected' : ''}>False</option></select>`;
            } else if (value && typeof value.toDate === 'function') { // Firestore Timestamp
                valueDisplayHtml = `<span class="text-purple-600 dark:text-purple-400">${new Date(value.toDate()).toLocaleString()} (Timestamp)</span>`;
                inputHtml = `<span class="text-purple-600 dark:text-purple-400 text-xs">Timestamp (not editable)</span>`;
            } else if (Array.isArray(value)) {
                valueDisplayHtml = `<span class="text-purple-600 dark:text-purple-400">Array (${value.length} items) - View/Edit as JSON</span>`;
                inputHtml = `<textarea name="${escapeHtml(key)}" rows="3" class="form-control text-xs font-mono" placeholder="Enter valid JSON for array">${escapeHtml(JSON.stringify(value, null, 2))}</textarea>`;
            } else if (typeof value === 'object') {
                valueDisplayHtml = `<span class="text-purple-600 dark:text-purple-400">Object - View/Edit as JSON</span>`;
                inputHtml = `<textarea name="${escapeHtml(key)}" rows="3" class="form-control text-xs font-mono" placeholder="Enter valid JSON for object">${escapeHtml(JSON.stringify(value, null, 2))}</textarea>`;
            } else {
                valueDisplayHtml = `<span>${escapeHtml(String(value))} (Unknown Type)</span>`;
                inputHtml = `<span>Cannot edit type: ${typeof value}</span>`;
            }

            contentHtml += `
                <div class="admin-db-field-item py-2 border-b border-gray-200 dark:border-gray-700">
                    <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">${escapeHtml(key)}</label>
                    <div class="admin-db-value-display text-sm text-gray-800 dark:text-gray-200">${valueDisplayHtml}</div>
                    <div class="admin-db-value-input hidden mt-1">${inputHtml}</div>
                </div>`;
        }
        contentHtml += '</form>';

        // Check for subcollections
        let subcollectionSectionHtml = '<div class="mt-6 pt-4 border-t dark:border-gray-600">';
        let hasSubcollections = false;
        let definedSubcollections = [];

        const currentCollectionId = pathSegments[pathSegments.length -1].collection;
        const rootCollectionConfig = COLLECTIONS_TO_BROWSE.find(c => c.id === pathSegments[0].collection);

        if (pathSegments.length === 1 && rootCollectionConfig?.subcollectionsForDoc) { // Top-level doc (e.g., user UID) that has defined subcollections
            definedSubcollections = Array.isArray(rootCollectionConfig.subcollectionsForDoc) ? rootCollectionConfig.subcollectionsForDoc : [rootCollectionConfig.subcollectionsForDoc];
        } else if (rootCollectionConfig?.subcollections) { // Subcollections defined directly on the root collection config (for all its docs)
            definedSubcollections = rootCollectionConfig.subcollections;
        }
        // More complex: If current path is already a subcollection, check its parent's config for further nesting
        // For now, focusing on one level of subcollections from root doc or general subcollections of root.

        if (definedSubcollections.length > 0) {
            hasSubcollections = true;
            subcollectionSectionHtml += `<h5 class="text-md font-semibold mb-2 text-gray-700 dark:text-gray-300">Subcollections</h5><div class="flex flex-wrap gap-2">`;
            definedSubcollections.forEach(subColName => {
                subcollectionSectionHtml += `<button onclick="window.adminNavigateToSubcollection('${subColName}')" class="btn-secondary-small text-xs">${escapeHtml(subColName)}</button>`;
            });
            subcollectionSectionHtml += `</div>`;
        }
        subcollectionSectionHtml += `</div>`;

        docViewContainer.innerHTML = contentHtml + (hasSubcollections ? subcollectionSectionHtml : '');
    } catch (error) {
        hideLoading();
        console.error("Error loading document content:", error);
        docViewContainer.innerHTML = `<p class="text-red-500 text-sm text-center py-4">Error loading document: ${error.message}</p>`;
    }
}


window.adminNavigateToSubcollection = (subcollectionName) => {
    if (!currentDbManagementState.selectedDocumentId) {
        alert("Cannot navigate: No parent document selected.");
        return;
    }
    currentDbManagementState.pathSegments.push({
        collection: subcollectionName,
        docId: null // We are now in this collection, no specific doc selected yet
    });
    currentDbManagementState.selectedDocumentId = null; // Clear selected document
    document.getElementById('admin-db-doc-view-container').innerHTML = '<p class="text-muted text-sm text-center py-4">Select a document to view its content.</p>';
    adminLoadCollectionDocuments(getDbRefFromPathSegments(currentDbManagementState.pathSegments), currentDbManagementState.pathSegments);
    updatePathBreadcrumbs();
};


window.adminToggleEditDocumentMode = (docPath, isEditing) => {
    document.querySelectorAll('.admin-db-value-display').forEach(el => el.classList.toggle('hidden', isEditing));
    document.querySelectorAll('.admin-db-value-input').forEach(el => el.classList.toggle('hidden', !isEditing));

    document.getElementById('admin-db-edit-doc-btn').classList.toggle('hidden', isEditing);
    document.getElementById('admin-db-save-doc-btn').classList.toggle('hidden', !isEditing);
    document.getElementById('admin-db-cancel-edit-doc-btn').classList.toggle('hidden', !isEditing);

    if (!isEditing) { // If cancelling, revert to original values (requires fetching again or storing)
        // For simplicity, just re-load the document to revert changes.
        // A more sophisticated approach would store original values and revert client-side.
        adminLoadDocumentContent(currentDbManagementState.pathSegments, currentDbManagementState.selectedDocumentId);
    }
};

window.adminSaveDocumentChanges = async (docPath) => {
    if (!confirm("Are you sure you want to save these changes to the document? This can be risky.")) return;
    showLoading("Saving document changes...");

    const form = document.getElementById('admin-db-doc-edit-form');
    const updates = {};
    let parseError = false;

    Array.from(form.elements).forEach(input => {
        if (input.name) {
            let value;
            if (input.type === 'number') {
                value = parseFloat(input.value);
                if (isNaN(value)) value = null; // Or handle error
            } else if (input.tagName === 'SELECT' && typeof input.value === 'string' && (input.value.toLowerCase() === 'true' || input.value.toLowerCase() === 'false')) {
                value = input.value.toLowerCase() === 'true';
            } else if (input.tagName === 'TEXTAREA' && (input.placeholder?.includes('JSON for array') || input.placeholder?.includes('JSON for object'))) {
                try {
                    value = JSON.parse(input.value);
                } catch (e) {
                    alert(`Invalid JSON for field "${input.name}": ${e.message}`);
                    input.classList.add('border-red-500');
                    parseError = true;
                    value = undefined; // Skip this field
                }
            } else {
                value = input.value;
            }
            if (value !== undefined) {
                updates[input.name] = value;
            }
        }
    });

    if (parseError) {
        hideLoading();
        return;
    }

    try {
        const docRef = db.doc(docPath); // docPath is the full path
        await docRef.update(updates);
        hideLoading();
        alert("Document updated successfully!");
        adminToggleEditDocumentMode(docPath, false); // Exit edit mode
        adminLoadDocumentContent(currentDbManagementState.pathSegments, currentDbManagementState.selectedDocumentId); // Reload to show changes
    } catch (error) {
        hideLoading();
        console.error("Error saving document changes:", error);
        alert(`Error saving changes: ${error.message}`);
    }
};

window.adminConfirmDeleteDocument = async (docPath) => {
    const docId = docPath.split('/').pop();
    if (!confirm(`PERMANENTLY DELETE document "${docId}" from path "${docPath}"? This cannot be undone.`)) return;
    showLoading("Deleting document...");

    try {
        const docRef = db.doc(docPath);
        await docRef.delete();
        hideLoading();
        alert(`Document "${docId}" deleted successfully.`);
        currentDbManagementState.selectedDocumentId = null;
        document.getElementById('admin-db-doc-view-container').innerHTML = '<p class="text-muted text-sm text-center py-4">Document deleted. Select another document.</p>';
        // Reload the current collection list
        adminLoadCollectionDocuments(getDbRefFromPathSegments(currentDbManagementState.pathSegments), currentDbManagementState.pathSegments);
    } catch (error) {
        hideLoading();
        console.error("Error deleting document:", error);
        alert(`Error deleting document: ${error.message}`);
    }
};

// --- END OF FILE admin_database_management.js ---