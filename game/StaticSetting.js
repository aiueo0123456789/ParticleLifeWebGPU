export class StaticSetting {
  constructor() {
    this.maxParticles = 10 ** 6;
    this.maxKinds = 10;
    this.radixSortMaxBitIndex = 16;
    this.maxChunks = 2 ** this.radixSortMaxBitIndex;
    // this.spawnRadius = 2500;
    this.spawnRadius = 5000;
  }
}
