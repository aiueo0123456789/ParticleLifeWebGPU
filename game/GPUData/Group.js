import { simpleWebGPU } from "../../simpleWebGPU.js";
import { GPUBuffer } from "./Buffer.js";
import { GPUGroupLayout } from "./GroupLayout.js";

export class GPUGroup {
  /**
   *
   * @param {GPUGroupLayout} groupLayout
   * @param {GPUBuffer} buffer
   */
  constructor(groupLayout, buffer) {
    this.updatePingToPong = simpleWebGPU.device.createBindGroup({
      layout: groupLayout.update,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: buffer.particlePositionPong,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: buffer.particlePositionPing,
          },
        },
        {
          binding: 2,
          resource: {
            buffer: buffer.particleVelocity,
          },
        },
        {
          binding: 3,
          resource: {
            buffer: buffer.particleKind,
          },
        },
        {
          binding: 4,
          resource: {
            buffer: buffer.particleRule,
          },
        },
        {
          binding: 5,
          resource: {
            buffer: buffer.particleIndexOderByChunck,
          },
        },
        {
          binding: 6,
          resource: {
            buffer: buffer.chunkOffset,
          },
        },
      ],
    });
    this.updatePongToPing = simpleWebGPU.device.createBindGroup({
      layout: groupLayout.update,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: buffer.particlePositionPing,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: buffer.particlePositionPong,
          },
        },
        {
          binding: 2,
          resource: {
            buffer: buffer.particleVelocity,
          },
        },
        {
          binding: 3,
          resource: {
            buffer: buffer.particleKind,
          },
        },
        {
          binding: 4,
          resource: {
            buffer: buffer.particleRule,
          },
        },
        {
          binding: 5,
          resource: {
            buffer: buffer.particleIndexOderByChunck,
          },
        },
        {
          binding: 6,
          resource: {
            buffer: buffer.chunkOffset,
          },
        },
      ],
    });

    this.radixSort_InvertBit_PongToPing = simpleWebGPU.device.createBindGroup({
      layout: groupLayout.radixSort_InvertBit,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: buffer.radixSort_invertedBit,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: buffer.radixSort_chunkIndexPong,
          },
        },
        {
          binding: 2,
          resource: {
            buffer: buffer.radixSort_bitIndexBuffer,
            size: 16,
          },
        },
      ],
    });
    this.radixSort_InvertBit_PingToPong = simpleWebGPU.device.createBindGroup({
      layout: groupLayout.radixSort_InvertBit,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: buffer.radixSort_invertedBit,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: buffer.radixSort_chunkIndexPing,
          },
        },
        {
          binding: 2,
          resource: {
            buffer: buffer.radixSort_bitIndexBuffer,
            size: 16,
          },
        },
      ],
    });
    this.radixSort_Sort_PongToPing = simpleWebGPU.device.createBindGroup({
      layout: groupLayout.radixSort_Sort,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: buffer.radixSort_chunkIndexPing,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: buffer.radixSort_chunkIndexPong,
          },
        },
        {
          binding: 2,
          resource: {
            buffer: buffer.radixSort_prefixSum,
          },
        },
        {
          binding: 3,
          resource: {
            buffer: buffer.radixSort_invertedBit,
          },
        },
        {
          binding: 4,
          resource: {
            buffer: buffer.radixSort_bitIndexBuffer,
            size: 16,
          },
        },
        {
          binding: 5,
          resource: {
            buffer: buffer.particleIndexOderByChunck,
          },
        },
        {
          binding: 6,
          resource: {
            buffer: buffer.radixSort_extrDataPong,
          },
        },
      ],
    });
    this.radixSort_Sort_PingToPong = simpleWebGPU.device.createBindGroup({
      layout: groupLayout.radixSort_Sort,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: buffer.radixSort_chunkIndexPong,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: buffer.radixSort_chunkIndexPing,
          },
        },
        {
          binding: 2,
          resource: {
            buffer: buffer.radixSort_prefixSum,
          },
        },
        {
          binding: 3,
          resource: {
            buffer: buffer.radixSort_invertedBit,
          },
        },
        {
          binding: 4,
          resource: {
            buffer: buffer.radixSort_bitIndexBuffer,
            size: 16,
          },
        },
        {
          binding: 5,
          resource: {
            buffer: buffer.radixSort_extrDataPong,
          },
        },
        {
          binding: 6,
          resource: {
            buffer: buffer.particleIndexOderByChunck,
          },
        },
      ],
    });
    this.radixSort_FirstInvertBit = simpleWebGPU.device.createBindGroup({
      layout: groupLayout.radixSort_InvertBit,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: buffer.radixSort_invertedBit,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: buffer.particleChunkIndex,
          },
        },
        {
          binding: 2,
          resource: {
            buffer: buffer.radixSort_bitIndexBuffer,
            size: 16,
          },
        },
      ],
    });
    this.radixSort_Sort_FirstToPing = simpleWebGPU.device.createBindGroup({
      layout: groupLayout.radixSort_Sort,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: buffer.radixSort_chunkIndexPing,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: buffer.particleChunkIndex,
          },
        },
        {
          binding: 2,
          resource: {
            buffer: buffer.radixSort_prefixSum,
          },
        },
        {
          binding: 3,
          resource: {
            buffer: buffer.radixSort_invertedBit,
          },
        },
        {
          binding: 4,
          resource: {
            buffer: buffer.radixSort_bitIndexBuffer,
            size: 16,
          },
        },
        {
          binding: 5,
          resource: {
            buffer: buffer.particleIndexOderByChunck,
          },
        },
        {
          binding: 6,
          resource: {
            buffer: buffer.particleIndex,
          },
        },
      ],
    });
    this.radixSort_Sort_FirstToPong = simpleWebGPU.device.createBindGroup({
      layout: groupLayout.radixSort_Sort,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: buffer.radixSort_chunkIndexPong,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: buffer.particleChunkIndex,
          },
        },
        {
          binding: 2,
          resource: {
            buffer: buffer.radixSort_prefixSum,
          },
        },
        {
          binding: 3,
          resource: {
            buffer: buffer.radixSort_invertedBit,
          },
        },
        {
          binding: 4,
          resource: {
            buffer: buffer.radixSort_bitIndexBuffer,
            size: 16,
          },
        },
        {
          binding: 5,
          resource: {
            buffer: buffer.radixSort_extrDataPong,
          },
        },
        {
          binding: 6,
          resource: {
            buffer: buffer.particleIndex,
          },
        },
      ],
    });
    this.radixSort_MakeOffset = simpleWebGPU.device.createBindGroup({
      layout: groupLayout.radixSort_MakeOffset,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: buffer.chunkOffset,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: buffer.radixSort_chunkIndexPing,
          },
        },
      ],
    });
    this.scanFirstPing = simpleWebGPU.device.createBindGroup({
      layout: groupLayout.radixSort_Scan,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: buffer.radixSort_prefixSum,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: buffer.radixSort_invertedBit,
          },
        },
        {
          binding: 2,
          resource: {
            buffer: buffer.radixSort_scan_stepBuffer,
            size: 16,
          },
        },
      ],
    });
    this.scanFirstPong = simpleWebGPU.device.createBindGroup({
      layout: groupLayout.radixSort_Scan,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: buffer.radixSort_scan_pong,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: buffer.radixSort_invertedBit,
          },
        },
        {
          binding: 2,
          resource: {
            buffer: buffer.radixSort_scan_stepBuffer,
            size: 16,
          },
        },
      ],
    });
    this.radixSort_Scan_PongToPing = simpleWebGPU.device.createBindGroup({
      layout: groupLayout.radixSort_Scan,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: buffer.radixSort_prefixSum,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: buffer.radixSort_scan_pong,
          },
        },
        {
          binding: 2,
          resource: {
            buffer: buffer.radixSort_scan_stepBuffer,
            size: 16,
          },
        },
      ],
    });
    this.radixSort_Scan_PingToPong = simpleWebGPU.device.createBindGroup({
      layout: groupLayout.radixSort_Scan,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: buffer.radixSort_scan_pong,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: buffer.radixSort_prefixSum,
          },
        },
        {
          binding: 2,
          resource: {
            buffer: buffer.radixSort_scan_stepBuffer,
            size: 16,
          },
        },
      ],
    });

    this.chunkPing = simpleWebGPU.device.createBindGroup({
      layout: groupLayout.chunk,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: buffer.particleChunkIndex,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: buffer.particleIndex,
          },
        },
        {
          binding: 2,
          resource: {
            buffer: buffer.particlePositionPing,
          },
        },
      ],
    });
    this.chunkPong = simpleWebGPU.device.createBindGroup({
      layout: groupLayout.chunk,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: buffer.particleChunkIndex,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: buffer.particleIndex,
          },
        },
        {
          binding: 2,
          resource: {
            buffer: buffer.particlePositionPong,
          },
        },
      ],
    });

    this.renderPing = simpleWebGPU.device.createBindGroup({
      layout: groupLayout.render,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: buffer.camera,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: buffer.particlePositionPing,
          },
        },
        {
          binding: 2,
          resource: {
            buffer: buffer.particleKind,
          },
        },
        {
          binding: 3,
          resource: {
            buffer: buffer.particleKindColor,
          },
        },
      ],
    });
    this.renderPong = simpleWebGPU.device.createBindGroup({
      layout: groupLayout.render,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: buffer.camera,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: buffer.particlePositionPong,
          },
        },
        {
          binding: 2,
          resource: {
            buffer: buffer.particleKind,
          },
        },
        {
          binding: 3,
          resource: {
            buffer: buffer.particleKindColor,
          },
        },
      ],
    });

    this.params = simpleWebGPU.device.createBindGroup({
      layout: groupLayout.params,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: buffer.params,
          },
        },
      ],
    });
  }
}
