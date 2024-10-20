import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors } from "@mediapipe/drawing_utils";
import {
  FACEMESH_CONTOURS,
  HAND_CONNECTIONS,
  POSE_LANDMARKS,
  Holistic,
  Results,
} from "@mediapipe/holistic";

const videoElement = document.getElementById("input") as HTMLVideoElement;
const canvasElement = document.getElementById("output") as HTMLCanvasElement;
const canvasCtx = canvasElement.getContext("2d") as CanvasRenderingContext2D;

function onResults(results: Results) {
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  if (results.segmentationMask) {
    canvasCtx.drawImage(
      results.segmentationMask,
      0,
      0,
      canvasElement.width,
      canvasElement.height
    );
  }

  // Only overwrite existing pixels.
  canvasCtx.globalCompositeOperation = "source-in";
  canvasCtx.fillStyle = "#00FF00";
  canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);

  // Only overwrite missing pixels.
  // canvasCtx.globalCompositeOperation = "destination-atop";
  // if (results.image) {
  //   canvasCtx.drawImage(
  //     results.image,
  //     0,
  //     0,
  //     canvasElement.width,
  //     canvasElement.height
  //   );
  // }

  canvasCtx.globalCompositeOperation = "source-over";
  if (results.poseLandmarks) {
    drawConnectors(
      canvasCtx,
      results.poseLandmarks,
      [
        [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER],
        [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW],
        [POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST],
        [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_ELBOW],
        [POSE_LANDMARKS.RIGHT_ELBOW, POSE_LANDMARKS.RIGHT_WRIST],
      ],
      {
        color: "#000000",
        lineWidth: 4,
      }
    );
    // drawLandmarks(canvasCtx, results.poseLandmarks, {
    //   color: "#FF0000",
    //   lineWidth: 2,
    // });
  }
  if (results.faceLandmarks) {
    drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_CONTOURS, {
      color: "#000000",
      lineWidth: 3,
    });
  }
  if (results.leftHandLandmarks) {
    drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS, {
      color: "#000000",
      lineWidth: 3,
    });
    // drawLandmarks(canvasCtx, results.leftHandLandmarks, {
    //   color: "#00FF00",
    //   lineWidth: 2,
    // });
  }
  if (results.rightHandLandmarks) {
    drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, {
      color: "#000000",
      lineWidth: 3,
    });
    // drawLandmarks(canvasCtx, results.rightHandLandmarks, {
    //   color: "#FF0000",
    //   lineWidth: 2,
    // });
  }
  canvasCtx.restore();
}

const holistic = new Holistic({
  locateFile: (file) => {
    // return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1675471629/${file}`;
    return new URL(`/node_modules/@mediapipe/holistic/${file}`, import.meta.url)
      .href;
  },
});
holistic.setOptions({
  modelComplexity: 1,
  selfieMode: true,
  enableFaceGeometry: false,
  smoothLandmarks: true,
  enableSegmentation: false,
  smoothSegmentation: false,
  refineFaceLandmarks: false,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});
holistic.onResults(onResults);

async function render() {
  // Fit to frame
  canvasElement.style.width = `${videoElement.videoWidth}`;
  canvasElement.style.height = `${videoElement.videoHeight}`;
  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;

  // Detect and draw
  await holistic.send({ image: videoElement });

  // Rerender on next frame
  window.requestAnimationFrame(render);
}

// Start rendering loop
const isWebCamSupported = !!navigator.mediaDevices?.getUserMedia;
if (isWebCamSupported) {
  navigator.mediaDevices
    .getUserMedia({ video: true })
    .then((stream) => {
      videoElement.srcObject = stream;
      videoElement.addEventListener("loadeddata", render);
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
