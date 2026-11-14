import React, { useState } from "react";

function ReferenceHistoryTable({ steps = [], currentStepIndex = 0, onSelectStep }) {
  const [filter, setFilter] = useState("ALL");

  const filteredSteps = steps.filter((st) => {
    if (filter === "HITS") return st.result === "HIT";
    if (filter === "FAULTS") return st.result !== "HIT";
    return true;
  });

  return (
    <div className="panel history-table-panel">
      <div className="panel-header">
        <div>
          <h2>Page Reference History</h2>
          <p>Step-by-step audit log of memory requests and replacement outcomes</p>
        </div>

        <div className="table-filter-group">
          <button
            type="button"
            className={`filter-btn ${filter === "ALL" ? "active" : ""}`}
            onClick={() => setFilter("ALL")}
          >
            All ({steps.length})
          </button>
          <button
            type="button"
            className={`filter-btn ${filter === "HITS" ? "active" : ""}`}
            onClick={() => setFilter("HITS")}
          >
            Hits ({steps.filter((s) => s.result === "HIT").length})
          </button>
          <button
            type="button"
            className={`filter-btn ${filter === "FAULTS" ? "active" : ""}`}
            onClick={() => setFilter("FAULTS")}
          >
            Faults ({steps.filter((s) => s.result !== "HIT").length})
          </button>
        </div>
      </div>

      <div className="table-container history-scroll-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: "70px" }}>Step</th>
              <th>Requested Page</th>
              <th>Result</th>
              <th>Frame</th>
              <th>Evicted Page</th>
              <th>Running Ratio</th>
              <th style={{ textAlign: "right" }}>Jump</th>
            </tr>
          </thead>

          <tbody>
            {filteredSteps.map((st) => {
              const isActive = st.step === currentStepIndex;
              const isHit = st.result === "HIT";
              const isEviction = st.evictedPage !== null && st.evictedPage !== undefined;

              return (
                <tr
                  key={st.step}
                  className={`history-row ${isActive ? "history-row-active" : ""}`}
                  onClick={() => onSelectStep && onSelectStep(st.step)}
                  title={`Click to jump to Step ${st.step}`}
                  style={{ cursor: "pointer" }}
                >
                  <td>
                    <span className={`step-pill ${isActive ? "step-pill-active" : ""}`}>
                      #{st.step}
                    </span>
                  </td>

                  <td>
                    <strong className="text-white">Page {st.requestedPage}</strong>
                  </td>

                  <td>
                    <span className={`result-badge ${isHit ? "badge-success" : "badge-danger"}`}>
                      {isHit ? "✓ HIT" : "⚠ FAULT"}
                    </span>
                  </td>

                  <td>
                    <span className="frame-tag">
                      Frame {st.frame}
                    </span>
                  </td>

                  <td>
                    {isEviction ? (
                      <span className="text-evicted">Page {st.evictedPage}</span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>

                  <td>
                    <div className="running-ratio-mini">
                      <span>{Number(st.runningHitRatio || 0).toFixed(0)}% Hit</span>
                    </div>
                  </td>

                  <td style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      className="jump-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectStep) onSelectStep(st.step);
                      }}
                    >
                      {isActive ? "● Active" : "Jump →"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ReferenceHistoryTable;
