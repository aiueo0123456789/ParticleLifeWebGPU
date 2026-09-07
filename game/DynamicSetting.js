export class DynamicSetting {
  constructor() {
    // this.particles = Math.ceil(10 ** 5.4);
    this.particles = Math.ceil(10 ** 5.3);
    // this.particles = Math.ceil(10 ** 1);
    this.kinds = 5;

    this.maxRadius = 100;
    this.minRadiusRate = 0.3;
    this.minValue = -20;
    this.maxValue = 20;

    this.bounce = 70;

    this.spawnRadius = 5000;

    this.correctSimulation = false;

    this.isPlay = true;

  }
}
