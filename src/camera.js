/**
 * Camera
 * Follows the player horizontally. All world objects use worldX;
 * call toScreenX() before drawing.
 */
export class Camera {
  /**
   * @param {number} canvasWidth
   * @param {number} followOffsetX  Screen X where the player is pinned (default: 220)
   */
  constructor(canvasWidth, followOffsetX = 220) {
    this.x             = 0;   // world X of the LEFT edge of the screen
    this.canvasWidth   = canvasWidth;
    this.followOffsetX = followOffsetX;
  }

  /** Update camera to keep worldX at the follow offset */
  follow(worldX) {
    this.x = worldX - this.followOffsetX;
  }

  /** Convert a world X coordinate to a screen X coordinate */
  toScreenX(worldX) {
    return worldX - this.x;
  }

  /** Y is untouched (no vertical camera movement for now) */
  toScreenY(worldY) {
    return worldY;
  }
}