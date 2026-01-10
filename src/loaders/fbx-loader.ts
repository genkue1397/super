import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { AppBase, Entity } from 'playcanvas';
import { AssetSource } from './asset-source';
import { ThreeToPlayCanvas } from './three-converter';
import { localize } from '../ui/localization';

const loader = new FBXLoader();

export const loadFbx = async (app: AppBase, source: AssetSource): Promise<Entity> => {
    return new Promise(async (resolve, reject) => {
        try {
            // Convert to ArrayBuffer
            let buffer: ArrayBuffer;

            if (source.contents instanceof ArrayBuffer) {
                buffer = source.contents;
            } else if (source.contents instanceof Uint8Array) {
                // Cast SharedArrayBuffer to ArrayBuffer if necessary, or just access validation
                buffer = source.contents.buffer as ArrayBuffer;
            } else if (source.contents instanceof Blob) {
                buffer = await source.contents.arrayBuffer();
            } else {
                // Case for Response object or other
                // @ts-ignore
                buffer = await new Response(source.contents).arrayBuffer();
            }

            // Check buffer size
            if (!buffer || buffer.byteLength === 0) {
                reject(new Error('FBX file is empty'));
                return;
            }

            console.log('FBX loading:', {
                filename: source.filename,
                size: buffer.byteLength,
                type: 'ArrayBuffer'
            });

            // Check FBX header (first 23 bytes)
            const headerView = new Uint8Array(buffer, 0, Math.min(23, buffer.byteLength));
            const headerString = String.fromCharCode(...headerView);

            console.log('FBX header:', headerString.substring(0, 20));

            // Check if binary or ASCII
            if (!headerString.includes('Kaydara FBX Binary')) {
                console.warn('This may be an ASCII FBX file, which is not fully supported');
            }

            // Parse FBX
            const group = loader.parse(buffer, '');

            if (!group) {
                reject(new Error('Failed to parse FBX file'));
                return;
            }

            console.log('FBX parsed:', {
                children: group.children.length,
                hasGeometry: group.children.some((c: any) => c.type === 'Mesh')
            });

            if (group.children.length === 0) {
                console.warn('FBX file contains no geometry, creating empty entity');
            }

            // Convert to PlayCanvas entity
            const entity = ThreeToPlayCanvas.convert(group, app);

            console.log('FBX loaded successfully:', entity.name);
            resolve(entity);

        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : String(e);

            console.error('FBX loading failed:', {
                filename: source.filename,
                error: errorMessage,
                stack: e instanceof Error ? e.stack : undefined
            });

            // Classify errors
            if (errorMessage.includes('Invalid array length')) {
                reject(new Error(localize('popup.error.fbx-transfer', { error: 'Invalid structure or corrupt file' })));
            } else if (errorMessage.includes('Unknown format')) {
                reject(new Error(localize('popup.error.fbx-transfer', { error: 'Unsupported format (ASCII not supported)' })));
            } else if (errorMessage.includes('Unexpected')) {
                reject(new Error(localize('popup.error.fbx-transfer', { error: 'Corrupt or malformed file' })));
            } else {
                reject(new Error(localize('popup.error.fbx-transfer', { error: errorMessage })));
            }
        }
    });
};
