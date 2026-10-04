import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Opens a camera and names every state it can be in, so the UI can say exactly
 * what went wrong instead of showing a black box.
 */
export type CameraStatus =
  | { kind: "idle" }
  | { kind: "starting" }
  | { kind: "live"; label: string; width: number; height: number; facing: "user" | "environment" | "unknown" }
  | { kind: "blocked" }
  | { kind: "missing" }
  | { kind: "busy" }
  | { kind: "insecure" }
  | { kind: "error"; message: string };

export interface CameraDevice {
  deviceId: string;
  label: string;
}

const STORAGE_KEY = "spotter.cameraId";

function savedDeviceId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveDeviceId(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Private windows can refuse storage. Remembering the camera is only a convenience.
  }
}

export function useCamera(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [status, setStatus] = useState<CameraStatus>({ kind: "idle" });
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(savedDeviceId);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const video = videoRef.current;
    if (video) video.srcObject = null;
    setStatus({ kind: "idle" });
  }, [videoRef]);

  const start = useCallback(
    async (requested: string | null = deviceId) => {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setStatus({ kind: "insecure" });
        return;
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setStatus({ kind: "starting" });
      const video: MediaTrackConstraints = {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      };
      if (requested) video.deviceId = { exact: requested };
      else video.facingMode = "user";
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
      } catch (err) {
        const name = err instanceof DOMException ? err.name : "";
        if (name === "NotAllowedError" || name === "SecurityError") setStatus({ kind: "blocked" });
        else if (name === "NotFoundError" || name === "OverconstrainedError") {
          if (requested) {
            // The remembered camera is gone (unplugged, different device). Try the default.
            setDeviceId(null);
            return start(null);
          }
          setStatus({ kind: "missing" });
        } else if (name === "NotReadableError" || name === "AbortError") setStatus({ kind: "busy" });
        else setStatus({ kind: "error", message: err instanceof Error ? err.message : String(err) });
        return;
      }
      streamRef.current = stream;
      const el = videoRef.current;
      if (!el) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      el.srcObject = stream;
      el.muted = true;
      el.playsInline = true;
      try {
        await el.play();
      } catch {
        // Autoplay of a muted, inline camera stream is allowed everywhere we support.
      }
      const track = stream.getVideoTracks()[0];
      const settings = track?.getSettings() ?? {};
      if (settings.deviceId) {
        setDeviceId(settings.deviceId);
        saveDeviceId(settings.deviceId);
      }
      const facing = settings.facingMode === "environment" ? "environment" : settings.facingMode === "user" ? "user" : "unknown";
      setStatus({
        kind: "live",
        label: track?.label || "Camera",
        width: el.videoWidth || settings.width || 0,
        height: el.videoHeight || settings.height || 0,
        facing,
      });
      // Labels are only readable after permission, so list devices now.
      try {
        const all = await navigator.mediaDevices.enumerateDevices();
        setDevices(
          all
            .filter((d) => d.kind === "videoinput")
            .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` })),
        );
      } catch {
        setDevices([]);
      }
    },
    [deviceId, videoRef],
  );

  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  return { status, devices, deviceId, start, stop };
}

export function cameraMessage(status: CameraStatus): string | null {
  switch (status.kind) {
    case "blocked":
      return "Camera access is blocked. Allow the camera in your browser's address bar, then try again.";
    case "missing":
      return "No camera was found on this device.";
    case "busy":
      return "Another app is using the camera. Close it (video calls are the usual cause) and try again.";
    case "insecure":
      return "The camera only works when this page is opened over https.";
    case "error":
      return `The camera couldn't start: ${status.message}`;
    default:
      return null;
  }
}
