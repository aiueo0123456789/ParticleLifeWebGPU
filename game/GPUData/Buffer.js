import { simpleWebGPU } from "../../simpleWebGPU.js";
import { StaticSetting } from "../StaticSetting.js";

export class GPUBuffer {
  /**
   *
   * @param {StaticSetting} setiting
   */
  constructor(setiting) {
    const stride = simpleWebGPU.device.limits.minUniformBufferOffsetAlignment; // 通常 256

    this.camera = simpleWebGPU.createBuffer((2 + 2) * 4, ["U"]);
    this.params = simpleWebGPU.createBuffer((1 + 1 + 1 + 1) * 4, ["U"]);

    // 読み取りと書き込みを切り替えながら使う
    this.particlePositionPing = simpleWebGPU.createBuffer(
      setiting.maxParticles * 2 * 4,
      ["S"],
    );
    this.particlePositionPong = simpleWebGPU.createBuffer(
      setiting.maxParticles * 2 * 4,
      ["S"],
    );
    this.particleVelocity = simpleWebGPU.createBuffer(
      setiting.maxParticles * 2 * 4,
      ["S"],
    );
    this.particleKind = simpleWebGPU.createBuffer(setiting.maxParticles * 4, [
      "S",
    ]);
    this.particleChunkIndex = simpleWebGPU.createBuffer(
      setiting.maxParticles * 4,
      ["S"],
    );

    this.particleRule = simpleWebGPU.createBuffer(
      setiting.maxKinds * setiting.maxKinds * 4,
      ["S"],
    );

    this.particleKindColor = simpleWebGPU.createBuffer(
      setiting.maxKinds * 4 * 4,
      ["S"],
    );

    this.particleIndex = simpleWebGPU.createBuffer(setiting.maxParticles * 4, [
      "S",
    ]);
    this.particleIndexOderByChunck = simpleWebGPU.createBuffer(
      setiting.maxParticles * 4,
      ["S"],
    );
    this.chunkOffset = simpleWebGPU.createBuffer(setiting.maxChunks * 2 * 4, [
      "S",
    ]);

    this.radixSort_extrDataPong = simpleWebGPU.createBuffer(
      setiting.maxParticles * 4,
      ["S"],
    );
    this.radixSort_chunkIndexPing = simpleWebGPU.createBuffer(
      setiting.maxParticles * 4,
      ["S"],
    );
    this.radixSort_chunkIndexPong = simpleWebGPU.createBuffer(
      setiting.maxParticles * 4,
      ["S"],
    );
    this.radixSort_invertedBit = simpleWebGPU.createBuffer(
      setiting.maxParticles * 4,
      ["S"],
    );
    this.radixSort_prefixSum = simpleWebGPU.createBuffer(
      setiting.maxParticles * 4,
      ["S"],
    );
    this.radixSort_scan_pong = simpleWebGPU.createBuffer(
      setiting.maxParticles * 4,
      ["S"],
    );

    const bitIndices = new Uint32Array(
      (stride / 4) * setiting.radixSortMaxBitIndex,
    );
    this.radixSort_bitIndexBuffer = simpleWebGPU.createBuffer(
      setiting.radixSortMaxBitIndex * stride,
      ["U"],
    );
    for (let p = 0; p < setiting.radixSortMaxBitIndex; p++) {
      bitIndices[p * (stride / 4)] = p;
    }
    simpleWebGPU.writeBuffer(this.radixSort_bitIndexBuffer, bitIndices);

    const stepsNum = Math.ceil(Math.log2(setiting.maxParticles));
    const steps = new Uint32Array((stride / 4) * stepsNum);
    this.radixSort_scan_stepBuffer = simpleWebGPU.createBuffer(
      stepsNum * stride,
      ["U"],
    );
    for (let p = 0; p < stepsNum; p++) {
      steps[p * (stride / 4)] = 2 ** p;
    }
    simpleWebGPU.writeBuffer(this.radixSort_scan_stepBuffer, steps);
  }
}
