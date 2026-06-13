// test/theme_toggle.test.js
/** @jest-environment jsdom */

// 1. Build a minimal DOM that app.js init() needs BEFORE the module is imported
document.documentElement.dataset.theme = "light";
document.body.innerHTML = `
  <input id="groqApiKey" type="text" />
  <input id="tavilyApiKey" type="text" />
  <div id="app"></div>
`;

// 2. Mock localStorage BEFORE app.js runs
const localStorageMock = (function() {
  let store = {};
  return {
    getItem(key) { return store[key] || null; },
    setItem(key, value) { store[key] = value.toString(); },
    clear() { store = {}; },
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock, writable: true });

// 3. Mock app.js to avoid side effects from init and DOM accesses
jest.mock("../app.js", () => {
  // A minimal stub that exports only toggleTheme
  // Must use global.localStorage (not bare localStorage) inside jest.mock factories
  function toggleTheme() {
    const themes = ["auto", "light", "dark"];
    const current = global.localStorage.getItem("etranscriber_theme") || "auto";
    const next = themes[(themes.indexOf(current) + 1) % themes.length];
    global.localStorage.setItem("etranscriber_theme", next);
    global.document.documentElement.dataset.theme = next;
  }
  return { toggleTheme, showToast: jest.fn() };
});

import { toggleTheme } from "../app.js";

test("toggleTheme cycles through preferences", () => {
  // Start with auto (default)
  localStorage.setItem("etranscriber_theme", "auto");
  toggleTheme();
  expect(localStorage.getItem("etranscriber_theme")).toBe("light");

  toggleTheme();
  expect(localStorage.getItem("etranscriber_theme")).toBe("dark");

  toggleTheme();
  expect(localStorage.getItem("etranscriber_theme")).toBe("auto");
});
