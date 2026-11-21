import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, ScanFace } from "lucide-react";
import { api } from "../lib/api";

let faceApiPromise;
async function loadFaceApi() {
  if (window.faceapi) return window.faceapi;
  if (!faceApiPromise) {
    const apiRoot = api.defaults.baseURL.replace(/\/api\/?$/, "");
    faceApiPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `${apiRoot}/vendor/face-api.min.js`;
      script.onload = () => window.faceapi ? resolve(window.faceapi) : reject(new Error("Face recognition library did not initialize"));
      script.onerror = () => reject(new Error("Face recognition library could not be loaded from the server"));
      document.head.appendChild(script);
    });
  }
  return faceApiPromise;
}

export default function FaceCamera({ onCapture, buttonLabel = "মুখ স্ক্যান করুন" }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [state, setState] = useState("starting");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      try {
        setState("starting"); setError("");
        const faceapi = await loadFaceApi();
        const apiRoot = api.defaults.baseURL.replace(/\/api\/?$/, "");
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(`${apiRoot}/models`),
          faceapi.nets.faceLandmark68Net.loadFromUri(`${apiRoot}/models`),
          faceapi.nets.faceRecognitionNet.loadFromUri(`${apiRoot}/models`),
        ]);
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (cancelled) { stream.getTracks().forEach((track) => track.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setState("ready");
      } catch (e) {
        setError(e.message || "ক্যামেরা চালু করা যায়নি");
        setState("error");
      }
    };
    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  const capture = async () => {
    if (busy || state !== "ready" || !videoRef.current) return;
    setBusy(true); setError("");
    try {
      const faceapi = await loadFaceApi();
      const results = await faceapi.detectAllFaces(
        videoRef.current,
        new faceapi.SsdMobilenetv1Options({ minConfidence: 0.65 })
      ).withFaceLandmarks().withFaceDescriptors();
      if (!results || results.length !== 1) {
        throw new Error(results?.length > 1
          ? "ফ্রেমে একাধিক মুখ পাওয়া গেছে। একবারে একজন শিক্ষার্থীকে ক্যামেরার সামনে রাখো।"
          : "একটি পরিষ্কার মুখ পাওয়া যায়নি। আলো ঠিক করে ক্যামেরার দিকে তাকাও।");
      }
      const descriptor = Array.from(results[0].descriptor);
      if (descriptor.length !== 128 || !descriptor.every(Number.isFinite)) throw new Error("Face descriptor সঠিক নয়");
      await onCapture(descriptor);
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Face scan ব্যর্থ হয়েছে");
    } finally { setBusy(false); }
  };

  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
    <div className="relative mx-auto aspect-[4/3] w-full max-w-[480px] overflow-hidden rounded-xl bg-slate-900">
      <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-[18%] rounded-[45%] border-2 border-dashed border-emerald-300/90" />
      {state !== "ready" && <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/85 p-4 text-center text-white"><CameraOff size={28}/><span className="text-sm">{state === "starting" ? "ক্যামেরা ও Face Model প্রস্তুত হচ্ছে..." : "ক্যামেরা চালু করা যায়নি"}</span></div>}
    </div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
      <span className="text-xs text-slate-500">{state === "ready" ? "ক্যামেরা প্রস্তুত · একটি মুখ ফ্রেমে রাখুন" : "ক্যামেরা প্রস্তুত হচ্ছে"}</span>
      <button type="button" disabled={state !== "ready" || busy} onClick={capture} className="primary-button"><ScanFace size={16}/>{busy ? "স্ক্যান হচ্ছে..." : buttonLabel}</button>
    </div>
    {error && <p role="alert" className="mt-2 text-sm text-rose-700">{error}</p>}
    <p className="mt-2 text-xs leading-5 text-amber-700">এই ক্যামেরা স্ক্যান পরীক্ষামূলক। এটি একা জীবন্ত ব্যক্তি ও ছবি/ভিডিওর পার্থক্য নির্ভরযোগ্যভাবে প্রমাণ করে না। সরকারি ব্যবহারের আগে স্বাধীন Liveness/PAD পরীক্ষা আবশ্যক।</p>
  </div>;
}
