// test/theme_toggle.test.js
/** @jest-environment jsdom */
import { toggleTheme } from "../app.js";

document.documentElement.dataset.theme = "light";

// Mock localStorage
const localStorageMock = (function() {
  let store = {};
  return {
    getItem(key) { return store[key] || null; },
    setItem(key, value) { store[key] = value.toString(); },
    clear() { store = {}; },
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Mock showToast to avoid side effects
jest.mock("../app.js", () => {
  const original = jest.requireActual("../app.js");
  return {
    ...original,
    showToast: jest.fn(),
  };
});

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
