import { simpleWebGPU } from "../simpleWebGPU.js";
import { GPUBuffer } from "./GPUData/Buffer.js";
import { GPUGroup } from "./GPUData/Group.js";
import { GPUGroupLayout } from "./GPUData/GroupLayout.js";
import { GPUPipeline } from "./GPUData/Pipeline.js";

export class GPUData {
  /**
   *
   * @param {Setting} setiting
   */
  constructor(setiting) {
    this.buffer = new GPUBuffer(setiting);
    this.groupLayout = new GPUGroupLayout();
    this.group = new GPUGroup(this.groupLayout, this.buffer);
    this.pipeline = new GPUPipeline(this.groupLayout);
  }
}
