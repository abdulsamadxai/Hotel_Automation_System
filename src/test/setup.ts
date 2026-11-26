import '@testing-library/jest-dom/vitest';

// jsdom does not implement window.matchMedia, which Radix UI components
// (and the use-mobile hook) rely on. Provide a minimal stub so components
// that query media features can render in tests.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
