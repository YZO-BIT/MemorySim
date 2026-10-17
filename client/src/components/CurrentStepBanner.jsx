import React from "react";

/**
 * CurrentStepBanner
 * Displays immediate feedback for the current page request:
 * Requested Page, HIT / MISS result, Affected Frame, Evicted / Loaded Page,
 * and running hit ratio.
 */
function CurrentStepBanner({ currentStep, totalSteps = 0 }) {
  if (!currentStep) {
    return (
      <div className="current-step-banner banner-standby">
        <div className="banner-icon">⏸</div>
        <div className="banner-content">
          <strong>Initial Memory State (Step 0)</strong>
          <p>Simulation ready. Press Play or Next Step to begin referencing pages.</p>
        </div>
      </div>
    );
  }

  const isHit = currentStep.result === "HIT";
  const isEviction = currentStep.evictedPage !== null && currentStep.evictedPage !== undefined;

  return (
    <div className={`current-step-banner ${isHit ? "banner-hit" : "banner-miss"}`}>
      <div className="banner-main">
        <div className="banner-step-indicator">
          <span className="step-badge">Step {currentStep.step} of {totalSteps}</span>
          <div className="request-display">
            <span className="request-label">Requested Page</span>
            <strong className="request-number">Page {currentStep.requestedPage}</strong>
          </div>
        </div>

        <div className="banner-outcome">
          <div className={`result-tag ${isHit ? "result-hit" : "result-miss"}`}>
            <span className="result-icon">{isHit ? "✓" : "⚠"}</span>
            <div className="result-text-group">
              <span className="result-title">{isHit ? "PAGE HIT" : "PAGE FAULT / MISS"}</span>
              <span className="result-detail">
                {isHit
                  ? `Located in Frame ${currentStep.frame} — Zero disk I/O latency`
                  : isEviction
                  ? `Frame ${currentStep.frame} full: Evicted Page ${currentStep.evictedPage} → Loaded Page ${currentStep.loadedPage}`
                  : `Allocated free Frame ${currentStep.frame} → Loaded Page ${currentStep.loadedPage}`}
              </span>
            </div>
          </div>
        </div>

        <div className="banner-running-stats">
          <div className="running-stat-item">
            <span>Running Hits</span>
            <strong className="text-green">{currentStep.runningHits}</strong>
          </div>
          <div className="running-stat-item">
            <span>Running Faults</span>
            <strong className="text-red">{currentStep.runningMisses}</strong>
          </div>
          <div className="running-stat-item">
            <span>Running Hit Ratio</span>
            <strong className="text-accent">{Number(currentStep.runningHitRatio || 0).toFixed(1)}%</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CurrentStepBanner;
