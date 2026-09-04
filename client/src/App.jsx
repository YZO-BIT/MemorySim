import { useState } from "react";

import Dashboard from "./pages/Dashboard";
import Simulation from "./pages/Simulation";
import Experiments from "./pages/Experiments";

import { mockSimulation } from "./data/mockSimulation";

function App() {
  const [page, setPage] = useState("dashboard");

  const renderPage = () => {
    if (page === "simulation") {
      return <Simulation />;
    }

    if (page === "experiments") {
      return <Experiments />;
    }

    return <Dashboard simulation={mockSimulation} />;
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-icon">M</div>

          <div>
            <strong>MemorySim</strong>
            <span>DBMS + OS</span>
          </div>
        </div>

        <nav>
          <button
            className={page === "dashboard" ? "active" : ""}
            onClick={() => setPage("dashboard")}
          >
            <span>▦</span>
            Dashboard
          </button>

          <button
            className={page === "simulation" ? "active" : ""}
            onClick={() => setPage("simulation")}
          >
            <span>▶</span>
            New Simulation
          </button>

          <button
            className={page === "experiments" ? "active" : ""}
            onClick={() => setPage("experiments")}
          >
            <span>◫</span>
            Experiments
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="system-info">
            <span className="online-dot"></span>
            Engine Ready
          </div>

          <div className="version">
            C++20 Simulator
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