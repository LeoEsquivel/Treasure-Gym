import { InputHandler }   from "./input_handler.js";
import { Player }          from "./player.js";
import { PlatformManager } from "./platformmanager.js";
import { Camera }          from "./camera.js";

/**
 * Game
 * Wires all subsystems. Player jumps with a parabola:
 * hold SPACE to charge, release to launch. More charge = longer/higher arc.
 */
export class Game {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx    = this.canvas.getContext("2d");

    this._resize();
    window.addEventListener("resize", () => this._resize());

    // Subsystems
    this.input           = new InputHandler();
    this.camera          = new Camera(this.canvas.width);
    this.platformManager = new PlatformManager(this.canvas.width, this.canvas.height);

    // Place player on first platform
    const first = this.platformManager.platforms[0];
    first.landed = true; // starting platform doesn't score

    this.player = new Player(
      first.worldX + first.width / 2 - 16, // center on platform
      first.top - 48
    );

    this.camera.follow(this.player.worldX);

    this.score    = 0;
    this.gameOver = false;

    this._lastTime = null;
    requestAnimationFrame((t) => this._loop(t));
  }

  _resize() {
    this.canvas.width  = Math.min(window.innerWidth,  900);
    this.canvas.height = Math.min(window.innerHeight, 500);
  }

  // --- Loop -----------------------------------------------------------------

  _loop(timestamp) {
    if (this._lastTime === null) this._lastTime = timestamp;
    const dt = Math.min((timestamp - this._lastTime) / 1000, 0.05);
    this._lastTime = timestamp;

    this._update(dt);
    this._draw();
    this.input.flush();

    requestAnimationFrame((t) => this._loop(t));
  }

  // --- Update ---------------------------------------------------------------

  _update(dt) {
    if (this.gameOver) {
      if (this.input.isJustPressed("Space")) this._restart();
      return;
    }

    // Charge input
    if (this.input.isJustPressed("Space"))   this.player.startCharge();
    if (this.input.isJustReleased("Space"))  this.player.releaseJump();

    // Player physics
    this.player.update(dt, this.platformManager.platforms, this.canvas.height);

    // Camera follows player
    this.camera.follow(this.player.worldX);

    // Spawn/cull platforms relative to camera
    this.platformManager.update(this.camera);

    // Score
    this._checkScore();

    if (this.player.isDead) this.gameOver = true;
  }

  _checkScore() {
    for (const platform of this.platformManager.platforms) {
      if (!platform.landed && this._playerIsStandingOn(platform)) {
        platform.landed = true;
        this.score++;
      }
    }
  }

  _playerIsStandingOn(platform) {
    const p = this.player;
    return (
      p.right  > platform.left  &&
      p.left   < platform.right &&
      p.isOnGround              &&
      Math.abs(p.bottom - platform.top) < 4
    );
  }

  // --- Draw -----------------------------------------------------------------

  _draw() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.platformManager.draw(ctx, this.camera);
    this.player.draw(ctx, this.camera);

    // HUD
    ctx.fillStyle = "#fff";
    ctx.font = "20px monospace";
    ctx.fillText("Score: " + this.score, 16, 30);
    ctx.fillText("Hold SPACE to charge, release to jump", 16, 54);

    // Charge hint while charging
    if (this.player.isCharging) {
      const pct  = this.player.chargePct;
      const label = pct < 0.4 ? "short" : pct < 0.75 ? "medium" : "FULL POWER";
      ctx.fillStyle = "#ff0";
      ctx.font = "bold 18px monospace";
      ctx.fillText("Charging... " + label, 16, 80);
    }

    if (this.gameOver) {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.textAlign = "center";
      ctx.fillStyle = "#f44";
      ctx.font = "bold 36px monospace";
      ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = "#fff";
      ctx.font = "20px monospace";
      ctx.fillText("Score: " + this.score + "  -  SPACE to restart", canvas.width / 2, canvas.height / 2 + 20);
      ctx.textAlign = "left";
    }
  }

  // --- Restart --------------------------------------------------------------

  _restart() {
    this.platformManager = new PlatformManager(this.canvas.width, this.canvas.height);
    this.camera          = new Camera(this.canvas.width);

    const first = this.platformManager.platforms[0];
    first.landed = true;

    this.player = new Player(
      first.worldX + first.width / 2 - 16,
      first.top - 48
    );

    this.camera.follow(this.player.worldX);
    this.score    = 0;
    this.gameOver = false;
  }
}

// Boot
new Game("gameCanvas");