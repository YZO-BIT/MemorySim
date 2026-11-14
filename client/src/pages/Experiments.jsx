import React, { useState, useEffect } from "react";
import api from "../services/api";

function Experiments({ onSelectExperiment }) {
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbConnected, setDbConnected] = useState(true);
  const [error, setError] = useState(null);
  const [selectedExperiment, setSelectedExperiment] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [clearing, setClearing] = useState(false);

  const fetchExperiments = () => {
    setLoading(true);
    api.getExperiments()
      .then((res) => {
        setDbConnected(res.dbConnected !== false);
        setExperiments(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => {
        setError(err.message || "Could not retrieve experiments.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchExperiments();
  }, []);

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this experiment?")) {
      return;
    }

    try {
      setDeletingId(id);
      await api.deleteExperiment(id);
      setExperiments((prev) => prev.filter((exp) => exp._id !== id));
      if (selectedExperiment && selectedExperiment._id === id) {
        setSelectedExperiment(null);
      }
    } catch (err) {
      alert(err.message || "Failed to delete experiment.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to clear ALL experiment history? This action cannot be undone.")) {
      return;
    }

    try {
      setClearing(true);
      await api.clearAllExperiments();
      setExperiments([]);
      setSelectedExperiment(null);
    } catch (err) {
      alert(err.message || "Failed to clear history.");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="page experiments-page">
      <div className="page-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1>Experiment History &amp; Benchmark Archive</h1>
          <p>Historical simulation runs persisted in database storage</p>
        </div>
        {dbConnected && experiments.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            disabled={clearing}
            style={{
              background: "rgba(239, 68, 68, 0.15)",
              color: "#ef4444",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              borderRadius: "6px",
              padding: "6px 14px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: clearing ? "not-allowed" : "pointer",
            }}
          >
            {clearing ? "Clearing..." : "Clear All History"}
          </button>
        )}
      </div>

      {!dbConnected && !loading && (
        <div className="db-offline-banner">
          <span className="info-icon">ⓘ</span>
          <div>
            <strong>MongoDB Persistence Offline:</strong>
            <p>
              MongoDB is currently disconnected or running in standalone mode. Core memory simulations run with 100% fidelity on the C++ engine, but historical database saving is paused.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="error-banner">
          <span className="error-icon">✕</span>
          <div className="error-text">{error}</div>
        </div>
      )}

      <div className="panel">
        <div className="table-container">
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
              Loading experiments...
            </div>
          ) : experiments.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
              {dbConnected
                ? "No saved experiments found. Run a new simulation to generate persistent benchmark records."
                : "Database offline. Start MongoDB service to enable persistent historical logging."}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Date &amp; Time</th>
                  <th>Algorithm</th>
                  <th>Workload</th>
                  <th>RAM / Frames</th>
                  <th>References</th>
                  <th>Hits / Faults</th>
                  <th>Hit Ratio</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {experiments.map((exp, idx) => {
                  const frames = exp.bufferSize || exp.physicalFrames || 3;
                  const pageSize = exp.pageSize || 4096;
                  const ramKb = ((frames * pageSize) / 1024).toFixed(0);
                  const hits = exp.bufferHits ?? 0;
                  const faults = exp.pageFaults ?? 0;
                  const dateStr = exp.createdAt
                    ? new Date(exp.createdAt).toLocaleString()
                    : "Recent";

                  return (
                    <tr key={exp._id || idx}>
                      <td>
                        <span className="experiment-id-pill">
                          #{String(exp._id || idx + 1).slice(-6)}
                        </span>
                      </td>
                      <td style={{ fontSize: "12px", color: "var(--muted)" }}>{dateStr}</td>
                      <td>
                        <strong className="algo-badge-sm">{exp.algorithm}</strong>
                      </td>
                      <td>{exp.workloadType || "Random"}</td>
                      <td>
                        <span>{ramKb} KB ({frames} frames)</span>
                      </td>
                      <td>{exp.totalRequests?.toLocaleString() || "—"}</td>
                      <td>
                        <span className="text-green">{hits}</span> / <span className="text-red">{faults}</span>
                      </td>
                      <td>
                        <strong className="text-accent">
                          {exp.bufferHitRatio != null ? `${Number(exp.bufferHitRatio).toFixed(1)}%` : "—"}
                        </strong>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px" }}>
                          <button
                            type="button"
                            className="btn-inspect"
                            onClick={() => setSelectedExperiment(exp)}
                          >
                            View Details
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDelete(exp._id, e)}
                            disabled={deletingId === exp._id}
                            style={{
                              background: "transparent",
                              border: "1px solid rgba(239, 68, 68, 0.3)",
                              color: "#ef4444",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            {deletingId === exp._id ? "..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedExperiment && (
        <div className="modal-backdrop" onClick={() => setSelectedExperiment(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Experiment #{String(selectedExperiment._id).slice(-8)}</h2>
                <span className="modal-date">
                  {selectedExperiment.createdAt ? new Date(selectedExperiment.createdAt).toUTCString() : "Historical"}
                </span>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setSelectedExperiment(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-grid">
              <div className="modal-item">
                <span className="label">Algorithm:</span>
                <strong className="value text-accent">{selectedExperiment.algorithm}</strong>
              </div>
              <div className="modal-item">
                <span className="label">Workload Pattern:</span>
                <strong className="value">{selectedExperiment.workloadType || "Random"}</strong>
              </div>
              <div className="modal-item">
                <span className="label">Buffer Pool Frames:</span>
                <strong className="value">{selectedExperiment.bufferSize || selectedExperiment.physicalFrames} Frames</strong>
              </div>
              <div className="modal-item">
                <span className="label">RAM Size:</span>
                <strong className="value">
                  {(((selectedExperiment.bufferSize || 3) * (selectedExperiment.pageSize || 4096)) / 1024).toFixed(0)} KB
                </strong>
              </div>
              <div className="modal-item">
                <span className="label">Total Page Requests:</span>
                <strong className="value">{selectedExperiment.totalRequests}</strong>
              </div>
              <div className="modal-item">
                <span className="label">Buffer Hits:</span>
                <strong className="value text-green">{selectedExperiment.bufferHits}</strong>
              </div>
              <div className="modal-item">
                <span className="label">Page Faults:</span>
                <strong className="value text-red">{selectedExperiment.pageFaults}</strong>
              </div>
              <div className="modal-item">
                <span className="label">Hit Ratio:</span>
                <strong className="value text-accent">
                  {Number(selectedExperiment.bufferHitRatio || 0).toFixed(2)}%
                </strong>
              </div>
              <div className="modal-item">
                <span className="label">Disk Reads / Writes:</span>
                <strong className="value">
                  {selectedExperiment.diskReads || 0} reads / {selectedExperiment.diskWrites || 0} writes
                </strong>
              </div>
              <div className="modal-item">
                <span className="label">Replacements / Evictions:</span>
                <strong className="value">{selectedExperiment.evictions || 0}</strong>
              </div>
            </div>

            <div className="modal-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => handleDelete(selectedExperiment._id)}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  color: "#ef4444",
                  padding: "8px 14px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Delete This Experiment
              </button>

              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  if (onSelectExperiment) {
                    onSelectExperiment(selectedExperiment);
                  }
                  setSelectedExperiment(null);
                }}
              >
                Load Experiment Parameters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Experiments;