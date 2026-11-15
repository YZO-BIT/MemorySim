import React from "react";

function PhysicalMemoryView({
  frames = [],
  currentStep = null,
  algorithm = "LRU",
  pageSize = 4096,
  onModifyPage = null,
}) {
  const affectedFrameId = currentStep ? currentStep.frame : -1;
  const isHit = currentStep?.result === "HIT";
  const isEviction = currentStep?.evictedPage !== null && currentStep?.evictedPage !== undefined;
  const isLoaded = !isHit && currentStep?.loadedPage !== null && currentStep?.loadedPage !== undefined;

  return (
    <div className="panel physical-memory-panel">
      <div className="panel-header">
        <div>
          <h2>Physical Memory (RAM) — Frame Allocation</h2>
          <p>
            {frames.length} Frame{frames.length !== 1 ? "s" : ""} × {(pageSize / 1024).toFixed(0)} KB ={" "}
            {((frames.length * pageSize) / 1024).toFixed(0)} KB Total RAM
          </p>
        </div>

        <div className="header-badges">
          <span className="badge badge-accent">{algorithm} Policy</span>
          <span className="badge badge-neutral">Page Size: {(pageSize / 1024).toFixed(0)} KB</span>
        </div>
      </div>

      <div className="frames-grid">
        {frames.map((frame) => {
          const isCurrentTarget = affectedFrameId === frame.frameId && currentStep !== null;
          const isOccupied = frame.pageId !== null && frame.pageId !== undefined;

          let highlightClass = "";
          let actionBadge = null;

          if (isCurrentTarget) {
            if (isHit) {
              highlightClass = "frame-hit-glow";
              actionBadge = <span className="frame-action-badge badge-hit">✓ HIT (In-Memory)</span>;
            } else if (isEviction) {
              highlightClass = "frame-evict-glow";
              actionBadge = (
                <span className="frame-action-badge badge-evict">
                  ↻ REPLACED: P{currentStep.evictedPage} → P{currentStep.loadedPage}
                </span>
              );
            } else if (isLoaded) {
              highlightClass = "frame-load-glow";
              actionBadge = <span className="frame-action-badge badge-load">+ LOADED: Page {currentStep.loadedPage}</span>;
            }
          }

          return (
            <div
              key={frame.frameId}
              className={`frame-card ${isOccupied ? "frame-occupied" : "frame-empty"} ${highlightClass}`}
              style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}
            >
              <div>
                <div className="frame-card-header">
                  <span className="frame-label">Frame {frame.frameId}</span>
                  <span className={`status-pill ${isOccupied ? "pill-occupied" : "pill-available"}`}>
                    {isOccupied ? "Occupied" : "Available"}
                  </span>
                </div>

                {actionBadge}

                <div className="frame-content">
                  {isOccupied ? (
                    <div className="page-slot page-active">
                      <span className="page-prefix">Database Page</span>
                      <strong className="page-id">Page {frame.pageId}</strong>
                      {frame.data && (
                        <div
                          style={{
                            fontSize: "11px",
                            color: "var(--muted)",
                            marginTop: "6px",
                            background: "rgba(0,0,0,0.3)",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            wordBreak: "break-word",
                          }}
                        >
                          "{frame.data}"
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="page-slot page-vacant">
                      <span className="vacant-icon">◌</span>
                      <strong className="vacant-text">Empty</strong>
                      <span className="vacant-sub">Slot Available</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="frame-meta">
                  <div className="meta-item">
                    <span>State:</span>
                    <span className={frame.dirty ? "meta-value text-amber" : "meta-value text-green"}>
                      {frame.dirty ? "● DIRTY" : "○ Clean"}
                    </span>
                  </div>

                  <div className="meta-item">
                    <span>Pin Count:</span>
                    <span className="meta-value">{frame.pinCount ?? 0}</span>
                  </div>
                </div>

                {isOccupied && onModifyPage && (
                  <button
                    type="button"
                    onClick={() => onModifyPage(frame.frameId, frame.pageId, frame.data)}
                    style={{
                      width: "100%",
                      marginTop: "10px",
                      background: frame.dirty ? "rgba(245, 158, 11, 0.15)" : "rgba(94, 234, 212, 0.1)",
                      border: `1px solid ${frame.dirty ? "#f59e0b" : "var(--accent)"}`,
                      color: frame.dirty ? "#f59e0b" : "var(--accent)",
                      borderRadius: "6px",
                      padding: "6px 10px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "0.2s",
                    }}
                  >
                    ✏️ {frame.dirty ? "Edit Dirty Page" : "Modify (Write in RAM)"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PhysicalMemoryView;