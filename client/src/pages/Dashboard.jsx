import React, { useState, useEffect } from "react";
import PhysicalMemoryView from "../components/PhysicalMemoryView";
import CurrentStepBanner from "../components/CurrentStepBanner";
import PlaybackControls from "../components/PlaybackControls";
import ReferenceHistoryTable from "../components/ReferenceHistoryTable";
import FrameTimeline from "../components/FrameTimeline";
import StatsCards from "../components/StatsCards";
import AlgorithmComparison from "../components/AlgorithmComparison";
import EventLog from "../components/EventLog";

function Dashboard({
  simulation,
  isLive = false,
  onNewSimulation,
  onRestartSimulation,
  onOpenComparison,
}) {
  const config = simulation?.config || {};
  const metrics = simulation?.metrics || {};
  const steps = simulation?.steps || [];
  const bufferPool = simulation?.bufferPool || [];
  const virtualMemory = simulation?.virtualMemory || [];
  const events = simulation?.events || [];
  const frameCount = config.bufferPoolSize || config.physicalFrames || bufferPool.length || 3;

  const [currentStepIndex, setCurrentStepIndex] = useState(steps.length > 0 ? 1 : 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState("timeline");

  useEffect(() => {
    setIsPlaying(false);
    if (steps.length > 0) {
      setCurrentStepIndex(1);
    } else {
      setCurrentStepIndex(0);
    }
  }, [simulation]);

  const getDisplayFrames = () => {
    if (currentStepIndex === 0) {
      return Array.from({ length: frameCount }, (_, i) => ({
        frameId: i,
        pageId: null,
        dirty: false,
        pinCount: 0,
      }));
    }

    const currentStepRecord = steps[currentStepIndex - 1];
    if (currentStepRecord && Array.isArray(currentStepRecord.frames) && currentStepRecord.frames.length > 0) {
      return currentStepRecord.frames;
    }

    return bufferPool.length > 0
      ? bufferPool
      : Array.from({ length: frameCount }, (_, i) => ({
          frameId: i,
          pageId: null,
          dirty: false,
          pinCount: 0,
        }));
  };

  const currentStep = currentStepIndex > 0 && steps.length >= currentStepIndex
    ? steps[currentStepIndex - 1]
    : null;

  const displayFrames = getDisplayFrames();

  return (
    <div className="page dashboard-page">
      {}
      <div className="page-title dashboard-header">
        <div>
          <div className="title-row">
            <h1>MemorySim Dashboard</h1>
          </div>
          <p>
            Interactive physical memory frame allocation, step-by-step playback &amp; page replacement tracking
          </p>
        </div>

        <div className="header-action-buttons">
          {onNewSimulation && (
            <button
              type="button"
              className="btn-primary"
              onClick={onNewSimulation}
              title="Configure a new simulation with custom RAM, frames & workload"
            >
              + New Simulation
            </button>
          )}

          <button
            type="button"
            className="btn-secondary"
            onClick={() => setActiveTab("compare")}
            title="Compare LRU, FIFO, Clock on this workload"
          >
            ~ Compare Policies
          </button>
        </div>
      </div>

      {!isLive && onNewSimulation && (
        <div className="preview-banner">
          <div className="preview-info">
            <strong>Preview Mode:</strong> Currently viewing a sample demonstration. Click "New Simulation" to run live C++ memory simulations.
          </div>
          <button type="button" className="btn-accent-sm" onClick={onNewSimulation}>
            Run Live Simulation →
          </button>
        </div>
      )}

      {}
      <PlaybackControls
        currentStepIndex={currentStepIndex}
        totalSteps={steps.length}
        onStepChange={setCurrentStepIndex}
        onRestart={onRestartSimulation || onNewSimulation}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
      />

      {}
      <CurrentStepBanner
        currentStep={currentStep}
        totalSteps={steps.length}
      />

      {}
      <PhysicalMemoryView
        frames={displayFrames}
        currentStep={currentStep}
        algorithm={config.algorithm || "LRU"}
        pageSize={config.pageSize || 4096}
      />

      {}
      <StatsCards
        config={config}
        metrics={metrics}
        currentStep={currentStep}
      />

      {}
      <div className="dashboard-tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === "timeline" ? "active" : ""}`}
          onClick={() => setActiveTab("timeline")}
        >
          ▦ Frame Allocation Timeline
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          📋 Reference History Table
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "compare" ? "active" : ""}`}
          onClick={() => setActiveTab("compare")}
        >
          🧠 Algorithm Comparison (LRU vs FIFO vs Clock)
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "events" ? "active" : ""}`}
          onClick={() => setActiveTab("events")}
        >
          📑 Event Audit Log
        </button>
      </div>

      {}
      <div className="tab-content-area">
        {activeTab === "timeline" && (
          <FrameTimeline
            steps={steps}
            frameCount={frameCount}
            currentStepIndex={currentStepIndex}
            onSelectStep={(s) => {
              setIsPlaying(false);
              setCurrentStepIndex(s);
            }}
          />
        )}

        {activeTab === "history" && (
          <ReferenceHistoryTable
            steps={steps}
            currentStepIndex={currentStepIndex}
            onSelectStep={(s) => {
              setIsPlaying(false);
              setCurrentStepIndex(s);
            }}
          />
        )}

        {activeTab === "compare" && (
          <AlgorithmComparison
            defaultSequence={simulation?.sequence || steps.map((s) => s.requestedPage)}
            defaultFrames={frameCount}
            defaultPageSize={config.pageSize || 4096}
          />
        )}

        {activeTab === "events" && (
          <EventLog events={events} />
        )}
      </div>
    </div>
  );
}

export default Dashboard;