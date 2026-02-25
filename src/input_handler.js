/**
 * InputHandler
 * Centralizes all input sources.
 */
export class InputHandler {
  constructor() {
    this._keys         = new Set();
    this._justPressed  = new Set();
    this._justReleased = new Set();

    window.addEventListener("keydown", (e) => {
      if (!this._keys.has(e.code)) this._justPressed.add(e.code);
      this._keys.add(e.code);
    });

    window.addEventListener("keyup", (e) => {
      this._keys.delete(e.code);
      this._justReleased.add(e.code);
    });

    // --- Touch ---
    // Any finger touching the screen = hold Space
    // Prevents default to avoid scroll/zoom interference
    window.addEventListener("touchstart", (e) => {
      e.preventDefault();
      this._justPressed.add("Space");
      this._keys.add("Space");
    }, { passive: false });

    window.addEventListener("touchend", (e) => {
      e.preventDefault();
      // Only release when all fingers are lifted
      if (e.touches.length === 0) {
        this._keys.delete("Space");
        this._justReleased.add("Space");
      }
    }, { passive: false });

    window.addEventListener("touchcancel", (e) => {
      this._keys.delete("Space");
      this._justReleased.add("Space");
    });
  }

  // --- Public trigger API (used by CameraInput) ------------------------------
  /** Simulate a key press — safe to call even if already pressed */
  triggerPress(code) {
    if (!this._keys.has(code)) this._justPressed.add(code);
    this._keys.add(code);
  }

  /** Simulate a key release */
  triggerRelease(code) {
    if (this._keys.has(code)) {
      this._keys.delete(code);
      this._justReleased.add(code);
    }
  }

  /** True only on the first frame the key goes down */
  isJustPressed(code)  { return this._justPressed.has(code); }

  /** True only on the first frame the key comes up */
  isJustReleased(code) { return this._justReleased.has(code); }

  /** True every frame the key is held */
  isHeld(code)         { return this._keys.has(code); }

  /** Call at the END of every game tick */
  flush() {
    this._justPressed.clear();
    this._justReleased.clear();
  }
}