/**
 * Tests for AutoSaveManager
 * Unit tests for auto-save functionality, debouncing, state recovery,
 * and localStorage management.
 *
 * Requirements: 11
 */

const AutoSaveManager = require('./auto-save-manager');

// ---------------------------------------------------------------------------
// localStorage mock (Node/Jest environment does not have localStorage)
// ---------------------------------------------------------------------------

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => (key in store ? store[key] : null)),
    setItem: jest.fn((key, value) => { store[key] = String(value); }),
    removeItem: jest.fn((key) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: jest.fn((index) => Object.keys(store)[index] || null),
    _getStore: () => store
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeManager(overrides = {}) {
  return new AutoSaveManager({
    storageKey: 'test_auto_save',
    debounceDelay: 100,
    ...overrides
  });
}

function storedState(key = 'test_auto_save') {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AutoSaveManager', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // =========================================================================
  // Constructor
  // =========================================================================

  describe('constructor', () => {
    test('should create instance with required storageKey', () => {
      const manager = makeManager();
      expect(manager).toBeInstanceOf(AutoSaveManager);
      expect(manager.storageKey).toBe('test_auto_save');
    });

    test('should use default debounceDelay of 500ms when not specified', () => {
      const manager = new AutoSaveManager({ storageKey: 'key' });
      expect(manager.debounceDelay).toBe(500);
    });

    test('should use provided debounceDelay', () => {
      const manager = makeManager({ debounceDelay: 200 });
      expect(manager.debounceDelay).toBe(200);
    });

    test('should throw if storageKey is not provided', () => {
      expect(() => new AutoSaveManager({})).toThrow();
    });
  });

  // =========================================================================
  // save() – debounced writes
  // =========================================================================

  describe('save()', () => {
    test('should not write to localStorage immediately', () => {
      const manager = makeManager();
      manager.save({ q1: true });

      expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    test('should write to localStorage after debounce delay', () => {
      const manager = makeManager({ debounceDelay: 100 });
      manager.save({ q1: true });

      jest.advanceTimersByTime(100);

      expect(localStorage.setItem).toHaveBeenCalledTimes(1);
      const state = storedState();
      expect(state).not.toBeNull();
      expect(state.data).toEqual({ q1: true });
    });

    test('should debounce multiple rapid calls into a single write', () => {
      const manager = makeManager({ debounceDelay: 100 });

      manager.save({ q1: 'a' });
      manager.save({ q1: 'ab' });
      manager.save({ q1: 'abc' });

      jest.advanceTimersByTime(100);

      expect(localStorage.setItem).toHaveBeenCalledTimes(1);
      const state = storedState();
      expect(state.data).toEqual({ q1: 'abc' });
    });

    test('should reset debounce timer on each call', () => {
      const manager = makeManager({ debounceDelay: 100 });

      manager.save({ q1: 'first' });
      jest.advanceTimersByTime(50); // halfway through

      manager.save({ q1: 'second' }); // resets timer
      jest.advanceTimersByTime(50); // only 50ms since last call

      // Should NOT have written yet
      expect(localStorage.setItem).not.toHaveBeenCalled();

      jest.advanceTimersByTime(50); // now 100ms since last call
      expect(localStorage.setItem).toHaveBeenCalledTimes(1);
      expect(storedState().data).toEqual({ q1: 'second' });
    });

    test('should persist timestamp alongside data', () => {
      const manager = makeManager({ debounceDelay: 100 });
      const before = Date.now();

      manager.save({ q1: true });
      jest.advanceTimersByTime(100);

      const state = storedState();
      expect(state.timestamp).toBeGreaterThanOrEqual(before);
      expect(state.timestamp).toBeLessThanOrEqual(Date.now());
    });

    test('should mark hasPending() as true before delay fires', () => {
      const manager = makeManager({ debounceDelay: 100 });
      manager.save({ q1: true });

      expect(manager.hasPending()).toBe(true);

      jest.advanceTimersByTime(100);
      expect(manager.hasPending()).toBe(false);
    });
  });

  // =========================================================================
  // flush() – immediate save
  // =========================================================================

  describe('flush()', () => {
    test('should write to localStorage immediately', () => {
      const manager = makeManager({ debounceDelay: 5000 });
      const result = manager.flush({ q1: true });

      expect(result).toBe(true);
      expect(localStorage.setItem).toHaveBeenCalledTimes(1);
      expect(storedState().data).toEqual({ q1: true });
    });

    test('should cancel pending debounced save', () => {
      const manager = makeManager({ debounceDelay: 100 });

      manager.save({ q1: 'debounced' });
      manager.flush({ q1: 'immediate' });

      // Advance past debounce delay – should NOT trigger another write
      jest.advanceTimersByTime(200);

      expect(localStorage.setItem).toHaveBeenCalledTimes(1);
      expect(storedState().data).toEqual({ q1: 'immediate' });
    });

    test('should return true on success', () => {
      const manager = makeManager();
      expect(manager.flush({ x: 1 })).toBe(true);
    });

    test('should return false when localStorage throws', () => {
      const manager = makeManager();
      localStorage.setItem.mockImplementationOnce(() => {
        const err = new Error('Storage full');
        err.name = 'QuotaExceededError';
        throw err;
      });
      // After quota error, cleanup removes the key, then retry also fails
      localStorage.setItem.mockImplementationOnce(() => {
        const err = new Error('Storage full');
        err.name = 'QuotaExceededError';
        throw err;
      });

      const result = manager.flush({ x: 1 });
      expect(result).toBe(false);
    });
  });

  // =========================================================================
  // load()
  // =========================================================================

  describe('load()', () => {
    test('should return null when nothing is stored', () => {
      const manager = makeManager();
      expect(manager.load()).toBeNull();
    });

    test('should return stored state object', () => {
      const manager = makeManager();
      manager.flush({ q1: 'hello' });

      const loaded = manager.load();
      expect(loaded).not.toBeNull();
      expect(loaded.data).toEqual({ q1: 'hello' });
    });

    test('should return null on JSON parse error', () => {
      localStorage.setItem('test_auto_save', 'not-valid-json{{{');
      const manager = makeManager();

      expect(manager.load()).toBeNull();
    });

    test('should return null when key does not exist', () => {
      const manager = makeManager({ storageKey: 'nonexistent_key' });
      expect(manager.load()).toBeNull();
    });
  });

  // =========================================================================
  // clear()
  // =========================================================================

  describe('clear()', () => {
    test('should remove stored state', () => {
      const manager = makeManager();
      manager.flush({ q1: true });

      manager.clear();

      expect(localStorage.getItem('test_auto_save')).toBeNull();
    });

    test('should return true on success', () => {
      const manager = makeManager();
      expect(manager.clear()).toBe(true);
    });

    test('should not throw when nothing is stored', () => {
      const manager = makeManager();
      expect(() => manager.clear()).not.toThrow();
    });
  });

  // =========================================================================
  // recover() – validation and age check
  // =========================================================================

  describe('recover()', () => {
    test('should return null when nothing is stored', () => {
      const manager = makeManager();
      expect(manager.recover()).toBeNull();
    });

    test('should return valid state saved recently', () => {
      const manager = makeManager();
      manager.flush({ q1: true, q2: 'text' });

      const recovered = manager.recover();
      expect(recovered).not.toBeNull();
      expect(recovered.data).toEqual({ q1: true, q2: 'text' });
    });

    test('should return null for state older than 24 hours', () => {
      const manager = makeManager();
      const oldState = {
        data: { q1: true },
        timestamp: Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
      };
      localStorage.setItem('test_auto_save', JSON.stringify(oldState));

      expect(manager.recover()).toBeNull();
    });

    test('should return state that is exactly at the 24h boundary (not expired)', () => {
      const manager = makeManager();
      const borderState = {
        data: { q1: false },
        timestamp: Date.now() - (23 * 60 * 60 * 1000) // 23 hours ago
      };
      localStorage.setItem('test_auto_save', JSON.stringify(borderState));

      const recovered = manager.recover();
      expect(recovered).not.toBeNull();
      expect(recovered.data).toEqual({ q1: false });
    });

    test('should return null for state with no data property', () => {
      const manager = makeManager();
      localStorage.setItem('test_auto_save', JSON.stringify({ timestamp: Date.now() }));

      expect(manager.recover()).toBeNull();
    });

    test('should return null for null stored value', () => {
      const manager = makeManager();
      localStorage.setItem('test_auto_save', JSON.stringify(null));

      expect(manager.recover()).toBeNull();
    });

    test('should return null for corrupted JSON', () => {
      localStorage.setItem('test_auto_save', 'corrupted{{');
      const manager = makeManager();

      expect(manager.recover()).toBeNull();
    });
  });

  // =========================================================================
  // cancelPending() / hasPending()
  // =========================================================================

  describe('cancelPending()', () => {
    test('should cancel a pending debounced save', () => {
      const manager = makeManager({ debounceDelay: 100 });
      manager.save({ q1: true });

      expect(manager.hasPending()).toBe(true);
      manager.cancelPending();
      expect(manager.hasPending()).toBe(false);

      jest.advanceTimersByTime(200);
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    test('should not throw when there is no pending save', () => {
      const manager = makeManager();
      expect(() => manager.cancelPending()).not.toThrow();
    });
  });

  // =========================================================================
  // QuotaExceededError handling
  // =========================================================================

  describe('QuotaExceededError handling', () => {
    test('should attempt cleanup and retry on quota exceeded', () => {
      const manager = makeManager();

      // First setItem throws QuotaExceededError, second succeeds
      localStorage.setItem
        .mockImplementationOnce(() => {
          const err = new Error('Quota exceeded');
          err.name = 'QuotaExceededError';
          throw err;
        });
      // removeItem (cleanup) and second setItem use default mock (no throw)

      const result = manager.flush({ q1: true });
      expect(result).toBe(true);
    });

    test('should return false if retry after cleanup also fails', () => {
      const manager = makeManager();

      localStorage.setItem
        .mockImplementationOnce(() => {
          const err = new Error('Quota exceeded');
          err.name = 'QuotaExceededError';
          throw err;
        })
        .mockImplementationOnce(() => {
          const err = new Error('Quota exceeded');
          err.name = 'QuotaExceededError';
          throw err;
        });

      const result = manager.flush({ q1: true });
      expect(result).toBe(false);
    });
  });

  // =========================================================================
  // State persistence across simulated page reload
  // =========================================================================

  describe('State persistence across page reload', () => {
    test('should recover responses after simulated page reload', () => {
      // Simulate first session: save responses
      const session1 = makeManager({ storageKey: 'reload_test', debounceDelay: 0 });
      const responses = { q1: true, q2: 'some text', q3: 42 };
      session1.flush(responses);

      // Simulate page reload: create new manager with same key
      const session2 = makeManager({ storageKey: 'reload_test' });
      const recovered = session2.recover();

      expect(recovered).not.toBeNull();
      expect(recovered.data).toEqual(responses);
    });

    test('should clear state after successful submission', () => {
      const manager = makeManager({ storageKey: 'submit_test' });
      manager.flush({ q1: true });

      // Simulate successful submission
      manager.clear();

      expect(manager.recover()).toBeNull();
    });
  });

  // =========================================================================
  // Edge cases
  // =========================================================================

  describe('Edge cases', () => {
    test('should handle saving empty object', () => {
      const manager = makeManager();
      const result = manager.flush({});

      expect(result).toBe(true);
      expect(storedState('test_auto_save').data).toEqual({});
    });

    test('should handle saving null data', () => {
      const manager = makeManager();
      const result = manager.flush(null);

      expect(result).toBe(true);
      expect(storedState('test_auto_save').data).toBeNull();
    });

    test('should handle saving nested objects', () => {
      const manager = makeManager();
      const data = { responses: { q1: true }, metadata: { specialty: 'endocrinologia' } };
      manager.flush(data);

      const recovered = manager.recover();
      expect(recovered.data).toEqual(data);
    });

    test('should use different keys independently', () => {
      const manager1 = makeManager({ storageKey: 'key_a' });
      const manager2 = makeManager({ storageKey: 'key_b' });

      manager1.flush({ source: 'a' });
      manager2.flush({ source: 'b' });

      expect(manager1.recover().data).toEqual({ source: 'a' });
      expect(manager2.recover().data).toEqual({ source: 'b' });
    });
  });
});
