// Simple test that doesn't require electron module
console.log('Simple test running...');
console.log('Process type:', process.type);
console.log('Process pid:', process.pid);
console.log('Process platform:', process.platform);

// Just check if electron module is needed at all
// In Electron main process, some globals are available:
console.log('__dirname:', __dirname);
console.log('__filename:', __filename);
