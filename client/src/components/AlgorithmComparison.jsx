import React, { useState } from "react";
import api from "../services/api";

/**
 * AlgorithmComparison
 * Compares LRU, FIFO, and Clock using the exact same page reference sequence and frame count.
 * All results are computed by the C++ engine via POST /api/simulation/compare.
 */
function AlgorithmComparison({ defaultSequence, defaultFrames = 3, defaultPageSize = 4096 }) {
  const [frames, setFrames] = useState(defaultFrames);
  const [sequenceInput, setSequenceInput] = useState(
    Array.isArray(defaultSequence) && defaultSequence.length > 0
      ? defaultSequence.join(", ")
      : "1, 2, 3, 1, 4, 2, 5, 1"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);

  const presets = [
    {
      name: "Belady's Anomaly (FIFO)",
      seq: "1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5",
      desc: "Classic sequence where increasing FIFO frames can paradoxically increase page faults.",
    },
    {
      name: "Cyclic Loop",
      seq: "1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4",
      desc: "Loop access exceeding cache size; tests eviction predictability.",
    },
    {
      name: "High Locality (80/20)",
      seq: "1, 2, 1, 2, 1, 3, 1, 2, 1, 4, 1, 2",
      desc: "Frequent re-access to a hot working set; LRU typically outperforms.",
    },
    {
      name: "Standard Mix",
      seq: "7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2",
      desc: "Operating system textbook reference string.",
    },
  ];

  const handleRunComparison = async (overrideSeq = null) => {
    setError(null);
    setLoading(true);

    try {
      const seqStr = overrideSeq !== null ? overrideSeq : sequenceInput;
      const parsedRequests = seqStr
        .split(/[,;\s]+/)
        .map((x) => x.trim())
        .filter((x) => x !== "")
        .map((x) => parseInt(x, 10))
        .filter((x) => !isNaN(x) && x >= 0);

      if (parsedRequests.length === 0) {
        throw new Error("Please provide at least one valid page number in the reference sequence.");
      }

      const res = await api.compareAlgorithms({
        bufferPoolSize: parseInt(frames, 10) || 3,
        physicalFrames: parseInt(frames, 10) || 3,
        pageSize: defaultPageSize,
        requests: parsedRequests,
      });

      if (!res.success) {
        throw new Error(res.message || "Failed to compare algorithms.");
      }

      setComparisonData(res);
    } catch (err) {
      setError(err.message || "Error running comparison.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel comparison-panel">
      <div className="panel-header">
        <div>
          <h2>Replacement Policy Comparison (LRU vs FIFO vs Clock)</h2>
          <p>
            Fair, synchronized benchmark: identical reference sequence &amp; frame capacity executed on C++ engine
          </p>
        </div>

        <button
          type="button"
          className="run-btn"
          disabled={loading}
          onClick={() => handleRunComparison()}
        >
          {loading ? "Simulating All 3 Engines..." : "⚡ Run Fair Comparison"}
        </button>
      </div>

      <div className="comparison-config-strip">
        <div className="config-item">
          <label>Physical Frames (Capacity):</label>
          <input
            type="number"
            min="1"
            max="32"
            value={frames}
            onChange={(e) => setFrames(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="config-input-sm"
          />
        </div>

        <div className="config-item config-item-grow">
          <label>Page Reference Sequence:</label>
          <input
            type="text"
            value={sequenceInput}
            onChange={(e) => setSequenceInput(e.target.value)}
            placeholder="e.g. 1, 2, 3, 1, 4, 2, 5, 1"
            className="config-input-seq"
          />
        </div>
      </div>

      <div className="preset-buttons-row">
        <span className="preset-label">Workload Presets:</span>
        {presets.map((p) => (
          <button
            key={p.name}
            type="button"
            className="preset-chip"
            onClick={() => {
              setSequenceInput(p.seq);
              handleRunComparison(p.seq);
            }}
            title={p.desc}
          >
            {p.name}
          </button>
        ))}
      </div>

      {error && (
        <div className="comparison-error-banner">
          <strong>Error:</strong> {error}
        </div>
      )}

      {comparisonData && (
        <div className="comparison-results-section">
          {comparisonData.bestAlgorithms && (
            <div className="winner-banner">
              <span className="trophy-icon">🏆</span>
              <div>
                <strong>
                  Best Performance: {comparisonData.bestAlgorithms.join(" & ")}
                </strong>
                <p>
                  Produced the lowest page fault count ({
                    comparisonData.summary.find((s) => s.algorithm === comparisonData.bestAlgorithms[0])?.pageFaults
                  } faults) for this specific workload.
                </p>
              </div>
            </div>
          )}

          <div className="comparison-cards-grid">
            {comparisonData.summary.map((item) => {
              const isWinner = comparisonData.bestAlgorithms.includes(item.algorithm);

              return (
                <div
                  key={item.algorithm}
                  className={`comparison-card ${isWinner ? "card-winner" : ""}`}
                >
                  <div className="card-top">
                    <span className="algo-title">{item.algorithm}</span>
                    {isWinner && <span className="winner-tag">Lowest Faults</span>}
                  </div>

                  <div className="card-metrics-table">
                    <div className="metric-row">
                      <span>Page Hits:</span>
                      <strong className="text-green">{item.hits}</strong>
                    </div>
                    <div className="metric-row">
                      <span>Page Faults:</span>
                      <strong className="text-red">{item.pageFaults}</strong>
                    </div>
                    <div className="metric-row">
                      <span>Hit Ratio:</span>
                      <strong className="text-accent">{Number(item.hitRatio || 0).toFixed(1)}%</strong>
                    </div>
                    <div className="metric-row">
                      <span>Fault Rate:</span>
                      <strong className="text-amber">{Number(item.pageFaultRate || 0).toFixed(1)}%</strong>
                    </div>
                    <div className="metric-row">
                      <span>Evictions:</span>
                      <span>{item.evictions}</span>
                    </div>
                    <div className="metric-row">
                      <span>Engine Latency:</span>
                      <span className="text-muted">{item.executionTimeMs} ms</span>
                    </div>
                  </div>

                  <div className="mini-bar-group">
                    <span className="bar-label">Hit Ratio Bar</span>
                    <div className="bar-track">
                      <div
                        className="bar-fill-hit"
                        style={{ width: `${Math.min(100, item.hitRatio || 0)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="comparison-insight-box">
            <span className="insight-icon">💡</span>
            <div>
              <strong>Systems Engineering Insight:</strong>
              <p>
                No single page replacement algorithm is universally optimal across all memory access patterns.
                <strong> LRU</strong> relies on the principle of temporal locality, excelling when recently accessed pages are likely to be accessed again.
                <strong> FIFO</strong> replaces the oldest loaded page, making it computationally simple (O(1)) but susceptible to Belady's Anomaly where additional frames can yield more faults.
                <strong> Clock (Second-Chance)</strong> uses a circular buffer and referenced bit to approximate LRU behavior with hardware-efficient O(1) pointer updates.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AlgorithmComparison;
