import { Platform } from "./platform.js";

/**
 * PlatformManager
 * Generates, recycles and draws platforms in world space.
 * Camera is passed in at draw time only.
 */
export class PlatformManager {
  /**
   * @param {number} canvasWidth
   * @param {number} canvasHeight
   */
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth  = canvasWidth;
    this.canvasHeight = canvasHeight;

    this.config = {
      platformWidth  : 120,
      platformHeight : 16,
      minGapX        : 180,  // horizontal gap between platform right edges
      maxGapX        : 320,
      minGapY        : -90,  // vertical offset relative to last platform
      maxGapY        : 90,
      floorY         : canvasHeight - 80,
      minY           : 80,
    };

    /** @type {Platform[]} */
    this.platforms = [];
    this._spawnInitial();
  }

  _spawnInitial() {
    const { floorY, platformWidth, platformHeight } = this.config;
    // Wide starting platform
    this.platforms.push(new Platform(80, floorY, platformWidth * 1.5, platformHeight));
    for (let i = 0; i < 8; i++) this._spawnNext();
  }

  _last() {
    return this.platforms[this.platforms.length - 1];
  }

  _spawnNext() {
    const { platformWidth, platformHeight, minGapX, maxGapX, minGapY, maxGapY, floorY, minY } = this.config;
    const last = this._last();

    const gapX = minGapX + Math.random() * (maxGapX - minGapX);
    const gapY = minGapY + Math.random() * (maxGapY - minGapY);

    const x = last.right + gapX;
    const y = Math.max(minY, Math.min(floorY, last.worldY + gapY));

    this.platforms.push(new Platform(x, y, platformWidth, platformHeight));
  }

  /**
   * Prune off-screen platforms (behind camera) and spawn ahead.
   * @param {import('./camera.js').Camera} camera
   */
  update(camera) {
    // Remove platforms far behind the camera
    this.platforms = this.platforms.filter(p => p.right > camera.x - 200);

    // Keep platforms generated well ahead
    while (this._last().worldX < camera.x + this.canvasWidth + 600) {
      this._spawnNext();
    }
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('./camera.js').Camera} camera
   */
  draw(ctx, camera) {
    for (const p of this.platforms) {
      p.draw(ctx, camera);
    }
  }
}