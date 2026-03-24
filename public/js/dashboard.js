// Dashboard JavaScript - Complete functionality

const API_BASE = '/api/v1';
let token = localStorage.getItem('accessToken');
let currentUser = null;
let currentChart = null;
let currentPage = 1;
let linksPerPage = 10;

// DOM Elements
const totalLinksEl = document.getElementById('totalLinks');
const totalClicksEl = document.getElementById('totalClicks');
const avgClicksEl = document.getElementById('avgClicks');
const linksLeftEl = document.getElementById('linksLeft');
const createLinkBtn = document.getElementById('createLinkBtn');
const newUrlInput = document.getElementById('newUrl');
const customSlugInput = document.getElementById('customSlug');
const createResult = document.getElementById('createResult');
const linksTableBody = document.getElementById('linksTableBody');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageInfoEl = document.getElementById('pageInfo');
const searchInput = document.getElementById('searchLinks');
const filterSelect = document.getElementById('filterLinks');

// Check authentication
async function checkAuth() {
    if (!token) {
        window.location.href = '/';
        return false;
    }
    
    try {
        const response = await fetch(`${API_BASE}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.data;
            return true;
        } else {
            throw new Error('Invalid token');
        }
    } catch (error) {
        console.error('Auth error:', error);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/';
        return false;
    }
}

// Load dashboard data
async function loadDashboard() {
    try {
        // Load user stats
        const statsRes = await fetch(`${API_BASE}/analytics/user`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const statsData = await statsRes.json();
        
        if (statsData.success) {
            totalLinksEl.textContent = statsData.data.totalLinks;
            totalClicksEl.textContent = statsData.data.totalClicks.toLocaleString();
            avgClicksEl.textContent = statsData.data.averageClicksPerLink.toFixed(1);
            
            // Calculate links left
            const linksLeft = currentUser.linksLimit - statsData.data.totalLinks;
            linksLeftEl.textContent = linksLeft >= 0 ? linksLeft : 0;
            
            // Update progress bar
            const usagePercent = (statsData.data.totalLinks / currentUser.linksLimit) * 100;
            const progressBar = document.querySelector('.progress-bar');
            if (progressBar) {
                progressBar.style.width = `${Math.min(usagePercent, 100)}%`;
                progressBar.setAttribute('aria-valuenow', usagePercent);
            }
        }
        
        // Load links
        await loadLinks();
        
        // Load analytics chart
        await loadAnalyticsChart();
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('Failed to load dashboard data', 'error');
    }
}

// Load user links with pagination and search
async function loadLinks() {
    try {
        const searchTerm = searchInput ? searchInput.value : '';
        const filter = filterSelect ? filterSelect.value : 'all';
        
        let url = `${API_BASE}/links?page=${currentPage}&limit=${linksPerPage}`;
        if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            renderLinksTable(data.data.links);
            updatePagination(data.data.pagination);
        }
    } catch (error) {
        console.error('Error loading links:', error);
        showToast('Failed to load links', 'error');
    }
}

// Render links table
function renderLinksTable(links) {
    if (!linksTableBody) return;
    
    if (links.length === 0) {
        linksTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-5">
                    <i class="fas fa-link fa-3x mb-3 opacity-50"></i>
                    <p class="mb-0">No links yet. Create your first link above!</p>
                </td>
            </tr>
        `;
        return;
    }
    
    linksTableBody.innerHTML = links.map(link => `
        <tr class="fade-in">
            <td>
                <div class="d-flex align-items-center">
                    <i class="fas fa-link me-2 text-primary"></i>
                    <div>
                        <a href="${link.shortUrl}" target="_blank" class="text-decoration-none">
                            <strong>${link.slug}</strong>
                        </a>
                        <div class="small text-muted">${new Date(link.createdAt).toLocaleDateString()}</div>
                    </div>
                </div>
            </td>
            <td class="text-truncate" style="max-width: 300px;">
                <a href="${link.originalUrl}" target="_blank" class="text-muted text-decoration-none">
                    ${link.originalUrl}
                </a>
            </td>
            <td class="text-center">
                <span class="badge bg-primary">${link.clicks}</span>
            </td>
            <td>
                ${link.expiresAt ? `
                    <span class="badge ${new Date(link.expiresAt) > new Date() ? 'bg-warning' : 'bg-danger'}">
                        ${new Date(link.expiresAt).toLocaleDateString()}
                    </span>
                ` : '<span class="badge bg-success">Never</span>'}
            </td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-info" onclick="copyToClipboard('${link.shortUrl}')" title="Copy link">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="btn btn-outline-primary" onclick="viewAnalytics('${link.id}')" title="View analytics">
                        <i class="fas fa-chart-line"></i>
                    </button>
                    <button class="btn btn-outline-warning" onclick="editLink('${link.id}')" title="Edit link">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="deleteLink('${link.id}')" title="Delete link">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Update pagination controls
function updatePagination(pagination) {
    if (!prevPageBtn || !nextPageBtn || !pageInfoEl) return;
    
    prevPageBtn.disabled = pagination.page === 1;
    nextPageBtn.disabled = pagination.page === pagination.pages;
    pageInfoEl.textContent = `Page ${pagination.page} of ${pagination.pages}`;
}

// Load analytics chart
async function loadAnalyticsChart() {
    try {
        // Get top links for chart
        const statsRes = await fetch(`${API_BASE}/analytics/user`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const statsData = await statsRes.json();
        
        if (statsData.success && statsData.data.topLinks) {
            const ctx = document.getElementById('clicksChart')?.getContext('2d');
            if (ctx) {
                // Destroy existing chart
                if (currentChart) {
                    currentChart.destroy();
                }
                
                const topLinks = statsData.data.topLinks.slice(0, 5);
                
                currentChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: topLinks.map(link => link.slug),
                        datasets: [{
                            label: 'Clicks',
                            data: topLinks.map(link => link.clicks),
                            backgroundColor: 'rgba(99, 102, 241, 0.5)',
                            borderColor: 'rgba(99, 102, 241, 1)',
                            borderWidth: 2,
                            borderRadius: 5
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                labels: {
                                    color: '#ffffff'
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return `Clicks: ${context.parsed.y.toLocaleString()}`;
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    color: '#b3b3b3'
                                },
                                grid: {
                                    color: 'rgba(255,255,255,0.1)'
                                }
                            },
                            x: {
                                ticks: {
                                    color: '#b3b3b3'
                                },
                                grid: {
                                    color: 'rgba(255,255,255,0.1)'
                                }
                            }
                        }
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error loading chart:', error);
    }
}

// Create new link
async function createLink() {
    const originalUrl = newUrlInput.value.trim();
    const customSlug = customSlugInput.value.trim();
    
    if (!originalUrl) {
        showToast('Please enter a URL', 'error');
        return;
    }
    
    // Validate URL
    try {
        new URL(originalUrl);
    } catch (e) {
        showToast('Please enter a valid URL (include http:// or https://)', 'error');
        return;
    }
    
    // Validate custom slug
    if (customSlug && !/^[a-zA-Z0-9_-]{3,50}$/.test(customSlug)) {
        showToast('Custom slug must be 3-50 characters and can only contain letters, numbers, underscores, and hyphens', 'error');
        return;
    }
    
    // Show loading state
    createLinkBtn.disabled = true;
    createLinkBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Creating...';
    
    try {
        const response = await fetch(`${API_BASE}/links`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                originalUrl,
                customSlug: customSlug || undefined
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Link created successfully!', 'success');
            
            // Clear inputs
            newUrlInput.value = '';
            customSlugInput.value = '';
            
            // Show result
            createResult.innerHTML = `
                <div class="alert alert-success alert-dismissible fade show" role="alert">
                    <i class="fas fa-check-circle me-2"></i>
                    Link created! 
                    <a href="${data.data.shortUrl}" target="_blank" class="alert-link">${data.data.shortUrl}</a>
                    <button class="btn btn-sm btn-outline-light ms-2" onclick="copyToClipboard('${data.data.shortUrl}')">
                        <i class="fas fa-copy me-1"></i>Copy
                    </button>
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
            createResult.style.display = 'block';
            
            // Reload dashboard
            await loadDashboard();
            
            // Auto hide result after 5 seconds
            setTimeout(() => {
                createResult.style.display = 'none';
            }, 5000);
        } else {
            showToast(data.error || 'Failed to create link', 'error');
        }
    } catch (error) {
        console.error('Create link error:', error);
        showToast('Failed to create link', 'error');
    } finally {
        createLinkBtn.disabled = false;
        createLinkBtn.innerHTML = '<i class="fas fa-plus-circle me-2"></i>Create Link';
    }
}

// Delete link
window.deleteLink = async function(id) {
    if (!confirm('Are you sure you want to delete this link? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/links/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            showToast('Link deleted successfully', 'success');
            await loadDashboard();
        } else {
            const data = await response.json();
            showToast(data.error || 'Failed to delete link', 'error');
        }
    } catch (error) {
        console.error('Delete link error:', error);
        showToast('Failed to delete link', 'error');
    }
};

// Edit link
window.editLink = async function(id) {
    // Get current link data
    try {
        const response = await fetch(`${API_BASE}/links/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.success) {
            const link = data.data;
            
            // Show edit modal
            const modalHtml = `
                <div class="modal fade" id="editLinkModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content bg-dark text-white">
                            <div class="modal-header border-secondary">
                                <h5 class="modal-title">Edit Link: ${link.slug}</h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="editLinkForm">
                                    <div class="mb-3">
                                        <label class="form-label">Original URL</label>
                                        <input type="url" class="form-control" id="editUrl" value="${link.originalUrl}" required>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Title (optional)</label>
                                        <input type="text" class="form-control" id="editTitle" value="${link.title || ''}">
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Description (optional)</label>
                                        <textarea class="form-control" id="editDescription" rows="2">${link.description || ''}</textarea>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Expiration Date (optional)</label>
                                        <input type="datetime-local" class="form-control" id="editExpiresAt" value="${link.expiresAt ? new Date(link.expiresAt).toISOString().slice(0, 16) : ''}">
                                    </div>
                                    <div class="mb-3">
                                        <div class="form-check form-switch">
                                            <input class="form-check-input" type="checkbox" id="editIsActive" ${link.isActive ? 'checked' : ''}>
                                            <label class="form-check-label">Active</label>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer border-secondary">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" onclick="saveLinkEdit('${id}')">Save Changes</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Remove existing modal if any
            const existingModal = document.getElementById('editLinkModal');
            if (existingModal) existingModal.remove();
            
            // Add modal to body
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('editLinkModal'));
            modal.show();
        }
    } catch (error) {
        console.error('Get link error:', error);
        showToast('Failed to load link data', 'error');
    }
};

// Save link edit
window.saveLinkEdit = async function(id) {
    const url = document.getElementById('editUrl').value;
    const title = document.getElementById('editTitle').value;
    const description = document.getElementById('editDescription').value;
    const expiresAt = document.getElementById('editExpiresAt').value;
    const isActive = document.getElementById('editIsActive').checked;
    
    if (!url) {
        showToast('URL is required', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/links/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                originalUrl: url,
                title,
                description,
                expiresAt: expiresAt || null,
                isActive
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Link updated successfully', 'success');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editLinkModal'));
            modal.hide();
            
            // Reload dashboard
            await loadDashboard();
        } else {
            showToast(data.error || 'Failed to update link', 'error');
        }
    } catch (error) {
        console.error('Update link error:', error);
        showToast('Failed to update link', 'error');
    }
};

// View analytics for a link
window.viewAnalytics = async function(linkId) {
    // Navigate to analytics page with link ID
    window.location.href = `/analytics/${linkId}`;
};

// Copy to clipboard
window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!', 'success');
};

// Pagination handlers
if (prevPageBtn) {
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadLinks();
        }
    });
}

if (nextPageBtn) {
    nextPageBtn.addEventListener('click', () => {
        currentPage++;
        loadLinks();
    });
}

// Search handler
if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentPage = 1;
            loadLinks();
        }, 500);
    });
}

// Filter handler
if (filterSelect) {
    filterSelect.addEventListener('change', () => {
        currentPage = 1;
        loadLinks();
    });
}

// Toast notification system
function showToast(message, type = 'info') {
    const existingToasts = document.querySelectorAll('.toast-notification');
    existingToasts.forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'} me-2"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add toast styles if not present
if (!document.querySelector('#toastStyles')) {
    const style = document.createElement('style');
    style.id = 'toastStyles';
    style.textContent = `
        .toast-notification {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #1a1a1a;
            border-left: 4px solid #6366f1;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            z-index: 10000;
            animation: slideInRight 0.3s ease-out;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: opacity 0.3s ease-out;
        }
        
        .toast-success {
            border-left-color: #10b981;
        }
        
        .toast-error {
            border-left-color: #ef4444;
        }
        
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
}

// Refresh data every 30 seconds
setInterval(() => {
    if (document.visibilityState === 'visible') {
        loadLinks();
        loadAnalyticsChart();
    }
}, 30000);

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
    if (await checkAuth()) {
        await loadDashboard();
        
        // Add create link button handler
        if (createLinkBtn) {
            createLinkBtn.addEventListener('click', createLink);
        }
        
        // Handle enter key in URL input
        if (newUrlInput) {
            newUrlInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    createLink();
                }
            });
        }
    }
});
