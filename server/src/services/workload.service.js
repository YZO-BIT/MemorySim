
function createRng(seed) {
  let s = Math.floor(seed) >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateWorkload({
  type = "Random",
  totalRequests = 10,
  pageCount = 10,
  seed = 42,
}) {
  const count = Math.max(1, parseInt(totalRequests, 10) || 10);
  const pages = Math.max(1, parseInt(pageCount, 10) || 10);
  const rng = createRng(seed);

  const normalizedType = (type || "").toLowerCase().replace(/[\s_-]/g, "");
  const requests = [];

  if (normalizedType === "repeating" || normalizedType === "repeat" || normalizedType === "loop") {
    const cycleLen = Math.max(2, Math.min(pages, 4));
    for (let i = 0; i < count; i++) {
      requests.push(i % cycleLen);
    }
  } else if (normalizedType === "sequential") {
    for (let i = 0; i < count; i++) {
      requests.push(i % pages);
    }
  } else if (normalizedType === "highlocality" || normalizedType === "locality") {
    const hotCount = Math.max(1, Math.floor(pages * 0.2));
    for (let i = 0; i < count; i++) {
      if (rng() < 0.8 || hotCount >= pages) {
        requests.push(Math.floor(rng() * hotCount));
      } else {
        requests.push(hotCount + Math.floor(rng() * (pages - hotCount)));
      }
    }
  } else if (normalizedType === "mixed") {
    const hotCount = Math.max(1, Math.floor(pages * 0.2));
    let seqCounter = 0;
    for (let i = 0; i < count; i++) {
      const r = rng();
      if (r < 0.5) {
        requests.push(Math.floor(rng() * hotCount));
      } else if (r < 0.8) {
        requests.push(seqCounter % pages);
        seqCounter++;
      } else {
        requests.push(Math.floor(rng() * pages));
      }
    }
  } else {
    for (let i = 0; i < count; i++) {
      requests.push(Math.floor(rng() * pages));
    }
  }

  return requests;
}
