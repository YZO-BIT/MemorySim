function MetricsPanel({ metrics }) {
  const cards = [
    {
      label: "Total Requests",
      value: metrics.totalRequests.toLocaleString(),
    },
    {
      label: "Buffer Hit Rate",
      value: `${metrics.bufferHitRatio}%`,
    },
    {
      label: "Buffer Misses",
      value: metrics.bufferMisses.toLocaleString(),
    },
    {
      label: "Page Fault Rate",
      value: `${metrics.pageFaultRate}%`,
    },
    {
      label: "Disk Reads",
      value: metrics.diskReads.toLocaleString(),
    },
    {
      label: "Disk Writes",
      value: metrics.diskWrites.toLocaleString(),
    },
    {
      label: "Evictions",
      value: metrics.evictions.toLocaleString(),
    },
    {
      label: "Execution Time",
      value: `${metrics.executionTimeMs} ms`,
    },
  ];

  return (
    <div className="metrics-grid">
      {cards.map((card) => (
        <div className="metric-card" key={card.label}>
          <span>{card.label}</span>
          <strong>{card.value}</strong>
        </div>
      ))}
    </div>
  );
}

export default MetricsPanel;