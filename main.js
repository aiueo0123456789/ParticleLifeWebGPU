import { ParticleLife } from "./game/ParticleLife.js";
import { simpleWebGPU } from "./simpleWebGPU.js";

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
const cameraZooMax = 100;
const cameraZooMin = 0.1;

document.addEventListener("wheel", (e) => {
  camera.zoom += e.deltaY / 200;
  camera.zoom = Math.max(Math.min(camera.zoom, cameraZooMax), cameraZooMin);
  cameraZoomUpd();
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

const sliders = [
  "spawnRadius",
  "count",
  "kinds",
  "minValue",
  "maxValue",
  "radius",
  "minRadiusRate",
  "bounce",
  "correctSimulation",
  "isPlay",
];
const structs = {
  spawnRadius: {
    text: "スポーン半径",
    min: 2500,
    max: 5000,
    value: game.dynamicSetting.spawnRadius,
    step: 1,
  },
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
  minValue: {
    text: "最小値",
    min: -100,
    max: 100,
    value: game.dynamicSetting.minValue,
    step: 0.1,
  },
  maxValue: {
    text: "最大値",
    min: -100,
    max: 100,
    value: game.dynamicSetting.maxValue,
    step: 0.1,
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
  bounce: {
    text: "反発力",
    min: 0,
    max: 100,
    value: game.dynamicSetting.bounce,
    step: 0.001,
  },
  correctSimulation: {
    text: "正しい計算",
    type: "checkbox",
    value: game.dynamicSetting.correctSimulation,
  },
  isPlay: {
    text: "再生",
    type: "checkbox",
    value: game.dynamicSetting.isPlay,
  },
};
const fmts = {
  spawnRadius: (v) => Math.round(v),
  count: (v) => Math.round(v),
  kinds: (v) => Math.round(v),
  minValue: (v) => v,
  maxValue: (v) => v,
  radius: (v) => Math.round(v),
  minRadiusRate: (v) => v,
  bounce: (v) => v,
  correctSimulation: (v) => v,
  isPlay: (v) => v,
};

const inputs = {
  spawnRadius: (v) => {
    game.dynamicSetting.spawnRadius = Number(v);
  },
  count: (v) => {
    game.dynamicSetting.particles = Number(v);
  },
  kinds: (v) => {
    game.dynamicSetting.kinds = Number(v);
    game.resetKind();
  },
  minValue: (v) => {
    game.dynamicSetting.minValue = Number(v);
  },
  maxValue: (v) => {
    game.dynamicSetting.maxValue = Number(v);
  },
  radius: (v) => {
    game.dynamicSetting.maxRadius = Number(v);
  },
  minRadiusRate: (v) => {
    game.dynamicSetting.minRadiusRate = Number(v);
  },
  bounce: (v) => {
    game.dynamicSetting.bounce = Number(v);
  },
  correctSimulation: (v) => {
    game.dynamicSetting.correctSimulation = v;
  },
  isPlay: (v) => {
    game.dynamicSetting.isPlay = v;
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
  if (structs[k].type === "checkbox") {
    input.type = "checkbox";
    input.checked = structs[k].value;
  } else {
    input.type = "range";
    input.min = structs[k].min;
    input.max = structs[k].max;
    input.step = structs[k].step;
    input.value = structs[k].value;
  }
  row.append(lh, input);

  setting.append(row);

  const upd = () => {
    if (input.type === "checkbox") {
      inputs[k](input.checked);
    } else {
      span.textContent = fmts[k](input.value);
      setPct(input);
      inputs[k](input.value);
    }
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
document.getElementById("btn-restart").addEventListener("click", () => {
  game.init();
});

const cameraSettingTag = document.getElementById("camera-setting");
const cameraZoomRow = document.createElement("div");
cameraZoomRow.classList.add("row");
const cameraZoomLh = document.createElement("div");
cameraZoomLh.classList.add("lh");
const cameraZoomLabel = document.createElement("label");
cameraZoomLabel.textContent = "ズーム";
const cameraZoomSpan = document.createElement("span");
cameraZoomLh.append(cameraZoomLabel, cameraZoomSpan);
const cameraZoomInput = document.createElement("input");
cameraZoomInput.type = "range";
cameraZoomInput.min = cameraZooMin;
cameraZoomInput.max = cameraZooMax;
cameraZoomInput.step = 0.01;
cameraZoomInput.value = camera.zoom;

cameraZoomRow.append(cameraZoomLh, cameraZoomInput);

cameraSettingTag.append(cameraZoomRow);

const cameraZoomUpd = () => {
  setPct(cameraZoomInput);
  cameraZoomSpan.textContent = Math.round(camera.zoom * 100) / 100;
};
cameraZoomInput.addEventListener("input", () => {
  camera.zoom = Number(cameraZoomInput.value);
  cameraZoomUpd();
});
cameraZoomUpd();

panel.addEventListener("mousemove", (e) => {
  e.stopPropagation();
});
panel.addEventListener("mousedown", (e) => {
  e.stopPropagation();
});
panel.addEventListener("mouseup", (e) => {
  e.stopPropagation();
});
panel.addEventListener("wheel", (e) => {
  e.stopPropagation();
});

game.init();
update();
