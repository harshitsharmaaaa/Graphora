// Re-exports so `eslint .` inside this package has a flat config to load.
// Real rules live in @eraser/config; this file only wires them up.
import base from "@eraser/config/eslint";

export default [...base];
