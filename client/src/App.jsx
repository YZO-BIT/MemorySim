import React, { useState, useEffect } from "react";
import Dashboard from "./pages/Dashboard";
import Simulation from "./pages/Simulation";
import Experiments from "./pages/Experiments";
import AlgorithmComparison from "./components/AlgorithmComparison";
import api from "./services/api";
import { mockSimulation } from "./data/mockSimulation";
import {
  IconGrid,
  IconPlus,
  IconArchive,
  IconCompare,
  IconMenu,
  IconCpu,
  IconChevron,
} from "./components/icons";

const NAV_SECTIONS = [
  {
    label: "Workspace",
    items: [
      { id: "dashboard", label: "Overview", Icon: IconGrid },
      { id: "simulation", label: "New Simulation", Icon: IconPlus },
      { id: "experiments", label: "Experiments", Icon: IconArchive },
    ],
  },
  {
    label: "Simulation",
    items: [{ id: "comparison", label: "Algorithm Comparison", Icon: IconCompare }],
  },
];

function App() {
  const [page, setPage] = useState("dashboard");
  const [simulationData, setSimulationData] = useState(null);
  const [isLiveResult, setIsLiveResult] = useState(false);
  const [engineOnline, setEngineOnline] = useState(false);
  const [lastConfig, setLastConfig] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

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
            writeRatio: 0,
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
            .catch(() => {});
        }
      })
      .catch(() => {
        if (isMounted) setEngineOnline(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const navigate = (next) => {
    setPage(next);
    setDrawerOpen(false);
  };

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
        seed: result.config.seed,
        writeRatio: result.config.writeRatio,
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

  // Historical replay: load the experiment's stored configuration and its
  // EXACT original reference sequence. Never silently generate a new
  // workload for a historical record.
  const handleSelectExperiment = async (exp) => {
    try {
      const detail = await api.getExperimentById(exp._id);
      const record = detail?.data?.experiment || exp;
      const frames = record.bufferSize || record.physicalFrames || 3;
      const baseConfig = {
        algorithm: record.algorithm || "LRU",
        bufferPoolSize: frames,
        virtualPages: record.virtualFrames || 10,
        physicalFrames: frames,
        pageSize: record.pageSize || 4096,
        workloadType: record.workloadType || "Random",
        totalRequests: record.totalRequests || 16,
        seed: record.seed ?? 42,
        writeRatio: record.writeRatio ?? 0,
      };

      const storedSequence = record.referenceSequence;
      if (Array.isArray(storedSequence) && storedSequence.length > 0) {
        const res = await api.runSimulation({
          ...baseConfig,
          requests: storedSequence,
          totalRequests: storedSequence.length,
        });
        if (res.success) {
          handleSimulationComplete(res);
          return;
        }
      }
      // No stored sequence: exact replay unavailable. Navigate to the
      // simulation page so the user can configure it explicitly.
      setPage("simulation");
    } catch {
      setPage("simulation");
    }
  };

  const currentSimulation = simulationData || mockSimulation;

  const renderPage = () => {
    if (page === "simulation") {
      return (
        <Simulation
          onSimulationComplete={handleSimulationComplete}
          onCancel={() => navigate("dashboard")}
        />
      );
    }

    if (page === "comparison") {
      return (
        <div className="page">
          <div className="page-title">
            <div>
              <h1>Algorithm Comparison</h1>
              <p>
                Compare LRU, FIFO, Clock and Optimal on identical workloads,
                executed by the C++ engine.
              </p>
            </div>
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
        onNewSimulation={() => navigate("simulation")}
        onRestartSimulation={handleRestartSimulation}
        onOpenComparison={() => navigate("comparison")}
      />
    );
  };

  const renderNavItems = (section) =>
    section.items.map(({ id, label, Icon }) => {
      const active = page === id;
      return (
        <button
          key={id}
          type="button"
          className={`nav-item ${active ? "active" : ""}`}
          data-label={label}
          onClick={() => navigate(id)}
          aria-current={active ? "page" : undefined}
        >
          <span className="nav-icon">
            <Icon size={17} />
          </span>
          <span className="nav-text">{label}</span>
        </button>
      );
    });

  const sidebar = (
    <aside
      className={`sidebar ${sidebarCollapsed ? "collapsed" : ""} ${drawerOpen ? "drawer-open" : ""}`}
    >
      <div className="sidebar-inner">
        <div className="sidebar-head">
          <button
            type="button"
            className="logo"
            onClick={() => navigate("dashboard")}
            data-label="MemorySim"
          >
            <span className="logo-mark">M</span>
            <span className="logo-text">
              <strong>MemorySim</strong>
              <span>Memory Workstation</span>
            </span>
          </button>
          <button
            type="button"
            className="sidebar-collapse"
            onClick={() => setSidebarCollapsed((c) => !c)}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={sidebarCollapsed ? "Expand" : "Collapse"}
          >
            <IconChevron size={15} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV_SECTIONS.map((section) => (
            <div className="nav-section" key={section.label}>
              <span className="nav-section-label">{section.label}</span>
              {renderNavItems(section)}
            </div>
          ))}

          <div className="nav-section">
            <span className="nav-section-label">System</span>
            <div
              className={`nav-item nav-static ${engineOnline ? "engine-ok" : "engine-off"}`}
              data-label={engineOnline ? "Engine online" : "Engine standby"}
            >
              <span className="nav-icon">
                <IconCpu size={17} />
              </span>
              <span className="nav-text engine-status-text">
                <span className="engine-dot" />
                {engineOnline ? "Engine Online" : "Engine Standby"}
              </span>
            </div>
          </div>
        </nav>

        <div className="sidebar-foot">
          <span className="sidebar-version">C++20 Simulation Core</span>
        </div>
      </div>
    </aside>
  );

  return (
    <div className={`app ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <header className="mobile-topbar">
        <button
          type="button"
          className="icon-btn"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation"
        >
          <IconMenu size={18} />
        </button>
        <span className="mobile-brand">MemorySim</span>
      </header>

      {sidebar}

      {drawerOpen && (
        <div
          className="drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      <main className="main-content">{renderPage()}</main>
    </div>
  );
}

export default App;
