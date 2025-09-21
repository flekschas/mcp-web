/**
 * Split plan for decomposing the HiGlass view configuration schema.
 */
export const higlassViewConfigSplitPlan = [
  'views[]',                  // View configurations with navigational, layout, and view-specific properties (tracks are split into separate sub-schemas)
  'views[].tracks.top[]',     // Top tracks within a view
  'views[].tracks.bottom[]',  // Bottom tracks within a view
  'views[].tracks.left[]',    // Left tracks within a view
  'views[].tracks.right[]',   // Right tracks within a view
  'views[].tracks.center[]',  // Center tracks within a view
  'zoomLocks',                // Zoom synchronization configuration
  'locationLocks',            // Location synchronization configuration
  'valueScaleLocks',          // Value scale synchronization configuration
];
