import { Camera } from "@mediapipe/camera_utils";
import {
  drawConnectors,
  drawLandmarks,
  NormalizedLandmark,
} from "@mediapipe/drawing_utils";
import {
  FACEMESH_CONTOURS,
  HAND_CONNECTIONS,
  POSE_LANDMARKS,
  Holistic,
  Results,
} from "@mediapipe/holistic";

// Constants
const WIDTH = 1280;
const HEIGHT = 720;

// DOM elements
const scoreElement = document.getElementById("score") as HTMLElement;
const buttonElement = document.getElementById("show-tip") as HTMLButtonElement;
const videoElement = document.getElementById("input") as HTMLVideoElement;
const canvasElement = document.getElementById("output") as HTMLCanvasElement;
const canvasCtx = canvasElement.getContext("2d") as CanvasRenderingContext2D;

// Resize to screen
canvasElement.style.width = `${WIDTH}`;
canvasElement.style.height = `${HEIGHT}`;
canvasElement.width = WIDTH;
canvasElement.height = HEIGHT;

// Movements
const movements = [
  ["leftIndexFinger", "rightShoulder"],
  ["leftIndexFinger", "leftHip"],
];
let currentMovement = 0;

// Tip
let showTip = false;
buttonElement.addEventListener("click", () => {
  showTip = !showTip;
  currentMovement = 0;
});

// Score
let score = 0;

// Draw
function draw(results: Results) {
  // Win condition
  const parts: Record<string, NormalizedLandmark> = {
    leftHip: results.poseLandmarks?.[POSE_LANDMARKS.LEFT_HIP],
    leftIndexFinger: results.leftHandLandmarks?.[8],
    rightShoulder: results.poseLandmarks?.[POSE_LANDMARKS.RIGHT_SHOULDER],
  };

  const movement = movements[currentMovement];
  const part = parts[movement[0]];
  const target = parts[movement[1]];

  if (part && target) {
    if (
      Math.abs(part.x - target.x) < 0.1 &&
      Math.abs(part.y - target.y) < 0.1
    ) {
      currentMovement += 1;
    }
  }

  if (currentMovement >= movement.length) {
    score += 1;
    scoreElement.innerHTML = `${score}`;
    currentMovement = 0;
  }

  // Draw
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
        [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_HIP],
        [POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.LEFT_HIP],
        [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_SHOULDER],
        [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER],
        [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW],
        [POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST],
        [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_ELBOW],
        [POSE_LANDMARKS.RIGHT_ELBOW, POSE_LANDMARKS.RIGHT_WRIST],
      ],
      {
        color: "#000000",
        lineWidth: 3,
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

  if (showTip) {
    if (part) {
      drawLandmarks(canvasCtx, [part], {
        color: "#FF0000",
        lineWidth: 5,
      });
    }
    if (target) {
      drawLandmarks(canvasCtx, [target], {
        color: "#00FF00",
        lineWidth: 5,
      });
    }
    if (part && target) {
      drawConnectors(canvasCtx, [part, target], [[0, 1]], {
        color: "#00FF00",
        lineWidth: 3,
      });
    }
  }

  canvasCtx.restore();
}

// Detection
const holistic = new Holistic({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1675471629/${file}`;
    // return new URL(`/node_modules/@mediapipe/holistic/${file}`, import.meta.url)
    //   .href;
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
holistic.onResults(draw);

// Camera
const camera = new Camera(videoElement, {
  onFrame: async () => holistic.send({ image: videoElement }),
  width: WIDTH,
  height: HEIGHT,
});
camera.start();
