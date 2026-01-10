import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { AppBase, Entity } from 'playcanvas';
import { AssetSource } from './asset-source';
import { ThreeToPlayCanvas } from './three-converter';

const loader = new FBXLoader();

export const loadFbx = async (app: AppBase, source: AssetSource): Promise<Entity> => {
    const buffer = await new Response(source.contents).arrayBuffer();

    return new Promise((resolve, reject) => {
        try {
            const group = loader.parse(buffer, '');
            const entity = ThreeToPlayCanvas.convert(group, app);
            resolve(entity);
        } catch (e) {
            reject(e);
        }
    });
};
