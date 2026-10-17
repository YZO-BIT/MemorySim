function BufferPool({ bufferPool = [], algorithm = "LRU" }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2>Buffer Pool</h2>
          <p>DBMS Memory Layer</p>
        </div>

        <span className="badge">{algorithm}</span>
      </div>

      <div className="buffer-grid">
        {bufferPool.map((frame) => (
          <div className="buffer-frame" key={frame.frameId}>
            <div className="frame-header">
              <span>Frame {frame.frameId}</span>

              <span className={frame.dirty ? "status dirty" : "status clean"}>
                {frame.dirty ? "DIRTY" : "CLEAN"}
              </span>
            </div>

            <div className="page-number">
              {frame.pageId !== null ? `Page ${frame.pageId}` : "Empty"}
            </div>

            <div className="frame-info">
              <span>Pin Count</span>
              <strong>{frame.pinCount}</strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BufferPool;