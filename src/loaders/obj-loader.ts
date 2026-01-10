import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { AppBase, Entity, Asset } from 'playcanvas';
import { AssetSource } from './asset-source';
import { ThreeToPlayCanvas } from './three-converter';

import { localize } from '../ui/localization';

const loader = new OBJLoader();

export const loadObj = async (app: AppBase, source: AssetSource): Promise<Entity> => {
    return new Promise((resolve, reject) => {
        const text = new TextDecoder().decode(source.contents as ArrayBuffer);

        try {
            const group = loader.parse(text);
            const entity = ThreeToPlayCanvas.convert(group, app);
            resolve(entity);
        } catch (e) {
            reject(new Error(localize('popup.error.obj-parse', { error: e.message })));
        }
    });
};
