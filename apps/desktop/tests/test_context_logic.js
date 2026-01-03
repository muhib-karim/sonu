
const assert = require('assert');
const proxyquire = require('proxyquire').noCallThru();

// Mock active-window
const activeWindowMock = {
    initialize: () => {},
    getActiveWindow: () => ({}) // Default
};

// Mock console to suppress output
const consoleMock = {
    log: () => {},
    error: () => {}
};

// Import context_manager with mocks
const contextManager = proxyquire('../../src/context_manager.js', {
    '@paymoapp/active-window': activeWindowMock
});

// Helper to test logic
function testAnalyzeContext() {
    console.log('Testing analyzeContext logic...');
    
    // Test Coding category
    const codingWindow = { application: 'Code', title: 'index.js - VS Code', pid: 123 };
    let context = contextManager.analyzeContext(codingWindow);
    assert.strictEqual(context.category, 'coding', 'Should detect VS Code as coding');
    
    // Test Chat category
    const chatWindow = { application: 'Slack', title: 'General - Slack', pid: 456 };
    context = contextManager.analyzeContext(chatWindow);
    assert.strictEqual(context.category, 'chat', 'Should detect Slack as chat');
    
    // Test Browser category
    const browserWindow = { application: 'Google Chrome', title: 'New Tab', pid: 789 };
    context = contextManager.analyzeContext(browserWindow);
    assert.strictEqual(context.category, 'browser', 'Should detect Chrome as browser');
    
    // Test Email category
    const emailWindow = { application: 'Outlook', title: 'Inbox', pid: 101 };
    context = contextManager.analyzeContext(emailWindow);
    assert.strictEqual(context.category, 'email', 'Should detect Outlook as email');
    
    // Test Fallback
    const unknownWindow = { application: 'RandomApp', title: 'Something', pid: 999 };
    context = contextManager.analyzeContext(unknownWindow);
    assert.strictEqual(context.category, 'general', 'Should fallback to general');
    
    console.log('✓ All context analysis tests passed');
}

// Run tests
try {
    testAnalyzeContext();
} catch (e) {
    console.error('Test Failed:', e);
    process.exit(1);
}
