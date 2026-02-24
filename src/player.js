/**
 * Player
 * World-space position (worldX, worldY).
 * Jump is parabolic: hold to charge, release to launch.
 * Charge time controls both horizontal (vx) and vertical (vy) velocity.
 */
export class Player {
  /**
   * @param {number} worldX  Starting world X
   * @param {number} worldY  Starting world Y
   */
  constructor(worldX, worldY) {
    this.worldX = worldX;
    this.worldY = worldY;
    this.width  = 32;
    this.height = 48;

    this.vx = 0;
    this.vy = 0;

    this.isOnGround  = false;
    this.isDead      = false;

    // Charge state
    this.isCharging  = false;
    this.chargeTime  = 0;   // seconds held

    // Physics config
    this.gravity     = 1400;  // px/s²

    // Jump power range (at min and max charge)
    this.minVx       = 120;
    this.maxVx       = 600;
    this.minVy       = -380;
    this.maxVy       = -750;
    this.maxCharge   = 1.5;   // seconds for full charge
  }

  // --- Accessors (world-space edges) ----------------------------------------
  get bottom() { return this.worldY + this.height; }
  get top()    { return this.worldY; }
  get left()   { return this.worldX; }
  get right()  { return this.worldX + this.width; }

  // --- Charge & Jump --------------------------------------------------------

  /** Begin charging. Call when SPACE is first pressed. */
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

    const t   = Math.min(this.chargeTime, this.maxCharge) / this.maxCharge; // 0..1
    this.vx   = this.minVx + t * (this.maxVx - this.minVx); // ej: 120 -> 600 px/s
    this.vy   = this.minVy + t * (this.maxVy - this.minVy); // ej: -380 -> -750 px/s both negative (up)
    this.isOnGround = false;
    return true;
  }

  /** Charge percentage 0..1 for the UI */
  get chargePct() {
    return Math.min(this.chargeTime / this.maxCharge, 1);
  }

  // ---- Update ------------------------------------------------------------------

  /**
   * @param {number} dt
   * @param {import('./Platform.js').Platform[]} platforms
   * @param {number} canvasHeight
   */
  update(dt, platforms, canvasHeight) {
    if (this.isDead) return;

    // Accumulate charge
    if (this.isCharging) {
      this.chargeTime += dt;
    }

    // Only apply physics when airborne
    if (!this.isOnGround) {
      this.vy       += this.gravity * dt;
      this.worldX   += this.vx * dt;
      this.worldY   += this.vy * dt;
    }

    // Platform collision (falling downward only, top surface)
    if (this.vy >= 0) {
      for (const platform of platforms) {
        if (
          this.right  > platform.left  &&
          this.left   < platform.right &&
          this.bottom >= platform.top  &&
          this.bottom <= platform.top + Math.abs(this.vy * dt) + 8
        ) {
          this.worldY     = platform.top - this.height;
          this.vy         = 0;
          this.vx         = 0;
          this.isOnGround = true;
          break;
        }
      }
    }

    // Fell off screen
    if (this.worldY > canvasHeight + 200) {
      this.isDead = true;
    }
  }

  // ---- Draw --------------------------------------------------

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('./Camera.js').Camera} camera
   */
  draw(ctx, camera) {
    const sx = camera.toScreenX(this.worldX);
    const sy = camera.toScreenY(this.worldY);

    // Body
    ctx.fillStyle = this.isDead ? "#f44" : "#5cf";
    ctx.fillRect(sx, sy, this.width, this.height);

    // Charge bar (above player, only while charging)
    if (this.isCharging) {
      const barW  = this.width;
      const barH  = 6;
      const barX  = sx;
      const barY  = sy - 12;
      const fillW = barW * this.chargePct;

      ctx.fillStyle = "#333";
      ctx.fillRect(barX, barY, barW, barH);

      // Color shifts green -> yellow -> red with charge
      const r = Math.round(255 * this.chargePct);
      const g = Math.round(255 * (1 - this.chargePct));
      ctx.fillStyle = `rgb(${r},${g},0)`;
      ctx.fillRect(barX, barY, fillW, barH);
    }
  }
}