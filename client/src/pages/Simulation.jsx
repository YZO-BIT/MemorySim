import React, { useState, useEffect } from "react";
import api from "../services/api";

/**
 * Initial Simulation Setup Screen
 * Configures RAM size, frame count, input patterns (Repeating, Random, Custom),
 * and page replacement algorithms (LRU, FIFO, Clock, Optimal).
 */
function Simulation({ onSimulationComplete, onCancel }) {
  // Memory settings
  const [frameCount, setFrameCount] = useState(4);
  const [frameSizeKb, setFrameSizeKb] = useState(4); // 4 KB per frame
  const [ramSizeInput, setRamSizeInput] = useState(16); // 16 KB
  const [ramUnit, setRamUnit] = useState("KB"); // KB or MB
  const [virtualPages, setVirtualPages] = useState(10);

  // Input pattern settings
  const [patternType, setPatternType] = useState("repeating"); // "repeating", "random", "custom"

  // Repeating pattern parameters
  const [repeatBaseSequence, setRepeatBaseSequence] = useState("1, 2, 3, 4");
  const [repeatCount, setRepeatCount] = useState(3);

  // Random pattern parameters
  const [randomRequestsCount, setRandomRequestsCount] = useState(16);
  const [randomSeed, setRandomSeed] = useState(42);

  // Custom sequence parameters
  const [customSequence, setCustomSequence] = useState("7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2");

  // Algorithm
  const [algorithm, setAlgorithm] = useState("LRU");

  // Write ratio: percentage of requests that are writes (deterministic from seed)
  const [writeRatio, setWriteRatio] = useState(0);

  // Form states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // Sync RAM size when frameCount or frameSizeKb changes
  useEffect(() => {
    const totalKb = frameCount * frameSizeKb;
    if (ramUnit === "MB") {
      setRamSizeInput((totalKb / 1024).toFixed(2));
    } else {
      setRamSizeInput(totalKb);
    }
  }, [frameCount, frameSizeKb, ramUnit]);

  // Handle direct RAM size change
  const handleRamChange = (val, unit = ramUnit) => {
    const num = parseFloat(val);
    setRamSizeInput(val);
    if (!isNaN(num) && num > 0) {
      const kb = unit === "MB" ? num * 1024 : num;
      const calculatedFrames = Math.max(1, Math.round(kb / frameSizeKb));
      setFrameCount(calculatedFrames);
    }
  };

  const presets = [
    {
      name: "Belady's Anomaly",
      seq: "1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5",
      type: "custom",
      algo: "FIFO",
      frames: 3,
      desc: "Demonstrates anomaly where FIFO produces more faults with more frames.",
    },
    {
      name: "LRU Working Set Loop",
      seq: "1, 2, 3, 1, 4, 2, 5, 1",
      type: "custom",
      algo: "LRU",
      frames: 3,
      desc: "Classic 8-reference workload illustrating temporal reuse and recency.",
    },
    {
      name: "Repeated Cyclic Loop",
      baseSeq: "1, 2, 3, 4",
      repeat: 4,
      type: "repeating",
      algo: "Clock",
      frames: 3,
      desc: "Cyclic reference loop exceeding physical frame capacity.",
    },
  ];

  const applyPreset = (preset) => {
    setAlgorithm(preset.algo || "LRU");
    setFrameCount(preset.frames || 3);
    if (preset.type === "custom") {
      setPatternType("custom");
      setCustomSequence(preset.seq);
    } else if (preset.type === "repeating") {
      setPatternType("repeating");
      setRepeatBaseSequence(preset.baseSeq);
      setRepeatCount(preset.repeat);
    }
    setError(null);
    setValidationErrors({});
  };

  const validate = () => {
    const errors = {};

    if (!frameCount || frameCount < 1 || frameCount > 64) {
      errors.frameCount = "Frames must be an integer between 1 and 64 for physical memory simulation.";
    }

    if (!virtualPages || virtualPages < 1 || virtualPages > 1000) {
      errors.virtualPages = "Virtual pages must be an integer between 1 and 1000.";
    }

    if (patternType === "repeating") {
      const parts = repeatBaseSequence
        .split(/[,;\s]+/)
        .map((x) => x.trim())
        .filter((x) => x !== "");
      if (parts.length === 0) {
        errors.repeating = "Please enter at least one valid page number in the base sequence.";
      }
      if (!repeatCount || repeatCount < 1 || repeatCount > 50) {
        errors.repeatCount = "Repetitions must be between 1 and 50.";
      }
    } else if (patternType === "random") {
      if (!randomRequestsCount || randomRequestsCount < 1 || randomRequestsCount > 500) {
        errors.randomRequests = "Number of requests must be between 1 and 500.";
      }
      if (randomSeed !== "" && Number.isNaN(parseInt(randomSeed, 10))) {
        errors.randomSeed = "Seed must be an integer (0 is a valid seed).";
      }
    } else if (patternType === "custom") {
      const parts = customSequence
        .split(/[,;\s]+/)
        .map((x) => x.trim())
        .filter((x) => x !== "");
      if (parts.length === 0) {
        errors.custom = "Please enter at least one page number (e.g. 1, 2, 3).";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      // Build final reference sequence
      let finalRequests = [];
      let workloadName = "Custom Sequence";

      if (patternType === "repeating") {
        workloadName = "Repeating Pattern";
        const base = repeatBaseSequence
          .split(/[,;\s]+/)
          .map((x) => x.trim())
          .filter((x) => x !== "")
          .map((x) => parseInt(x, 10))
          .filter((x) => !isNaN(x) && x >= 0);

        if (base.length === 0) {
          throw new Error("Base sequence must contain valid non-negative page integers.");
        }

        const reps = Math.max(1, parseInt(repeatCount, 10) || 1);
        for (let r = 0; r < reps; r++) {
          finalRequests.push(...base);
        }
      } else if (patternType === "random") {
        workloadName = "Random Pattern";
        // Let backend/C++ generate using random seed, or generate on client
        const count = Math.max(1, parseInt(randomRequestsCount, 10) || 16);
        const vPages = Math.max(1, parseInt(virtualPages, 10) || 10);
        const parsedSeed = parseInt(randomSeed, 10);
        const seedVal = Number.isNaN(parsedSeed) ? 42 : parsedSeed;

        const genRes = await api.generateWorkload({
          type: "Random",
          totalRequests: count,
          pageCount: vPages,
          seed: seedVal,
        });

        if (genRes?.requests) {
          finalRequests = genRes.requests;
        }
      } else {
        workloadName = "Custom Sequence";
        finalRequests = customSequence
          .split(/[,;\s]+/)
          .map((x) => x.trim())
          .filter((x) => x !== "")
          .map((x) => parseInt(x, 10))
          .filter((x) => !isNaN(x) && x >= 0);

        if (finalRequests.length === 0) {
          throw new Error("Custom sequence must contain valid non-negative page integers.");
        }
      }

      // Max requests safeguard for browser rendering
      if (finalRequests.length > 200) {
        finalRequests = finalRequests.slice(0, 200);
      }

      const payload = {
        algorithm,
        bufferPoolSize: parseInt(frameCount, 10),
        virtualPages: Math.max(parseInt(virtualPages, 10), ...finalRequests) + 1,
        physicalFrames: parseInt(frameCount, 10),
        pageSize: frameSizeKb * 1024,
        workloadType: workloadName,
        totalRequests: finalRequests.length,
        requests: finalRequests,
        seed: Number.isNaN(parseInt(randomSeed, 10)) ? 42 : parseInt(randomSeed, 10),
        writeRatio,
      };

      const result = await api.runSimulation(payload);

      if (!result.success) {
        throw new Error(result.message || "Simulation execution failed.");
      }

      if (onSimulationComplete) {
        onSimulationComplete(result);
      }
    } catch (err) {
      console.error("[Simulation Setup Error]:", err);
      setError(err.message || "Failed to execute simulation. Check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page setup-page">
      <div className="page-title">
        <div>
          <h1>Simulation Setup &amp; Configuration</h1>
          <p>Configure physical memory parameters, reference sequence, and replacement policy</p>
        </div>

        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel}>
            ← Back to Dashboard
          </button>
        )}
      </div>

      <div className="presets-banner">
        <span className="presets-title">⚡ Quick Presets:</span>
        <div className="presets-list">
          {presets.map((p) => (
            <button
              key={p.name}
              type="button"
              className="preset-btn"
              onClick={() => applyPreset(p)}
              title={p.desc}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span className="error-icon">✕</span>
          <div className="error-text">
            <strong>Simulation Error:</strong> {error}
          </div>
          <button type="button" className="error-close" onClick={() => setError(null)}>
            ✕
          </button>
        </div>
      )}

      <form className="setup-form" onSubmit={handleSubmit}>
        {/* Section 1: Memory Architecture */}
        <div className="form-card">
          <div className="card-header">
            <span className="section-step">1</span>
            <div>
              <h3>Physical Memory (RAM) Configuration</h3>
              <p>Define physical memory size and frame capacity for the simulation engine</p>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-field">
              <label htmlFor="frameCount">
                Number of Physical Frames
                <span className="field-hint">Fixed slots in RAM available to hold pages</span>
              </label>
              <div className="input-with-badge">
                <input
                  id="frameCount"
                  type="number"
                  min="1"
                  max="64"
                  value={frameCount}
                  onChange={(e) => setFrameCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  required
                />
                <span className="input-unit">Frames</span>
              </div>
              {validationErrors.frameCount && (
                <span className="field-error">{validationErrors.frameCount}</span>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="ramSize">
                Total RAM Size (Derived)
                <span className="field-hint">RAM Capacity = Frames × {frameSizeKb} KB Frame Size</span>
              </label>
              <div className="input-with-badge">
                <input
                  id="ramSize"
                  type="number"
                  step="any"
                  min="1"
                  value={ramSizeInput}
                  onChange={(e) => handleRamChange(e.target.value)}
                />
                <select
                  value={ramUnit}
                  onChange={(e) => {
                    const newUnit = e.target.value;
                    setRamUnit(newUnit);
                    handleRamChange(ramSizeInput, newUnit);
                  }}
                  className="unit-select"
                >
                  <option value="KB">KB</option>
                  <option value="MB">MB</option>
                </select>
              </div>
              <span className="text-explanation">
                Configured: <strong>{frameCount} frames</strong> @ <strong>{frameSizeKb} KB/frame</strong> ={" "}
                <strong>{frameCount * frameSizeKb} KB</strong> total physical memory.
              </span>
            </div>
          </div>

          <div className="form-grid-2" style={{ marginTop: "16px" }}>
            <div className="form-field">
              <label htmlFor="virtualPages">
                Virtual Pages in Address Space
                <span className="field-hint">Total unique pages process may reference</span>
              </label>
              <input
                id="virtualPages"
                type="number"
                min="1"
                max="1000"
                value={virtualPages}
                onChange={(e) => setVirtualPages(Math.max(1, parseInt(e.target.value, 10) || 1))}
                required
              />
              {validationErrors.virtualPages && (
                <span className="field-error">{validationErrors.virtualPages}</span>
              )}
            </div>

            <div className="form-field">
              <label>Frame Size</label>
              <select
                value={frameSizeKb}
                onChange={(e) => setFrameSizeKb(parseInt(e.target.value, 10))}
              >
                <option value={4}>4 KB (Standard x86/ARM)</option>
                <option value={2}>2 KB (Small Frame)</option>
                <option value={8}>8 KB (High-Throughput)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Input / Page Reference Pattern */}
        <div className="form-card">
          <div className="card-header">
            <span className="section-step">2</span>
            <div>
              <h3>Page Reference Pattern (Workload)</h3>
              <p>Select how page requests will be generated and fed into the simulator</p>
            </div>
          </div>

          <div className="pattern-toggle-row">
            <label className={`pattern-choice ${patternType === "repeating" ? "active" : ""}`}>
              <input
                type="radio"
                name="patternType"
                value="repeating"
                checked={patternType === "repeating"}
                onChange={() => setPatternType("repeating")}
              />
              <div className="pattern-choice-content">
                <strong>1. Repeating Pattern</strong>
                <span>Cyclic sequence repeating multiple times to model loops and temporal locality.</span>
              </div>
            </label>

            <label className={`pattern-choice ${patternType === "random" ? "active" : ""}`}>
              <input
                type="radio"
                name="patternType"
                value="random"
                checked={patternType === "random"}
                onChange={() => setPatternType("random")}
              />
              <div className="pattern-choice-content">
                <strong>2. Random Pattern</strong>
                <span>Stochastic pseudo-random requests simulating unpredictable memory accesses.</span>
              </div>
            </label>

            <label className={`pattern-choice ${patternType === "custom" ? "active" : ""}`}>
              <input
                type="radio"
                name="patternType"
                value="custom"
                checked={patternType === "custom"}
                onChange={() => setPatternType("custom")}
              />
              <div className="pattern-choice-content">
                <strong>3. Custom Sequence</strong>
                <span>Explicit comma-separated reference string for controlled experimentation.</span>
              </div>
            </label>
          </div>

          <div className="pattern-config-area">
            {patternType === "repeating" && (
              <div className="pattern-fields">
                <div className="form-field">
                  <label htmlFor="repeatBaseSequence">Base Sequence (Cycle):</label>
                  <input
                    id="repeatBaseSequence"
                    type="text"
                    value={repeatBaseSequence}
                    onChange={(e) => setRepeatBaseSequence(e.target.value)}
                    placeholder="e.g. 1, 2, 3, 4"
                    required
                  />
                  {validationErrors.repeating && (
                    <span className="field-error">{validationErrors.repeating}</span>
                  )}
                </div>

                <div className="form-field">
                  <label htmlFor="repeatCount">Repetition Count:</label>
                  <input
                    id="repeatCount"
                    type="number"
                    min="1"
                    max="50"
                    value={repeatCount}
                    onChange={(e) => setRepeatCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    required
                  />
                  {validationErrors.repeatCount && (
                    <span className="field-error">{validationErrors.repeatCount}</span>
                  )}
                </div>

                <div className="pattern-preview">
                  <span>Generated Workload Preview:</span>
                  <code>
                    {repeatBaseSequence
                      .split(/[,;\s]+/)
                      .filter(Boolean)
                      .join(", ")}{" "}
                    (repeated {repeatCount} times)
                  </code>
                </div>
              </div>
            )}

            {patternType === "random" && (
              <div className="form-grid-2">
                <div className="form-field">
                  <label htmlFor="randomRequestsCount">Total Page References:</label>
                  <input
                    id="randomRequestsCount"
                    type="number"
                    min="1"
                    max="500"
                    value={randomRequestsCount}
                    onChange={(e) => setRandomRequestsCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    required
                  />
                  {validationErrors.randomRequests && (
                    <span className="field-error">{validationErrors.randomRequests}</span>
                  )}
                </div>

                <div className="form-field">
                  <label htmlFor="randomSeed">Random Seed (for determinism):</label>
                  <input
                    id="randomSeed"
                    type="number"
                    value={randomSeed}
                    onChange={(e) => setRandomSeed(parseInt(e.target.value, 10) || 42)}
                    required
                  />
                </div>
              </div>
            )}

            {patternType === "custom" && (
              <div className="form-field">
                <label htmlFor="customSequence">Enter Page Reference Sequence (comma-separated):</label>
                <input
                  id="customSequence"
                  type="text"
                  value={customSequence}
                  onChange={(e) => setCustomSequence(e.target.value)}
                  placeholder="e.g. 7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2"
                  required
                />
                {validationErrors.custom && (
                  <span className="field-error">{validationErrors.custom}</span>
                )}
                <span className="field-hint">
                  Separate page integers with commas or spaces. Example: 1, 2, 3, 1, 4, 2, 5, 1
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Replacement Policy */}
        <div className="form-card">
          <div className="card-header">
            <span className="section-step">3</span>
            <div>
              <h3>Page Replacement Policy</h3>
              <p>Select the algorithm implemented in the C++ engine to handle victim frame selection</p>
            </div>
          </div>

          <div className="algorithm-choice-grid">
            <label className={`algo-card ${algorithm === "LRU" ? "active" : ""}`}>
              <input
                type="radio"
                name="algorithm"
                value="LRU"
                checked={algorithm === "LRU"}
                onChange={() => setAlgorithm("LRU")}
              />
              <div className="algo-card-body">
                <span className="algo-name">LRU (Least Recently Used)</span>
                <p>
                  Evicts the frame whose page has not been accessed for the longest time. Exploits temporal locality.
                </p>
                <span className="algo-badge">Optimal for Working Sets</span>
              </div>
            </label>

            <label className={`algo-card ${algorithm === "FIFO" ? "active" : ""}`}>
              <input
                type="radio"
                name="algorithm"
                value="FIFO"
                checked={algorithm === "FIFO"}
                onChange={() => setAlgorithm("FIFO")}
              />
              <div className="algo-card-body">
                <span className="algo-name">FIFO (First In, First Out)</span>
                <p>
                  Evicts the oldest page loaded into physical memory. Simple queue-based eviction, but susceptible to Belady's Anomaly.
                </p>
                <span className="algo-badge">Queue Based (O(1))</span>
              </div>
            </label>

            <label className={`algo-card ${algorithm === "Clock" ? "active" : ""}`}>
              <input
                type="radio"
                name="algorithm"
                value="Clock"
                checked={algorithm === "Clock"}
                onChange={() => setAlgorithm("Clock")}
              />
              <div className="algo-card-body">
                <span className="algo-name">Clock (Second Chance)</span>
                <p>
                  Inspects reference bits with a circular hand. Clears bit and gives a second chance before evicting.
                </p>
                <span className="algo-badge">Hardware Friendly LRU Approx</span>
              </div>
            </label>

            <label className={`algo-card ${algorithm === "OPT" ? "active" : ""}`}>
              <input
                type="radio"
                name="algorithm"
                value="OPT"
                checked={algorithm === "OPT"}
                onChange={() => setAlgorithm("OPT")}
              />
              <div className="algo-card-body">
                <span className="algo-name">Optimal (Belady)</span>
                <p>
                  Evicts the page whose next use is farthest in the future. Needs future knowledge, so it serves as the theoretical lower bound for faults.
                </p>
                <span className="algo-badge">Theoretical Benchmark</span>
              </div>
            </label>
          </div>

          <div className="form-field">
            <label htmlFor="writeRatio">Write Ratio</label>
            <select
              id="writeRatio"
              value={writeRatio}
              onChange={(e) => setWriteRatio(parseInt(e.target.value, 10))}
            >
              <option value={0}>0% writes (read-only)</option>
              <option value={10}>10% writes</option>
              <option value={30}>30% writes</option>
              <option value={50}>50% writes</option>
              <option value={100}>100% writes</option>
            </select>
            <span className="field-hint">
              Share of requests issued as writes; assignment is deterministic and derived from the seed. Writes dirty pages, and dirty evictions trigger disk write-backs.
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="form-submit-row">
          <button
            type="submit"
            className="btn-primary-large"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Running C++ Simulation Engine...
              </>
            ) : (
              "🚀 Start Simulation"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Simulation;