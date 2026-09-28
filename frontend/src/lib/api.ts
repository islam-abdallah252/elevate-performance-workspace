import type { ApiFailure, ApiSuccess } from "@kpi/contracts";

let currentActorId = localStorage.getItem("kpi-actor") ?? "director";
export const setApiActor = (id: string) => { currentActorId = id; localStorage.setItem("kpi-actor", id); };
export const getApiActor = () => currentActorId;

export class ApiError extends Error {
  constructor(public code: string, message: string, public details?: unknown) { super(message); }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "X-Actor-User-Id": currentActorId, ...init?.headers },
  });
  const payload = await response.json() as ApiSuccess<T> | ApiFailure;
  if (!response.ok || "error" in payload) {
    const error = "error" in payload ? payload.error : { code: "HTTP_ERROR", message: "Request failed" };
    throw new ApiError(error.code, error.message, error.details);
  }
  return payload.data;
}

export const json = (method: "POST" | "PUT", body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });
