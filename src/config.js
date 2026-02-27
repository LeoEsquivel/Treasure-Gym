/**
 * Config
 * Central configuration singleton.
 * Loads from localStorage on init, persists on every change.
 * Systems subscribe via onChange() to react when values update.
 */

const STORAGE_KEY = "pecfly_config";

const DEFAULTS = {
  // --- Camera detection ---
  thresholdClosed  : 1.0,   // ratio below this = arms closed = start charge
  thresholdOpen    : 1.8,   // ratio above this = arms open  = release jump
  cameraDeviceId   : null,  // null = default camera
  cameraOpacity    : 0.85,  // preview opacity 0..1
  modelComplexity  : 1,     // MediaPipe model: 0=fast, 1=balanced, 2=accurate

  // --- Jump physics ---
  gravity          : 1400,
  minVx            : 260,
  maxVx            : 700,
  minVy            : -500,
  maxVy            : -880,
  maxCharge        : 1.5,   // seconds for full charge

  // --- Platforms ---
  platformWidthPct : 0.18,  // platform width as % of visible world width
  minGapXPct       : 0.22,  // min horizontal gap as % of visible world width
  maxGapXPct       : 0.40,  // max horizontal gap as % of visible world width
  minGapYPct       : 0.15,  // vertical variance as % of visible world height
  referenceWidth   : 800,   // design width — controls global zoom
};

class Config {
  constructor() {
    this._data      = this._load();
    this._listeners = [];
  }

  // --- Persistence -----------------------------------------------------------
  _load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        // Merge saved values over defaults so new keys always have a value
        return { ...DEFAULTS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn("Config: could not read localStorage", e);
    }
    return { ...DEFAULTS };
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data));
    } catch (e) {
      console.warn("Config: could not write localStorage", e);
    }
  }

  // --- Public API ------------------------------------------------------------

  /** Get a single value */
  get(key) {
    return this._data[key];
  }

  /** Get the full config object (read-only copy) */
  all() {
    return { ...this._data };
  }

  /**
   * Set a value, persist it and notify listeners.
   * @param {string} key
   * @param {*}      value
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
    this._data = { ...DEFAULTS };
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

// Export singleton
export const config = new Config();