import { ConfigBase } from "../../../shared/config_base.js";

const DEFAULTS = {
  // Camera detection
  thresholdClosed  : 1.0,
  thresholdOpen    : 2.5,
  cameraDeviceId   : null,
  cameraOpacity    : 0.85,
  modelComplexity  : 1,

  // Jump physics
  gravity          : 1400,
  minVx            : 260,
  maxVx            : 700,
  minVy            : -500,
  maxVy            : -880,
  maxCharge        : 1.5,

  // Platforms
  platformWidthPct : 0.18,
  minGapXPct       : 0.22,
  maxGapXPct       : 0.40,
  minGapYPct       : 0.15,
  referenceWidth   : 800,
};

class PecFlyConfig extends ConfigBase {
  constructor() {
    super("pecfly_config", DEFAULTS);
  }
}

export const config = new PecFlyConfig();