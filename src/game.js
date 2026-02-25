import { InputHandler }   from "./input_handler.js";
import { Player }          from "./player.js";
import { PlatformManager } from "./platformmanager.js";
import { Camera }          from "./camera.js";

/**
 * Game
 * Bootstraps the canvas and wires all subsystems together.
 * Hold SPACE to charge, release to jump.
 */
export class Game {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx    = this.canvas.getContext("2d");

    this._resize();
    window.addEventListener("resize", () => {
      this._resize();
      this._initSystems();
    });

    this.input = new InputHandler();
    this._initSystems();

    this._lastTime = null;
    requestAnimationFrame((t) => this._loop(t));
  }

  // --- Setup -----------------------------------------------------------------

  _resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  _initSystems() {
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.camera          = new Camera(w, h);
    this.platformManager = new PlatformManager(w, h, this.camera);

    const first = this.platformManager.platforms[0];
    first.landed = true; // starting platform doesn't score

    this.player = new Player(
      first.worldX + first.width / 2 - 16,
      first.top - 48
    );

    this.camera.follow(this.player.worldX);
    this.score    = 0;
    this.gameOver = false;
  }

  // --- Loop ------------------------------------------------------------------

  _loop(timestamp) {
    if (this._lastTime === null) this._lastTime = timestamp;
    const dt = Math.min((timestamp - this._lastTime) / 1000, 0.05);
    this._lastTime = timestamp;

    this._update(dt);
    this._draw();
    this.input.flush();

    requestAnimationFrame((t) => this._loop(t));
  }

  // --- Update ----------------------------------------------------------------

  _update(dt) {
    if (this.gameOver) {
      if (this.input.isJustPressed("Space")) this._initSystems();
      return;
    }

    if (this.input.isJustPressed("Space"))  this.player.startCharge();
    if (this.input.isJustReleased("Space")) this.player.releaseJump();

    // Death boundary must be in world space, not screen space
    const worldHeight = this.canvas.height / this.camera.scale;
    this.player.update(dt, this.platformManager.platforms, worldHeight);

    this.camera.follow(this.player.worldX);
    this.platformManager.update(this.camera);
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

  // --- Draw ------------------------------------------------------------------

  _draw() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.platformManager.draw(ctx, this.camera);
    this.player.draw(ctx, this.camera);

    // HUD — font scales with screen width
    const fontSize = Math.max(14, Math.round(canvas.width * 0.045));
    ctx.fillStyle = "#fff";
    ctx.font = fontSize + "px monospace";
    ctx.fillText("Score: " + this.score, 16, fontSize + 8);
    ctx.fillText("Hold SPACE to charge, release to jump", 16, fontSize * 2 + 12);

    if (this.player.isCharging) {
      const pct   = this.player.chargePct;
      const label = pct < 0.4 ? "short" : pct < 0.75 ? "medium" : "FULL POWER";
      ctx.fillStyle = "#ff0";
      ctx.font = "bold " + fontSize + "px monospace";
      ctx.fillText("Charging... " + label, 16, fontSize * 3 + 16);
    }

    if (this.gameOver) {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.textAlign = "center";
      ctx.fillStyle = "#f44";
      ctx.font = "bold " + Math.round(canvas.width * 0.09) + "px monospace";
      ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = "#fff";
      ctx.font = fontSize + "px monospace";
      ctx.fillText("Score: " + this.score + "  -  SPACE to restart", canvas.width / 2, canvas.height / 2 + 30);
      ctx.textAlign = "left";
    }
  }
}

// Boot
new Game("gameCanvas");