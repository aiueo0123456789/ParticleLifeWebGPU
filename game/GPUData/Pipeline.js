import { simpleWebGPU } from "../../simpleWebGPU.js";
import { GPUGroupLayout } from "./GroupLayout.js";

export class GPUPipeline {
  /**
   *
   * @param {GPUGroupLayout} groupLayout
   */
  constructor(groupLayout) {
    const renderPipelineShader = simpleWebGPU.createShaderModule(/* wgsl */ `
struct Camera {
  position: vec2<f32>,
  displayRange: vec2<f32>,
}

@group(0) @binding(0) var<uniform> camera: Camera;
@group(0) @binding(1) var<storage, read> particles: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read> kind: array<u32>;
@group(0) @binding(3) var<storage, read> kindColor: array<vec4<f32>>;

struct VInput {
  @builtin(instance_index) instanceIndex: u32,
  @builtin(vertex_index) vertexIndex: u32
}

struct VOutput {
  @builtin(position) position: vec4<f32>, // クリッピング座標系での頂点位置
  @location(0) texCoord: vec2<f32>,
  @location(1) color: vec4<f32>,
}

const pointData = array<vec2<f32>, 3>(
  vec2<f32>( 3.0,-1.0),
  vec2<f32>(0.0, 1.5),
  vec2<f32>(-3.0,-1.0),
);

const particleSize = 4.0;

// バーテックスシェーダー
@vertex
fn vmain(input: VInput) -> VOutput {
  var output: VOutput;
  let point = pointData[input.vertexIndex];
  output.position = vec4<f32>((point * particleSize + particles[input.instanceIndex] - camera.position) / camera.displayRange, 0.0, 1.0);
  output.texCoord = point;
  output.color = kindColor[kind[input.instanceIndex]];
  return output;
}

struct FInput {
  @location(0) texCoord: vec2<f32>,
  @location(1) color: vec4<f32>,
};

struct FOutput {
  @location(0) color: vec4<f32>,   // カラーバッファ (通常は0番目の出力)
};

// フラグメントシェーダー
@fragment
fn fmain(input: FInput) -> FOutput {
  var output: FOutput;
  if (dot(input.texCoord, input.texCoord) > 1.0) {
    discard;
  }
  output.color = input.color;
  return output;
}
`);
    this.render = simpleWebGPU.device.createRenderPipeline({
      layout: simpleWebGPU.device.createPipelineLayout({
        bindGroupLayouts: [groupLayout.render],
      }),
      vertex: {
        module: renderPipelineShader,
        entryPoint: "vmain",
        buffers: [],
      },
      primitive: { topology: "triangle-list" },
      fragment: {
        module: renderPipelineShader,
        entryPoint: "fmain",
        targets: [
          {
            format: simpleWebGPU.preferredCanvasFormat,
            blend: {
              color: {
                srcFactor: "src-alpha",
                dstFactor: "one",
                operation: "add",
              },
              alpha: {
                srcFactor: "one",
                dstFactor: "one",
                operation: "add",
              },
            },
          },
        ],
      },
    });

    const paramsStruct = /* wgsl */ `
struct Params {
  particleCount: u32,
  maxKindsCount: u32,
  chunkCount: u32,
  chunkSize: f32,
  maxRadius: f32,
  minRadiusRate: f32,
};
    `;

    const posToHash = /* wgsl */ `
fn chunkCoord(pos: vec2<f32>) -> vec2<i32> {
  return vec2<i32>(
    i32(floor(pos.x / params.chunkSize)),
    i32(floor(pos.y / params.chunkSize))
  );
}

fn posToHash(pos: vec2<f32>) -> u32 {
  let p = chunkCoord(pos);

  var h = u32(p.x) * 0x9E3779B9u;
  h ^= u32(p.y) * 0x85EBCA6Bu;

  h ^= h >> 16u;
  h *= 0x85EBCA6Bu;
  h ^= h >> 13u;
  h *= 0xC2B2AE35u;
  h ^= h >> 16u;

  return h % params.chunkCount;
}
    `;

    // ビット反転
    this.radixSort_InvertBit = simpleWebGPU.device.createComputePipeline({
      layout: simpleWebGPU.device.createPipelineLayout({
        bindGroupLayouts: [groupLayout.radixSort_InvertBit, groupLayout.params],
      }),
      compute: {
        module: simpleWebGPU.device.createShaderModule({
          label: "radixSortA",
          code: /* wgsl */ `
${paramsStruct}

struct Uniforms {
  bitIndex: u32,
}

@group(0) @binding(0) var<storage, read_write> invertedBit: array<u32>;
@group(0) @binding(1) var<storage, read> dataRead: array<u32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;
@group(1) @binding(0) var<uniform> params: Params;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (params.particleCount <= i) {
    return;
  }
  let b = (dataRead[i] >> uniforms.bitIndex) & 1u;
  invertedBit[i] = 1u - b;
}
          `,
        }),
        entryPoint: "main",
      },
    });
    // 移動
    this.radixSort_Sort = simpleWebGPU.device.createComputePipeline({
      layout: simpleWebGPU.device.createPipelineLayout({
        bindGroupLayouts: [groupLayout.radixSort_Sort, groupLayout.params],
      }),
      compute: {
        module: simpleWebGPU.device.createShaderModule({
          label: "radixSortB",
          code: /* wgsl */ `
${paramsStruct}

struct Uniforms {
  bitIndex: u32,
}

@group(0) @binding(0) var<storage, read_write> dataWrite: array<u32>; // 並び替え後
@group(0) @binding(1) var<storage, read> dataRead: array<u32>; // 並び替え前
@group(0) @binding(2) var<storage, read> prefixSum: array<u32>;   // 累積和
@group(0) @binding(3) var<storage, read> invertedBit: array<u32>;
@group(0) @binding(4) var<uniform> uniforms: Uniforms;

@group(0) @binding(5) var<storage, read_write> extrDataWrite: array<u32>; // 並び替え後
@group(0) @binding(6) var<storage, read> extrDataRead: array<u32>; // 並び替え前

@group(1) @binding(0) var<uniform> params: Params;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) globalId: vec3<u32>) {
  let i = globalId.x;
  if (params.particleCount <= i) {
    return;
  }

  let value = dataRead[i];
  let b = (value >> uniforms.bitIndex) & 1u;

  let f = prefixSum[i] - invertedBit[i];

  let lastIndex = params.particleCount - 1u;
  let tf = invertedBit[lastIndex] + prefixSum[lastIndex] - invertedBit[lastIndex]; // totalFalse
  let t = i - f + tf;

  let d = select(f, t, b == 1u);

  dataWrite[d] = value;
  extrDataWrite[d] = extrDataRead[i];
}
          `,
        }),
        entryPoint: "main",
      },
    });
    // offsetを計算
    this.radixSort_MakeOffset = simpleWebGPU.device.createComputePipeline({
      layout: simpleWebGPU.device.createPipelineLayout({
        bindGroupLayouts: [
          groupLayout.radixSort_MakeOffset,
          groupLayout.params,
        ],
      }),
      compute: {
        module: simpleWebGPU.device.createShaderModule({
          label: "makeOffset",
          code: /* wgsl */ `
${paramsStruct}

struct Offset {
  start: u32,
  end: u32,
}

@group(0) @binding(0) var<storage, read_write> offsets: array<Offset>;
@group(0) @binding(1) var<storage, read> sortedKeys: array<u32>;
@group(1) @binding(0) var<uniform> params: Params;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) globalId: vec3<u32>) {
  let i = globalId.x;
  if (params.particleCount <= i) {
    return;
  }

  let key = sortedKeys[i];

  // 先頭要素、または前の要素とキーが違う場所が「そのキーの開始位置」
  if (i == 0u || sortedKeys[i - 1u] != key) {
    offsets[key].start = i;
  }
  if (i == params.particleCount - 1 || sortedKeys[i + 1u] != key) {
    offsets[key].end = i;
  }
}
          `,
        }),
        entryPoint: "main",
      },
    });
    // 累積和の計算
    this.radixSort_Scan = simpleWebGPU.device.createComputePipeline({
      layout: simpleWebGPU.device.createPipelineLayout({
        bindGroupLayouts: [groupLayout.radixSort_Scan, groupLayout.params],
      }),
      compute: {
        module: simpleWebGPU.device.createShaderModule({
          label: "scanPipeline",
          code: /* wgsl */ `
${paramsStruct}

struct Uniforms {
  step: u32,
};

@group(0) @binding(0) var<storage, read_write> dst: array<u32>;
@group(0) @binding(1) var<storage, read> src: array<u32>;
@group(0) @binding(2) var<uniform> uni: Uniforms;
@group(1) @binding(0) var<uniform> params: Params;

struct CInput {
  @builtin(global_invocation_id) gid: vec3<u32>
}

@compute @workgroup_size(64)
fn main(input: CInput) {
  let i = input.gid.x;
  if (i >= params.particleCount) {
    return;
  }

  if (i < uni.step) {
    dst[i] = src[i];
  } else {
    dst[i] = src[i] + src[i - uni.step];
  }
}
          `,
        }),
        entryPoint: "main",
      },
    });

    this.update = simpleWebGPU.device.createComputePipeline({
      layout: simpleWebGPU.device.createPipelineLayout({
        bindGroupLayouts: [groupLayout.update, groupLayout.params],
      }),
      compute: {
        module: simpleWebGPU.device.createShaderModule({
          label: "update",
          code: /* wgsl */ `
${paramsStruct}

struct Offset {
  start: u32,
  end: u32,
}

@group(0) @binding(0) var<storage, read_write> positionWrite: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read> positionRead: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read_write> velocity: array<vec2<f32>>;
@group(0) @binding(3) var<storage, read> kind: array<u32>;
@group(0) @binding(4) var<storage, read> rule: array<f32>;
@group(0) @binding(5) var<storage, read> particleIndices: array<u32>;
@group(0) @binding(6) var<storage, read> offsets: array<Offset>;
@group(1) @binding(0) var<uniform> params: Params;

const dt = 1.0 / 60.0;
const bounce = 5.0;

${posToHash}

fn f(r: f32, a: f32) -> f32 {
  if (1.0 < r) { // 遠すぎ
    return 0.0;
  } else if (r < params.minRadiusRate) { // 近すぎる時の跳ね返し
    return (r / params.minRadiusRate - 1.0) * bounce;
  } else { // 通常
    return a * (1.0 - abs(2.0 * r - 1.0 - params.minRadiusRate) / (1.0 - params.minRadiusRate));
  }
  // return select(
  //   select(0.0, // 遠すぎ
  //     a * (1.0 - abs(2.0 * r - 1.0 - params.minRadiusRate) / (1.0 - params.minRadiusRate)), // 通常
  //     params.minRadiusRate < r && r < 1.0
  //   ),
  //   (r / params.minRadiusRate - 1) * bounce, // 近すぎる時の跳ね返し
  //   r < params.minRadiusRate
  // );
}

fn update(posA: vec2<f32>, kindA: u32, particleIndexB: u32) -> vec2<f32> {
  let sub = positionRead[particleIndexB] - posA;
  if (abs(sub.x) < params.maxRadius && abs(sub.y) < params.maxRadius) {
    let dist = max(length(sub), 0.0001);
    let dir = sub / dist;
    return dir * f(dist / params.maxRadius, rule[kindA * params.maxKindsCount + kind[particleIndexB]]) * dt;
  } else {
    return vec2<f32>(0.0);
  }
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) globalId: vec3<u32>) {
  let particleIndex = globalId.x;
  let particlesNum = params.particleCount;
  if (particlesNum <= particleIndex) {
    return ;
  }
  var sumForce = vec2<f32>(0.0);
  let chunkRange = ceil(params.maxRadius / params.chunkSize) + 1.0; // 不正確な計算に対応するために計算チャンクの範囲を1つ広げる

  let posA = positionRead[particleIndex];
  let kindA = kind[particleIndex];

  for (var dy: f32 = -chunkRange; dy <= chunkRange; dy += 1.0) {
    for (var dx: f32 = -chunkRange; dx <= chunkRange; dx += 1.0) {
      let chunkIndex = posToHash(posA + vec2<f32>(dx,dy) * params.chunkSize);
      for (
        var i = offsets[chunkIndex].start;
        i < offsets[chunkIndex].end;
        i = i + 1u
      ) {
        let indexB = particleIndices[i];
        if (particleIndex != indexB) {
          sumForce += update(posA, kindA, indexB);
        }
      }
    }
  }
  velocity[particleIndex] += sumForce;
  velocity[particleIndex] *= 0.95;
  // 一フレームでチャンクを跨ぐようなことを無くそうかとも思った
  // const speed = length(params.chunkSize);
  // if (params.chunkSize < speed * dt) {
  //   velocity[particleIndex] = min(params.chunkSize, length(velocity[particleIndex]));
  // }
  positionWrite[particleIndex] = posA + velocity[particleIndex] * dt;
}
          `,
        }),
        entryPoint: "main",
      },
    });

    this.chunk = simpleWebGPU.device.createComputePipeline({
      layout: simpleWebGPU.device.createPipelineLayout({
        bindGroupLayouts: [groupLayout.chunk, groupLayout.params],
      }),
      compute: {
        module: simpleWebGPU.device.createShaderModule({
          label: "chunk",
          code: /* wgsl */ `
${paramsStruct}

@group(0) @binding(0) var<storage, read_write> chunckIndices: array<u32>;
@group(0) @binding(1) var<storage, read_write> particleIndices: array<u32>;
@group(0) @binding(2) var<storage, read> positionRead: array<vec2<f32>>;
@group(1) @binding(0) var<uniform> params: Params;

${posToHash}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) globalId: vec3<u32>) {
  let particleIndex = globalId.x;
  if (params.particleCount <= particleIndex) {
    return ;
  }
  chunckIndices[particleIndex] = posToHash(positionRead[particleIndex]);
  particleIndices[particleIndex] = particleIndex;
}
          `,
        }),
        entryPoint: "main",
      },
    });
  }
}
