import { Platform } from "./platform.js";

/**
 * PlatformManager
 * All coordinates are in world space.
 * Gaps and platform sizes are derived from the effective visible world
 */
export class PlatformManager {
  /**
   * @param {number} canvasWidth
   * @param {number} canvasHeight
   * @param {import('./camera.js').Camera} camera
   */
  constructor(canvasWidth, canvasHeight, camera) {
    this.canvasWidth  = canvasWidth;
    this.canvasHeight = canvasHeight;

    // Effective world dimensions (what the player actually sees)
    const worldW = canvasWidth  / camera.scale;
    const worldH = canvasHeight / camera.scale;

    const platW  = Math.round(worldW * 0.18);  // ~18% of visible width
    const minGapX = Math.round(worldW * 0.22); // min jump reaches this
    const maxGapX = Math.round(worldW * 0.40); // max jump overshoots this
    const gapY    = Math.round(worldH * 0.15); // vertical variance ~15% of height

    this.config = {
      platformWidth  : platW,
      platformHeight : 16,
      minGapX,
      maxGapX,
      minGapY        : -gapY,
      maxGapY        :  gapY,
      floorY         : Math.round(worldH * 0.82),
      minY           : Math.round(worldH * 0.12),
    };

    /** @type {Platform[]} */
    this.platforms = [];
    this._spawnInitial();
  }

  _spawnInitial() {
    const { floorY, platformWidth, platformHeight } = this.config;
    // Wide starting platform
    this.platforms.push(new Platform(80, floorY, Math.round(platformWidth * 1.5), platformHeight));
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
    const x    = last.right + gapX;
    const y    = Math.max(minY, Math.min(floorY, last.worldY + gapY));
    this.platforms.push(new Platform(x, y, platformWidth, platformHeight));
  }

  /**
   * Prune platforms behind camera and spawn ahead.
   * @param {import('./camera.js').Camera} camera
   */
  update(camera) {
    this.platforms = this.platforms.filter(p => p.right > camera.x - 200);
    const visibleWorldWidth = this.canvasWidth / camera.scale;
    while (this._last().worldX < camera.x + visibleWorldWidth + 600) {
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