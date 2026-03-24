// Admin Panel JavaScript - Complete admin functionality

const API_BASE = '/api/v1';
let token = localStorage.getItem('accessToken');
let currentUser = null;
let currentSection = 'dashboard';

// DOM Elements
const contentDiv = document.getElementById('content');

// Check admin access
async function checkAdminAccess() {
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
        
        if (data.success && data.data.role === 'admin') {
            currentUser = data.data;
            return true;
        } else {
            throw new Error('Not admin');
        }
    } catch (error) {
        console.error('Admin check error:', error);
        window.location.href = '/dashboard';
        return false;
    }
}

// Load section content
async function loadSection(section) {
    currentSection = section;
    
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('onclick')?.includes(section)) {
            link.classList.add('active');
        }
    });
    
    switch(section) {
        case 'dashboard':
            await loadDashboard();
            break;
        case 'users':
            await loadUsers();
            break;
        case 'links':
            await loadLinks();
            break;
        case 'activity':
            await loadActivity();
            break;
        case 'settings':
            await loadSettings();
            break;
        default:
            await loadDashboard();
    }
}

// Load admin dashboard
async function loadDashboard() {
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE}/admin/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const stats = data.data;
            
            contentDiv.innerHTML = `
                <div class="fade-in">
                    <h2 class="mb-4">System Dashboard</h2>
                    
                    <!-- Stats Cards -->
                    <div class="row mb-4">
                        <div class="col-md-3">
                            <div class="stat-card">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <p class="text-muted mb-1">Total Users</p>
                                        <h3 class="mb-0">${stats.totalUsers.toLocaleString()}</h3>
                                    </div>
                                    <i class="fas fa-users fa-2x text-primary opacity-50"></i>
                                </div>
                                <div class="mt-2">
                                    <small class="text-success">
                                        <i class="fas fa-arrow-up"></i> ${stats.activeUsers} active
                                    </small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <p class="text-muted mb-1">Total Links</p>
                                        <h3 class="mb-0">${stats.totalLinks.toLocaleString()}</h3>
                                    </div>
                                    <i class="fas fa-link fa-2x text-success opacity-50"></i>
                                </div>
                                <div class="mt-2">
                                    <small class="text-info">
                                        <i class="fas fa-plus"></i> +${stats.newLinks24h} today
                                    </small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <p class="text-muted mb-1">Total Clicks</p>
                                        <h3 class="mb-0">${stats.totalClicks.toLocaleString()}</h3>
                                    </div>
                                    <i class="fas fa-chart-line fa-2x text-warning opacity-50"></i>
                                </div>
                                <div class="mt-2">
                                    <small class="text-info">
                                        <i class="fas fa-chart-line"></i> +${stats.clicks24h.toLocaleString()} today
                                    </small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-card">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <p class="text-muted mb-1">Database Size</p>
                                        <h3 class="mb-0">${stats.dbSize ? formatBytes(stats.dbSize) : 'N/A'}</h3>
                                    </div>
                                    <i class="fas fa-database fa-2x text-info opacity-50"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Charts Row -->
                    <div class="row mb-4">
                        <div class="col-md-8">
                            <div class="stat-card">
                                <h5>Clicks Overview (Last 30 Days)</h5>
                                <canvas id="clicksChart" height="300"></canvas>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="stat-card">
                                <h5>Top Users</h5>
                                <div class="table-responsive">
                                    <table class="table table-sm">
                                        <thead>
                                            <tr>
                                                <th>User</th>
                                                <th>Links</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${stats.topUsers.map(user => `
                                                <tr>
                                                    <td>${escapeHtml(user.name)}</td>
                                                    <td><span class="badge bg-primary">${user.linkCount}</span></td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Recent Activity -->
                    <div class="stat-card">
                        <h5>Recent Activity</h5>
                        <div id="recentActivity"></div>
                    </div>
                </div>
            `;
            
            // Load chart data
            await loadChartData();
            
            // Load recent activity
            await loadRecentActivity();
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        contentDiv.innerHTML = '<div class="alert alert-danger">Failed to load dashboard data</div>';
    }
}

// Load chart data
async function loadChartData() {
    try {
        const response = await fetch(`${API_BASE}/admin/activity?limit=30`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success && data.data.recentClicks) {
            // Group clicks by date
            const clicksByDate = {};
            data.data.recentClicks.forEach(click => {
                const date = new Date(click.timestamp).toLocaleDateString();
                clicksByDate[date] = (clicksByDate[date] || 0) + 1;
            });
            
            const dates = Object.keys(clicksByDate).slice(-30);
            const counts = dates.map(date => clicksByDate[date]);
            
            const ctx = document.getElementById('clicksChart')?.getContext('2d');
            if (ctx) {
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: dates,
                        datasets: [{
                            label: 'Clicks',
                            data: counts,
                            borderColor: '#6366f1',
                            backgroundColor: 'rgba(99, 102, 241, 0.1)',
                            fill: true,
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                labels: { color: '#ffffff' }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: { color: '#b3b3b3' },
                                grid: { color: 'rgba(255,255,255,0.1)' }
                            },
                            x: {
                                ticks: { color: '#b3b3b3' },
                                grid: { color: 'rgba(255,255,255,0.1)' }
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

// Load recent activity
async function loadRecentActivity() {
    try {
        const response = await fetch(`${API_BASE}/admin/activity?limit=10`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const activityDiv = document.getElementById('recentActivity');
            if (activityDiv) {
                const recentClicks = data.data.recentClicks.slice(0, 5);
                
                activityDiv.innerHTML = `
                    <div class="timeline">
                        ${recentClicks.map(click => `
                            <div class="timeline-item">
                                <div class="timeline-icon">
                                    <i class="fas fa-mouse-pointer"></i>
                                </div>
                                <div class="timeline-content">
                                    <div class="d-flex justify-content-between">
                                        <strong>Click on ${click.Link?.slug || 'Unknown'}</strong>
                                        <small class="text-muted">${new Date(click.timestamp).toLocaleString()}</small>
                                    </div>
                                    <div class="small text-muted">
                                        <i class="fas fa-map-marker-alt"></i> ${click.country || 'Unknown'} |
                                        <i class="fas fa-mobile-alt"></i> ${click.device || 'Unknown'} |
                                        <i class="fas fa-chrome"></i> ${click.browser || 'Unknown'}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Error loading activity:', error);
    }
}

// Load users list
async function loadUsers() {
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE}/admin/users?limit=50`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            contentDiv.innerHTML = `
                <div class="fade-in">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h2>User Management</h2>
                        <div>
                            <input type="text" class="form-control" id="searchUsers" placeholder="Search users...">
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="table-responsive">
                            <table class="table table-hover">
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Plan</th>
                                        <th>Links</th>
                                        <th>Clicks</th>
                                        <th>Joined</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="usersTableBody">
                                    ${data.data.users.map(user => `
                                        <tr>
                                            <td>
                                                <div class="d-flex align-items-center">
                                                    <div class="user-avatar me-2">
                                                        <i class="fas fa-user-circle fa-2x"></i>
                                                    </div>
                                                    <div>
                                                        <strong>${escapeHtml(user.name)}</strong>
                                                        <div class="small text-muted">ID: ${user.id.substring(0, 8)}</div>
                                                    </div>
                                                </div>
                                             </td>
                                            <td>${escapeHtml(user.email)}</td>
                                            <td>
                                                <span class="badge bg-${user.role === 'admin' ? 'danger' : 'info'}">
                                                    ${user.role}
                                                </span>
                                            </td>
                                            <td>
                                                <span class="badge bg-${user.plan === 'free' ? 'secondary' : user.plan === 'pro' ? 'primary' : 'warning'}">
                                                    ${user.plan}
                                                </span>
                                            </td>
                                            <td>${user.totalLinks}</td>
                                            <td>${user.totalClicks.toLocaleString()}</td>
                                            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                                            <td>
                                                <div class="btn-group btn-group-sm">
                                                    <button class="btn btn-outline-info" onclick="viewUserDetails('${user.id}')" title="View details">
                                                        <i class="fas fa-eye"></i>
                                                    </button>
                                                    <button class="btn btn-outline-warning" onclick="editUser('${user.id}')" title="Edit user">
                                                        <i class="fas fa-edit"></i>
                                                    </button>
                                                    <button class="btn btn-outline-danger" onclick="deleteUser('${user.id}')" title="Delete user">
                                                        <i class="fas fa-trash"></i>
                                                    </button>
                                                </div>
                                            </td>
                                         </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
            
            // Add search functionality
            const searchInput = document.getElementById('searchUsers');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    filterUsers(e.target.value);
                });
            }
        }
    } catch (error) {
        console.error('Error loading users:', error);
        contentDiv.innerHTML = '<div class="alert alert-danger">Failed to load users</div>';
    }
}

// Filter users
function filterUsers(searchTerm) {
    const rows = document.querySelectorAll('#usersTableBody tr');
    const term = searchTerm.toLowerCase();
    
    rows.forEach(row => {
        const name = row.cells[0]?.innerText.toLowerCase() || '';
        const email = row.cells[1]?.innerText.toLowerCase() || '';
        
        if (name.includes(term) || email.includes(term)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Load links list
async function loadLinks() {
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE}/admin/links?limit=50`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            contentDiv.innerHTML = `
                <div class="fade-in">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h2>Link Management</h2>
                        <div>
                            <input type="text" class="form-control" id="searchLinks" placeholder="Search links...">
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="table-responsive">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Slug</th>
                                        <th>Original URL</th>
                                        <th>User</th>
                                        <th>Clicks</th>
                                        <th>Created</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="linksTableBody">
                                    ${data.data.links.map(link => `
                                        <tr>
                                            <td>
                                                <a href="${process.env.BASE_URL}/${link.slug}" target="_blank">
                                                    <code>${escapeHtml(link.slug)}</code>
                                                </a>
                                            </td>
                                            <td class="text-truncate" style="max-width: 300px;">
                                                <a href="${link.originalUrl}" target="_blank" class="text-muted">
                                                    ${escapeHtml(link.originalUrl)}
                                                </a>
                                            </td>
                                            <td>
                                                <div class="small">
                                                    <strong>${escapeHtml(link.User?.name || 'Unknown')}</strong>
                                                    <div class="text-muted">${escapeHtml(link.User?.email || '')}</div>
                                                </div>
                                            </td>
                                            <td>
                                                <span class="badge bg-primary">${link.clicks.toLocaleString()}</span>
                                            </td>
                                            <td>${new Date(link.createdAt).toLocaleDateString()}</td>
                                            <td>
                                                ${!link.isActive ? 
                                                    '<span class="badge bg-danger">Disabled</span>' : 
                                                    link.expiresAt && new Date(link.expiresAt) < new Date() ?
                                                    '<span class="badge bg-warning">Expired</span>' :
                                                    '<span class="badge bg-success">Active</span>'
                                                }
                                            </td>
                                            <td>
                                                <button class="btn btn-sm btn-danger" onclick="adminDeleteLink('${link.id}')">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </td>
                                         </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
            
            // Add search functionality
            const searchInput = document.getElementById('searchLinks');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    filterLinks(e.target.value);
                });
            }
        }
    } catch (error) {
        console.error('Error loading links:', error);
        contentDiv.innerHTML = '<div class="alert alert-danger">Failed to load links</div>';
    }
}

// Filter links
function filterLinks(searchTerm) {
    const rows = document.querySelectorAll('#linksTableBody tr');
    const term = searchTerm.toLowerCase();
    
    rows.forEach(row => {
        const slug = row.cells[0]?.innerText.toLowerCase() || '';
        const url = row.cells[1]?.innerText.toLowerCase() || '';
        
        if (slug.includes(term) || url.includes(term)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Load activity log
async function loadActivity() {
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE}/admin/activity?limit=100`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            contentDiv.innerHTML = `
                <div class="fade-in">
                    <h2 class="mb-4">Activity Log</h2>
                    
                    <div class="stat-card">
                        <ul class="nav nav-tabs mb-3" id="activityTab" role="tablist">
                            <li class="nav-item">
                                <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#clicks" type="button">
                                    <i class="fas fa-mouse-pointer me-2"></i>Clicks
                                </button>
                            </li>
                            <li class="nav-item">
                                <button class="nav-link" data-bs-toggle="tab" data-bs-target="#newLinks" type="button">
                                    <i class="fas fa-plus-circle me-2"></i>New Links
                                </button>
                            </li>
                        </ul>
                        
                        <div class="tab-content">
                            <div class="tab-pane fade show active" id="clicks">
                                <div class="timeline">
                                    ${data.data.recentClicks.map(click => `
                                        <div class="timeline-item">
                                            <div class="timeline-icon">
                                                <i class="fas fa-mouse-pointer"></i>
                                            </div>
                                            <div class="timeline-content">
                                                <div class="d-flex justify-content-between">
                                                    <strong>Click on ${click.Link?.slug || 'Unknown'}</strong>
                                                    <small class="text-muted">${new Date(click.timestamp).toLocaleString()}</small>
                                                </div>
                                                <div class="small text-muted">
                                                    <i class="fas fa-user"></i> User: ${click.Link?.User?.name || 'Anonymous'} |
                                                    <i class="fas fa-map-marker-alt"></i> ${click.country || 'Unknown'} |
                                                    <i class="fas fa-mobile-alt"></i> ${click.device || 'Unknown'} |
                                                    <i class="fas fa-chrome"></i> ${click.browser || 'Unknown'}
                                                </div>
                                                <div class="small">
                                                    <i class="fas fa-link"></i> ${click.Link?.originalUrl || 'N/A'}
                                                </div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                            <div class="tab-pane fade" id="newLinks">
                                <div class="timeline">
                                    ${data.data.recentLinks.map(link => `
                                        <div class="timeline-item">
                                            <div class="timeline-icon">
                                                <i class="fas fa-link"></i>
                                            </div>
                                            <div class="timeline-content">
                                                <div class="d-flex justify-content-between">
                                                    <strong>New Link: ${link.slug}</strong>
                                                    <small class="text-muted">${new Date(link.createdAt).toLocaleString()}</small>
                                                </div>
                                                <div class="small">
                                                    <i class="fas fa-user"></i> Created by: ${link.User?.name || 'Unknown'}
                                                </div>
                                                <div class="small">
                                                    <i class="fas fa-link"></i> ${link.originalUrl}
                                                </div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading activity:', error);
        contentDiv.innerHTML = '<div class="alert alert-danger">Failed to load activity</div>';
    }
}

// Load settings
async function loadSettings() {
    contentDiv.innerHTML = `
        <div class="fade-in">
            <h2 class="mb-4">System Settings</h2>
            
            <div class="row">
                <div class="col-md-6">
                    <div class="stat-card">
                        <h5>System Configuration</h5>
                        <form id="systemSettingsForm">
                            <div class="mb-3">
                                <label class="form-label">System Name</label>
                                <input type="text" class="form-control" id="systemName" value="ShortLink">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Base URL</label>
                                <input type="text" class="form-control" id="baseUrl" value="${window.location.origin}">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Default Link Limit (Free Plan)</label>
                                <input type="number" class="form-control" id="defaultLinkLimit" value="10">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Default Click Limit (Free Plan)</label>
                                <input type="number" class="form-control" id="defaultClickLimit" value="1000">
                            </div>
                            <button type="submit" class="btn btn-primary">Save Settings</button>
                        </form>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <div class="stat-card">
                        <h5>System Information</h5>
                        <div class="mb-3">
                            <strong>Node Version:</strong> ${process.version || 'N/A'}
                        </div>
                        <div class="mb-3">
                            <strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}
                        </div>
                        <div class="mb-3">
                            <strong>Database:</strong> ${process.env.DB_DIALECT || 'SQLite'}
                        </div>
                        <div class="mb-3">
                            <strong>Redis:</strong> ${localStorage.getItem('redisStatus') || 'Connected'}
                        </div>
                        <hr>
                        <div class="mb-3">
                            <strong>Uptime:</strong> ${formatUptime()}
                        </div>
                        <div class="mb-3">
                            <strong>Memory Usage:</strong> ${formatMemoryUsage()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Handle form submit
    const form = document.getElementById('systemSettingsForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            showToast('Settings saved successfully!', 'success');
        });
    }
}

// View user details
window.viewUserDetails = async function(userId) {
    try {
        const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const user = data.data;
            
            const modalHtml = `
                <div class="modal fade" id="userDetailsModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content bg-dark text-white">
                            <div class="modal-header border-secondary">
                                <h5 class="modal-title">User Details: ${escapeHtml(user.name)}</h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <strong>Email:</strong> ${escapeHtml(user.email)}
                                    </div>
                                    <div class="col-md-6">
                                        <strong>Role:</strong> <span class="badge bg-${user.role === 'admin' ? 'danger' : 'info'}">${user.role}</span>
                                    </div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <strong>Plan:</strong> ${user.plan}
                                    </div>
                                    <div class="col-md-6">
                                        <strong>Status:</strong> ${user.isActive ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-danger">Disabled</span>'}
                                    </div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <strong>Total Links:</strong> ${user.totalLinks}
                                    </div>
                                    <div class="col-md-6">
                                        <strong>Total Clicks:</strong> ${user.totalClicks.toLocaleString()}
                                    </div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <strong>Links Limit:</strong> ${user.linksLimit === -1 ? 'Unlimited' : user.linksLimit}
                                    </div>
                                    <div class="col-md-6">
                                        <strong>Clicks Limit:</strong> ${user.clicksLimit === -1 ? 'Unlimited' : user.clicksLimit.toLocaleString()}
                                    </div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <strong>Joined:</strong> ${new Date(user.createdAt).toLocaleString()}
                                    </div>
                                    <div class="col-md-6">
                                        <strong>Last Login:</strong> ${user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                                    </div>
                                </div>
                                
                                <h6 class="mt-4 mb-3">Recent Links</h6>
                                <div class="table-responsive">
                                    <table class="table table-sm">
                                        <thead>
                                            <tr>
                                                <th>Slug</th>
                                                <th>Original URL</th>
                                                <th>Clicks</th>
                                                <th>Created</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${user.Links?.slice(0, 5).map(link => `
                                                <tr>
                                                    <td><code>${link.slug}</code></td>
                                                    <td class="text-truncate" style="max-width: 200px;">${link.originalUrl}</td>
                                                    <td>${link.clicks}</td>
                                                    <td>${new Date(link.createdAt).toLocaleDateString()}</td>
                                                </tr>
                                            `).join('') || '<tr><td colspan="4">No links found</td></tr>'}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div class="modal-footer border-secondary">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Remove existing modal
            const existingModal = document.getElementById('userDetailsModal');
            if (existingModal) existingModal.remove();
            
            // Add modal to body
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('userDetailsModal'));
            modal.show();
        }
    } catch (error) {
        console.error('Error loading user details:', error);
        showToast('Failed to load user details', 'error');
    }
};

// Edit user
window.editUser = async function(userId) {
    try {
        const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const user = data.data;
            
            const modalHtml = `
                <div class="modal fade" id="editUserModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content bg-dark text-white">
                            <div class="modal-header border-secondary">
                                <h5 class="modal-title">Edit User: ${escapeHtml(user.name)}</h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="editUserForm">
                                    <div class="mb-3">
                                        <label class="form-label">Name</label>
                                        <input type="text" class="form-control" id="editName" value="${escapeHtml(user.name)}">
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Email</label>
                                        <input type="email" class="form-control" id="editEmail" value="${escapeHtml(user.email)}">
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Role</label>
                                        <select class="form-select" id="editRole">
                                            <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                                        </select>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Plan</label>
                                        <select class="form-select" id="editPlan">
                                            <option value="free" ${user.plan === 'free' ? 'selected' : ''}>Free</option>
                                            <option value="pro" ${user.plan === 'pro' ? 'selected' : ''}>Pro</option>
                                            <option value="enterprise" ${user.plan === 'enterprise' ? 'selected' : ''}>Enterprise</option>
                                        </select>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Links Limit (-1 for unlimited)</label>
                                        <input type="number" class="form-control" id="editLinksLimit" value="${user.linksLimit}">
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Clicks Limit (-1 for unlimited)</label>
                                        <input type="number" class="form-control" id="editClicksLimit" value="${user.clicksLimit}">
                                    </div>
                                    <div class="mb-3">
                                        <div class="form-check form-switch">
                                            <input class="form-check-input" type="checkbox" id="editIsActive" ${user.isActive ? 'checked' : ''}>
                                            <label class="form-check-label">Active</label>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer border-secondary">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" onclick="saveUserEdit('${userId}')">Save Changes</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Remove existing modal
            const existingModal = document.getElementById('editUserModal');
            if (existingModal) existingModal.remove();
            
            // Add modal to body
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
            modal.show();
        }
    } catch (error) {
        console.error('Error loading user:', error);
        showToast('Failed to load user data', 'error');
    }
};

// Save user edit
window.saveUserEdit = async function(userId) {
    const name = document.getElementById('editName').value;
    const email = document.getElementById('editEmail').value;
    const role = document.getElementById('editRole').value;
    const plan = document.getElementById('editPlan').value;
    const linksLimit = parseInt(document.getElementById('editLinksLimit').value);
    const clicksLimit = parseInt(document.getElementById('editClicksLimit').value);
    const isActive = document.getElementById('editIsActive').checked;
    
    try {
        const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name,
                email,
                role,
                plan,
                linksLimit,
                clicksLimit,
                isActive
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('User updated successfully', 'success');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
            modal.hide();
            
            // Reload users list
            await loadUsers();
        } else {
            showToast(data.error || 'Failed to update user', 'error');
        }
    } catch (error) {
        console.error('Error updating user:', error);
        showToast('Failed to update user', 'error');
    }
};

// Delete user
window.deleteUser = async function(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone and will delete all their links and data!')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            showToast('User deleted successfully', 'success');
            await loadUsers();
        } else {
            const data = await response.json();
            showToast(data.error || 'Failed to delete user', 'error');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showToast('Failed to delete user', 'error');
    }
};

// Admin delete link
window.adminDeleteLink = async function(linkId) {
    if (!confirm('Are you sure you want to delete this link?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/admin/links/${linkId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            showToast('Link deleted successfully', 'success');
            await loadLinks();
        } else {
            const data = await response.json();
            showToast(data.error || 'Failed to delete link', 'error');
        }
    } catch (error) {
        console.error('Error deleting link:', error);
        showToast('Failed to delete link', 'error');
    }
};

// Utility functions
function showLoading() {
    if (contentDiv) {
        contentDiv.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3 text-muted">Loading...</p>
            </div>
        `;
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatUptime() {
    // Simple uptime calculation (can be enhanced with actual server uptime)
    const startTime = localStorage.getItem('adminStartTime');
    if (startTime) {
        const uptime = Date.now() - parseInt(startTime);
        const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
        const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
        return `${days}d ${hours}h ${minutes}m`;
    }
    return 'N/A';
}

function formatMemoryUsage() {
    if (performance && performance.memory) {
        const used = performance.memory.usedJSHeapSize;
        const total = performance.memory.totalJSHeapSize;
        return `${Math.round(used / 1024 / 1024)}MB / ${Math.round(total / 1024 / 1024)}MB`;
    }
    return 'N/A';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Toast notification
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
if (!document.querySelector('#adminToastStyles')) {
    const style = document.createElement('style');
    style.id = 'adminToastStyles';
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
        
        .timeline {
            position: relative;
            padding-left: 30px;
        }
        
        .timeline-item {
            position: relative;
            margin-bottom: 20px;
        }
        
        .timeline-icon {
            position: absolute;
            left: -30px;
            top: 0;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background: #6366f1;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
        }
        
        .timeline-content {
            background: rgba(255,255,255,0.05);
            padding: 12px;
            border-radius: 8px;
        }
        
        .stat-card {
            background: #1a1a1a;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .user-avatar {
            font-size: 24px;
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

// Set start time
localStorage.setItem('adminStartTime', Date.now());

// Logout function
window.adminLogout = function() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/';
};

// Initialize admin panel
document.addEventListener('DOMContentLoaded', async () => {
    if (await checkAdminAccess()) {
        await loadSection('dashboard');
    }
});

// Make functions globally available
window.loadSection = loadSection;
window.viewUserDetails = viewUserDetails;
window.editUser = editUser;
window.deleteUser = deleteUser;
window.saveUserEdit = saveUserEdit;
window.adminDeleteLink = adminDeleteLink;
window.adminLogout = adminLogout;
