/**
 * 見分けやすいRGBAカラーを生成する
 * @param {number} count
 * @returns {number[][]} [[r,g,b,a], ...] (各要素は0～1)
 */
export function generateDistinctColors(count) {
  const colors = [];
  for (let i = 0; i < count; i++) {
    const h = (i / count) * 360;
    const [r, g, b] = hslToRgb(h, 0.8, 0.55);
    colors.push([r, g, b, 0.5]);
  }
  return colors;
}
function hslToRgb(h, s, l) {
  h /= 360;
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [r, g, b];
}

export async function printBufferData(device, buffer, struct, text = "") {
    // 一時的な読み取り用バッファを作成 (MAP_READ を含む)
    const readBuffer = device.createBuffer({
      size: buffer.size,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });

    // コピーコマンドを発行
    const commandEncoder = device.createCommandEncoder();
    commandEncoder.copyBufferToBuffer(buffer, 0, readBuffer, 0, buffer.size);
    const commandBuffer = commandEncoder.finish();
    device.queue.submit([commandBuffer]);

    // 一時バッファの内容をマップして表示
    await readBuffer.mapAsync(GPUMapMode.READ);
    const mappedRange = readBuffer.getMappedRange();
    const rawData = new Uint8Array(mappedRange);

    // 構造体に基づいてデータを解析
    const dataView = new DataView(rawData.buffer);
    const structSize = struct.length * 4; // 各フィールドのサイズが 4 バイト固定 (u32, f32)
    const result = [];

    let offset = 0;
    for (let i = 0; i < buffer.size / structSize; i++) {
      const keep = [];
      for (const field of struct) {
        if (field === "u32") {
          keep.push(dataView.getUint32(offset, true));
        } else if (field === "f32") {
          keep.push(dataView.getFloat32(offset, true));
        } else if (field == "bit") {
        }
        offset += 4; // フィールドのサイズを加算
      }
      result.push(keep);
    }

    readBuffer.unmap();
    console.log(text, result);
  }