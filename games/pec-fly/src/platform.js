/**
 * Platform
 * Lives in world space. Camera converts to screen coordinates for drawing.
 */
export class Platform {
  /**
   * @param {number} worldX
   * @param {number} worldY
   * @param {number} width
   * @param {number} height
   */
  constructor(worldX, worldY, width = 120, height = 16) {
    this.worldX  = worldX;
    this.worldY  = worldY;
    this.width   = width;
    this.height  = height;
    this.landed  = false; 
  }

  get top()   { return this.worldY; }
  get left()  { return this.worldX; }
  get right() { return this.worldX + this.width; }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('./camera.js').Camera} camera
   */
  draw(ctx, camera) {
    const sx = camera.toScreenX(this.worldX);
    const sy = camera.toScreenY(this.worldY);
    ctx.fillStyle = this.landed ? "#4a9" : "#fff";
    ctx.fillRect(sx, sy, this.width * camera.scale, this.height * camera.scale);
  }
}