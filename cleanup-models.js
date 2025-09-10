// Run this in browser console to clean up broken models
console.log('Current customModels:', localStorage.getItem('customModels'));

const customModels = JSON.parse(localStorage.getItem('customModels') || '{}');
const cleanModels = {};

Object.entries(customModels).forEach(([name, config]) => {
  // Keep models that don't have the broken file
  if (!config.path || !config.path.includes('modelFile-1757494491214-218965798.glb')) {
    cleanModels[name] = config;
  } else {
    console.log(`Removing broken model: ${name}`);
  }
});

localStorage.setItem('customModels', JSON.stringify(cleanModels));
console.log('Cleaned customModels:', localStorage.getItem('customModels'));

// Also clear selected model if it was the broken one
const selectedModel = localStorage.getItem('selectedModel');
if (selectedModel === 'NEW') {
  localStorage.setItem('selectedModel', 'Undercounter');
  console.log('Reset selectedModel to Undercounter');
}

console.log('Cleanup complete! Refresh the page.');
