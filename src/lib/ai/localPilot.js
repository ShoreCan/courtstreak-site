export const isLocalAIPilot = () =>
  import.meta.env.DEV &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname);
const base = "http://127.0.0.1:8765";
export async function pilotRequest(
  path,
  body,
  { signal, timeout = 12000 } = {},
) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, timeout);
  try {
    const options = { signal: controller.signal };
    if (body !== undefined) {
      options.method = "POST";
      options.keepalive = path === "/cancel";
      options.headers = {
        "Content-Type":
          body instanceof Blob ? "image/jpeg" : "application/json",
      };
      options.body = body instanceof Blob ? body : JSON.stringify(body);
    }
    const response = await fetch(base + path, options);
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || "Camera test could not continue.");
    return data;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
export const captureFrame = (video, canvas) =>
  new Promise((resolve, reject) => {
    if (!video.videoWidth || !video.videoHeight) {
      reject(new Error("Waiting for the camera image."));
      return;
    }
    canvas.height = 720;
    canvas.width = Math.round((video.videoWidth * 720) / video.videoHeight);
    if (canvas.width < 240 || canvas.width > 1600) {
      reject(new Error("Use a standard landscape or portrait camera view."));
      return;
    }
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("Camera image could not be prepared.")),
      "image/jpeg",
      0.85,
    );
  });
