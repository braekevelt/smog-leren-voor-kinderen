import {
  drawConnectors,
  drawLandmarks,
  drawRectangle,
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
const datalistElement = document.getElementById(
  "options"
) as HTMLDataListElement;
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
videoElement1.playsInline = true;
let videoElement2 = document.createElement("video");
videoElement2.playsInline = true;
videoElement2.loop = true;
videoElement2.muted = false;

// Movements
const leftBottomHead = (results: Results) => results.faceLandmarks?.[288];
const leftIndexFinger = (results: Results) => results.leftHandLandmarks?.[8];
const leftIndexHand = (results: Results) => results.leftHandLandmarks?.[5];
// const leftHandBottom = (results: Results) => results.leftHandLandmarks?.[0];
const leftHip = (results: Results) =>
  results.poseLandmarks?.[POSE_LANDMARKS.LEFT_HIP];
const leftMiddleHead = (results: Results) => results.faceLandmarks?.[323];
const leftPinkyFinger = (results: Results) => results.leftHandLandmarks?.[20];
const leftPinkyHand = (results: Results) => results.leftHandLandmarks?.[17];
const leftShoulder = (results: Results) =>
  results.poseLandmarks?.[POSE_LANDMARKS.LEFT_SHOULDER];
const leftTopHead = (results: Results) => results.faceLandmarks?.[251];
// const leftWrist = (results: Results) => results.poseLandmarks?.[15];
const rightIndexFinger = (results: Results) => results.rightHandLandmarks?.[8];
const rightIndexHand = (results: Results) => results.rightHandLandmarks?.[5];
const rightNose = (results: Results) => results.faceLandmarks?.[48];
const rightShoulder = (results: Results) =>
  results.poseLandmarks?.[POSE_LANDMARKS.RIGHT_SHOULDER];
const mouthTop = (results: Results) => results.faceLandmarks?.[11];
const neck = (results: Results): NormalizedLandmark => ({
  x:
    ((results.poseLandmarks?.[11]?.x ?? 0) +
      (results.poseLandmarks?.[12]?.x ?? 0)) /
    2,
  y:
    ((results.poseLandmarks?.[11]?.y ?? 0) +
      (results.poseLandmarks?.[12]?.y ?? 0)) /
    2,
});
// const chin = (results: Results) => results.faceLandmarks?.[152];

const allMovements: Record<
  string,
  [
    (results: Results) => NormalizedLandmark,
    (results: Results) => NormalizedLandmark,
    number
  ][][]
> = {
  koning: [
    [[leftIndexFinger, rightShoulder, 0.1]],
    [[leftIndexFinger, leftHip, 0.1]],
  ],
  boos: [
    [
      [leftIndexFinger, leftIndexHand, 0.05],
      [leftIndexHand, neck, 0.12],
    ],
    [
      [leftIndexFinger, leftIndexHand, 0.05],
      [leftIndexHand, leftShoulder, 0.1],
    ],
  ],
  braaf: [
    [
      [leftIndexFinger, leftTopHead, 0.05],
      [leftIndexHand, leftBottomHead, 0.08],
    ],
    [[leftIndexFinger, leftBottomHead, 0.12]],
  ],
  danku: [
    [[leftIndexFinger, mouthTop, 0.05]],
    [[leftPinkyHand, leftShoulder, 0.16]],
  ],
  fruit: [
    [
      [leftIndexFinger, rightNose, 0.06],
      [leftPinkyFinger, leftPinkyHand, 0.12],
    ],
    [
      [leftIndexFinger, leftMiddleHead, 0.06],
      [leftPinkyFinger, leftPinkyHand, 0.12],
    ],
  ],
  "jas-aandoen": [
    [
      [leftIndexFinger, leftIndexHand, 0.05],
      [leftIndexHand, leftShoulder, 0.15],
      [rightIndexFinger, rightIndexHand, 0.05],
      [rightIndexHand, rightShoulder, 0.15],
    ],
    [
      [leftIndexHand, rightIndexHand, 0.1],
      [leftIndexFinger, leftIndexHand, 0.05],
      [rightIndexFinger, rightIndexHand, 0.05],
    ],
  ],
};

let movementIndex = 0;
const resetMovementIndex = () => {
  movementIndex = 0;
};
selectElement.addEventListener("change", resetMovementIndex);
exampleElement.addEventListener("click", resetMovementIndex);

// Example
const updateVideoElement2 = async () => {
  videoElement2.src = `videos/${selectElement.value}.mp4`;
  if (exampleElement.checked) {
    videoElement2.load?.();
    try {
      if (videoElement2.paused) {
        await videoElement2.play();
      }
    } catch (e: any) {
      console.error(`updateVideoElement2 > play: ${e?.message} ${e?.stack}`);
    }
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
  if (Date.now() - lastScoreIncrease < SUCCESS_MESSAGE_DURATION) {
    canvasCtx.font = "64px serif";
    canvasCtx.textAlign = "center";
    canvasCtx.fillText(
      "Goed gedaan!",
      canvasElement.width / 2,
      canvasElement.height / 2
    );
  } else if (!exampleElement.checked) {
    const movements = allMovements[selectElement.value];
    const movement = movements?.[movementIndex];
    if (movement?.length) {
      const currentMovement = movement.map(
        ([part, target, distance]) =>
          [part(results), target(results), distance] as const
      );

      if (
        currentMovement.every(
          ([part, target, distance]) =>
            part &&
            target &&
            Math.abs(part.x - target.x) < distance &&
            Math.abs(part.y - target.y) < distance
        )
      ) {
        movementIndex += 1;
      }

      if (movementIndex >= movements.length) {
        score += 1;
        scoreElement.innerHTML = `${score}`;
        lastScoreIncrease = Date.now();
        movementIndex = 0;
        const options = [...datalistElement.options].filter(
          (option) => option.value !== selectElement.value
        );
        selectElement.value =
          options[Math.floor(Math.random() * options.length)].value;
      }

      if (tipElement.checked) {
        for (const [part, target, distance] of currentMovement) {
          if (part) {
            drawLandmarks(canvasCtx, [part], {
              color: "rgba(255, 0, 0, 1.0)",
              lineWidth: 5,
            });
          }
          if (target) {
            drawRectangle(
              canvasCtx,
              {
                xCenter: target.x,
                yCenter: target.y,
                width: distance * 2,
                height: distance * 2,
                rotation: 0,
              },
              {
                color: "rgba(0, 255, 0, 0.0)",
                fillColor: "rgba(0, 255, 0, 0.1)",
                lineWidth: 3,
              }
            );
          }
          if (part && target) {
            drawConnectors(canvasCtx, [part, target], [[0, 1]], {
              color: "rgba(0, 255, 0, 1.0)",
              lineWidth: 3,
            });
          }
        }
      }
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
    try {
      await holistic.send({ image: videoElement });
    } catch (e: any) {
      console.error(`render > send: ${e?.message} ${e?.stack}`);
    }
  }

  // Rerender on next frame
  window.requestAnimationFrame(render);
}

// Start rendering loop
async function main() {
  const mediaStream = await navigator.mediaDevices.getUserMedia({
    video: true,
  });

  // Older browsers may not have srcObject
  try {
    videoElement1.srcObject = mediaStream;
  } catch (e: any) {
    if (e.name !== "TypeError") {
      throw e;
    }
    // Avoid using this in new browsers, as it is going away.
    videoElement1.src = URL.createObjectURL(mediaStream as any);
  }

  videoElement1.addEventListener("loadeddata", render);
  videoElement1.load?.();
  await videoElement1.play();
}

const isWebCamSupported = !!navigator.mediaDevices?.getUserMedia;
if (!isWebCamSupported) {
  console.error(isWebCamSupported);
  alert(
    "Je browser is niet ondersteund. Probeer in een andere browser of een ander toestel."
  );
  location.reload();
} else {
  main().catch((e) => {
    console.error(`main: ${e?.message} ${e?.stack}`);
    alert("Er is een fout opgetreden. Probeer opnieuw.");
    location.reload();
  });
}
