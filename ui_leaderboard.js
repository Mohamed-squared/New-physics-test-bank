// --- START OF FILE ui_leaderboard.js ---

// ui_leaderboard.js

import { displayContent, setActiveSidebarLink } from './ui_core.js';
import { db, currentUser } from './state.js';
import { escapeHtml, showLoading, hideLoading } from './utils.js';

export async function showLeaderboard() {
    if (!currentUser) {
        alert("Please log in to view the leaderboard.");
        return;
    }
    setActiveSidebarLink('showLeaderboard', 'sidebar-standard-nav');
    // --- START MODIFICATION: Call clearContent before showLoading ---
    clearContent(); // Clear previous content
    // --- END MODIFICATION ---
    showLoading("Loading Leaderboard...");

    let leaderboardHtml = `
        <div class="max-w-3xl mx-auto animate-fade-in">
            <div class="content-card">
                <h2 class="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200">Top Learners - Leaderboard</h2>
    `;

    try {
        const usersRef = db.collection('users');
        // Query for users, order by credits descending, limit to top 50
        const snapshot = await usersRef.orderBy('credits', 'desc').limit(50).get();

        if (snapshot.empty) {
            leaderboardHtml += '<p class="text-muted text-center">The leaderboard is currently empty. Start learning to get on the board!</p>';
        } else {
            leaderboardHtml += `
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead class="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Rank</th>
                                <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">User</th>
                                <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Credits</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            `;
            let rank = 1;
            snapshot.forEach(doc => {
                const userData = doc.data();
                const displayName = userData.displayName || userData.username || 'Anonymous User';
                const credits = userData.credits || 0;
                const isCurrentUser = currentUser && doc.id === currentUser.uid;

                leaderboardHtml += `
                    <tr class="${isCurrentUser ? 'bg-primary-50 dark:bg-primary-900/30 font-semibold' : ''}">
                        <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">${rank}</td>
                        <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            <div class="flex items-center">
                                <img src="${userData.photoURL || './assets/images/branding/default_PFP.png'}" alt="${escapeHtml(displayName)}" class="w-8 h-8 rounded-full mr-3 object-cover" onerror="this.onerror=null;this.src='./assets/images/branding/default_PFP.png';">
                                <div>
                                    <p class="truncate max-w-xs">${escapeHtml(displayName)}</p>
                                    ${userData.username ? `<p class="text-xs text-muted">@${escapeHtml(userData.username)}</p>` : ''}
                                </div>
                            </div>
                        </td>
                        <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-right">${credits.toLocaleString()}</td>
                    </tr>
                `;
                rank++;
            });
            leaderboardHtml += `
                        </tbody>
                    </table>
                </div>
            `;
        }
    } catch (error) {
        console.error("Error fetching leaderboard data:", error);
        leaderboardHtml += '<p class="text-red-500 text-center">Could not load leaderboard data. Please try again later.</p>';
    }

    leaderboardHtml += `
            </div>
        </div>
    `;
    hideLoading();
    displayContent(leaderboardHtml);
}

export function showMarketplacePlaceholder() {
    setActiveSidebarLink('showMarketplacePlaceholder', 'sidebar-standard-nav');
    // --- START MODIFICATION: Call clearContent first ---
    clearContent(); // Clear previous content
    // --- END MODIFICATION ---

    const placeholderHtml = `
        <div class="max-w-xl mx-auto animate-fade-in">
            <div class="content-card text-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto mb-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5A2.25 2.25 0 0011.25 11.25H6.75a2.25 2.25 0 00-2.25 2.25V21M3 3h12M3 7.5h12M3 12h12m-4.5 3.75h.008v.008h-.008v-.008zm0 3.75h.008v.008h-.008v-.008zm0 3.75h.008v.008h-.008v-.008z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 3.75V16.5L12 14.25 7.5 16.5V3.75m9 0H12M4.5 3.75H12M12 3.75C12 3.75 10.5 2.25 9 2.25S6 3.75 6 3.75M12 3.75C12 3.75 13.5 2.25 15 2.25S18 3.75 18 3.75M4.5 21V16.5" />
                </svg>
                <h2 class="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Marketplace - Coming Soon!</h2>
                <p class="text-muted mb-3">
                    Exciting things are planned for this space!
                </p>
                <p class="text-gray-700 dark:text-gray-300 mb-6">
                    You can earn Lyceum Credits by engaging with the platform – completing tests, enrolling in courses, suggesting new content, and more.
                    Soon, you'll be able to use your hard-earned credits here for various perks and features.
                </p>
                <p class="text-lg font-medium text-primary-600 dark:text-primary-400">
                    Your current balance: <span id="marketplace-credit-balance">${currentUser?.credits?.toLocaleString() || 0}</span> Credits
                </p>
                <button onclick="window.showHomeDashboard()" class="btn-primary mt-8">Back to Home</button>
            </div>
        </div>
    `;
    displayContent(placeholderHtml);
    // Update credit balance if currentUser is available
    const creditBalanceSpan = document.getElementById('marketplace-credit-balance');
    if (creditBalanceSpan && currentUser) {
        creditBalanceSpan.textContent = currentUser.credits?.toLocaleString() || 0;
    }
}
// --- END OF FILE ui_leaderboard.js ---