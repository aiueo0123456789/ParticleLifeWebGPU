export class StaticSetting {
  constructor() {
    this.maxParticles = 10 ** 6;
    this.maxKinds = 10;
    this.radixSortMaxBitIndex = 16;
    this.maxChunks = 2 ** this.radixSortMaxBitIndex;
  }
}
