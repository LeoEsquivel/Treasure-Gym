/**
 * InputHandler
 * Centralizes all input sources. Later we'll add touch and camera triggers here.
 */
export class InputHandler {
  constructor() {
    this._keys        = new Set();
    this._justPressed = new Set();
    this._justReleased = new Set();

    window.addEventListener("keydown", (e) => {
      if (!this._keys.has(e.code)) {
        this._justPressed.add(e.code);
      }
      this._keys.add(e.code);
    });

    window.addEventListener("keyup", (e) => {
      this._keys.delete(e.code);
      this._justReleased.add(e.code);
    });
  }

  /** True only on the first frame the key goes down */
  isJustPressed(code)   { return this._justPressed.has(code); }

  /** True only on the first frame the key comes up */
  isJustReleased(code)  { return this._justReleased.has(code); }

  /** True every frame the key is held */
  isHeld(code)          { return this._keys.has(code); }

  /** Call at the END of every game tick */
  flush() {
    this._justPressed.clear();
    this._justReleased.clear();
  }
}