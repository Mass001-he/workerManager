import type { RequestPayload, ResponsePayload } from "./types";

/**
 * 请求tabManager，返回结果
 * @param payload
 */
export async function requestManager(
  payload: RequestPayload
): Promise<ResponsePayload> {
  throw new Error("Not implemented");
}

/**
 * 递交任务给tabManager, 不关心结果
 * @param payload
 */
export async function postManager(payload: RequestPayload) {}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
  }
});
