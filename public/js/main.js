// Main JavaScript for public pages (index.html)

// Global variables
const API_BASE = '/api/v1';
let currentUser = null;

// DOM Elements
const urlInput = document.getElementById('urlInput');
const shortenBtn = document.getElementById('shortenBtn');
const resultDiv = document.getElementById('result');
const shortUrlInput = document.getElementById('shortUrl');

// Check authentication status
async function checkAuth() {
    const token = localStorage.getItem('accessToken');
    if (!token) return false;
    
    try {
        const response = await fetch(`${API_BASE}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        if (data.success) {
            currentUser = data.data;
            updateUIForLoggedInUser();
            return true;
        }
    } catch (error) {
        console.error('Auth check error:', error);
    }
    
    return false;
}

// Update UI for logged in user
function updateUIForLoggedInUser() {
    // Update navbar buttons
    const navbarNav = document.querySelector('.navbar-nav');
    if (navbarNav) {
        const loginBtn = navbarNav.querySelector('a[href="/login"]');
        const signupBtn = navbarNav.querySelector('a[href="/register"]');
        
        if (loginBtn && signupBtn) {
            loginBtn.style.display = 'none';
            signupBtn.style.display = 'none';
            
            // Add dashboard link if not exists
            let dashboardLink = navbarNav.querySelector('a[href="/dashboard"]');
            if (!dashboardLink) {
                dashboardLink = document.createElement('a');
                dashboardLink.className = 'btn btn-primary ms-2';
                dashboardLink.href = '/dashboard';
                dashboardLink.innerHTML = '<i class="fas fa-tachometer-alt me-2"></i>Dashboard';
                navbarNav.appendChild(dashboardLink);
            }
            
            // Add logout button
            let logoutBtn = navbarNav.querySelector('#logoutBtn');
            if (!logoutBtn) {
                logoutBtn = document.createElement('a');
                logoutBtn.className = 'btn btn-outline-light ms-2';
                logoutBtn.id = 'logoutBtn';
                logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt me-2"></i>Logout';
                logoutBtn.onclick = logout;
                navbarNav.appendChild(logoutBtn);
            }
        }
    }
}

// Logout function
async function logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    currentUser = null;
    showToast('Logged out successfully', 'success');
    setTimeout(() => {
        window.location.href = '/';
    }, 1000);
}

// Create short link (public, no auth required)
async function createShortLink(url) {
    try {
        const token = localStorage.getItem('accessToken');
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`${API_BASE}/links`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ originalUrl: url })
        });
        
        const data = await response.json();
        
        if (data.success) {
            return data.data.shortUrl;
        } else {
            throw new Error(data.error || 'Failed to create short link');
        }
    } catch (error) {
        console.error('Create short link error:', error);
        throw error;
    }
}

// Handle shorten button click
if (shortenBtn) {
    shortenBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        
        if (!url) {
            showToast('Please enter a URL', 'error');
            return;
        }
        
        // Validate URL
        try {
            new URL(url);
        } catch (e) {
            showToast('Please enter a valid URL (include http:// or https://)', 'error');
            return;
        }
        
        // Show loading state
        shortenBtn.disabled = true;
        shortenBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Shortening...';
        
        try {
            const shortUrl = await createShortLink(url);
            
            if (shortUrlInput) {
                shortUrlInput.value = shortUrl;
            }
            
            if (resultDiv) {
                resultDiv.style.display = 'block';
            }
            
            showToast('Link shortened successfully!', 'success');
            
            // Animate result
            resultDiv.classList.add('fade-in');
            setTimeout(() => {
                resultDiv.classList.remove('fade-in');
            }, 500);
            
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            // Reset button state
            shortenBtn.disabled = false;
            shortenBtn.innerHTML = '<i class="fas fa-magic me-2"></i>Shorten';
        }
    });
}

// Copy to clipboard function
window.copyToClipboard = function(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('Copied to clipboard!', 'success');
};

// Toast notification system
function showToast(message, type = 'info') {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.toast-notification');
    existingToasts.forEach(toast => toast.remove());
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas ${getToastIcon(type)} me-2"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 10);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// Get toast icon based on type
function getToastIcon(type) {
    switch(type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        default: return 'fa-info-circle';
    }
}

// Add CSS animation for toast removal
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Handle enter key press
if (urlInput) {
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            shortenBtn.click();
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
    // Add smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Add animation on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-up');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    document.querySelectorAll('.card, .feature-icon').forEach(el => {
        observer.observe(el);
    });
});

// Add CSS for fade-in-up animation
const animationStyle = document.createElement('style');
animationStyle.textContent = `
    .fade-in-up {
        animation: fadeInUp 0.6s ease-out;
    }
    
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(animationStyle);
