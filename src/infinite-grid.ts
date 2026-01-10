import {
    BLEND_NORMAL,
    Color,
    Entity,
    Mesh,
    MeshInstance,
    PRIMITIVE_LINES,
    StandardMaterial
} from 'playcanvas';

import { Element, ElementType } from './element';
import { Serializer } from './serializer';

class InfiniteGrid extends Element {
    visible = true;
    gridEntity: Entity;

    constructor() {
        super(ElementType.debug);
    }

    add() {
        // Create grid entity
        this.gridEntity = new Entity('grid');

        // Grid material
        const material = new StandardMaterial();
        material.emissive = new Color(0.3, 0.3, 0.3);
        material.opacity = 0.5;
        material.blendType = BLEND_NORMAL;
        material.update();

        // Grid mesh
        const gridSize = 10;
        const gridStep = 1;
        const positions = [];
        const indices = [];

        for (let i = -gridSize; i <= gridSize; i++) {
            // X-axis lines
            positions.push(i * gridStep, 0, -gridSize * gridStep);
            positions.push(i * gridStep, 0, gridSize * gridStep);

            // Z-axis lines
            positions.push(-gridSize * gridStep, 0, i * gridStep);
            positions.push(gridSize * gridStep, 0, i * gridStep);
        }

        // Generate indices
        for (let i = 0; i < positions.length / 3; i++) {
            indices.push(i);
        }

        const device = this.scene.app.graphicsDevice;
        const mesh = new Mesh(device);
        mesh.setPositions(positions);
        mesh.setIndices(indices);
        mesh.primitive[0].type = PRIMITIVE_LINES;
        mesh.update();

        // Add render component
        this.gridEntity.addComponent('render', {
            type: 'asset',
            meshInstances: [new MeshInstance(mesh, material)]
        });

        this.gridEntity.enabled = this.visible;
        this.scene.app.root.addChild(this.gridEntity); // Add to root or scene root
    }

    remove() {
        if (this.gridEntity) {
            this.gridEntity.destroy();
            this.gridEntity = null;
        }
    }

    onUpdate(deltaTime: number) {
        if (this.gridEntity) {
            this.gridEntity.enabled = this.visible;
        }
    }

    serialize(serializer: Serializer): void {
        serializer.pack(this.visible);
    }
}

export { InfiniteGrid };
