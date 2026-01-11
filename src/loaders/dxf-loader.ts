import { Entity } from 'playcanvas';
import { AssetSource } from './asset-source';

const loadDxf = async (app: any, source: AssetSource): Promise<Entity> => {
    console.warn('DXF loader is currently disabled');
    const root = new Entity('dxf-root');
    return root;
};

export { loadDxf };
