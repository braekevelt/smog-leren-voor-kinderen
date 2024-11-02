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

// DOM elements
const scoreElement = document.getElementById("score") as HTMLElement;
const selectElement = document.getElementById("select") as HTMLSelectElement;
const exampleElement = document.getElementById(
  "show-example"
) as HTMLInputElement;
const tipElement = document.getElementById("show-tip") as HTMLInputElement;
const cameraElement = document.getElementById(
  "show-camera"
) as HTMLInputElement;
const canvasElement = document.getElementById("output") as HTMLCanvasElement;
const canvasCtx = canvasElement.getContext("2d") as CanvasRenderingContext2D;
const videoElement1 = document.createElement("video");
let videoElement2 = document.createElement("video");
videoElement2.loop = true;
videoElement2.autoplay = true;
videoElement2.muted = false;

// Movements
const movements = [
  ["leftIndexFinger", "rightShoulder"],
  ["leftIndexFinger", "leftHip"],
];
let currentMovement = 0;

// Example
const updateVideoElement2 = async () => {
  videoElement2.src = `videos/${selectElement.value}.mp4`;
  if (exampleElement.checked) {
    videoElement2.load?.();
    await videoElement2.play();
  } else {
    videoElement2.pause();
  }
};
selectElement.addEventListener("change", updateVideoElement2);
exampleElement.addEventListener("click", updateVideoElement2);

// Score
const SUCCESS_MESSAGE_DURATION = 3000;
let lastScoreIncrease = Date.now() - SUCCESS_MESSAGE_DURATION;
let score = 0;

// Draw
function draw(results: Results) {
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
  if (cameraElement.checked) {
    canvasCtx.globalCompositeOperation = "destination-atop";
    if (results.image) {
      canvasCtx.drawImage(
        results.image,
        0,
        0,
        canvasElement.width,
        canvasElement.height
      );
    }
  }

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

  // Win condition
  if (exampleElement.checked) {
    currentMovement = 0;
  } else {
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
      lastScoreIncrease = Date.now();
    }

    if (tipElement.checked) {
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
  }
  if (Date.now() - lastScoreIncrease < SUCCESS_MESSAGE_DURATION) {
    canvasCtx.font = "64px serif";
    canvasCtx.textAlign = "center";
    canvasCtx.fillText(
      "Goed gedaan!",
      canvasElement.width / 2,
      canvasElement.height / 2
    );
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

// Rendering loop
async function render() {
  const videoElement = !exampleElement.checked ? videoElement1 : videoElement2;

  if (videoElement.readyState > 1) {
    // Fit to frame
    const canvasElementWidth =
      ((videoElement.videoWidth || window.innerWidth) * window.innerHeight) /
      (videoElement.videoHeight || window.innerHeight);
    if (canvasElement.width !== canvasElementWidth) {
      canvasElement.width = canvasElementWidth;
    }
    if (window.innerHeight !== canvasElement.height) {
      canvasElement.height = window.innerHeight;
    }

    // Detect and draw
    await holistic.send({ image: videoElement });
  }

  // Rerender on next frame
  window.requestAnimationFrame(render);
}

// Start rendering loop
const isWebCamSupported = !!navigator.mediaDevices?.getUserMedia;
if (!isWebCamSupported) {
  alert(
    "Je browser is niet ondersteund. Probeer in een andere browser of een ander toestel."
  );
  location.reload();
} else {
  navigator.mediaDevices
    .getUserMedia({ video: true })
    .then(async (stream) => {
      videoElement1.srcObject = stream;
      videoElement1.addEventListener("loadeddata", render);
      videoElement1.load?.();
      await videoElement1.play();
    })
    .catch((e) => {
      console.log(e?.message);
      alert("Er is een fout opgetreden. Probeer opnieuw.");
      location.reload();
    });
}
