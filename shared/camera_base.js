/**
 * CameraBase
 * Handles everything common to all camerabased inputs:
 *    MediaPipe Pose initialization
 *    Camera stream management (start, stop, switch device)
 *    Drawing the skeleton overlay
 *
 * Games extend this and implement _onPoseResults(results) for their
 * specific landmark logic (ratio, hip position, etc).
 *
 * Usage:
 *   import { CameraBase } from "../../shared/CameraBase.js";
 *   export class MyGameCameraInput extends CameraBase {
 *     constructor(videoEl, overlayEl, inputHandler, config) {
 *       super(videoEl, overlayEl, config);
 *     }
 *     _onPoseResults(results) {
 *       // gamespecific landmark logic here
 *     }
 *   }
 */
export class CameraBase {
  /**
   * @param {HTMLVideoElement}  videoEl
   * @param {HTMLCanvasElement} overlayEl
   * @param {import('./ConfigBase.js').ConfigBase} config
   */
  constructor(videoEl, overlayEl, config) {
    this.video   = videoEl;
    this.overlay = overlayEl;
    this.ctx     = overlayEl.getContext("2d");
    this.config  = config;

    this._ready  = false;
    this._stream = null;

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

  // Setup 

  async _initMediaPipe() {
    const { Pose, POSE_CONNECTIONS } = window;
    this._poseConnections = POSE_CONNECTIONS;

    this._pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });

    this._pose.setOptions({
      modelComplexity       : this.config.get("modelComplexity"),
      smoothLandmarks       : false,
      enableSegmentation    : false,
      minDetectionConfidence: 0.6,
      minTrackingConfidence : 0.6,
    });

    this._pose.onResults((results) => this._handleResults(results));
    await this._startCamera();
  }

  async _startCamera() {
    try {
      if (this._stream) {
        this._stream.getTracks().forEach(t => t.stop());
        this._stream = null;
      }

      const deviceId = this.config.get("cameraDeviceId");
      const videoConstraints = deviceId
        ? { deviceId: { exact: deviceId } }
        : { facingMode: "user" };

      this._stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });

      this.video.srcObject = this._stream;
      this.video.style.opacity = this.config.get("cameraOpacity");
      this.video.play();

      this.video.addEventListener("loadeddata", () => {
        this._ready = true;
        this._processLoop();
      }, { once: true });

    } catch (err) {
      console.error("CameraBase: stream error:", err);
    }
  }

  async _restartCamera() {
    this._ready = false;
    await this._pose.setOptions({
      modelComplexity: this.config.get("modelComplexity"),
    });
    await this._startCamera();
  }

  // Frame loop 

  async _processLoop() {
    if (!this._ready) return;
    await this._pose.send({ image: this.video });
    requestAnimationFrame(() => this._processLoop());
  }

  // Results 

  _handleResults(results) {
    this._drawSkeleton(results);
    // Delegate gamespecific logic to subclass
    if (results.poseLandmarks) this._onPoseResults(results);
  }

  /**
   * Override in subclass to handle landmarks.
   * Only called when poseLandmarks is present.
   * @param {object} results  MediaPipe Pose results
   */
  _onPoseResults(results) {}

  // Drawing 

  _drawSkeleton(results) {
    const { overlay, ctx } = this;
    overlay.width  = this.video.videoWidth  || overlay.clientWidth;
    overlay.height = this.video.videoHeight || overlay.clientHeight;
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    if (!results.poseLandmarks) return;

    const lm = results.poseLandmarks;
    const w  = overlay.width;
    const h  = overlay.height;

    // Full skeleton (dimmed)
    ctx.strokeStyle = "rgba(0,255,0,0.4)";
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
  }

  /**
   * Draw highlighted key points on the overlay.
   * Subclasses call this after _drawSkeleton with their specific points.
   * @param {Array<{point, label, color}>} keyPoints
   */
  _drawKeyPoints(keyPoints) {
    const w = this.overlay.width;
    const h = this.overlay.height;

    for (const kp of keyPoints) {
      const x = kp.point.x * w;
      const y = kp.point.y * h;
      this.ctx.fillStyle = kp.color;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 6, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = "#fff";
      this.ctx.font = "bold 10px monospace";
      this.ctx.fillText(kp.label, x + 8, y + 4);
    }
  }

  //  Helpers 

  _dist(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  get isReady() { return this._ready; }
}