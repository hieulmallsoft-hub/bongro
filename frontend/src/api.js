const baseUrl = (import.meta.env?.VITE_API_URL || "/api").replace(/\/$/, "");

export async function request(path, { method = "GET", body } = {}) {
  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      credentials: "include",
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error(
      "Không kết nối được máy chủ. Vui lòng kiểm tra backend và thử lại.",
    );
  }
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const message = result?.message;
    throw new Error(
      Array.isArray(message)
        ? message.join(" · ")
        : message || "Yêu cầu không thành công. Vui lòng thử lại.",
    );
  }
  return result;
}

export const api = {
  dashboard: () => request("/dashboard"),
  state: () => request("/academy"),
  saveStudent: (id, body) =>
    request(id ? `/students/${encodeURIComponent(id)}` : "/students", {
      method: id ? "PUT" : "POST",
      body,
    }),
  saveStudentProfile: (body) =>
    request("/students/profile", { method: "POST", body }),
  deleteStudent: (id) =>
    request(`/students/${encodeURIComponent(id)}`, { method: "DELETE" }),
  addLesson: (body) => request("/lessons", { method: "POST", body }),
  check: (studentId, out) =>
    request(`/attendance/${out ? "check-out" : "check-in"}`, {
      method: "POST",
      body: { studentId },
    }),
  backup: () => request("/backup"),
  restore: (body) => request("/backup/restore", { method: "POST", body }),
};
