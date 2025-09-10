// DEBUGGING TOOL - Paste this in browser console to see all object names in your model

console.log('=== MODEL DEBUGGING ===');

// Wait for the Experience component to load
setTimeout(() => {
  // Find the Experience component in React DevTools
  const canvas = document.querySelector('canvas');
  if (!canvas) {
    console.log('❌ Canvas not found');
    return;
  }

  // Look for React fiber with Experience component
  const findExperience = (fiber) => {
    if (!fiber) return null;
    if (fiber.type?.name === 'Experience') return fiber;
    if (fiber.child) {
      const result = findExperience(fiber.child);
      if (result) return result;
    }
    if (fiber.sibling) return findExperience(fiber.sibling);
    return null;
  };

  const reactFiber = canvas._reactInternalFiber || canvas._reactInternalInstance;
  if (reactFiber) {
    const experience = findExperience(reactFiber);
    if (experience) {
      const allObjects = experience.memoizedProps?.allObjects || {};
      console.log('🎯 Found Experience component!');
      console.log('📦 All objects in scene:', Object.keys(allObjects.current || {}));
      
      // Show interactive parts from config
      const config = experience.memoizedProps?.config;
      if (config?.interactionGroups) {
        console.log('⚙️ Interaction Groups:');
        config.interactionGroups.forEach((group, i) => {
          console.log(`  Group ${i}: ${group.type} - ${group.label}`);
          group.parts?.forEach(part => {
            const exists = allObjects.current?.[part.name] ? '✅' : '❌';
            console.log(`    ${exists} ${part.name}`);
          });
        });
      }
    }
  } else {
    console.log('❌ React fiber not found');
  }
}, 2000);

console.log('⏳ Waiting 2 seconds for model to load...');
