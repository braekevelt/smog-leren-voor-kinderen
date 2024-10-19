import { defineConfig } from "vite";
import { mediapipe } from "vite-plugin-mediapipe";

export default defineConfig({
  plugins: [mediapipe()],
});
