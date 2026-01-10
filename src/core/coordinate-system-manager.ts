import { Entity, Vec3, Quat } from 'playcanvas';

export type UpAxis = 'y' | 'z';

export class CoordinateSystemManager {
    private static _upAxis: UpAxis = 'y';

    static get upAxis(): UpAxis {
        return this._upAxis;
    }

    static set upAxis(axis: UpAxis) {
        this._upAxis = axis;
        // Trigger event or update scene if needed
    }

    // Aligns the entity to the world origin (0,0,0) based on its bounding box center
    static alignToOrigin(entity: Entity) {
        // We need to calculate bounding box. 
        // PlayCanvas entities don't always have a straightforward bbox without models.
        // But for our imported models/splats, they should have render components or similar.

        // This is a placeholder for the logic. Real logic needs to traverse children.
        const pos = entity.getLocalPosition();
        entity.setLocalPosition(-pos.x, -pos.y, -pos.z);
    }

    // Adjusts rotation based on up-axis
    static normalizeRotation(entity: Entity, originalUp: UpAxis) {
        if (this._upAxis === 'y' && originalUp === 'z') {
            entity.rotateLocal(-90, 0, 0);
        } else if (this._upAxis === 'z' && originalUp === 'y') {
            entity.rotateLocal(90, 0, 0);
        }
    }
}
