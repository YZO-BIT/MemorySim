import React from "react";

function StatsCards({ config = {}, metrics = {}, currentStep = null }) {
  const totalReq = currentStep ? currentStep.step : metrics.totalRequests || 0;
  const hits = currentStep ? currentStep.runningHits : metrics.bufferHits || 0;
  const faults = currentStep ? currentStep.runningMisses : metrics.bufferMisses || 0;
  const evictions = metrics.evictions ?? 0;

  const hitRatio = totalReq > 0 ? ((hits / totalReq) * 100).toFixed(1) : "0.0";
  const faultRatio = totalReq > 0 ? ((faults / totalReq) * 100).toFixed(1) : "0.0";

  const frames = config.bufferPoolSize || config.physicalFrames || 3;
  const pageSize = config.pageSize || 4096;
  const ramKb = ((frames * pageSize) / 1024).toFixed(0);

  const cards = [
    {
      label: "Total References",
      value: totalReq,
      sub: `of ${config.totalRequests || totalReq} planned`,
      color: "text-blue",
    },
    {
      label: "Page Hits",
      value: hits,
      sub: `${hitRatio}% Hit Ratio`,
      color: "text-green",
    },
    {
      label: "Page Faults / Misses",
      value: faults,
      sub: `${faultRatio}% Fault Ratio`,
      color: "text-red",
    },
    {
      label: "Hit Ratio",
      value: `${hitRatio}%`,
      sub: "Hits / References",
      color: "text-accent",
    },
    {
      label: "RAM Capacity",
      value: `${ramKb} KB`,
      sub: `${frames} Frames × ${(pageSize / 1024).toFixed(0)} KB`,
      color: "text-purple",
    },
    {
      label: "Algorithm",
      value: config.algorithm || "LRU",
      sub: config.workloadType || "Random Pattern",
      color: "text-yellow",
    },
    {
      label: "Replacements / Evictions",
      value: evictions,
      sub: `${metrics.dirtyEvictions || 0} dirty writes`,
      color: "text-muted",
    },
    {
      label: "Disk I/O Reads",
      value: metrics.diskReads || faults,
      sub: `Exec Time: ${metrics.executionTimeMs ?? 0} ms`,
      color: "text-muted",
    },
  ];

  return (
    <div className="stats-cards-grid">
      {cards.map((card) => (
        <div key={card.label} className="stat-card">
          <span className="stat-label">{card.label}</span>
          <strong className={`stat-value ${card.color}`}>{card.value}</strong>
          <span className="stat-sub">{card.sub}</span>
        </div>
      ))}
    </div>
  );
}

export default StatsCards;
