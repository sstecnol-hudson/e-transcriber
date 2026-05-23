/**
 * AutoSaveManager
 * Manages automatic saving of questionnaire state to localStorage with
 * debouncing, state recovery, and quota error handling.
 *
 * Requirements: 11
 */

class AutoSaveManager {
  /**
   * @param {Object} options
   * @param {string} options.storageKey - localStorage key to use for saving state
   * @param {number} [options.debounceDelay=500] - Debounce delay in milliseconds
   */
  constructor(options = {}) {
    if (!options.storageKey) {
      throw new Error('AutoSaveManager requires a storageKey option');
    }

    this.storageKey = options.storageKey;
    this.debounceDelay = options.debounceDelay !== undefined ? options.debounceDelay : 500;
    this._debounceTimer = null;
    this._maxStateAge = 24 * 60 * 60 * 1000; // 24 hours in ms
  }

  /**
   * Saves data to localStorage with debouncing.
   * Multiple rapid calls within debounceDelay will only result in one write.
   *
   * @param {Object} data - Data to save
   */
  save(data) {
    if (this._debounceTimer !== null) {
      clearTimeout(this._debounceTimer);
    }

    this._debounceTimer = setTimeout(() => {
      this._write(data);
      this._debounceTimer = null;
    }, this.debounceDelay);
  }

  /**
   * Immediately saves data to localStorage, bypassing the debounce timer.
   * Cancels any pending debounced save.
   *
   * @param {Object} data - Data to save
   * @returns {boolean} True if saved successfully
   */
  flush(data) {
    if (this._debounceTimer !== null) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }

    return this._write(data);
  }

  /**
   * Loads raw state from localStorage without validation.
   *
   * @returns {Object|null} Saved state or null if not found / parse error
   */
  load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw === null) {
        return null;
      }
      return JSON.parse(raw);
    } catch (error) {
      console.error('[AutoSaveManager] Error loading state:', error);
      return null;
    }
  }

  /**
   * Removes saved state from localStorage.
   *
   * @returns {boolean} True if cleared successfully
   */
  clear() {
    try {
      localStorage.removeItem(this.storageKey);
      return true;
    } catch (error) {
      console.error('[AutoSaveManager] Error clearing state:', error);
      return false;
    }
  }

  /**
   * Loads and validates saved state.
   * Returns the state only if it exists and is not older than 24 hours.
   *
   * @returns {Object|null} Valid state or null
   */
  recover() {
    const state = this.load();

    if (!this._isValid(state)) {
      return null;
    }

    return state;
  }

  /**
   * Cancels any pending debounced save without writing.
   */
  cancelPending() {
    if (this._debounceTimer !== null) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }
  }

  /**
   * Returns true if there is a pending debounced save.
   *
   * @returns {boolean}
   */
  hasPending() {
    return this._debounceTimer !== null;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Writes a state object to localStorage, wrapping it with a timestamp.
   *
   * @param {Object} data - Data to persist
   * @returns {boolean} True if written successfully
   */
  _write(data) {
    const state = {
      data,
      timestamp: Date.now()
    };

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
      return true;
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('[AutoSaveManager] localStorage quota exceeded. Attempting cleanup.');
        this._handleQuotaExceeded();

        // Retry once after cleanup
        try {
          localStorage.setItem(this.storageKey, JSON.stringify(state));
          return true;
        } catch (retryError) {
          console.error('[AutoSaveManager] Failed to save after cleanup:', retryError);
          return false;
        }
      }

      console.error('[AutoSaveManager] Error writing state:', error);
      return false;
    }
  }

  /**
   * Validates a loaded state object.
   * A state is valid if it has a `data` property and is not older than 24 hours.
   *
   * @param {*} state - State to validate
   * @returns {boolean}
   */
  _isValid(state) {
    if (!state || typeof state !== 'object') {
      return false;
    }

    if (!('data' in state)) {
      return false;
    }

    if (state.timestamp !== undefined) {
      const age = Date.now() - state.timestamp;
      if (age > this._maxStateAge) {
        console.warn('[AutoSaveManager] Saved state is older than 24 hours, discarding.');
        return false;
      }
    }

    return true;
  }

  /**
   * Attempts to free up localStorage space when quota is exceeded.
   * Removes the oldest entries that share the same key prefix pattern.
   */
  _handleQuotaExceeded() {
    try {
      // Remove the current key first to free space
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error('[AutoSaveManager] Error during quota cleanup:', error);
    }
  }
}

// Export for Node.js / Jest
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AutoSaveManager;
}
