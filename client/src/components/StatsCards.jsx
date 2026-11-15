import React from "react";

/**
 * StatsCards
 * Four compact live counters derived from the current step, or final metrics.
 * Buffer layer (hits/misses) and virtual-memory layer (page faults) stay
 * separate: page faults are never derived from buffer misses.
 */
function StatsCards({ config = {}, metrics = {}, currentStep = null }) {
  const totalReq = currentStep ? currentStep.step : metrics.totalRequests || 0;
  const hits = currentStep ? currentStep.runningHits : metrics.bufferHits || 0;
  const misses = currentStep ? currentStep.runningMisses : metrics.bufferMisses || 0;
  const stepFaults = currentStep ? currentStep.runningFaults ?? 0 : null;
  const metricFaults = metrics.pageFaults ?? 0;
  const faults = currentStep ? stepFaults : metricFaults;

  const hitRatio = totalReq > 0 ? ((hits / totalReq) * 100).toFixed(1) : "0.0";
  const faultRatio = totalReq > 0 ? ((faults / totalReq) * 100).toFixed(1) : "0.0";

  const cards = [
    {
      label: "Total Requests",
      value: totalReq,
      sub: `of ${config.totalRequests || totalReq} planned`,
      color: "text-white",
    },
    {
      label: "Buffer Hits",
      value: hits,
      sub: `${hitRatio}% hit ratio`,
      color: "text-green",
    },
    {
      label: "Buffer Misses",
      value: misses,
      sub: "Required disk reads",
      color: "text-amber",
    },
    {
      label: "VM Page Faults",
      value: faults,
      sub: `${faultRatio}% fault rate`,
      color: "text-red",
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
