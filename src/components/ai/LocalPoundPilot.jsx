import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiArrowLeft,
  FiCamera,
  FiCheck,
  FiDownload,
  FiPlay,
  FiRefreshCw,
  FiX,
} from "react-icons/fi";
import { requireTrainingAccess } from "../../lib/trainingAccess.js";
import {
  captureFrame,
  isLocalAIPilot,
  pilotRequest,
} from "../../lib/ai/localPilot.js";
import "./local-pound-pilot.css";

const initial = {
  phase: "idle",
  count: 0,
  remaining: 20,
  message: "Set your camera so your body, ball, and floor are visible.",
};
const paint = () =>
  new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve)),
  );
export default function LocalPoundPilot() {
  const [round, setRound] = useState(initial),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [devices, setDevices] = useState([]),
    [device, setDevice] = useState(""),
    [recording, setRecording] = useState(""),
    [result, setResult] = useState(null),
    [recordingExtension, setRecordingExtension] = useState("webm"),
    [reviewOpen, setReviewOpen] = useState(false),
    [recordingState, setRecordingState] = useState("idle");
  const finishPanel = useRef(null),
    reviewPanel = useRef(null);
  const video = useRef(null),
    canvas = useRef(null),
    stream = useRef(null),
    session = useRef(null),
    generation = useRef(0),
    alive = useRef(true),
    recorder = useRef(null),
    aborter = useRef(null),
    recordURL = useRef(""),
    recordStart = useRef(0),
    goOffset = useRef(null),
    starting = useRef(false),
    announcedPhase = useRef("");
  const update = (value) => {
    if (alive.current) setRound(value);
  };
  function speak(text) {
    try {
      window.speechSynthesis?.cancel();
      window.speechSynthesis?.speak(new SpeechSynthesisUtterance(text));
    } catch {}
  }
  function stopLocal() {
    generation.current++;
    aborter.current?.abort();
    if (recorder.current?.state === "recording") recorder.current.stop();
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
  }
  async function cancelSession() {
    const id = session.current;
    session.current = null;
    if (id) {
      try {
        await pilotRequest("/cancel", { id }, { timeout: 3000 });
      } catch {}
    }
  }
  useEffect(() => {
    alive.current = true;
    const hidden = () => {
      if (document.hidden && stream.current) {
        stopLocal();
        void cancelSession();
        update({
          ...initial,
          phase: "interrupted",
          message: "Test stopped while CourtStreak was off screen.",
        });
      }
    };
    const leaving = () => {
      const id = session.current;
      stopLocal();
      if (id && navigator.sendBeacon) {
        navigator.sendBeacon(
          "http://127.0.0.1:8765/cancel",
          new Blob([JSON.stringify({ id })], {
            type: "text/plain;charset=UTF-8",
          }),
        );
        session.current = null;
      } else {
        void cancelSession();
      }
      update({
        ...initial,
        phase: "interrupted",
        message: "Camera stopped. Start a new test when you return.",
      });
    };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", leaving);
    return () => {
      alive.current = false;
      stopLocal();
      void cancelSession();
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", leaving);
      if (recordURL.current) URL.revokeObjectURL(recordURL.current);
    };
  }, []);
  useEffect(() => {
    if (round.phase !== "complete") return;
    finishPanel.current?.focus({ preventScroll: true });
    finishPanel.current?.scrollIntoView?.({
      block: "start",
      behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, [round.phase]);
  useEffect(() => {
    if (!reviewOpen) return;
    reviewPanel.current?.focus({ preventScroll: true });
    reviewPanel.current?.scrollIntoView?.({
      block: "start",
      behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, [reviewOpen]);
  function recordCamera(camera) {
    if (!window.MediaRecorder) {
      setRecordingState("unavailable");
      return;
    }
    const chunks = [];
    const r = new MediaRecorder(
      camera,
      MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
        ? { mimeType: "video/webm;codecs=vp8" }
        : {},
    );
    recorder.current = r;
    recordStart.current = performance.now();
    goOffset.current = null;
    r.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    r.onstop = () => {
      if (!alive.current) return;
      if (!chunks.length) {
        setRecordingState("unavailable");
        return;
      }
      if (recordURL.current) URL.revokeObjectURL(recordURL.current);
      recordURL.current = URL.createObjectURL(
        new Blob(chunks, { type: r.mimeType || "video/webm" }),
      );
      setRecordingExtension(r.mimeType?.includes("mp4") ? "mp4" : "webm");
      setRecording(recordURL.current);
      setRecordingState("ready");
    };
    r.start(1000);
    setRecordingState("recording");
  }
  async function loop(run) {
    try {
      while (
        alive.current &&
        run === generation.current &&
        session.current &&
        stream.current
      ) {
        const controller = new AbortController();
        aborter.current = controller;
        const blob = await captureFrame(video.current, canvas.current);
        if (run !== generation.current) return;
        let snapshot = await pilotRequest("/frame/" + session.current, blob, {
          signal: controller.signal,
        });
        if (!alive.current || run !== generation.current) return;
        update(snapshot);
        if (snapshot.phase === "armed") {
          // Begin at the GO transition, never during camera setup or countdown.
          // Starting just before paint preserves the first visible GO frame.
          recordCamera(stream.current);
          await paint();
          if (run !== generation.current) return;
          goOffset.current =
            recorder.current?.state === "recording"
              ? (performance.now() - recordStart.current) / 1000
              : null;
          speak("Go");
          snapshot = await pilotRequest(
            "/go",
            { id: session.current },
            { signal: controller.signal },
          );
          update(snapshot);
        }
        if (
          snapshot.phase === "checking" &&
          announcedPhase.current !== "checking"
        )
          speak("Time. Hold the ball.");
        announcedPhase.current = snapshot.phase;
        if (snapshot.phase === "complete") {
          const data = await pilotRequest(
            "/result",
            { id: session.current },
            { signal: controller.signal },
          );
          if (!alive.current || run !== generation.current) return;
          setResult({
            ...data,
            go_video_seconds: goOffset.current,
            recording_started_at_go: true,
            recording_note:
              "Recording begins at the GO transition and includes final-rep verification. Original unmirrored camera; analysis uses mirrored frames.",
          });
          stopLocal();
          await cancelSession();
          return;
        }
        if (snapshot.phase === "interrupted") {
          stopLocal();
          await cancelSession();
          return;
        }
        await new Promise((resolve) =>
          setTimeout(resolve, snapshot.phase === "preview" ? 100 : 0),
        );
      }
    } catch (e) {
      if (!alive.current || run !== generation.current) return;
      stopLocal();
      await cancelSession();
      setError(
        e.name === "AbortError"
          ? "Tracking stopped responding. Restart the camera test."
          : e.message,
      );
      update({ ...initial, phase: "interrupted" });
    }
  }
  async function startCamera() {
    if (starting.current || !isLocalAIPilot()) return;
    starting.current = true;
    setBusy(true);
    setError("");
    announcedPhase.current = "";
    stopLocal();
    await cancelSession();
    const run = generation.current;
    try {
      await requireTrainingAccess();
      if (!alive.current || run !== generation.current) return;
      await pilotRequest("/health", undefined, { timeout: 3000 }).catch(() => {
        throw new Error(
          "Start the local camera-test launcher in Terminal, then try again.",
        );
      });
      if (!alive.current || run !== generation.current) return;
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          "Open CourtStreak on localhost in Chrome to allow the camera.",
        );
      if (recordURL.current) {
        URL.revokeObjectURL(recordURL.current);
        recordURL.current = "";
      }
      setRecording("");
      setReviewOpen(false);
      setRecordingState("idle");
      setResult(null);
      const camera = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 15, max: 30 },
          ...(device
            ? { deviceId: { exact: device } }
            : { facingMode: { ideal: "user" } }),
        },
        audio: false,
      });
      if (!alive.current || run !== generation.current) {
        camera.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = camera;
      camera.getVideoTracks()[0]?.addEventListener("ended", () => {
        if (alive.current && stream.current === camera) {
          stopLocal();
          void cancelSession();
          setError("Camera disconnected. Reconnect it and start a new test.");
          update({ ...initial, phase: "interrupted" });
        }
      });
      video.current.srcObject = camera;
      await video.current.play();
      setDevices(
        (await navigator.mediaDevices.enumerateDevices()).filter(
          (d) => d.kind === "videoinput",
        ),
      );
      const next = await pilotRequest("/session", {});
      session.current = next.id;
      if (!alive.current || run !== generation.current) {
        stopLocal();
        await cancelSession();
        return;
      }
      update(next);
      recorder.current = null;
      recordStart.current = 0;
      goOffset.current = null;
      void loop(run);
    } catch (e) {
      stopLocal();
      await cancelSession();
      if (alive.current) {
        setError(
          e.name === "NotAllowedError"
            ? "Camera permission was denied. Allow it in the address bar, then try again."
            : e.message,
        );
        update(initial);
      }
    } finally {
      starting.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function ready() {
    if (busy || round.phase !== "preview") return;
    setBusy(true);
    setError("");
    try {
      await requireTrainingAccess();
      update(await pilotRequest("/ready", { id: session.current }));
    } catch (e) {
      setError(e.message);
      stopLocal();
      await cancelSession();
      update(initial);
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function stop() {
    stopLocal();
    await cancelSession();
    update(initial);
    setError("");
  }
  function downloadLog() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(result, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "CourtStreak-right-pound-camera-test.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (!isLocalAIPilot())
    return (
      <main id="cs-ai-pilot">
        <h1>Camera test unavailable</h1>
        <Link to="/lab">Back to drills</Link>
      </main>
    );
  const running = [
    "position",
    "countdown",
    "armed",
    "active",
    "checking",
  ].includes(round.phase);
  const step =
    round.phase === "complete"
      ? 3
      : ["armed", "active", "checking"].includes(round.phase)
        ? 2
        : ["position", "countdown"].includes(round.phase)
          ? 1
          : 0;
  return (
    <main id="cs-ai-pilot">
      <header>
        <Link to="/lab/drill/right-hand-pound">
          <FiArrowLeft /> Drill details
        </Link>
        <span className="pilot-tag">LOCAL CAMERA TEST</span>
      </header>
      <div className="pilot-title">
        <div>
          <p className="pilot-eyebrow">COURTSTREAK · BALL HANDLING</p>
          <h1>Right-Hand Pound</h1>
          <p>20 seconds. Strong bounce. Controlled return.</p>
        </div>
        <span className="pilot-engine">AI counter · v0.7.8</span>
      </div>
      <ol className="pilot-steps" aria-label="Camera training steps">
        {["Camera", "Position", "Train", "Review"].map((label, index) => (
          <li
            key={label}
            className={
              index === step ? "is-current" : index < step ? "is-done" : ""
            }
            aria-current={index === step ? "step" : undefined}
          >
            <span>{index < step ? <FiCheck /> : index + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      {round.phase === "complete" && (
        <section
          className="pilot-finish"
          ref={finishPanel}
          tabIndex={-1}
          aria-labelledby="pilot-finish-heading"
        >
          <span className="pilot-finish-kicker">
            <FiCheck aria-hidden="true" /> ROUND COMPLETE
          </span>
          <h2 id="pilot-finish-heading">Right-Hand Pound</h2>
          <div
            className="pilot-finish-score"
            aria-label={`${round.count} controlled dribbles`}
          >
            <svg
              className="pilot-finish-ring"
              viewBox="0 0 200 200"
              aria-hidden="true"
            >
              <circle
                cx="100"
                cy="100"
                r="88"
                fill="none"
                stroke="#ffffff12"
                strokeWidth="2"
              />
              <circle
                className="pilot-finish-ring-stroke"
                cx="100"
                cy="100"
                r="88"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="553"
              />
            </svg>
            <strong>{round.count}</strong>
            <span className="pilot-finish-check" aria-hidden="true">
              <FiCheck />
            </span>
          </div>
          <p className="pilot-finish-unit">controlled dribbles</p>
          <p className="pilot-finish-duration">20 seconds completed</p>
          <div className="pilot-finish-actions">
            <button
              className="pilot-primary"
              onClick={() => setReviewOpen(true)}
              disabled={!recording}
              aria-expanded={reviewOpen}
              aria-controls="pilot-round-review"
            >
              <FiPlay />
              {!recording && recordingState !== "unavailable"
                ? "Preparing replay…"
                : "Review video"}
            </button>
            <button
              className="pilot-secondary"
              onClick={startCamera}
              disabled={busy}
            >
              <FiRefreshCw />
              {busy ? "Connecting…" : "Try again"}
            </button>
            <Link to="/lab/drill/right-hand-pound">Back to drills</Link>
          </div>
          {recordingState === "unavailable" && (
            <p className="pilot-finish-note">
              Video is unavailable for this round. Your final count is shown
              above.
            </p>
          )}
          <p className="pilot-finish-note">
            Camera test · this result isn’t saved to Progress or leaderboards.
          </p>
          {result && (
            <button className="pilot-finish-log" onClick={downloadLog}>
              <FiDownload /> Decision log
            </button>
          )}
        </section>
      )}
      <section className="pilot-layout" hidden={round.phase === "complete"}>
        <div className="pilot-camera-card">
          <div
            className="pilot-stage"
            style={{
              aspectRatio:
                round.width && round.height
                  ? `${round.width}/${round.height}`
                  : "16/9",
            }}
          >
            <video
              ref={video}
              muted
              playsInline
              className="pilot-camera"
              aria-label="Live camera preview"
            />
            {round.circle && running && (
              <svg
                viewBox={`0 0 ${round.width} ${round.height}`}
                aria-hidden="true"
              >
                <circle
                  cx={round.circle.x}
                  cy={round.circle.y}
                  r={round.circle.r}
                  fill="none"
                  stroke="#93e7b5"
                  strokeWidth="4"
                />
              </svg>
            )}
            {!stream.current && (
              <div className="pilot-camera-placeholder">
                <FiCamera />
                <strong>
                  {round.phase === "complete"
                    ? "Round complete"
                    : "Your court. Your camera."}
                </strong>
                <span>
                  {round.phase === "complete"
                    ? "Camera off · review your result below"
                    : "Keep your body, basketball, and floor in view."}
                </span>
              </div>
            )}
            {(round.phase === "countdown" ||
              round.phase === "armed" ||
              (round.phase === "active" && round.remaining === 20)) && (
              <div
                className={`pilot-countdown ${round.phase === "countdown" ? "" : "is-go"}`}
              >
                <div className="pilot-countdown-dial">
                  <svg
                    className="pilot-countdown-ring"
                    viewBox="0 0 200 200"
                    aria-hidden="true"
                  >
                    <circle
                      cx="100"
                      cy="100"
                      r="92"
                      fill="none"
                      stroke="#ffffff22"
                      strokeWidth="3"
                    />
                    <circle
                      cx="100"
                      cy="100"
                      r="92"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray="578"
                      strokeDashoffset={
                        round.phase === "countdown"
                          ? 578 * (round.countdown / 5)
                          : 0
                      }
                    />
                  </svg>
                  <strong
                    key={round.phase === "countdown" ? round.countdown : "go"}
                  >
                    {round.phase === "countdown" ? round.countdown : "GO"}
                  </strong>
                </div>
                <span>
                  {round.phase === "countdown"
                    ? "Hold the ball · wait for GO"
                    : "Right-hand pounds"}
                </span>
              </div>
            )}
          </div>
          <div className="pilot-feedback" role="status">
            <i className={round.circle ? "is-locked" : ""} />
            <span>{round.message}</span>
          </div>
          {round.phase === "position" && (
            <progress
              max="1"
              value={round.progress}
              aria-label="Position check"
            />
          )}
        </div>
        <aside className="pilot-controls">
          <div className="pilot-score">
            <span>
              {round.phase === "complete" ? "FINAL COUNT" : "LIVE COUNT"}
            </span>
            <strong aria-label={`${round.count} reps`}>{round.count}</strong>
            <small>controlled dribbles</small>
          </div>
          <div className="pilot-clock">
            <span>
              {round.phase === "checking"
                ? "FINAL REP CHECK"
                : "TIME REMAINING"}
            </span>
            <strong>
              {round.phase === "checking"
                ? "Checking…"
                : `0:${String(round.remaining).padStart(2, "0")}`}
            </strong>
          </div>
          {!stream.current && round.phase !== "complete" && (
            <button
              className="pilot-primary"
              onClick={startCamera}
              disabled={busy}
            >
              <FiCamera />
              {busy ? "Connecting…" : "Enable camera"}
            </button>
          )}
          {round.phase === "preview" && (
            <button className="pilot-primary" onClick={ready} disabled={busy}>
              <FiPlay />
              {busy ? "Checking access…" : "Ready · check my position"}
            </button>
          )}
          {(running || round.phase === "preview") && (
            <button className="pilot-secondary" onClick={stop}>
              <FiX />
              Cancel test
            </button>
          )}
          {round.phase === "preview" && devices.length > 1 && (
            <details className="pilot-camera-options">
              <summary>Change camera</summary>
              <label className="pilot-device">
                Camera
                <select
                  value={device}
                  onChange={(e) => setDevice(e.target.value)}
                >
                  <option value="">Automatic camera</option>
                  {devices.map((d, i) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${i + 1}`}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="pilot-secondary"
                onClick={startCamera}
                disabled={busy}
              >
                {busy ? "Connecting…" : "Use selected camera"}
              </button>
            </details>
          )}
          <p className="pilot-test-note">
            Recording starts at GO. Test results aren’t saved to Progress or
            leaderboards.
          </p>
          <details>
            <summary>How this test works</summary>
            <p>
              Hold the ball through the position check and countdown. Start on
              GO. At TIME, hold it while the final return is checked for two
              seconds.
            </p>
            <p>
              Recording starts at GO, after setup and countdown. Video stays on
              your Mac. The front-facing or default camera opens automatically.
              Use Change camera only if you want another available camera.
            </p>
          </details>
        </aside>
      </section>
      {error && (
        <p className="pilot-error" role="alert">
          {error}
        </p>
      )}
      {round.phase === "complete" && reviewOpen && (
        <section
          className="pilot-review"
          id="pilot-round-review"
          ref={reviewPanel}
          tabIndex={-1}
          aria-labelledby="pilot-review-heading"
        >
          <div>
            <span className="pilot-eyebrow">
              <FiCheck /> ROUND COMPLETE
            </span>
            <h2 id="pilot-review-heading">Review your {round.count} reps</h2>
            <p>Check the first and last bounce against the recording.</p>
          </div>
          {recording ? (
            <video
              src={recording}
              controls
              playsInline
              preload="metadata"
              aria-label="Review your recorded round"
            />
          ) : (
            <p>
              Recording is unavailable in this browser. The count is still shown
              above.
            </p>
          )}
          <div className="pilot-review-actions">
            {recording && (
              <a
                className="pilot-secondary"
                href={recording}
                download={`CourtStreak-right-pound-camera-test.${recordingExtension}`}
              >
                <FiDownload />
                Video
              </a>
            )}
            {result && (
              <button className="pilot-secondary" onClick={downloadLog}>
                <FiDownload />
                Decision log
              </button>
            )}
            <button
              className="pilot-primary"
              onClick={startCamera}
              disabled={busy}
            >
              <FiRefreshCw />
              Test again
            </button>
            <Link to="/lab/drill/right-hand-pound">Finish test</Link>
          </div>
        </section>
      )}
      <canvas ref={canvas} hidden />
    </main>
  );
}
