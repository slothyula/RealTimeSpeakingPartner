/**
 * Test Google Gemini API Connection
 * This script tests if the API key is valid and if we can connect to Google's servers
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDnnbC9LkXF0oyfsRsDRZKnczz8pxP8dbU';

console.log('🔍 Testing Google Gemini API Connection...\n');
console.log('API Key:', API_KEY.substring(0, 20) + '...' + API_KEY.substring(API_KEY.length - 4));
console.log('');

async function testConnection() {
    try {
        console.log('1. Initializing Google Generative AI client...');
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        console.log('   ✅ Client initialized\n');

        console.log('2. Testing API connection with a simple request...');
        const result = await model.generateContent('Say "Hello" in one word');
        const response = await result.response;
        const text = response.text();
        
        console.log('   ✅ API connection successful!');
        console.log('   Response:', text);
        console.log('\n✅ All tests passed! API is working correctly.\n');
        return true;
        
    } catch (error) {
        console.error('\n❌ API Connection Test Failed!\n');
        console.error('Error Type:', error?.constructor?.name);
        console.error('Error Message:', error?.message);
        console.error('Error Code:', error?.code);
        
        if (error?.message?.includes('fetch failed')) {
            console.error('\n🔍 Diagnosis: Network/Connection Error');
            console.error('   Possible causes:');
            console.error('   1. No internet connection');
            console.error('   2. Firewall or proxy blocking the connection');
            console.error('   3. DNS resolution issues');
            console.error('   4. Google API servers unreachable');
            console.error('\n   Solutions:');
            console.error('   - Check your internet connection');
            console.error('   - Check firewall/proxy settings');
            console.error('   - Try using a VPN if in a restricted network');
        } else if (error?.message?.includes('API_KEY') || error?.message?.includes('401')) {
            console.error('\n🔍 Diagnosis: Invalid API Key');
            console.error('   Solutions:');
            console.error('   1. Get a new API key from: https://aistudio.google.com/app/apikey');
            console.error('   2. Set it as environment variable: GEMINI_API_KEY=your_key_here');
            console.error('   3. Or update it in src/engines/AIEngine.ts');
        } else if (error?.message?.includes('quota') || error?.message?.includes('429')) {
            console.error('\n🔍 Diagnosis: API Quota Exceeded');
            console.error('   Solutions:');
            console.error('   - Wait for quota to reset');
            console.error('   - Upgrade your API plan');
            console.error('   - Use a different API key');
        }
        
        console.error('\n');
        return false;
    }
}

// Run the test
testConnection().then(success => {
    process.exit(success ? 0 : 1);
});

