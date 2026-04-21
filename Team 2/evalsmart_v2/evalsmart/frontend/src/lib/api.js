const BASE = "/api";

function getToken() {
  return localStorage.getItem("evalsmart_token");
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

async function req(method, path, body) {
  const opts = {
    method,
    headers: method === "GET" ? { Authorization: `Bearer ${getToken()}` } : authHeaders(),
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const api = {
  login: (username, password) => req("POST", "/login", { username, password }),
  logout: () => req("POST", "/logout"),
  me: () => req("GET", "/me"),
  upload: async (file) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(BASE + "/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken()}` },
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data;
  },
  uploadPipeline: async (studentImage, referenceImage) => {
    const form = new FormData();
    form.append("student_image", studentImage);
    if (referenceImage) form.append("reference_image", referenceImage);
    const res = await fetch(BASE + "/upload_pipeline", {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken()}` },
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Pipeline upload failed");
    return data;
  },
  pipelineStatus: (jobId) => req("GET", `/pipeline_status/${jobId}`),
  sessions: () => req("GET", "/sessions"),
  results: (sid) => req("GET", `/results/${sid}`),
  adminUsers: () => req("GET", "/admin/users"),
};
