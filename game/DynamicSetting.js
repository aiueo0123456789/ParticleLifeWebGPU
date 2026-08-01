export class DynamicSetting {
  constructor() {
    this.particles = Math.ceil(10 ** 5.3);
    // this.particles = Math.ceil(10 ** 1);
    this.kinds = 5;

    this.maxRadius = 100;
    this.minRadiusRate = 0.3;
  }
}
