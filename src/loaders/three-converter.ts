import * as THREE from 'three';
import { Mesh, StandardMaterial, Vec3, GraphNode, Entity, RenderComponent, MeshInstance, AppBase } from 'playcanvas';

export class ThreeToPlayCanvas {
    static convert(threeObject: THREE.Object3D, app: AppBase): Entity {
        const entity = new Entity(threeObject.name);

        // Transform (Three.js is Y-up, PlayCanvas is Y-up usually, but we might need adjustment later)
        entity.setLocalPosition(threeObject.position.x, threeObject.position.y, threeObject.position.z);
        // Rotation (Euler order might differ, using quaternions is safer but this is starter)
        entity.setLocalEulerAngles(threeObject.rotation.x * 180 / Math.PI, threeObject.rotation.y * 180 / Math.PI, threeObject.rotation.z * 180 / Math.PI);
        entity.setLocalScale(threeObject.scale.x, threeObject.scale.y, threeObject.scale.z);

        if ((threeObject as THREE.Mesh).isMesh) {
            const threeMesh = threeObject as THREE.Mesh;
            const geometry = threeMesh.geometry;

            const pcMesh = this.convertGeometry(geometry, app);
            if (pcMesh) {
                // Should import StandardMaterial or use pc.StandardMaterial
                const material = new StandardMaterial();
                entity.addComponent('render', {
                    meshInstances: [new MeshInstance(pcMesh, material)]
                });
            }
        }

        // Children
        for (const child of threeObject.children) {
            entity.addChild(this.convert(child, app));
        }

        return entity;
    }

    static convertGeometry(geometry: THREE.BufferGeometry, app: AppBase): Mesh | null {
        // Basic conversion of positions, normals, uvs, indices
        // properties: position, normal, uv

        const positions = geometry.attributes.position?.array;
        const normals = geometry.attributes.normal?.array;
        const uvs = geometry.attributes.uv?.array;
        const indices = geometry.index?.array;

        if (!positions) return null;

        const mesh = new Mesh(app.graphicsDevice);
        mesh.setPositions(positions as Float32Array);
        if (normals) mesh.setNormals(normals as Float32Array);
        if (uvs) mesh.setUvs(0, uvs as Float32Array);
        if (indices) mesh.setIndices(indices as Uint16Array | Uint32Array);

        mesh.update();
        return mesh;
    }
}
