/**
 * DebugPanel
 * HTML/CSS overlay injected into the DOM.
 * Opens/closes with a fixed button. Game keeps running underneath.
 * Reads initial values from Config and writes back on every change.
 */
import { config } from "./config.js";

export class DebugPanel {
  /**
   * @param {function} onNeedsRebuild  Called when changes require re-init of game systems
   */
  constructor(onNeedsRebuild) {
    this.onNeedsRebuild = onNeedsRebuild;
    this._cameras = []; // available camera devices

    this._injectStyles();
    this._buildDOM();
    this._populateCameras();
  }

  // --- Styles ----------------------------------------------------------------

  _injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
      #debug-toggle {
        position: fixed;
        top: 12px;
        right: 12px;
        z-index: 1000;
        background: rgba(0,0,0,0.7);
        color: #fff;
        border: 1px solid #555;
        border-radius: 8px;
        padding: 6px 12px;
        font: bold 14px monospace;
        cursor: pointer;
      }
      #debug-toggle:hover { background: rgba(60,60,60,0.9); }

      #debug-panel {
        display: none;
        position: fixed;
        top: 0; right: 0;
        width: 300px;
        height: 100vh;
        overflow-y: auto;
        background: rgba(15,15,15,0.95);
        border-left: 1px solid #333;
        z-index: 999;
        padding: 16px;
        font: 13px monospace;
        color: #eee;
        box-sizing: border-box;
      }
      #debug-panel.open { display: block; }

      .dp-title {
        font-size: 16px;
        font-weight: bold;
        color: #5cf;
        margin-bottom: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .dp-close {
        background: none;
        border: none;
        color: #f44;
        font-size: 18px;
        cursor: pointer;
      }

      .dp-section {
        margin-bottom: 20px;
      }
      .dp-section-title {
        color: #fa0;
        font-weight: bold;
        margin-bottom: 10px;
        padding-bottom: 4px;
        border-bottom: 1px solid #333;
      }

      .dp-row {
        margin-bottom: 10px;
      }
      .dp-label {
        display: flex;
        justify-content: space-between;
        margin-bottom: 3px;
        color: #aaa;
      }
      .dp-value {
        color: #fff;
        font-weight: bold;
      }
      .dp-row input[type=range] {
        width: 100%;
        accent-color: #5cf;
      }
      .dp-row select,
      .dp-row input[type=number] {
        width: 100%;
        background: #222;
        color: #eee;
        border: 1px solid #444;
        border-radius: 4px;
        padding: 4px 6px;
        font: 12px monospace;
      }

      .dp-reset {
        width: 100%;
        margin-top: 8px;
        padding: 8px;
        background: #400;
        color: #faa;
        border: 1px solid #f44;
        border-radius: 6px;
        font: bold 13px monospace;
        cursor: pointer;
      }
      .dp-reset:hover { background: #600; }
    `;
    document.head.appendChild(style);
  }

  // --- DOM -------------------------------------------------------------------

  _buildDOM() {
    // Toggle button
    this._toggleBtn = document.createElement("button");
    this._toggleBtn.id = "debug-toggle";
    this._toggleBtn.textContent = "⚙ Config";
    this._toggleBtn.addEventListener("click", () => this.toggle());
    document.body.appendChild(this._toggleBtn);

    // Panel
    this._panel = document.createElement("div");
    this._panel.id = "debug-panel";
    this._panel.innerHTML = `
      <div class="dp-title">
        ⚙ Configuración
        <button class="dp-close" id="dp-close-btn">✕</button>
      </div>

      <!-- Camera -->
      <div class="dp-section">
        <div class="dp-section-title">Cámara</div>

        <div class="dp-row">
          <div class="dp-label">Cámara activa</div>
          <select id="dp-camera-select"></select>
        </div>

        <div class="dp-row">
          <div class="dp-label">
            <span>Opacidad preview</span>
            <span class="dp-value" id="dp-cameraOpacity-val"></span>
          </div>
          <input type="range" id="dp-cameraOpacity" min="0.1" max="1" step="0.05" />
        </div>

        <div class="dp-row">
          <div class="dp-label">Precisión MediaPipe</div>
          <select id="dp-modelComplexity">
            <option value="0">0 — Rápido</option>
            <option value="1">1 — Balanceado</option>
            <option value="2">2 — Preciso</option>
          </select>
        </div>
      </div>

      <!-- Detection thresholds -->
      <div class="dp-section">
        <div class="dp-section-title">Detección de brazos</div>

        <div class="dp-row">
          <div class="dp-label">
            <span>Umbral cerrado (≤)</span>
            <span class="dp-value" id="dp-thresholdClosed-val"></span>
          </div>
          <input type="range" id="dp-thresholdClosed" min="0.3" max="2.0" step="0.05" />
        </div>

        <div class="dp-row">
          <div class="dp-label">
            <span>Umbral abierto (≥)</span>
            <span class="dp-value" id="dp-thresholdOpen-val"></span>
          </div>
          <input type="range" id="dp-thresholdOpen" min="1.0" max="4.0" step="0.05" />
        </div>
      </div>

      <!-- Jump physics -->
      <div class="dp-section">
        <div class="dp-section-title">Física del salto</div>

        <div class="dp-row">
          <div class="dp-label">
            <span>Gravedad</span>
            <span class="dp-value" id="dp-gravity-val"></span>
          </div>
          <input type="range" id="dp-gravity" min="400" max="3000" step="50" />
        </div>

        <div class="dp-row">
          <div class="dp-label">
            <span>Vel. horizontal mínima</span>
            <span class="dp-value" id="dp-minVx-val"></span>
          </div>
          <input type="range" id="dp-minVx" min="50" max="500" step="10" />
        </div>

        <div class="dp-row">
          <div class="dp-label">
            <span>Vel. horizontal máxima</span>
            <span class="dp-value" id="dp-maxVx-val"></span>
          </div>
          <input type="range" id="dp-maxVx" min="200" max="1200" step="10" />
        </div>

        <div class="dp-row">
          <div class="dp-label">
            <span>Vel. vertical mínima</span>
            <span class="dp-value" id="dp-minVy-val"></span>
          </div>
          <input type="range" id="dp-minVy" min="-1200" max="-100" step="10" />
        </div>

        <div class="dp-row">
          <div class="dp-label">
            <span>Vel. vertical máxima</span>
            <span class="dp-value" id="dp-maxVy-val"></span>
          </div>
          <input type="range" id="dp-maxVy" min="-1500" max="-300" step="10" />
        </div>

        <div class="dp-row">
          <div class="dp-label">
            <span>Tiempo carga máxima (s)</span>
            <span class="dp-value" id="dp-maxCharge-val"></span>
          </div>
          <input type="range" id="dp-maxCharge" min="0.3" max="3.0" step="0.1" />
        </div>
      </div>

      <!-- Platforms -->
      <div class="dp-section">
        <div class="dp-section-title">Plataformas</div>

        <div class="dp-row">
          <div class="dp-label">
            <span>Ancho plataforma (%)</span>
            <span class="dp-value" id="dp-platformWidthPct-val"></span>
          </div>
          <input type="range" id="dp-platformWidthPct" min="0.08" max="0.40" step="0.01" />
        </div>

        <div class="dp-row">
          <div class="dp-label">
            <span>Gap horizontal mín (%)</span>
            <span class="dp-value" id="dp-minGapXPct-val"></span>
          </div>
          <input type="range" id="dp-minGapXPct" min="0.10" max="0.50" step="0.01" />
        </div>

        <div class="dp-row">
          <div class="dp-label">
            <span>Gap horizontal máx (%)</span>
            <span class="dp-value" id="dp-maxGapXPct-val"></span>
          </div>
          <input type="range" id="dp-maxGapXPct" min="0.15" max="0.70" step="0.01" />
        </div>

        <div class="dp-row">
          <div class="dp-label">
            <span>Variación vertical (%)</span>
            <span class="dp-value" id="dp-minGapYPct-val"></span>
          </div>
          <input type="range" id="dp-minGapYPct" min="0.02" max="0.40" step="0.01" />
        </div>

        <div class="dp-row">
          <div class="dp-label">
            <span>Zoom global (ref. width)</span>
            <span class="dp-value" id="dp-referenceWidth-val"></span>
          </div>
          <input type="range" id="dp-referenceWidth" min="400" max="1600" step="50" />
        </div>
      </div>

      <button class="dp-reset" id="dp-reset-btn">↺ Restablecer valores por defecto</button>
    `;
    document.body.appendChild(this._panel);

    // Close button
    this._panel.querySelector("#dp-close-btn")
      .addEventListener("click", () => this.close());

    // Reset button
    this._panel.querySelector("#dp-reset-btn")
      .addEventListener("click", () => {
        config.reset();
        this._syncFromConfig();
        this.onNeedsRebuild();
      });

    // Wire all sliders and selects
    this._wireControls();

    // Set initial values from config
    this._syncFromConfig();
  }

  // --- Camera list -----------------------------------------------------------

  async _populateCameras() {
    try {
      // Must request permission first so labels are available
      await navigator.mediaDevices.getUserMedia({ video: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      this._cameras = devices.filter(d => d.kind === "videoinput");

      const select = this._panel.querySelector("#dp-camera-select");
      select.innerHTML = "";

      for (const cam of this._cameras) {
        const opt = document.createElement("option");
        opt.value = cam.deviceId;
        opt.textContent = cam.label || "Cámara " + (this._cameras.indexOf(cam) + 1);
        if (cam.deviceId === config.get("cameraDeviceId")) opt.selected = true;
        select.appendChild(opt);
      }
    } catch (e) {
      console.warn("DebugPanel: could not enumerate cameras", e);
    }
  }

  // --- Wire controls ---------------------------------------------------------

  _wireControls() {
    // Slider controls — key matches config key
    const sliders = [
      "cameraOpacity", "thresholdClosed", "thresholdOpen",
      "gravity", "minVx", "maxVx", "minVy", "maxVy", "maxCharge",
      "platformWidthPct", "minGapXPct", "maxGapXPct", "minGapYPct", "referenceWidth"
    ];

    for (const key of sliders) {
      const el = this._panel.querySelector(`#dp-${key}`);
      if (!el) continue;

      el.addEventListener("input", () => {
        const val = parseFloat(el.value);
        config.set(key, val);
        this._updateLabel(key, val);

        // Changes that require rebuilding game systems
        const needsRebuild = [
          "referenceWidth", "platformWidthPct",
          "minGapXPct", "maxGapXPct", "minGapYPct"
        ];
        if (needsRebuild.includes(key)) this.onNeedsRebuild();
      });
    }

    // Camera select
    const camSelect = this._panel.querySelector("#dp-camera-select");
    camSelect.addEventListener("change", () => {
      config.set("cameraDeviceId", camSelect.value);
      this.onNeedsRebuild();
    });

    // Model complexity select
    const modelSelect = this._panel.querySelector("#dp-modelComplexity");
    modelSelect.addEventListener("change", () => {
      config.set("modelComplexity", parseInt(modelSelect.value));
      this.onNeedsRebuild();
    });
  }

  // --- Sync UI from Config ---------------------------------------------------

  _syncFromConfig() {
    const keys = [
      "cameraOpacity", "thresholdClosed", "thresholdOpen",
      "gravity", "minVx", "maxVx", "minVy", "maxVy", "maxCharge",
      "platformWidthPct", "minGapXPct", "maxGapXPct", "minGapYPct", "referenceWidth"
    ];

    for (const key of keys) {
      const el  = this._panel.querySelector(`#dp-${key}`);
      const val = config.get(key);
      if (el) el.value = val;
      this._updateLabel(key, val);
    }

    // Model complexity
    const modelSelect = this._panel.querySelector("#dp-modelComplexity");
    if (modelSelect) modelSelect.value = config.get("modelComplexity");
  }

  _updateLabel(key, val) {
    const label = this._panel.querySelector(`#dp-${key}-val`);
    if (!label) return;

    // Format percentages nicely
    const pctKeys = ["platformWidthPct", "minGapXPct", "maxGapXPct", "minGapYPct", "cameraOpacity"];
    if (pctKeys.includes(key)) {
      label.textContent = Math.round(val * 100) + "%";
    } else {
      label.textContent = val;
    }
  }

  // --- Toggle ----------------------------------------------------------------

  toggle() {
    this._panel.classList.toggle("open");
  }

  close() {
    this._panel.classList.remove("open");
  }

  open() {
    this._panel.classList.add("open");
    this._syncFromConfig();
  }
}