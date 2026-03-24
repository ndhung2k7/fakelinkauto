const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';
let token = null;

async function testAPI() {
    console.log('🧪 Testing URL Shortener API\n');
    
    // 1. Register user
    console.log('1. Registering user...');
    try {
        const registerRes = await axios.post(`${BASE_URL}/auth/register`, {
            email: `test${Date.now()}@example.com`,
            password: 'test123456',
            name: 'Test User'
        });
        
        if (registerRes.data.success) {
            console.log('✅ User registered successfully');
            token = registerRes.data.data.accessToken;
            console.log('   Token:', token.substring(0, 50) + '...');
        }
    } catch (error) {
        console.log('❌ Registration failed:', error.response?.data?.error);
    }
    
    // 2. Login
    console.log('\n2. Logging in...');
    try {
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'admin@shortlink.com',
            password: 'Admin123!'
        });
        
        if (loginRes.data.success) {
            console.log('✅ Login successful');
            token = loginRes.data.data.accessToken;
        }
    } catch (error) {
        console.log('❌ Login failed:', error.response?.data?.error);
    }
    
    // 3. Create link
    console.log('\n3. Creating short link...');
    try {
        const linkRes = await axios.post(`${BASE_URL}/links`, {
            originalUrl: 'https://example.com',
            title: 'Test Link'
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (linkRes.data.success) {
            console.log('✅ Link created successfully');
            console.log('   Short URL:', linkRes.data.data.shortUrl);
            console.log('   Slug:', linkRes.data.data.slug);
        }
    } catch (error) {
        console.log('❌ Link creation failed:', error.response?.data?.error);
    }
    
    // 4. Get user links
    console.log('\n4. Fetching user links...');
    try {
        const linksRes = await axios.get(`${BASE_URL}/links`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (linksRes.data.success) {
            console.log('✅ Found', linksRes.data.data.links.length, 'links');
            linksRes.data.data.links.forEach(link => {
                console.log(`   - ${link.slug}: ${link.clicks} clicks`);
            });
        }
    } catch (error) {
        console.log('❌ Failed to fetch links:', error.response?.data?.error);
    }
    
    // 5. Get user analytics
    console.log('\n5. Fetching analytics...');
    try {
        const analyticsRes = await axios.get(`${BASE_URL}/analytics/user`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (analyticsRes.data.success) {
            console.log('✅ Analytics retrieved');
            console.log('   Total Links:', analyticsRes.data.data.totalLinks);
            console.log('   Total Clicks:', analyticsRes.data.data.totalClicks);
        }
    } catch (error) {
        console.log('❌ Failed to fetch analytics:', error.response?.data?.error);
    }
    
    console.log('\n✅ API testing completed!');
}

// Run tests
testAPI().catch(console.error);
