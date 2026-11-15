import React, { useState, useEffect } from "react";
import PhysicalMemoryView from "../components/PhysicalMemoryView";
import CurrentStepBanner from "../components/CurrentStepBanner";
import PlaybackControls from "../components/PlaybackControls";
import ReferenceHistoryTable from "../components/ReferenceHistoryTable";
import FrameTimeline from "../components/FrameTimeline";
import StatsCards from "../components/StatsCards";
import AlgorithmComparison from "../components/AlgorithmComparison";
import PageTable from "../components/PageTable";
import DiskView from "../components/DiskView";
import EventLog from "../components/EventLog";
import {
  IconPlus,
  IconCompare,
  IconList,
  IconDatabase,
  IconLayers,
  IconClock,
} from "../components/icons";

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

  // Active step index: 0 = initial state (before any requests), 1..N = after step 1..N
  const [currentStepIndex, setCurrentStepIndex] = useState(steps.length > 0 ? 1 : 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState("timeline"); // "timeline", "history", "compare", "vm"

  // When a new simulation is loaded, reset to Step 1 (or 0)
  useEffect(() => {
    setIsPlaying(false);
    if (steps.length > 0) {
      setCurrentStepIndex(1);
    } else {
      setCurrentStepIndex(0);
    }
  }, [simulation]);

  // Derive frame state for current step
  const getDisplayFrames = () => {
    if (currentStepIndex === 0) {
      // Step 0: All frames empty
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

    // Fallback to final bufferPool
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
      {/* Top Header */}
      <div className="page-title dashboard-header">
        <div>
          <div className="title-row">
            <h1>MemorySim Dashboard</h1>
            <span className={`live-status-pill ${isLive ? "pill-live" : "pill-sample"}`}>
              <span className="pulsing-dot"></span>
              {isLive ? `Live Engine Run (${config.algorithm || "LRU"})` : "Sample / Standby"}
            </span>
          </div>
          <p>
            Interactive physical memory frame allocation, step-by-step playback &amp; page replacement tracking
          </p>
        </div>

        <div className="header-actions">
          {onNewSimulation && (
            <button
              type="button"
              className="btn-primary"
              onClick={onNewSimulation}
              title="Configure a new simulation with custom RAM, frames & workload"
            >
              <IconPlus size={14} />
              New Simulation
            </button>
          )}

          <button
            type="button"
            className="btn-secondary"
            onClick={() => setActiveTab("compare")}
            title="Compare LRU, FIFO, Clock, Optimal on this workload"
          >
            <IconCompare size={14} />
            Compare Policies
          </button>
        </div>
      </div>

      {!isLive && onNewSimulation && (
        <div className="preview-banner">
          <div className="preview-info">
            <strong>Preview Mode:</strong> Currently viewing a sample demonstration. Click "New Simulation" to run live C++ memory simulations.
          </div>
          <button type="button" className="btn-accent-sm" onClick={onNewSimulation}>
            Run Live Simulation
          </button>
        </div>
      )}

      {/* Playback Controls Strip */}
      <PlaybackControls
        currentStepIndex={currentStepIndex}
        totalSteps={steps.length}
        onStepChange={setCurrentStepIndex}
        onRestart={onRestartSimulation || onNewSimulation}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
      />

      {/* Current Step Immediate Visual Banner */}
      <CurrentStepBanner
        currentStep={currentStep}
        totalSteps={steps.length}
      />

      {/* Physical Memory / Frame Allocation Visualization */}
      <PhysicalMemoryView
        frames={displayFrames}
        currentStep={currentStep}
        algorithm={config.algorithm || "LRU"}
        pageSize={config.pageSize || 4096}
      />

      {/* Statistics Cards */}
      <StatsCards
        config={config}
        metrics={metrics}
        currentStep={currentStep}
      />

      {/* Navigation Tabs for Analytical Views */}
      <div className="dashboard-tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === "timeline" ? "active" : ""}`}
          onClick={() => setActiveTab("timeline")}
        >
          <IconLayers size={13} />
          Frame Timeline
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          <IconList size={13} />
          Reference History
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "compare" ? "active" : ""}`}
          onClick={() => setActiveTab("compare")}
        >
          <IconCompare size={13} />
          Algorithm Comparison
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "vm" ? "active" : ""}`}
          onClick={() => setActiveTab("vm")}
        >
          <IconDatabase size={13} />
          Page Table &amp; Architecture
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "events" ? "active" : ""}`}
          onClick={() => setActiveTab("events")}
        >
          <IconClock size={13} />
          Event Audit Log
        </button>
      </div>

      {/* Tab Panels */}
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

        {activeTab === "vm" && (
          <div className="two-column">
            <PageTable virtualMemory={virtualMemory} />
            <DiskView diskPages={config.virtualPages || 16} />
          </div>
        )}

        {activeTab === "events" && (
          <EventLog events={events} />
        )}
      </div>
    </div>
  );
}

export default Dashboard;