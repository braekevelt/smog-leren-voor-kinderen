import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { HAND_CONNECTIONS } from "@mediapipe/hands";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

// DOM elements
const button = document.getElementById("button") as HTMLButtonElement;
const video = document.getElementById("video") as HTMLVideoElement;
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const canvasCtx = canvas.getContext("2d") as CanvasRenderingContext2D;

button.addEventListener("click", () => {
  video.hidden = !video.hidden;
});

// Start rendering loop
const isWebCamSupported = !!navigator.mediaDevices?.getUserMedia;
if (isWebCamSupported) {
  navigator.mediaDevices
    .getUserMedia({ video: true })
    .then((stream) => {
      video.srcObject = stream;
      video.addEventListener("loadeddata", render);
    })
    .catch(() => {
      alert(
        "Geen toegang tot camera. Klik op 'camera toestaan' en probeer opnieuw."
      );
      location.reload();
    });
} else {
  alert(
    "Je browser is niet ondersteund. Probeer in een andere browser of een ander toestel."
  );
  location.reload();
}

// Load vision models
const vision = await FilesetResolver.forVisionTasks(
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
);
const handLandmarker = await HandLandmarker.createFromOptions(vision, {
  baseOptions: {
    modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
    delegate: "GPU",
  },
  runningMode: "VIDEO",
  numHands: 2,
});

// Rendering loop
async function render() {
  // Fit to frame
  canvas.style.width = `${video.videoWidth}`;
  canvas.style.height = `${video.videoHeight}`;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  // Detect in current frame
  const results = handLandmarker.detectForVideo(video, performance.now());

  // Draw results
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
  if (results?.landmarks) {
    for (const landmarks of results.landmarks) {
      drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
        color: "#00FF00",
        lineWidth: 3,
      });
      drawLandmarks(canvasCtx, landmarks, { color: "#00FF00", radius: 3 });
    }
  }
  canvasCtx.restore();

  // Rerender on next frame
  window.requestAnimationFrame(render);
}
