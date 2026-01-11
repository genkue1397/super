import { Entity } from 'playcanvas';
import { AssetSource } from './asset-source';

const loadObj = async (app: any, source: AssetSource): Promise<Entity> => {
    console.warn('OBJ loader is currently disabled');
    const root = new Entity('obj-root');
    return root;
};

export { loadObj };
