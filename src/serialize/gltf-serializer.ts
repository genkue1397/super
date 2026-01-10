import { Writer } from './writer';
import { Splat } from '../splat';
import { SerializeSettings } from '../splat-serialize';

const align4 = (n: number) => (n + 3) & ~3;

export const serializeGltf = async (
    splats: Splat[],
    settings: SerializeSettings,
    writer: Writer
): Promise<void> => {

    // 1. Collect data
    const positions: number[] = [];
    const colors: number[] = [];

    for (const splat of splats) {
        const data = splat.splatData;
        const numSplats = data.numSplats;

        const xArr = data.getProp('x') as Float32Array;
        const yArr = data.getProp('y') as Float32Array;
        const zArr = data.getProp('z') as Float32Array;
        const state = data.getProp('state') as Uint8Array;

        let f_dc_0, f_dc_1, f_dc_2;
        // @ts-ignore
        if (settings.includeColor !== false) {
            f_dc_0 = data.getProp('f_dc_0') as Float32Array;
            f_dc_1 = data.getProp('f_dc_1') as Float32Array;
            f_dc_2 = data.getProp('f_dc_2') as Float32Array;
        }

        for (let i = 0; i < numSplats; i++) {
            if (settings.removeInvalid && state && (state[i] & 254) !== 0) continue;

            // Positions
            if (xArr) positions.push(xArr[i], yArr[i], zArr[i]);

            // Colors
            // @ts-ignore
            if (settings.includeColor !== false && f_dc_0) {
                colors.push(f_dc_0[i], f_dc_1[i], f_dc_2[i]);
            }
        }
    }

    const numPoints = positions.length / 3;
    if (numPoints === 0) return;

    // 2. Prepare Buffers
    const positionByteLength = positions.length * 4;
    const colorByteLength = colors.length * 4;
    const totalBufferLength = align4(positionByteLength + colorByteLength);

    const buffer = new Uint8Array(totalBufferLength);
    const view = new DataView(buffer.buffer);

    let offset = 0;
    // Write positions
    for (let i = 0; i < positions.length; i++) {
        view.setFloat32(offset, positions[i], true);
        offset += 4;
    }
    // Write colors
    for (let i = 0; i < colors.length; i++) {
        view.setFloat32(offset, colors[i], true);
        offset += 4;
    }

    // 3. Create JSON structure
    const json: any = {
        asset: {
            generator: "SuperSplat",
            version: "2.0"
        },
        scenes: [{ nodes: [0] }],
        nodes: [{ mesh: 0 }],
        meshes: [{
            primitives: [{
                attributes: {
                    POSITION: 0,
                    COLOR_0: 1
                },
                mode: 0 // POINTS
            }]
        }],
        accessors: [
            {
                bufferView: 0,
                componentType: 5126, // FLOAT
                count: numPoints,
                type: "VEC3",
                byteOffset: 0,
                min: [
                    Math.min(...positions.filter((_, idx) => idx % 3 === 0)),
                    Math.min(...positions.filter((_, idx) => idx % 3 === 1)),
                    Math.min(...positions.filter((_, idx) => idx % 3 === 2))
                ],
                max: [
                    Math.max(...positions.filter((_, idx) => idx % 3 === 0)),
                    Math.max(...positions.filter((_, idx) => idx % 3 === 1)),
                    Math.max(...positions.filter((_, idx) => idx % 3 === 2))
                ]
            },
            {
                bufferView: 1,
                componentType: 5126, // FLOAT
                count: numPoints,
                type: "VEC3",
                byteOffset: 0
            }
        ],
        bufferViews: [
            {
                buffer: 0,
                byteOffset: 0,
                byteLength: positionByteLength
            },
            {
                buffer: 0,
                byteOffset: positionByteLength,
                byteLength: colorByteLength
            }
        ],
        buffers: [{
            byteLength: totalBufferLength
        }]
    };

    // 4. Construct GLB
    const jsonString = JSON.stringify(json);
    const jsonBuffer = new TextEncoder().encode(jsonString);
    const jsonPaddedLength = align4(jsonBuffer.length);
    const binPaddedLength = align4(totalBufferLength);

    const totalLength = 12 + 8 + jsonPaddedLength + 8 + binPaddedLength;

    const header = new Uint8Array(12);
    const headerView = new DataView(header.buffer);
    headerView.setUint32(0, 0x46546C67, true); // glTF
    headerView.setUint32(4, 2, true); // Version 2
    headerView.setUint32(8, totalLength, true);

    const jsonHeader = new Uint8Array(8);
    const jsonHeaderView = new DataView(jsonHeader.buffer);
    jsonHeaderView.setUint32(0, jsonPaddedLength, true);
    jsonHeaderView.setUint32(4, 0x4E4F534A, true); // JSON

    const binHeader = new Uint8Array(8);
    const binHeaderView = new DataView(binHeader.buffer);
    binHeaderView.setUint32(0, binPaddedLength, true);
    binHeaderView.setUint32(4, 0x004E4942, true); // BIN

    // Write all to writer
    await writer.write(header);
    await writer.write(jsonHeader);
    await writer.write(jsonBuffer);

    const jsonPadding = jsonPaddedLength - jsonBuffer.length;
    if (jsonPadding > 0) {
        await writer.write(new Uint8Array(jsonPadding).fill(0x20));
    }

    await writer.write(binHeader);
    await writer.write(buffer);

    const binPadding = binPaddedLength - totalBufferLength;
    if (binPadding > 0) {
        await writer.write(new Uint8Array(binPadding).fill(0x00));
    }
};
