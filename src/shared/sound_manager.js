/**
 * SoundManager
 * Loads and plays game sound effects.
 * Add new sounds here as the game grows.
 */
export class SoundManager {
  constructor() {
    this._sounds = {
      point : this._load("assets/sounds/sfx_point.wav"),
      die   : this._load("assets/sounds/sfx_die.wav"),
    };
  }

  _load(path) {
    const audio = new Audio(path);
    audio.preload = "auto";
    return audio;
  }

  /**
   * Play a sound by cloning it so overlapping calls work correctly.
   * @param {"point"|"die"} name
   */
  _play(name) {
    const src = this._sounds[name];
    if (!src) return;
    // Clone the audio node so the same sound can overlap itself if needed
    const instance = src.cloneNode();
    instance.play().catch(() => {
      // Autoplay blocked — user hasn't interacted yet, ignore silently
    });
  }

  point() { this._play("point"); }
  die()   { this._play("die");   }
}