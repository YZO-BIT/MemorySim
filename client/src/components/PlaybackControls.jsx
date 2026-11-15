import React, { useEffect, useState } from "react";
import { IconReset, IconPrev, IconPlay, IconPause, IconNext } from "./icons";

/**
 * PlaybackControls
 * Controls step-by-step playback: Play, Pause, Previous, Next, Reset, Restart,
 * speed selector, and interactive progress scrubber.
 */
function PlaybackControls({
  currentStepIndex,
  totalSteps,
  onStepChange,
  onRestart,
  isPlaying,
  setIsPlaying,
}) {
  const [speed, setSpeed] = useState(1); // 1 = 1000ms

  useEffect(() => {
    let timer = null;
    if (isPlaying) {
      const intervalMs = Math.max(250, 1000 / speed);
      timer = setInterval(() => {
        onStepChange((prev) => {
          if (prev >= totalSteps) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, speed, totalSteps, onStepChange, setIsPlaying]);

  const handlePlayPause = () => {
    if (currentStepIndex >= totalSteps && !isPlaying) {
      // Loop or restart from step 0
      onStepChange(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handlePrev = () => {
    setIsPlaying(false);
    onStepChange((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setIsPlaying(false);
    onStepChange((prev) => Math.min(totalSteps, prev + 1));
  };

  const handleReset = () => {
    setIsPlaying(false);
    onStepChange(0);
  };

  const progressPercent = totalSteps > 0 ? (currentStepIndex / totalSteps) * 100 : 0;

  return (
    <div className="playback-panel">
      <div className="playback-top">
        <div className="playback-buttons">
          <button
            type="button"
            className="ctrl-btn ctrl-btn-reset"
            onClick={handleReset}
            title="Reset to initial state (Step 0)"
          >
            <IconReset size={13} />
            Reset
          </button>

          <button
            type="button"
            className="ctrl-btn ctrl-btn-prev"
            onClick={handlePrev}
            disabled={currentStepIndex <= 0}
            title="Step Backward"
          >
            <IconPrev size={13} />
          </button>

          <button
            type="button"
            className={`ctrl-btn ctrl-btn-play ${isPlaying ? "playing" : ""}`}
            onClick={handlePlayPause}
            title={isPlaying ? "Pause Simulation" : "Auto-Play Simulation"}
          >
            {isPlaying ? <IconPause size={13} /> : <IconPlay size={13} />}
            {isPlaying ? "Pause" : currentStepIndex >= totalSteps ? "Replay" : "Play"}
          </button>

          <button
            type="button"
            className="ctrl-btn ctrl-btn-next"
            onClick={handleNext}
            disabled={currentStepIndex >= totalSteps}
            title="Step Forward"
          >
            Next
            <IconNext size={13} />
          </button>

          {onRestart && (
            <button
              type="button"
              className="ctrl-btn ctrl-btn-restart"
              onClick={() => {
                setIsPlaying(false);
                onRestart();
              }}
              title="Restart simulation with same configuration"
            >
              <IconReset size={13} />
              Re-run
            </button>
          )}
        </div>

        <div className="playback-status">
          <span className="step-counter-text">
            Step <strong>{currentStepIndex}</strong> of <strong>{totalSteps}</strong>
          </span>

          <div className="speed-selector">
            <span className="speed-label">Speed:</span>
            {[0.5, 1, 2, 4].map((s) => (
              <button
                key={s}
                type="button"
                className={`speed-btn ${speed === s ? "active" : ""}`}
                onClick={() => setSpeed(s)}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="playback-scrubber-group">
        <input
          type="range"
          min="0"
          max={totalSteps}
          value={currentStepIndex}
          onChange={(e) => {
            setIsPlaying(false);
            onStepChange(parseInt(e.target.value, 10));
          }}
          className="playback-slider"
        />
        <div className="playback-progress-bar">
          <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
        </div>
      </div>
    </div>
  );
}

export default PlaybackControls;
