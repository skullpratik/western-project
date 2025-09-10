// EMERGENCY CLEANUP - Run this in browser console

console.log('=== DEBUGGING LOCALSTORAGE ===');
console.log('customModels:', localStorage.getItem('customModels'));
console.log('selectedModel:', localStorage.getItem('selectedModel'));

// Clear everything related to custom models
localStorage.removeItem('customModels');
localStorage.removeItem('selectedModel');

// Set safe defaults
localStorage.setItem('selectedModel', 'Undercounter');
localStorage.setItem('customModels', '{}');

console.log('=== AFTER CLEANUP ===');
console.log('customModels:', localStorage.getItem('customModels'));
console.log('selectedModel:', localStorage.getItem('selectedModel'));

// Force reload
window.location.reload();
