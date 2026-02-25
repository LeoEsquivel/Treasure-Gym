/**
 * Player
 * World-space position (worldX, worldY).
 * Jump is parabolic: hold to charge, release to launch.
 * Charge time controls both horizontal (vx) and vertical (vy) velocity.
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

    this.vx = 0;
    this.vy = 0;

    this.isOnGround = false;
    this.isDead     = false;

    // Charge state
    this.isCharging = false;
    this.chargeTime = 0;

    // Physics
    this.gravity   = 1400; // px/s²

    // Jump range calibrated so:
    //   min charge reaches ~minGapX (doesn't fall short on min gap)
    //   max charge overshoots ~maxGapX (falls into the void if over-charged)
    this.minVx     = 260;
    this.maxVx     = 700;
    this.minVy     = -500;
    this.maxVy     = -880;
    this.maxCharge = 1.5; // seconds for full charge
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

    const t = Math.min(this.chargeTime, this.maxCharge) / this.maxCharge; // 0..1
    this.vx = this.minVx + t * (this.maxVx - this.minVx);
    this.vy = this.minVy + t * (this.maxVy - this.minVy);
    this.isOnGround = false;
    return true;
  }

  /** Charge percentage 0..1 for the UI */
  get chargePct() {
    return Math.min(this.chargeTime / this.maxCharge, 1);
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

      this.vy     += this.gravity * dt;
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
            break;
          }
        }
      }
    }

    // Fell out of the world
    if (this.worldY > worldHeight + 100) {
      this.isDead = true;
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