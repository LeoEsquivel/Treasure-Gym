/**
 * Camera
 * Follows the player horizontally with a configurable zoom scale.
 * Scale is derived from canvas width so narrow/portrait screens zoom out automatically.
 */
export class Camera {
  /**
   * @param {number} canvasWidth
   * @param {number} canvasHeight
   * @param {number} referenceWidth  The design width the game was built for
   */
  constructor(canvasWidth, canvasHeight, referenceWidth = 800) {
    this.canvasWidth  = canvasWidth;
    this.canvasHeight = canvasHeight;

    // scale < 1 = zoomed out (mobile portrait), scale > 1 = zoomed in (wide screen)
    this.scale = canvasWidth / referenceWidth;

    // Screen X where the player is pinned (before scale)
    this.followOffsetX = canvasWidth * 0.3;

    this.x = 0; // world X of the left edge of the screen
    this.y = 0;
  }

  /** Keep player's world X at followOffsetX on screen */
  follow(worldX) {
    this.x = worldX - (this.followOffsetX / this.scale);
  }

  /** World -> screen X */
  toScreenX(worldX) {
    return (worldX - this.x) * this.scale;
  }

  /** World -> screen Y */
  toScreenY(worldY) {
    return worldY * this.scale;
  }
}