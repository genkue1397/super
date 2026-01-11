import { Entity } from 'playcanvas';
import { AssetSource } from './asset-source';

const loadFbx = async (app: any, source: AssetSource): Promise<Entity> => {
    console.warn('FBX loader is currently disabled');
    const root = new Entity('fbx-root');
    return root;
};

export { loadFbx };
