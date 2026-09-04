import BufferPool from "../components/BufferPool";
import VirtualMemory from "../components/VirtualMemory";
import PageTable from "../components/PageTable";
import DiskView from "../components/DiskView";
import EventLog from "../components/EventLog";
import MetricsPanel from "../components/MetricsPanel";

function Dashboard({ simulation }) {
  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>Memory Simulator</h1>
          <p>
            Database Buffer Pool + Virtual Memory Simulator
          </p>
        </div>

        <div className="running-status">
          <span></span>
          Simulation Ready
        </div>
      </div>

      <MetricsPanel metrics={simulation.metrics} />

      <div className="two-column">
        <BufferPool bufferPool={simulation.bufferPool} />

        <VirtualMemory
          virtualMemory={simulation.virtualMemory}
        />
      </div>

      <div className="two-column">
        <PageTable virtualMemory={simulation.virtualMemory} />

        <DiskView />
      </div>

      <EventLog events={simulation.events} />
    </div>
  );
}

export default Dashboard;