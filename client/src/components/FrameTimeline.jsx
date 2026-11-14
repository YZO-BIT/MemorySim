import React from "react";

function FrameTimeline({
  steps = [],
  frameCount = 3,
  currentStepIndex = 0,
  onSelectStep,
}) {
  const frameIndices = Array.from({ length: frameCount }, (_, i) => i);

  return (
    <div className="panel timeline-panel">
      <div className="panel-header">
        <div>
          <h2>Frame Allocation Timeline</h2>
          <p>Historical frame residency map across all page references</p>
        </div>

        <div className="timeline-legend">
          <span className="legend-item"><span className="legend-box box-hit"></span> Hit</span>
          <span className="legend-item"><span className="legend-box box-load"></span> Loaded</span>
          <span className="legend-item"><span className="legend-box box-evict"></span> Replaced</span>
          <span className="legend-item"><span className="legend-box box-idle"></span> Preserved</span>
        </div>
      </div>

      <div className="table-container timeline-scroll-container">
        <table className="timeline-table">
          <thead>
            <tr>
              <th className="sticky-col th-step">Step</th>
              <th className="sticky-col-2 th-req">Req Page</th>
              <th className="th-outcome">Result</th>
              {frameIndices.map((fIdx) => (
                <th key={fIdx} className="th-frame">
                  Frame {fIdx}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {steps.map((st) => {
              const isActive = st.step === currentStepIndex;
              const isHit = st.result === "HIT";
              const isEviction = st.evictedPage !== null && st.evictedPage !== undefined;

              return (
                <tr
                  key={st.step}
                  className={`timeline-row ${isActive ? "timeline-row-active" : ""}`}
                  onClick={() => onSelectStep && onSelectStep(st.step)}
                  title={`Jump to Step ${st.step}`}
                  style={{ cursor: "pointer" }}
                >
                  <td className="sticky-col td-step">
                    <span className={`step-badge-mini ${isActive ? "active" : ""}`}>
                      {st.step}
                    </span>
                  </td>

                  <td className="sticky-col-2 td-req">
                    <strong>P{st.requestedPage}</strong>
                  </td>

                  <td className="td-outcome">
                    <span className={`outcome-pill ${isHit ? "pill-hit" : "pill-fault"}`}>
                      {isHit ? "HIT" : "FAULT"}
                    </span>
                  </td>

                  {frameIndices.map((fIdx) => {
                    const frameData = st.frames ? st.frames.find((f) => f.frameId === fIdx) : null;
                    const pageInFrame = frameData && frameData.pageId !== null && frameData.pageId !== undefined
                      ? frameData.pageId
                      : null;

                    const isAffectedFrame = st.frame === fIdx;

                    let cellClass = "timeline-cell-idle";
                    let badge = null;

                    if (isAffectedFrame) {
                      if (isHit) {
                        cellClass = "timeline-cell-hit";
                        badge = <span className="cell-indicator indicator-hit">HIT</span>;
                      } else if (isEviction) {
                        cellClass = "timeline-cell-evict";
                        badge = <span className="cell-indicator indicator-evict">↻ P{st.evictedPage}</span>;
                      } else {
                        cellClass = "timeline-cell-load";
                        badge = <span className="cell-indicator indicator-load">+ NEW</span>;
                      }
                    }

                    return (
                      <td key={fIdx} className={`timeline-cell ${cellClass}`}>
                        <div className="cell-inner">
                          {pageInFrame !== null ? (
                            <span className="cell-page-text">Page {pageInFrame}</span>
                          ) : (
                            <span className="cell-empty-text">—</span>
                          )}
                          {badge}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default FrameTimeline;
