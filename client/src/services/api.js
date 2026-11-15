const API_BASE = "http://localhost:5000/api";

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.message || `Request failed with status ${response.status}`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    if (error.name === "TypeError" && error.message.includes("fetch")) {
      throw new Error(
        "Could not connect to the backend server. Please verify the Express backend is running on port 5000."
      );
    }
    throw error;
  }
}

export const api = {
  runSimulation: (params) => {
    return request("/simulation/run", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },

  compareAlgorithms: (params) => {
    return request("/simulation/compare", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },

  getExperiments: () => {
    return request("/experiments");
  },

  getExperimentById: (id) => {
    return request(`/experiments/${id}`);
  },

    deleteExperiment: (id) => {
    return request(`/experiments/${id}`, {
      method: "DELETE",
    });
  },

  clearAllExperiments: () => {
    return request("/experiments", {
      method: "DELETE",
    });
  },

    getPages: () => {
    return request("/pages");
  },

  writebackPage: (payload) => {
    return request("/pages/writeback", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  resetDiskPages: () => {
    return request("/pages/reset", {
      method: "POST",
    });
  },

  getStatus: () => {
    return request("/status");
  },

  getWorkloadTypes: () => {
    return request("/workload/types");
  },

  generateWorkload: (params) => {
    return request("/workload/generate", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },
};

export default api;
