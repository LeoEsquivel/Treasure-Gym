import { config } from "./config.js";
import { SoundManager } from "./sound_manager.js";

/**
 * Player
 * World-space position (worldX, worldY).
 * Jump is parabolic: hold to charge, release to launch.
 * Charge time controls both horizontal (vx) and vertical (vy) velocity. gravity = px/s²
 */
export class Player {
  /**
   * @param {number} worldX
   * @param {number} worldY
   */
  constructor(worldX, worldY) {
    this.worldX = worldX;
    this.worldY = worldY;
    this.width  = 32;
    this.height = 48;
    this._sounds  = new SoundManager();

    this.vx = 0;
    this.vy = 0;

    this.isOnGround = true;
    this.isDead     = false;

    // Charge state
    this.isCharging = false;
    this.chargeTime = 0;

    // Physics
    this.gravity   = 1400; // px/s²
  }

  // --- Accessors (world-space edges) ----------------------------------------

  get bottom() { return this.worldY + this.height; }
  get top()    { return this.worldY; }
  get left()   { return this.worldX; }
  get right()  { return this.worldX + this.width; }

  // --- Charge & Jump ---------------------------------------------------------

  /** Begin charging. Call when input is first pressed. */
  startCharge() {
    if (!this.isOnGround || this.isDead) return;
    this.isCharging = true;
    this.chargeTime = 0;
  }

  /**
   * Release: launch with power proportional to chargeTime.
   * @returns {boolean} whether jump was performed
   */
  releaseJump() {
    if (!this.isCharging || !this.isOnGround || this.isDead) return false;
    this.isCharging = false;

    const maxCharge = config.get("maxCharge");
    const t = Math.min(this.chargeTime, maxCharge) / maxCharge; // 0..1
    
    this.vx = config.get("minVx") + t * (config.get("maxVx") - config.get("minVx"));
    this.vy = config.get("minVy") + t * (config.get("maxVy") - config.get("minVy"));
    this.isOnGround = false;
    return true;
  }

  /** Charge percentage 0..1 for the UI */
  get chargePct() {
    return Math.min(this.chargeTime / config.get("maxCharge"), 1);
  }

  // --- Update ----------------------------------------------------------------

  /**
   * @param {number} dt
   * @param {import('./platform.js').Platform[]} platforms
   * @param {number} worldHeight  Canvas height converted to world space
   */
  update(dt, platforms, worldHeight) {
    if (this.isDead) return;

    if (this.isCharging) this.chargeTime += dt;

    if (!this.isOnGround) {
      // Save position BEFORE moving for sweep collision
      const prevBottom = this.bottom;

      this.vy     += config.get("gravity") * dt;
      this.worldX += this.vx * dt;
      this.worldY += this.vy * dt;

      // Only check collision when falling downward
      if (this.vy >= 0) {
        for (const platform of platforms) {
          const horizontalOverlap =
            this.right > platform.left &&
            this.left  < platform.right;

          // Did we cross the top surface this frame?
          const crossedSurface =
            prevBottom <= platform.top &&
            this.bottom >= platform.top;

          if (horizontalOverlap && crossedSurface) {
            // Snap exactly to surface — no penetration
            this.worldY     = platform.top - this.height;
            this.vy         = 0;
            this.vx         = 0;
            this.isOnGround = true;
            this._sounds.point();
            break;
          }
        }
      }
    }

    // Fell out of the world
    if (this.worldY > worldHeight + 100) {
      this.isDead = true;
      this._sounds.die();
    }
  }

  // --- Draw ------------------------------------------------------------------

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('./camera.js').Camera} camera
   */
  draw(ctx, camera) {
    const sx = camera.toScreenX(this.worldX);
    const sy = camera.toScreenY(this.worldY);

    ctx.fillStyle = this.isDead ? "#f44" : "#5cf";
    ctx.fillRect(sx, sy, this.width * camera.scale, this.height * camera.scale);

    // Charge bar (above player, only while charging)
    if (this.isCharging) {
      const bw   = this.width * camera.scale;
      const bh   = 6;
      const bx   = sx;
      const by   = sy - 12;
      const fill = bw * this.chargePct;

      ctx.fillStyle = "#333";
      ctx.fillRect(bx, by, bw, bh);

      // Color shifts green -> yellow -> red with charge
      const r = Math.round(255 * this.chargePct);
      const g = Math.round(255 * (1 - this.chargePct));
      ctx.fillStyle = `rgb(${r},${g},0)`;
      ctx.fillRect(bx, by, fill, bh);
    }
  }
}