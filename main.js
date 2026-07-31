import { ParticleLife } from "./game/ParticleLife.js";
import { RadixSortGPU } from "./lib/RadixSortGPU.js";
import { simpleWebGPU } from "./simpleWebGPU.js";
import { generateDistinctColors, printBufferData } from "./util.js";

/** @type {HTMLCanvasElement} */
const canvas = document.getElementById("renderTarget");
canvas.width = canvas.offsetWidth * 2;
canvas.height = canvas.offsetHeight * 2;
const canvasContext = canvas.getContext("webgpu");
canvasContext.configure({
  device: simpleWebGPU.device,
  format: simpleWebGPU.preferredCanvasFormat,
});

const game = new ParticleLife();
let lastTime = performance.now();
let frames = 0;
function update() {
  game.update(canvas, canvasContext);
  frames++;
  const time = performance.now();
  const diff = time - lastTime;

  // 1秒経過したかチェック
  if (diff >= 1000) {
    const fps = Math.round((frames * 1000) / diff);
    document.getElementById("fps").textContent = `FPS: ${fps}`;
    frames = 0;
    lastTime = time;
  }
  requestAnimationFrame(update);
}

const camera = game.camera;

simpleWebGPU.writeBuffer(
  game.gpu.buffer.particleKind,
  new Uint32Array(
    Array.from({ length: game.dynamicSetting.particles }, () =>
      Math.floor(Math.random() * game.dynamicSetting.kinds),
    ),
  ),
);
simpleWebGPU.writeBuffer(
  game.gpu.buffer.particlePositionPong,
  new Float32Array(
    Array.from(
      { length: game.dynamicSetting.particles * 2 },
      () => Math.random() * 10000,
    ),
  ),
);
simpleWebGPU.writeBuffer(
  game.gpu.buffer.particleKindColor,
  new Float32Array(generateDistinctColors(game.dynamicSetting.kinds).flat()),
);
simpleWebGPU.writeBuffer(
  game.gpu.buffer.particleRule,
  /**
   *   0 1 2
   * 0
   * 1
   * 2
   */
  new Float32Array(
    Array.from({
      length: game.staticSetting.maxKinds * game.staticSetting.maxKinds,
    }).map(() => (Math.random() * 2 - 1) * 10),
  ),
);
update();

document.addEventListener("wheel", (e) => {
  camera.zoom += e.deltaY / 100;
  camera.zoom = Math.max(Math.min(camera.zoom, 100), 0.1);
});

let isMouseDown = false;
document.addEventListener("mousedown", (e) => {
  isMouseDown = true;
});
document.addEventListener("mouseup", (e) => {
  isMouseDown = false;
});
document.addEventListener("mousemove", (e) => {
  if (isMouseDown) {
    camera.position[0] -= e.movementX / camera.zoom;
    camera.position[1] += e.movementY / camera.zoom;
  }
});
