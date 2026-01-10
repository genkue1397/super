import { Splat } from './splat';
import { ElementType } from './element';
import { Scene } from './scene';

// Derived from doc.ts existing structure logic
export interface ProjectFile {
    version: number;
    created?: string;
    camera: any;
    view: any;
    poseSets: any;
    timeline: any;
    splats: any[]; // currently store Splat docSerialize results
    // Potential future expansion for generic objects
    objects?: any[];
}

export const getSaveableSplats = (scene: Scene) => {
    return scene.getElementsByType(ElementType.splat) as Splat[];
};
