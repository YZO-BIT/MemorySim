function VirtualMemory({ virtualMemory }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2>Virtual Memory</h2>
          <p>OS Memory Layer</p>
        </div>

        <span className="badge">PAGE TABLE</span>
      </div>

      <div className="virtual-memory-list">
        {virtualMemory.map((page) => (
          <div className="memory-row" key={page.virtualPage}>
            <div className="memory-page">
              <span>Virtual Page</span>
              <strong>{page.virtualPage}</strong>
            </div>

            <div className="arrow">→</div>

            <div className="memory-frame">
              <span>Physical Frame</span>

              <strong>
                {page.present ? page.physicalFrame : "—"}
              </strong>
            </div>

            <div
              className={
                page.present ? "present-status present" : "present-status absent"
              }
            >
              {page.present ? "PRESENT" : "NOT PRESENT"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default VirtualMemory;