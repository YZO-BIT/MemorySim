function Experiments() {
  const experiments = [
    {
      id: 1,
      algorithm: "LRU",
      workload: "Random",
      bufferSize: 100,
      hitRate: "72.34%",
      pageFaultRate: "8.31%",
    },
    {
      id: 2,
      algorithm: "FIFO",
      workload: "Random",
      bufferSize: 100,
      hitRate: "68.12%",
      pageFaultRate: "10.42%",
    },
    {
      id: 3,
      algorithm: "Clock",
      workload: "High Locality",
      bufferSize: 50,
      hitRate: "84.21%",
      pageFaultRate: "5.17%",
    },
  ];

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>Experiments</h1>
          <p>Previous simulation results</p>
        </div>
      </div>

      <div className="panel">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Algorithm</th>
                <th>Workload</th>
                <th>Buffer Size</th>
                <th>Hit Rate</th>
                <th>Page Fault Rate</th>
              </tr>
            </thead>

            <tbody>
              {experiments.map((experiment) => (
                <tr key={experiment.id}>
                  <td>#{experiment.id}</td>
                  <td>{experiment.algorithm}</td>
                  <td>{experiment.workload}</td>
                  <td>{experiment.bufferSize}</td>
                  <td>{experiment.hitRate}</td>
                  <td>{experiment.pageFaultRate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Experiments;