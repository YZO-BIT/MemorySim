import React, { useState, useEffect } from "react";
import Dashboard from "./pages/Dashboard";
import Simulation from "./pages/Simulation";
import Experiments from "./pages/Experiments";
import AlgorithmComparison from "./components/AlgorithmComparison";
import api from "./services/api";
import { mockSimulation } from "./data/mockSimulation";

function App() {
  const [page, setPage] = useState("dashboard");
  const [simulationData, setSimulationData] = useState(null);
  const [isLiveResult, setIsLiveResult] = useState(false);
  const [engineOnline, setEngineOnline] = useState(false);
  const [lastConfig, setLastConfig] = useState(null);

  useEffect(() => {
    let isMounted = true;

    api.getStatus()
      .then((status) => {
        if (!isMounted) return;
        if (status.engineAvailable) {
          setEngineOnline(true);

          const initialPayload = {
            algorithm: "LRU",
            bufferPoolSize: 3,
            virtualPages: 10,
            physicalFrames: 3,
            pageSize: 4096,
            workloadType: "Repeating Pattern",
            totalRequests: 8,
            requests: [1, 2, 3, 1, 4, 2, 5, 1],
          };

          api.runSimulation(initialPayload)
            .then((res) => {
              if (!isMounted) return;
              if (res.success) {
                setSimulationData(res);
                setIsLiveResult(true);
                setLastConfig(initialPayload);
              }
            })
            .catch(() => {
              
            });
        }
      })
      .catch(() => {
        if (isMounted) setEngineOnline(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSimulationComplete = (result) => {
    setSimulationData(result);
    setIsLiveResult(true);
    if (result.config) {
      setLastConfig({
        algorithm: result.config.algorithm,
        bufferPoolSize: result.config.bufferPoolSize,
        virtualPages: result.config.virtualPages,
        physicalFrames: result.config.physicalFrames,
        pageSize: result.config.pageSize,
        workloadType: result.config.workloadType,
        totalRequests: result.config.totalRequests,
        requests: result.sequence || [],
      });
    }
    setPage("dashboard");
  };

  const handleRestartSimulation = async () => {
    if (!lastConfig) return;
    try {
      const res = await api.runSimulation(lastConfig);
      if (res.success) {
        setSimulationData(res);
        setIsLiveResult(true);
      }
    } catch (err) {
      console.warn("Could not restart simulation:", err);
    }
  };

  const handleSelectExperiment = (exp) => {
    const frames = exp.bufferSize || exp.physicalFrames || 3;
    const config = {
      algorithm: exp.algorithm || "LRU",
      bufferPoolSize: frames,
      virtualPages: exp.virtualFrames || 10,
      physicalFrames: frames,
      pageSize: exp.pageSize || 4096,
      workloadType: exp.workloadType || "Random",
      totalRequests: exp.totalRequests || 16,
    };
    api.runSimulation(config)
      .then((res) => {
        if (res.success) {
          handleSimulationComplete(res);
        }
      })
      .catch(() => {
        setPage("simulation");
      });
  };

  const currentSimulation = simulationData || mockSimulation;

  const renderPage = () => {
    if (page === "simulation") {
      return (
        <Simulation
          onSimulationComplete={handleSimulationComplete}
          onCancel={() => setPage("dashboard")}
        />
      );
    }

    if (page === "comparison") {
      return (
        <div className="page">
          <div className="page-title">
            <div>
              <h1>Algorithm Comparison Hub</h1>
              <p>Compare LRU, FIFO, and Clock on identical workloads with C++ engine execution</p>
            </div>
            <button type="button" className="btn-secondary" onClick={() => setPage("dashboard")}>
              ← Back to Dashboard
            </button>
          </div>
          <AlgorithmComparison
            defaultSequence={currentSimulation?.sequence || [1, 2, 3, 1, 4, 2, 5, 1]}
            defaultFrames={currentSimulation?.config?.bufferPoolSize || 3}
            defaultPageSize={currentSimulation?.config?.pageSize || 4096}
          />
        </div>
      );
    }

    if (page === "experiments") {
      return <Experiments onSelectExperiment={handleSelectExperiment} />;
    }

    return (
      <Dashboard
        simulation={currentSimulation}
        isLive={isLiveResult}
        onNewSimulation={() => setPage("simulation")}
        onRestartSimulation={handleRestartSimulation}
        onOpenComparison={() => setPage("comparison")}
      />
    );
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo" onClick={() => setPage("dashboard")} style={{ cursor: "pointer" }}>
          <div className="logo-icon">M</div>

          <div>
            <strong>MemorySim</strong>
            <span>Storage &amp; Memory Simulator</span>
          </div>
        </div>

        <nav>
          <button
            type="button"
            className={page === "dashboard" ? "active" : ""}
            onClick={() => setPage("dashboard")}
          >
            <span>▦</span>
            Dashboard
          </button>

          <button
            type="button"
            className={page === "simulation" ? "active" : ""}
            onClick={() => setPage("simulation")}
          >
            <span>▶</span>
            New Simulation
          </button>

          <button
            type="button"
            className={page === "comparison" ? "active" : ""}
            onClick={() => setPage("comparison")}
          >
            <span>~</span>
            Compare Policies
          </button>

          <button
            type="button"
            className={page === "experiments" ? "active" : ""}
            onClick={() => setPage("experiments")}
          >
            <span>◫</span>
            Experiment History
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="system-info">
            <span
              className="online-dot"
              style={{ background: engineOnline ? "#4ade80" : "#facc15" }}
            ></span>
            {engineOnline ? "C++ Engine Online" : "Engine Standby"}
          </div>

          <div className="version">
            C++20 Simulation Core
          </div>
        </div>
      </aside>

      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;