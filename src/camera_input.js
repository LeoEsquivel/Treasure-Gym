import { config } from "./config.js";

/**
 * CameraInput
 *
 * Landmarks used:
 *   11 = left shoulder  |  12 = right shoulder
 *   15 = left wrist     |  16 = right wrist
 *
 * Ratio = dist(wristL, wristR) / dist(shoulderL, shoulderR)
 *   ratio < THRESHOLD_CLOSED  -> arms closed -> trigger "Space" press
 *   ratio > THRESHOLD_OPEN    -> arms open   -> trigger "Space" release
 *
 * The dead zone between both thresholds prevents flickering.
 */

const THRESHOLD_CLOSED = 1.0; // below this = arms closed
const THRESHOLD_OPEN   = 2.5; // above this = arms open

export class CameraInput {
  /**
   * @param {HTMLVideoElement}                  videoEl
   * @param {HTMLCanvasElement}                 overlayEl
   * @param {import('./InputHandler.js').InputHandler} inputHandler
   */
  constructor(videoEl, overlayEl, inputHandler) {
    this.video        = videoEl;
    this.overlay      = overlayEl;
    this.ctx          = overlayEl.getContext("2d");
    this.inputHandler = inputHandler;

    this._ready      = false;
    this.ratio       = null;
    this._armsClosed = false;
    this._stream     = null;

    // Track arm state to detect transitions (open -> closed, closed -> open)
    this._armsClosed  = false;

    this._initMediaPipe();
    // React to config changes that affect camera
    config.onChange((key) => {
      if (key === "cameraDeviceId" || key === "modelComplexity" || key === null) {
        this._restartCamera();
      }
      if (key === "cameraOpacity" || key === null) {
        this.video.style.opacity = config.get("cameraOpacity");
      }
    });
  }

  // --- Setup -----------------------------------------------------------------

  async _initMediaPipe() {
    const { Pose, POSE_CONNECTIONS } = window;
    this._poseConnections = POSE_CONNECTIONS;

    this._pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });

    this._pose.setOptions({
      modelComplexity       : config.get("modelComplexity"),
      // smoothLandmarks       : true,
      enableSegmentation    : false,
      minDetectionConfidence: 0.6,
      minTrackingConfidence : 0.6,
    });

    this._pose.onResults((results) => this._onResults(results));
    await this._startCamera();
  }

  async _startCamera() {
    try {
      // Stop previous stream if any
      if (this._stream) {
        this._stream.getTracks().forEach(t => t.stop());
        this._stream = null;
      }

      const deviceId = config.get("cameraDeviceId");
      const videoConstraints = deviceId
        ? { deviceId: { exact: deviceId } }
        : { facingMode: "user" };

      this._stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });

      this.video.srcObject = this._stream;
      this.video.style.opacity = config.get("cameraOpacity");
      this.video.play();

      this.video.addEventListener("loadeddata", () => {
        this._ready = true;
        this._processLoop();
      }, { once: true });

    } catch (err) {
      console.error("Camera error:", err);
    }
  }

  async _restartCamera() {
    this._ready = false;
    await this._pose.setOptions({
      modelComplexity: config.get("modelComplexity"),
    });
    await this._startCamera();
  }

  // --- Frame loop ------------------------------------------------------------

  async _processLoop() {
    if (!this._ready) return;
    await this._pose.send({ image: this.video });
    requestAnimationFrame(() => this._processLoop());
  }

  // --- Results ---------------------------------------------------------------

  _onResults(results) {
    this._calculateRatio(results);
    this._triggerInput();
    this._drawOverlay(results);
  }

  _calculateRatio(results) {
    if (!results.poseLandmarks) {
      this.ratio = null;
      return;
    }
    const lm = results.poseLandmarks;
    const shoulderDist = this._dist(lm[11], lm[12]);
    const wristDist    = this._dist(lm[15], lm[16]);

    if (shoulderDist > 0.01) {
      this.ratio = wristDist / shoulderDist;
    } else {
      this.ratio = null;
    }
  }

  /**
   * Detect state transitions and notify InputHandler.
   * Uses hysteresis: only switches state when crossing the threshold clearly.
   */
  _triggerInput() {
    if (this.ratio === null) return;

    const closed = config.get("thresholdClosed");
    const open   = config.get("thresholdOpen");

    if (!this._armsClosed && this.ratio < closed) {
      this._armsClosed = true;
      this.inputHandler.triggerPress("Space");
    } else if (this._armsClosed && this.ratio > open) {
      this._armsClosed = false;
      this.inputHandler.triggerRelease("Space");
    }
  }


  _dist(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // --- Draw ------------------------------------------------------------------

  _drawOverlay(results) {
    const { overlay, ctx } = this;

    overlay.width  = this.video.videoWidth  || overlay.clientWidth;
    overlay.height = this.video.videoHeight || overlay.clientHeight;

    ctx.clearRect(0, 0, overlay.width, overlay.height);

    if (!results.poseLandmarks) return;

    const lm = results.poseLandmarks;
    const w  = overlay.width;
    const h  = overlay.height;

    // Full skeleton (dimmed)
    ctx.strokeStyle = "rgba(0, 255, 0, 0.4)";
    ctx.lineWidth   = 1.5;
    for (const [a, b] of this._poseConnections) {
      const pa = lm[a];
      const pb = lm[b];
      if (!pa || !pb) continue;
      ctx.beginPath();
      ctx.moveTo(pa.x * w, pa.y * h);
      ctx.lineTo(pb.x * w, pb.y * h);
      ctx.stroke();
    }

    // Key points
    const keyPoints = [
      { point: lm[11], label: "SL", color: "#0af" },
      { point: lm[12], label: "SR", color: "#0af" },
      { point: lm[15], label: "WL", color: "#ff0" },
      { point: lm[16], label: "WR", color: "#ff0" },
    ];

    for (const kp of keyPoints) {
      const x = kp.point.x * w;
      const y = kp.point.y * h;
      ctx.fillStyle = kp.color;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px monospace";
      ctx.fillText(kp.label, x + 8, y + 4);
    }

    // Wrist-to-wrist line — color reflects arm state
    ctx.strokeStyle = this._armsClosed ? "#0f0" : "#f00";
    ctx.lineWidth   = 3;
    ctx.beginPath();
    ctx.moveTo(lm[15].x * w, lm[15].y * h);
    ctx.lineTo(lm[16].x * w, lm[16].y * h);
    ctx.stroke();
  }

  // --- Public API ------------------------------------------------------------

  get isReady() { return this._ready; }
}