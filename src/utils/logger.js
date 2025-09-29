// Lightweight debug logger. Enable via: set window.__APP_DEBUG__ = true or
// localStorage.setItem('debugLogs', '1') in the browser console during development.
export const DEBUG = false;

const seen = new Set();

function enabled() {
  try {
    if (typeof window !== 'undefined' && window.__APP_DEBUG__ === true) return true;
    if (typeof localStorage !== 'undefined' && localStorage.getItem('debugLogs') === '1') return true;
  } catch (e) {
    // ignore
  }
  return DEBUG;
}

export function dlog(...args) {
  if (!enabled()) return;
  console.log(...args);
}

export function dlogOnce(key, ...args) {
  if (!enabled()) return;
  if (seen.has(key)) return;
  seen.add(key);
  console.log(...args);
}

export default { dlog, dlogOnce };
