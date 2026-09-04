import { useState } from "react";

function Simulation() {
  const [config, setConfig] = useState({
    databasePages: 1000,
    bufferPoolSize: 3,
    virtualPages: 10,
    physicalFrames: 4,
    pageSize: 4096,
    algorithm: "LRU",
    workloadType: "Random",
    totalRequests: 10000,
  });

  const handleChange = (event) => {
    const { name, value } = event.target;

    setConfig((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    console.log("Simulation configuration:", config);

    alert("Simulation configuration saved!");
  };

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>New Simulation</h1>
          <p>Configure your memory management experiment</p>
        </div>
      </div>

      <form className="simulation-form" onSubmit={handleSubmit}>
        <div className="form-section">
          <h2>Memory Configuration</h2>

          <div className="form-grid">
            <div className="form-group">
              <label>Database Pages</label>
              <input
                type="number"
                name="databasePages"
                value={config.databasePages}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Buffer Pool Size</label>
              <input
                type="number"
                name="bufferPoolSize"
                value={config.bufferPoolSize}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Virtual Pages</label>
              <input
                type="number"
                name="virtualPages"
                value={config.virtualPages}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Physical Frames</label>
              <input
                type="number"
                name="physicalFrames"
                value={config.physicalFrames}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Page Size</label>

              <select
                name="pageSize"
                value={config.pageSize}
                onChange={handleChange}
              >
                <option value="1024">1024 bytes</option>
                <option value="2048">2048 bytes</option>
                <option value="4096">4096 bytes</option>
                <option value="8192">8192 bytes</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>Algorithm & Workload</h2>

          <div className="form-grid">
            <div className="form-group">
              <label>Replacement Algorithm</label>

              <select
                name="algorithm"
                value={config.algorithm}
                onChange={handleChange}
              >
                <option value="LRU">LRU</option>
                <option value="FIFO">FIFO</option>
                <option value="Clock">Clock</option>
              </select>
            </div>

            <div className="form-group">
              <label>Workload Type</label>

              <select
                name="workloadType"
                value={config.workloadType}
                onChange={handleChange}
              >
                <option value="Random">Random</option>
                <option value="Sequential">Sequential</option>
                <option value="High Locality">
                  High Locality
                </option>
                <option value="Mixed">Mixed</option>
              </select>
            </div>

            <div className="form-group">
              <label>Number of Requests</label>

              <input
                type="number"
                name="totalRequests"
                value={config.totalRequests}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <button className="start-button" type="submit">
          Start Simulation
        </button>
      </form>
    </div>
  );
}

export default Simulation;