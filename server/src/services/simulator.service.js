import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getEngineBinaryPath() {
  if (process.env.ENGINE_PATH && fs.existsSync(process.env.ENGINE_PATH)) {
    return path.resolve(process.env.ENGINE_PATH);
  }

  const candidates = [
    path.resolve(__dirname, "../../../engine/simulator.exe"),
    path.resolve(__dirname, "../../../engine/simulator"),
    path.resolve(__dirname, "../../engine/simulator.exe"),
    path.resolve(__dirname, "../../engine/simulator"),
    path.resolve(process.cwd(), "engine/simulator.exe"),
    path.resolve(process.cwd(), "engine/simulator"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function executeSimulation({
  algorithm = "LRU",
  bufferPoolSize = 3,
  virtualPages = 10,
  physicalFrames = 3,
  pageSize = 4096,
  workloadType = "Random",
  totalRequests = 10,
  requests = [],
  seed = 42,
  writeRatio = 0,
}) {
  return new Promise((resolve, reject) => {
    const binaryPath = getEngineBinaryPath();

    if (!binaryPath) {
      return reject(
        new Error(
          "C++ simulation engine executable not found. Please compile engine/simulator.exe before running simulations."
        )
      );
    }

    // Argument building - safe array passing to execFile without shell interpolation
    const parsedSeed = parseInt(seed, 10);
    const args = [
      "--json",
      "--algo",
      String(algorithm || "LRU"),
      "--frames",
      String(Math.max(1, parseInt(bufferPoolSize, 10) || 3)),
      "--virtual-pages",
      String(Math.max(1, parseInt(virtualPages, 10) || 10)),
      "--physical-frames",
      String(Math.max(1, parseInt(physicalFrames, 10) || 3)),
      "--page-size",
      String(Math.max(256, parseInt(pageSize, 10) || 4096)),
      "--workload",
      String(workloadType || "Random"),
      "--seed",
      // Preserve seed 0; only fall back when parsing fails.
      String(Number.isNaN(parsedSeed) ? 42 : parsedSeed),
      "--write-ratio",
      String(Math.min(100, Math.max(0, Math.round(Number(writeRatio) || 0)))),
    ];

    if (Array.isArray(requests) && requests.length > 0) {
      args.push("--sequence", requests.join(","));
    } else {
      args.push("--requests", String(Math.max(1, parseInt(totalRequests, 10) || 10)));
    }

    const options = {
      timeout: 15000, // 15-second timeout
      // 256MB stdout buffer: bounded step JSON (1000 steps) stays well below
      // this even for large frame counts.
      maxBuffer: 256 * 1024 * 1024,
    };

    execFile(binaryPath, args, options, (error, stdout, stderr) => {
      if (error) {
        if (error.killed) {
          return reject(new Error("Simulation execution timed out after 15 seconds."));
        }
        return reject(
          new Error(`Simulation engine exited with error: ${error.message}${stderr ? " - " + stderr : ""}`)
        );
      }

      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (parseError) {
        reject(
          new Error(`Failed to parse simulation engine output JSON: ${parseError.message}. Output was: ${stdout.slice(0, 300)}`)
        );
      }
    });
  });
}
