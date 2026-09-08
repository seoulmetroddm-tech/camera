"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { canvasToBlob, context2d, createCanvas } from "@/lib/canvas/util";
import { bitmapFromBlob } from "@/lib/image";

interface Props {
  title: string;
  onCapture: (image: ImageBitmap) => void;
  onClose: () => void;
}

function describeError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "카메라 권한이 거부되었습니다. 주소창의 자물쇠 아이콘에서 카메라를 허용한 뒤 다시 시도해 주세요.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "사용할 수 있는 카메라를 찾지 못했습니다. 아래에서 사진 파일을 선택해 주세요.";
  }
  if (name === "NotReadableError") {
    return "다른 프로그램이 카메라를 사용 중입니다. 그 프로그램을 닫고 다시 시도해 주세요.";
  }
  return "카메라를 열지 못했습니다. 아래에서 사진 파일을 선택해 주세요.";
}

export default function CameraCapture({ title, onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      // getUserMedia는 HTTPS 또는 localhost에서만 동작한다.
      if (!window.isSecureContext) {
        setError(
          "카메라는 HTTPS 또는 localhost에서만 쓸 수 있습니다. 아래에서 사진 파일을 선택해 주세요.",
        );
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("이 브라우저는 카메라를 지원하지 않습니다. 아래에서 사진 파일을 선택해 주세요.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 2560 },
            height: { ideal: 1440 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setError(null);
      } catch (err) {
        if (!cancelled) setError(describeError(err));
      }
    }

    start();
    return () => {
      cancelled = true;
      stopStream();
    };
  }, [facingMode, stopStream]);

  async function handleShutter() {
    const video = videoRef.current;
    if (!video || busy || !video.videoWidth) return;
    setBusy(true);
    try {
      const canvas = createCanvas(video.videoWidth, video.videoHeight);
      const ctx = context2d(canvas);
      if (facingMode === "user") {
        // 전면 카메라는 미리보기를 거울처럼 보여주므로 결과물도 맞춰 뒤집는다.
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0);
      const blob = await canvasToBlob(canvas, "image/jpeg", 0.95);
      onCapture(await bitmapFromBlob(blob));
    } catch {
      setError("촬영에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      onCapture(await bitmapFromBlob(file));
    } catch {
      setError("이미지를 읽지 못했습니다. 다른 파일로 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-medium">{title}</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-1.5 text-sm text-white/80 hover:bg-white/10"
        >
          닫기
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`h-full w-full object-contain ${facingMode === "user" ? "-scale-x-100" : ""}`}
        />
        {error && (
          <div className="absolute inset-x-4 top-4 rounded-xl bg-white/95 p-4 text-sm text-slate-700 shadow-lg">
            {error}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 px-6 pb-8 pt-4">
        <label className="cursor-pointer rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10">
          파일 선택
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFile}
            className="hidden"
          />
        </label>

        <button
          type="button"
          onClick={handleShutter}
          disabled={busy || !!error}
          aria-label="촬영"
          className="h-18 w-18 rounded-full border-4 border-white bg-white/20 p-1 disabled:opacity-40"
        >
          <span className="block h-full w-full rounded-full bg-white" />
        </button>

        <button
          type="button"
          onClick={() => setFacingMode((mode) => (mode === "environment" ? "user" : "environment"))}
          className="rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10"
        >
          카메라 전환
        </button>
      </div>
    </div>
  );
}
