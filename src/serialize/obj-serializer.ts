import { Writer } from './writer';
import { Splat } from '../splat';
import { SerializeSettings } from '../splat-serialize';

export const serializeObj = async (
    splats: Splat[],
    settings: SerializeSettings,
    writer: Writer
): Promise<void> => {
    const encoder = new TextEncoder();
    const writeLine = async (str: string) => {
        await writer.write(encoder.encode(str));
    };

    let vertexOffset = 1; // OBJ indices start at 1

    for (const splat of splats) {
        const data = splat.splatData;
        const numSplats = data.numSplats;

        const xArr = data.getProp('x') as Float32Array;
        const yArr = data.getProp('y') as Float32Array;
        const zArr = data.getProp('z') as Float32Array;
        const state = data.getProp('state') as Uint8Array;

        // Header
        await writeLine(`# Exported from SuperSplat\n`);
        await writeLine(`# Object: ${splat.name}\n`);
        await writeLine(`o ${splat.name}\n`);

        const includeColor = (settings as any).includeColor !== false;
        let f_dc_0, f_dc_1, f_dc_2;
        if (includeColor) {
            f_dc_0 = data.getProp('f_dc_0') as Float32Array;
            f_dc_1 = data.getProp('f_dc_1') as Float32Array;
            f_dc_2 = data.getProp('f_dc_2') as Float32Array;
        }

        // Vertices
        for (let i = 0; i < numSplats; i++) {
            if (settings.removeInvalid && state && (state[i] & 254) !== 0) continue;

            const x = xArr[i];
            const y = yArr[i];
            const z = zArr[i];

            await writeLine(`v ${x} ${y} ${z}\n`);
        }

        // Optional: vertex colors
        // OBJ vertex colors extension: vc r g b (often supported by some loaders like MeshLab)
        if (includeColor && f_dc_0) {
            for (let i = 0; i < numSplats; i++) {
                if (settings.removeInvalid && state && (state[i] & 254) !== 0) continue;

                const r = f_dc_0[i];
                const g = f_dc_1[i];
                const b = f_dc_2[i];

                await writeLine(`vc ${r} ${g} ${b}\n`);
            }
        }

        vertexOffset += numSplats;
    }
};
