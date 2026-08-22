import { simpleWebGPU } from "../simpleWebGPU.js";
import { generateDistinctColors } from "../util.js";
import { Camera } from "./Camera.js";
import { DynamicSetting } from "./DynamicSetting.js";
import { GPUData } from "./GPUData.js";
import { StaticSetting } from "./StaticSetting.js";

export class ParticleLife {
  constructor() {
    this.staticSetting = new StaticSetting();
    this.dynamicSetting = new DynamicSetting();
    this.gpu = new GPUData(this.staticSetting);

    this.camera = new Camera();

    this.counter = 0;
  }

  init() {
    simpleWebGPU.writeBuffer(
      this.gpu.buffer.particleKind,
      new Uint32Array(
        Array.from({ length: this.staticSetting.maxParticles }, () =>
          Math.floor(Math.random() * this.dynamicSetting.kinds),
        ),
      ),
    );
    simpleWebGPU.writeBuffer(
      this.gpu.buffer.particlePositionPong,
      new Float32Array(
        Array.from(
          { length: this.staticSetting.maxParticles * 2 },
          () => Math.random() * 10000,
        ),
      ),
    );
    simpleWebGPU.writeBuffer(
      this.gpu.buffer.particleKindColor,
      new Float32Array(
        generateDistinctColors(this.staticSetting.maxKinds).flat(),
      ),
    );
    simpleWebGPU.writeBuffer(
      this.gpu.buffer.particleRule,
      /**
       *   0 1 2
       * 0
       * 1
       * 2
       */
      new Float32Array(
        Array.from({
          length: this.staticSetting.maxKinds * this.staticSetting.maxKinds,
        }).map(() => (Math.random() * 2 - 1) * 20),
      ),
    );
  }

  resetRurle() {
    simpleWebGPU.writeBuffer(
      this.gpu.buffer.particleRule,
      /**
       *   0 1 2
       * 0
       * 1
       * 2
       */
      new Float32Array(
        Array.from({
          length: this.staticSetting.maxKinds * this.staticSetting.maxKinds,
        }).map(() => (Math.random() * 2 - 1) * 20),
      ),
    );
  }

  resetKind() {
    simpleWebGPU.writeBuffer(
      this.gpu.buffer.particleKind,
      new Uint32Array(
        Array.from({ length: this.staticSetting.maxParticles }, () =>
          Math.floor(Math.random() * this.dynamicSetting.kinds),
        ),
      ),
    );
  }

  update(canvas, canvasContext) {
    const stride = simpleWebGPU.device.limits.minUniformBufferOffsetAlignment; // 通常 256
    const prefixSumLoopNum = Math.ceil(
      Math.log2(this.dynamicSetting.particles),
    );
    const isPing = (this.counter & 1) === 0; // レンダリングにpingを使うか

    simpleWebGPU.writeBuffer(
      this.gpu.buffer.params,
      simpleWebGPU.createBitData(
        [
          this.dynamicSetting.particles,
          this.staticSetting.maxKinds,
          this.staticSetting.maxChunks,
          50.0,
          this.dynamicSetting.maxRadius,
          this.dynamicSetting.minRadiusRate,
        ],
        ["u32", "u32", "u32", "f32", "f32", "f32"],
      ),
    );

    simpleWebGPU.writeBuffer(
      this.gpu.buffer.camera,
      new Float32Array([
        ...this.camera.position,
        canvas.offsetWidth / this.camera.zoom,
        canvas.offsetHeight / this.camera.zoom,
      ]),
    );

    const encoder = simpleWebGPU.device.createCommandEncoder();
    encoder.clearBuffer(
      this.gpu.buffer.chunkOffset,
      0,
      this.gpu.buffer.chunkOffset.size,
    );

    const computePass = encoder.beginComputePass();
    computePass.setBindGroup(1, this.gpu.group.params);

    computePass.setPipeline(this.gpu.pipeline.chunk);
    // 読み取りからチャンクを計算するためpingとpongを逆にする
    computePass.setBindGroup(
      0,
      isPing ? this.gpu.group.chunkPong : this.gpu.group.chunkPing,
    );
    computePass.dispatchWorkgroups(
      Math.ceil(this.dynamicSetting.particles / 64),
    );

    const calPrefixSum = () => {
      // 累積和
      computePass.setPipeline(this.gpu.pipeline.radixSort_Scan);

      const isPingInScanOffset = prefixSumLoopNum & 1;
      /**
       * offsetがない（桁数が偶数）場合はpong->pingの順番
       * offsetがある（桁数が奇数）場合はping->pong->pingの順番
       */
      computePass.setBindGroup(
        0,
        isPingInScanOffset === 1
          ? this.gpu.group.scanFirstPing
          : this.gpu.group.scanFirstPong,
        [0],
      );
      computePass.dispatchWorkgroups(
        Math.ceil(this.dynamicSetting.particles / 64),
      );
      for (let stepIndex = 1; stepIndex < prefixSumLoopNum; stepIndex++) {
        const isPingInScan = ((stepIndex + isPingInScanOffset) & 1) === 1;
        computePass.setBindGroup(
          0,
          isPingInScan
            ? this.gpu.group.radixSort_Scan_PongToPing
            : this.gpu.group.radixSort_Scan_PingToPong,
          [stepIndex * stride],
        );
        computePass.dispatchWorkgroups(
          Math.ceil(this.dynamicSetting.particles / 64),
        );
      }
    };

    const isPingInRadixSortOffset = this.staticSetting.radixSortMaxBitIndex & 1;
    if (true) {
      const isPingInRadixSort = (isPingInRadixSortOffset & 1) === 1;

      // ビットの反転
      computePass.setPipeline(this.gpu.pipeline.radixSort_InvertBit);
      computePass.setBindGroup(0, this.gpu.group.radixSort_FirstInvertBit, [0]);
      computePass.dispatchWorkgroups(
        Math.ceil(this.dynamicSetting.particles / 64),
      );

      calPrefixSum();

      // ソート
      computePass.setPipeline(this.gpu.pipeline.radixSort_Sort);
      computePass.setBindGroup(
        0,
        isPingInRadixSort
          ? this.gpu.group.radixSort_Sort_FirstToPing
          : this.gpu.group.radixSort_Sort_FirstToPong,
        [0],
      );
      computePass.dispatchWorkgroups(
        Math.ceil(this.dynamicSetting.particles / 64),
      );
    }
    for (
      let bitIndex = 1;
      bitIndex < this.staticSetting.radixSortMaxBitIndex;
      bitIndex++
    ) {
      const isPingInRadixSort =
        ((bitIndex + isPingInRadixSortOffset) & 1) === 1;

      // ビットの反転
      computePass.setPipeline(this.gpu.pipeline.radixSort_InvertBit);
      computePass.setBindGroup(
        0,
        isPingInRadixSort
          ? this.gpu.group.radixSort_InvertBit_PongToPing
          : this.gpu.group.radixSort_InvertBit_PingToPong,
        [bitIndex * stride],
      );
      computePass.dispatchWorkgroups(
        Math.ceil(this.dynamicSetting.particles / 64),
      );

      calPrefixSum();

      // ソート
      computePass.setPipeline(this.gpu.pipeline.radixSort_Sort);
      computePass.setBindGroup(
        0,
        isPingInRadixSort
          ? this.gpu.group.radixSort_Sort_PongToPing
          : this.gpu.group.radixSort_Sort_PingToPong,
        [bitIndex * stride],
      );
      computePass.dispatchWorkgroups(
        Math.ceil(this.dynamicSetting.particles / 64),
      );
    }
    computePass.setPipeline(this.gpu.pipeline.radixSort_MakeOffset);
    computePass.setBindGroup(0, this.gpu.group.radixSort_MakeOffset);
    computePass.dispatchWorkgroups(
      Math.ceil(this.dynamicSetting.particles / 64),
    );

    computePass.setPipeline(this.gpu.pipeline.update);
    computePass.setBindGroup(
      0,
      isPing
        ? this.gpu.group.updatePongToPing
        : this.gpu.group.updatePingToPong,
    );
    computePass.dispatchWorkgroups(
      Math.ceil(this.dynamicSetting.particles / 64),
    );
    computePass.end();

    const renderTarget = canvasContext.getCurrentTexture();
    const renderTargetView = renderTarget.createView();
    const RenderPassEncoder = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: renderTargetView,
          clearValue: [0, 0, 0, 1],
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    RenderPassEncoder.setBindGroup(
      0,
      isPing ? this.gpu.group.renderPing : this.gpu.group.renderPong,
    );
    RenderPassEncoder.setPipeline(this.gpu.pipeline.render);
    RenderPassEncoder.draw(3, this.dynamicSetting.particles, 0);

    RenderPassEncoder.end();
    simpleWebGPU.device.queue.submit([encoder.finish()]);

    this.counter++;
  }
}
