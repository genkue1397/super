import DxfParser from 'dxf-parser';
import { AppBase, Entity, Mesh, MeshInstance, StandardMaterial, Vec3, Color } from 'playcanvas';
import { AssetSource } from './asset-source';

const parser = new DxfParser();

export const loadDxf = async (app: AppBase, source: AssetSource): Promise<Entity> => {
    const text = await new Response(source.contents).text();
    const dxf = parser.parseSync(text);

    const root = new Entity('dxf-root');
    const positions: number[] = [];
    const colors: number[] = [];

    // Simple line renderer for DXF entities
    // This assumes LINES primitive
    // We only handle LINE, POLYLINE, LWPOLYLINE for now

    if (dxf && dxf.entities) {
        for (const entity of dxf.entities) {
            if (entity.type === 'LINE') {
                const start = entity.vertices[0];
                const end = entity.vertices[1];
                positions.push(start.x, start.y, start.z);
                positions.push(end.x, end.y, end.z);
                // Default white
                colors.push(255, 255, 255, 255);
                colors.push(255, 255, 255, 255);
            } else if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
                if (entity.vertices && entity.vertices.length > 1) {
                    for (let i = 0; i < entity.vertices.length - 1; i++) {
                        const start = entity.vertices[i];
                        const end = entity.vertices[i + 1];
                        positions.push(start.x, start.y, start.z || 0);
                        positions.push(end.x, end.y, end.z || 0);
                        colors.push(255, 255, 255, 255);
                        colors.push(255, 255, 255, 255);
                    }
                    if (entity.shape && (entity.shape as any) === true) { // closed loop
                        const start = entity.vertices[entity.vertices.length - 1];
                        const end = entity.vertices[0];
                        positions.push(start.x, start.y, start.z || 0);
                        positions.push(end.x, end.y, end.z || 0);
                        colors.push(255, 255, 255, 255);
                        colors.push(255, 255, 255, 255);
                    }
                }
            }
        }
    }

    if (positions.length > 0) {
        const mesh = new Mesh(app.graphicsDevice);
        mesh.setPositions(new Float32Array(positions));
        mesh.setColors(new Uint8Array(colors));
        mesh.update(app.graphicsDevice.PRIMITIVE_LINES);

        const material = new StandardMaterial();
        material.emissive = new Color(1, 1, 1);
        material.useLighting = false;

        const instance = new MeshInstance(mesh, material);
        const renderEntity = new Entity('dxf-mesh');
        renderEntity.addComponent('render', {
            meshInstances: [instance]
        });
        root.addChild(renderEntity);
    }

    return root;
};
