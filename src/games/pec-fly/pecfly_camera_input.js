import { CameraBase } from "../../shared/camera_base.js";

/**
 * PecFlyCameraInput
 * Extends CameraBase with pec-fly specific detection:
 * ratio = dist(wristL, wristR) / dist(shoulderL, shoulderR)
 *
 * Landmarks:
 *   11 = left shoulder  |  12 = right shoulder
 *   15 = left wrist     |  16 = right wrist
 */
export class PecFlyCameraInput extends CameraBase {
  /**
   * @param {HTMLVideoElement}  videoEl
   * @param {HTMLCanvasElement} overlayEl
   * @param {import('../../../shared/InputHandler.js').InputHandler} inputHandler
   * @param {import('./config.js').PecFlyConfig} config
   */
  constructor(videoEl, overlayEl, inputHandler, config) {
    super(videoEl, overlayEl, config);
    this.inputHandler = inputHandler;
    this.ratio        = null;
    this._armsClosed  = false;
  }

  _onPoseResults(results) {
    const lm = results.poseLandmarks;

    this._calculateRatio(lm);
    this._triggerInput();
    this._drawOverlay(lm);
  }

  _calculateRatio(lm) {
    const shoulderDist = this._dist(lm[11], lm[12]);
    const wristDist    = this._dist(lm[15], lm[16]);

    if (shoulderDist > 0.01) {
      this.ratio = wristDist / shoulderDist;
    } else {
      this.ratio = null;
    }
  }

  _triggerInput() {
    if (this.ratio === null) return;

    const closed = this.config.get("thresholdClosed");
    const open   = this.config.get("thresholdOpen");

    if (!this._armsClosed && this.ratio < closed) {
      this._armsClosed = true;
      this.inputHandler.triggerPress("Space");
    } else if (this._armsClosed && this.ratio > open) {
      this._armsClosed = false;
      this.inputHandler.triggerRelease("Space");
    }
  }

  _drawOverlay(lm) {
    // Key points specific to pec-fly
    this._drawKeyPoints([
      { point: lm[11], label: "SL", color: "#0af" },
      { point: lm[12], label: "SR", color: "#0af" },
      { point: lm[15], label: "WL", color: "#ff0" },
      { point: lm[16], label: "WR", color: "#ff0" },
    ]);

    // Wrist-to-wrist line
    const w = this.overlay.width;
    const h = this.overlay.height;
    this.ctx.strokeStyle = this._armsClosed ? "#0f0" : "#f00";
    this.ctx.lineWidth   = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(lm[15].x * w, lm[15].y * h);
    this.ctx.lineTo(lm[16].x * w, lm[16].y * h);
    this.ctx.stroke();
  }
}