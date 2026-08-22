import { ParticleLife } from "./game/ParticleLife.js";
import { simpleWebGPU } from "./simpleWebGPU.js";
import { generateDistinctColors } from "./util.js";

/** @type {HTMLCanvasElement} */
const canvas = document.getElementById("renderTarget");
canvas.width = canvas.offsetWidth * 1;
canvas.height = canvas.offsetHeight * 1;
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

  // simpleWebGPU.printBufferData(
  //   game.gpu.buffer.particleChunkIndex,
  //   ["u32"],
  //   "particleChunkIndex",
  // );
  // simpleWebGPU.printBufferData(
  //   game.gpu.buffer.chunkOffset,
  //   ["u32"],
  //   "chunkOffset",
  // );
  // simpleWebGPU.printBufferData(
  //   game.gpu.buffer.particleIndexOderByChunck,
  //   ["u32"],
  //   "particleIndexOderByChunck",
  // );

  frames++;
  const time = performance.now();
  const diff = time - lastTime;

  // 1秒経過したかチェック
  if (diff >= 1000) {
    const fps = Math.round((frames * 1000) / diff);
    document.getElementById("fps").textContent = `${fps}`;
    frames = 0;
    lastTime = time;
  }
  requestAnimationFrame(update);
}

const camera = game.camera;

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

const sliders = ["count", "kinds", "radius", "minRadiusRate"];
const structs = {
  count: {
    text: "パーティクル数",
    min: 10 ** 3,
    max: game.staticSetting.maxParticles,
    value: game.dynamicSetting.particles,
    step: 1,
  },
  kinds: {
    text: "パーティクル種類",
    min: 1,
    max: game.staticSetting.maxKinds,
    value: game.dynamicSetting.kinds,
    step: 1,
  },
  radius: {
    text: "最大作用半径",
    min: 10,
    max: 200,
    value: game.dynamicSetting.maxRadius,
    step: 0.1,
  },
  minRadiusRate: {
    text: "最小範囲割合",
    min: 0,
    max: 1,
    value: game.dynamicSetting.minRadiusRate,
    step: 0.001,
  },
};
const fmts = {
  count: (v) => Math.round(v),
  kinds: (v) => Math.round(v),
  radius: (v) => Math.round(v),
  minRadiusRate: (v) => v,
};

const inputs = {
  count: (v) => {
    game.dynamicSetting.particles = Number(v);
  },
  kinds: (v) => {
    game.dynamicSetting.kinds = Number(v);
    game.resetKind();
  },
  radius: (v) => {
    game.dynamicSetting.maxRadius = Number(v);
  },
  minRadiusRate: (v) => {
    console.log();
    game.dynamicSetting.minRadiusRate = Number(v);
  },
};

function setPct(el) {
  const min = Number(el.min),
    max = Number(el.max),
    v = Number(el.value);
  el.style.setProperty("--pct", ((v - min) / (max - min)) * 100 + "%");
}

const panel = document.getElementById("panel");
const setting = document.getElementById("setting");

sliders.forEach((k) => {
  // <div class="row">
  //   <div class="lh"><label>粒子数</label>
  //     <span class="val" id="v-count"></span>
  //   </div>
  //   <input type="range" id="s-count" min="10000" max="316228" step="50">
  // </div>
  const row = document.createElement("div");
  row.classList.add("row");
  const lh = document.createElement("div");
  lh.classList.add("lh");
  const label = document.createElement("label");
  label.textContent = structs[k].text;
  const span = document.createElement("span");
  lh.append(label, span);
  const input = document.createElement("input");
  input.type = "range";
  input.min = structs[k].min;
  input.max = structs[k].max;
  input.step = structs[k].step;
  input.value = structs[k].value;
  row.append(lh, input);

  setting.append(row);

  const upd = () => {
    span.textContent = fmts[k](input.value);
    setPct(input);
    inputs[k](input.value);
  };
  input.addEventListener("input", upd);
  upd();
});

const tab = document.getElementById("tab");
document.body.classList.add("open");
tab.addEventListener("click", () => {
  document.body.classList.toggle("open");
});

document.getElementById("btn-matrix").addEventListener("click", () => {
  game.resetRurle();
});

panel.addEventListener("mousemove", (e) => {
  e.stopPropagation();
});
panel.addEventListener("mousedown", (e) => {
  e.stopPropagation();
});
panel.addEventListener("mouseup", (e) => {
  e.stopPropagation();
});

game.init();
update();
