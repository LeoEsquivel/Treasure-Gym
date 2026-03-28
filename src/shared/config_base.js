/**
 * ConfigBase
 * Reusable config mechanism: localStorage persistence, onChange subscriptions.
 * Each game extends this with its own DEFAULTS and STORAGE_KEY.
 *
 * Usage:
 *   import { ConfigBase } from "../../shared/ConfigBase.js";
 *   const DEFAULTS = { gravity: 1400, ... };
 *   class GameConfig extends ConfigBase {
 *     constructor() { super("my_game_config", DEFAULTS); }
 *   }
 *   export const config = new GameConfig();
 */
export class ConfigBase {
  /**
   * @param {string} storageKey   localStorage key for this game
   * @param {object} defaults     Default values
   */
  constructor(storageKey, defaults) {
    this._storageKey = storageKey;
    this._defaults   = { ...defaults };
    this._data       = this._load();
    this._listeners  = [];
  }

  // Persistence 

  _load() {
    try {
      const saved = localStorage.getItem(this._storageKey);
      if (saved) {
        // Merge over defaults so new keys always have a value
        return { ...this._defaults, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn("Config: could not read localStorage", e);
    }
    return { ...this._defaults };
  }

  _save() {
    try {
      localStorage.setItem(this._storageKey, JSON.stringify(this._data));
    } catch (e) {
      console.warn("Config: could not write localStorage", e);
    }
  }

  // Public API 

  /** Get a single value */
  get(key) {
    return this._data[key];
  }

  /** Get the full config object (readonly copy) */
  all() {
    return { ...this._data };
  }

  /**
   * Set a value, persist and notify listeners.
   * @param {string}  key
   * @param {*}       value
   * @param {boolean} silent  Skip notifying listeners (used for batch updates)
   */
  set(key, value, silent = false) {
    this._data[key] = value;
    this._save();
    if (!silent) this._notify(key, value);
  }

  /** Set multiple values at once and notify once */
  setBatch(obj) {
    for (const [k, v] of Object.entries(obj)) {
      this.set(k, v, true);
    }
    this._notify(null, null);
  }

  /** Reset all values to defaults */
  reset() {
    this._data = { ...this._defaults };
    this._save();
    this._notify(null, null);
  }

  /**
   * Subscribe to config changes.
   * @param {function(key: string|null, value: *): void} fn
   * @returns {function} unsubscribe function
   */
  onChange(fn) {
    this._listeners.push(fn);
    return () => {
      this._listeners = this._listeners.filter(l => l !== fn);
    };
  }

  _notify(key, value) {
    for (const fn of this._listeners) fn(key, value);
  }
}