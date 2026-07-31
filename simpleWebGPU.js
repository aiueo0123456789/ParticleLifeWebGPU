function string_extractBetween(text, start = "", end = "") {
  let pattern = "";

  if (start === "" && end === "") {
    return [text];
  } else if (start === "") {
    pattern = `(.*?)${escapeRegExp(end)}`;
  } else if (end === "") {
    pattern = `${escapeRegExp(start)}(.*)`;
  } else {
    pattern = `${escapeRegExp(start)}(.*?)${escapeRegExp(end)}`;
  }

  const regex = new RegExp(pattern, "g");
  return [...text.matchAll(regex)].map((match) => match[1]);
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isPlainObject(obj) {
  return (
    obj instanceof Object && Object.getPrototypeOf(obj) === Object.prototype
  );
}

// 指定した文字を全て置き換える
function string_allReplace(strings, targetStrings, newStrings = "") {
  let checkString = "";
  let result = "";
  for (const string of strings) {
    if (checkString.length >= targetStrings.length) {
      if (checkString == targetStrings) {
        result += newStrings;
      } else {
        result += checkString[0];
      }
      checkString = checkString.slice(1) + string;
    } else {
      checkString += string;
    }
  }
  if (checkString != targetStrings) {
    result += checkString[0];
  }
  return result;
}

class ImportLink {
  constructor(name, code, link) {
    this.name = name;
    this.code = code;
    this.link = link;
  }
}

export class SimpleWebGPU {
  constructor(device, preferredCanvasFormat) {
    this.device = device;
    this.preferredCanvasFormat = preferredCanvasFormat;

    /** @type {Map<String, ImportLink>} */
    this.template = new Map();

    this.sampler = this.createTextureSampler();
  }

  createTextureSampler() {
    return device.createSampler({
      magFilter: "nearest", // 拡大時: 最近傍
      minFilter: "nearest", // 縮小時: 最近傍
      mipmapFilter: "nearest", // ミップマップ使用時も最近傍
      // addressModeU: "clamp-to-edge", // repeat でも可
      // addressModeV: "clamp-to-edge",
      addressModeU: "repeat",
      addressModeV: "repeat",
    });
  }

  addImportSourceFunction(code) {
    const getFunctionName = (strings) => {
      return string_extractBetween(
        string_allReplace(
          string_extractBetween(
            string_allReplace(strings, "\n"),
            "fn ",
            "->",
          )[0],
          " ",
        ),
        "",
        "(",
      )[0];
    };
    const getReferenceFunctions = (string) => {
      const regex = /\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
      const result = new Set();
      let match;

      while ((match = regex.exec(string)) !== null) {
        const name = match[1];

        // fn 宣言そのものは除外
        if (name !== "fn") {
          result.add(name);
        }
      }

      return Array.from(result).filter((functionName) =>
        functionNames.includes(functionName),
      );
    };
    const imported = this.importResolution(code);
    const functionCodes = imported
      .split("fn ")
      .slice(1)
      .map((text) => `fn ${text}`); // 宣言で分割・先頭の空文字を削除・struct を先頭につける
    const functionNames = functionCodes.map((code) => getFunctionName(code));
    functionCodes.forEach((code, index) => {
      const name = functionNames[index];
      this.template.set(
        name,
        new ImportLink(
          name,
          code,
          getReferenceFunctions(code).filter(
            (functionName) => functionName != name,
          ),
        ),
      );
    });
  }

  addImportSourceStruct(code) {
    const getStructName = (strings) => {
      return string_allReplace(
        string_extractBetween(strings, "struct ", "{")[0],
        " ",
      );
    };
    const getReferenceStruct = (strings) => {
      const matches = [
        ...strings
          .matchAll(/(\w+)\s*:\s*([^,]+),/g)
          .map((match) => match[2])
          .filter((match) => structNames.includes(match)),
      ];
      return matches;
    };
    const imported = this.importResolution(code);
    const structCodes = imported
      .split("struct ")
      .slice(1)
      .map((text) => `struct ${text}`); // 型宣言で分割・先頭の空文字を削除・struct を先頭につける
    const structNames = structCodes.map((code) => getStructName(code));
    structCodes.forEach((code, index) => {
      const name = structNames[index];
      this.template.set(
        name,
        new ImportLink(name, code, getReferenceStruct(code)),
      );
    });
  }

  importResolution(code) {
    /** @type {string} */
    const imported = [];
    let newCode = code.replace(/^import\s+(.+)$/gm, (match, importBody) => {
      importBody = importBody.slice(0, -1); // ;を消す
      if (this.template.has(importBody)) {
        const linkResolution = (text, /** @type {ImportLink} */ il) => {
          let newText = "";
          for (const link of il.link) {
            if (!imported.includes(link) && this.template.has(link)) {
              newText += linkResolution(text, this.template.get(link)) + "\n";
            }
          }
          imported.push(il.name);
          return newText + "\n" + il.code;
        };
        const importLink = this.template.get(importBody);
        return linkResolution("", importLink);
      } else {
        console.error(`未解決のimportがあります ${importBody}`);
        return "";
      }
    });
    if (newCode.includes("import ")) newCode = this.importResolution(newCode);
    return newCode;
  }

  createShaderModule(code, label = "unknown") {
    return device.createShaderModule({
      label: label,
      code: code,
    });
  }

  dataTypeByteSize(dataType) {
    if (dataType == "u32" || dataType == "f32" || dataType == "i32") {
      return 4;
    } else if (dataType == "bit") {
      return 1;
    }
  }

  structByteSize(struct) {
    let sumByte = 0;
    for (const data of struct) {
      sumByte += this.dataTypeByteSize(data);
    }
    return sumByte;
  }

  createBitData(array, struct) {
    const bufferLength = array.length / struct.length;
    if (!Number.isInteger(bufferLength)) {
      console.warn("配列と型の長さが合いません");
      return;
    }
    const buffer = new ArrayBuffer(bufferLength * this.structByteSize(struct));
    const view = new DataView(buffer);

    let offset = 0;
    let index = 0;
    for (let i = 0; i < bufferLength; i++) {
      for (const dataType of struct) {
        if (dataType == "u32") view.setUint32(offset, array[index], true);
        else if (dataType == "i32") view.setInt32(offset, array[index], true);
        else if (dataType == "f32") view.setFloat32(offset, array[index], true);
        offset += this.dataTypeByteSize(dataType);
        index++;
      }
    }
    return new Uint8Array(buffer);
  }

  createTexture2D(size, textureFormat = "rgba8unorm") {
    if (textureFormat == "rgba8unorm") {
      return device.createTexture({
        size: size,
        format: textureFormat,
        // alphaMode: 'premultiplied', // または必要に応じて 'unpremultiplied'
        usage:
          GPUTextureUsage.STORAGE_BINDING |
          GPUTextureUsage.TEXTURE_BINDING |
          GPUTextureUsage.COPY_SRC |
          GPUTextureUsage.COPY_DST |
          GPUTextureUsage.RENDER_ATTACHMENT,
      });
    } else {
      return device.createTexture({
        size: size,
        format: textureFormat,
        // alphaMode: 'premultiplied', // または必要に応じて 'unpremultiplied'
        usage:
          GPUTextureUsage.TEXTURE_BINDING |
          GPUTextureUsage.COPY_SRC |
          GPUTextureUsage.COPY_DST |
          GPUTextureUsage.RENDER_ATTACHMENT,
      });
    }
  }

  createBuffer(size, usage, data = undefined) {
    if (Array.isArray(usage)) {
      const usageArray = usage;
      const GPUBufferUsageTable = {
        V: GPUBufferUsage.VERTEX,
        S: GPUBufferUsage.STORAGE,
        U: GPUBufferUsage.UNIFORM,
        I: GPUBufferUsage.INDEX,
        INDIRECT: GPUBufferUsage.INDIRECT,
      };
      usage = GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
      for (const element of usageArray) {
        usage |= GPUBufferUsageTable[element];
      }
    }

    const buffer = device.createBuffer({
      size: size,
      usage: usage,
    });
    if (data) {
      device.queue.writeBuffer(buffer, 0, data);
    }
    return buffer;
  }

  writeBuffer(buffer, data, offset = 0) {
    if (buffer instanceof GPUBuffer) {
      device.queue.writeBuffer(buffer, offset, data);
    } else {
      console.warn("GPUBufferを渡してください", buffer);
    }
  }

  createGroup(groupLayout, items) {
    function entrieFromType(type, item) {
      if (!type) {
        if (item instanceof GPUBuffer) type = "b";
        else if (item instanceof GPUTexture) {
          item = item.createView();
          type = "t";
        } else if (item instanceof GPUTextureView) type = "t";
        else if (item instanceof GPUSampler) type = "ts";
        else console.warn("無効", item);
      }
      if (type == "b") {
        if (!item.size) {
          return {
            log: item,
            error: "bufferのサイズが有効な値ではありません",
          };
        }
        if (isPlainObject(item)) {
          // オフセットを指定する場合
          return {
            resource: {
              buffer: item.buffer,
              offset: item.offset,
              size: item.size,
            },
          };
        } else {
          return {
            resource: {
              buffer: item,
            },
          };
        }
      }
      if (type == "t") {
        return {
          resource: item,
        };
      }
      if (type == "ts") {
        return {
          resource: item,
        };
      }
      if (type == "ct") {
        return {
          resource: item,
        };
      }
      console.warn(
        `グループのリソースの振り分けに問題がありました。\n無効なtype[${type}]関連付けられたitem[${item}]`,
      );
      console.warn(items);
    }

    return device.createBindGroup({
      layout: groupLayout,
      entries: items.map((x, i) => {
        let entrie;
        if (x.type) {
          entrie = entrieFromType(x.type, x.item);
        } else {
          entrie = entrieFromType(null, x);
        }
        if (entrie.error) {
          console.error(entrie.log);
          throw Error(entrie.error + `index: ${i}`);
        }
        return Object.assign(
          {
            binding: i, // インプットオブジェクトデータ
          },
          entrie,
        );
      }),
    });
  }

  async printBufferData(buffer, struct, text = "") {
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
    const structSize = this.structByteSize(struct); // 各フィールドのサイズが 4 バイト固定 (u32, f32)
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
    console.log(text, result.flat());
  }

  createTextureAtlas(textures, padding = 100) {
    let totalPixcelNum = 0;
    for (const texture of textures) {
      totalPixcelNum += (texture.width + padding) * (texture.height + padding);
    }
    let minAtlasSize = Math.ceil(Math.sqrt(totalPixcelNum));
    let width = Math.pow(2, Math.ceil(Math.log2(minAtlasSize)));
    let height = width;
    const sortedTextures = [...textures].sort(
      (a, b) => b.width * b.height - a.width * a.height,
    );
    let isAllIncluded = false;
    let isError = false;
    const textureLeftBottom = [];
    while (!isAllIncluded && !isError) {
      let skyline = [[0, 0]]; // 左下から始める
      let isOverflowing = false;
      textureLeftBottom.length = 0;
      for (const texture of sortedTextures) {
        const textureSize = [texture.width + padding, texture.height + padding];
        let minIndex = -1;
        for (let pointIndex = 0; pointIndex < skyline.length; pointIndex++) {
          let widthBool = false; // 横幅が足りるか
          if (pointIndex == skyline.length - 1)
            widthBool = textureSize[0] < width - skyline[pointIndex][0];
          else {
            widthBool =
              textureSize[0] <
              skyline[pointIndex + 1][0] - skyline[pointIndex][0];
            if (!widthBool) {
              // 隣だけじゃ足りない場合
              let maxWidth = skyline[pointIndex][0];
              for (
                let pointIndex_ = pointIndex + 1;
                pointIndex_ < skyline.length;
                pointIndex_++
              ) {
                if (skyline[pointIndex_][1] < skyline[pointIndex][1])
                  maxWidth = skyline[pointIndex_][0]; // 隣の方が低いなら
                else break;
              }
              if (textureSize[0] < maxWidth - skyline[pointIndex][0])
                widthBool = true;
            }
          }
          if (
            widthBool &&
            textureSize[1] < height - skyline[pointIndex][1] &&
            (minIndex == -1 || skyline[pointIndex][1] < skyline[minIndex][1])
          ) {
            // 横縦も足りて現時点で見つかっているものより位置が低いか
            minIndex = pointIndex;
          }
        }
        if (minIndex == -1) {
          // 場所が足りない
          isOverflowing = true;
          break;
        }
        let [minX, minY] = skyline[minIndex]; // 左下
        let [maxX, maxY] = [
          skyline[minIndex][0] + textureSize[0],
          skyline[minIndex][1] + textureSize[1],
        ]; // 右上
        textureLeftBottom.push([minX, minY]);
        skyline = skyline.filter((point) => minX > point[0] || point[0] > maxX); // ボックスと重なっている頂点を削除
        skyline.push([minX, maxY], [maxX, minY]); // 頂点を追加
        // 同じ高さの連続する点を削除
        for (let i = skyline.length - 2; i >= 0; i--) {
          if (skyline[i][1] === skyline[i + 1][1]) {
            skyline.splice(i + 1, 1);
          }
        }
        skyline = skyline.sort((a, b) => a[0] - b[0]); // 頂点を並び替える
      }
      if (!isOverflowing)
        isAllIncluded = true; // 一つも溢れなかったら終了
      else {
        // 溢れたらサイズを増やす
        if (height == width) {
          // 横長または正方形にしながら拡張
          width *= 2;
        } else {
          height *= 2;
        }
        if (width == 8192 * 2 || height == 8192 * 2) isError = true;
        width = Math.min(width, 8192);
        height = Math.min(height, 8192);
      }
    }
    if (isError) {
      console.warn("アトラスにおさまりませんでした");
    }

    const atlasTexture = device.createTexture({
      size: [width, height],
      format: "rgba8unorm",
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.COPY_SRC |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });

    // 各テクスチャをアトラスにコピー
    const commandEncoder = device.createCommandEncoder();
    sortedTextures.forEach((texture, index) => {
      if (textureLeftBottom.length <= index) return;
      commandEncoder.copyTextureToTexture(
        { texture },
        { texture: atlasTexture, origin: textureLeftBottom[index] },
        [texture.width, texture.height, 1],
      );
    });

    const commandBuffer = commandEncoder.finish();
    device.queue.submit([commandBuffer]);

    return {
      atlasTexture: atlasTexture,
      regions: textures.map((texture) => {
        const point = textureLeftBottom[sortedTextures.indexOf(texture)];
        return [
          point[0] / width,
          point[1] / height,
          texture.width / width,
          texture.height / height,
        ];
      }),
    };
  }

  async imagePathToImage(imagePath) {
    const image = new Image();
    const imagePromise = new Promise((resolve, reject) => {
      image.onload = () => resolve(image);
      image.onerror = (e) => reject(e);
    });
    image.src = imagePath;
    const img = await imagePromise;
    if (!(img instanceof HTMLImageElement)) {
      throw new TypeError(
        "Loaded image is not an instance of HTMLImageElement.",
      );
    }
    return img;
  }

  imageToTexture2D(image) {
    const reslutTexture = this.createTexture2D([image.width, image.height]);

    device.queue.copyExternalImageToTexture(
      { source: image },
      { texture: reslutTexture, origin: [0, 0] },
      [image.width, image.height],
    );

    return reslutTexture;
  }

  async imagePathToTexture2D(imagePath) {
    return this.imageToTexture2D(await this.imagePathToImage(imagePath));
  }

  async readTexturePixels(
    texture,
    width = texture.width,
    height = texture.height,
  ) {
    const bytesPerPixel = 4; // rgba8unorm
    const unpaddedBytesPerRow = width * bytesPerPixel;
    // bytesPerRowは256の倍数
    const bytesPerRow = Math.ceil(unpaddedBytesPerRow / 256) * 256;

    const readBuffer = device.createBuffer({
      size: bytesPerRow * height,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });

    const encoder = device.createCommandEncoder();
    encoder.copyTextureToBuffer(
      { texture },
      { buffer: readBuffer, bytesPerRow },
      { width, height },
    );
    device.queue.submit([encoder.finish()]);

    await readBuffer.mapAsync(GPUMapMode.READ);
    const mapped = new Uint8Array(readBuffer.getMappedRange());

    const pixels = new Uint8Array(width * height * bytesPerPixel);
    for (let y = 0; y < height; y++) {
      const srcOffset = y * bytesPerRow;
      const dstOffset = y * unpaddedBytesPerRow;
      pixels.set(
        mapped.subarray(srcOffset, srcOffset + unpaddedBytesPerRow),
        dstOffset,
      );
    }

    readBuffer.unmap();
    readBuffer.destroy();
    return pixels;
  }

  async pickTextureColor(texture, uv) {
    const readBuffer = device.createBuffer({
      size: 256,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    const encoder = device.createCommandEncoder();
    encoder.copyTextureToBuffer(
      {
        texture,
        origin: [
          Math.floor(uv[0] * texture.width),
          Math.floor((1 - uv[1]) * texture.height),
        ],
      },
      {
        buffer: readBuffer,
        bytesPerRow: 256,
      },
      {
        width: 1,
        height: 1,
        depthOrArrayLayers: 1,
      },
    );
    device.queue.submit([encoder.finish()]);
    await readBuffer.mapAsync(GPUMapMode.READ);
    const data = new Uint32Array(readBuffer.getMappedRange());
    const value = data[0];
    readBuffer.unmap();
    return value;
  }
}

export const userLang = navigator.language || navigator.userLanguage;

console.log("使用言語", userLang);

if ("gpu" in navigator) {
} else {
  // WebGPUが使えない
  console.warn("お使いの環境ではWebGPUが使用できません");
}

const adapter = await navigator.gpu.requestAdapter();

const device = await adapter.requestDevice({
  requiredLimits: {
    maxStorageBuffersPerShaderStage: 10, // ストレージバッファを10個まで使えるようにする
  },
});

export const simpleWebGPU = new SimpleWebGPU(
  device,
  navigator.gpu.getPreferredCanvasFormat(),
);
