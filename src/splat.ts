import {
    ADDRESS_CLAMP_TO_EDGE,
    BLENDEQUATION_ADD,
    BLENDMODE_ONE,
    BLENDMODE_ONE_MINUS_SRC_ALPHA,
    FILTER_NEAREST,
    PIXELFORMAT_R8,
    PIXELFORMAT_R16U,
    Asset,
    BlendState,
    BoundingBox,
    Color,
    Entity,
    GSplatData,
    GSplatResource,
    Mat4,
    Quat,
    Texture,
    Vec3,
    MeshInstance,
    Mesh,
    StandardMaterial
} from 'playcanvas';

import { Element, ElementType } from './element';
import { Serializer } from './serializer';
import { vertexShader, fragmentShader, gsplatCenter } from './shaders/splat-shader';
import { State } from './splat-state';
import { Transform } from './transform';
import { TransformPalette } from './transform-palette';

const vec = new Vec3();
const veca = new Vec3();
const vecb = new Vec3();

const boundingPoints =
    [-1, 1].map((x) => {
        return [-1, 1].map((y) => {
            return [-1, 1].map((z) => {
                return [
                    new Vec3(x, y, z), new Vec3(x * 0.75, y, z),
                    new Vec3(x, y, z), new Vec3(x, y * 0.75, z),
                    new Vec3(x, y, z), new Vec3(x, y, z * 0.75)
                ];
            });
        });
    }).flat(3);

class Splat extends Element {
    asset: Asset;
    splatData: GSplatData;
    numSplats = 0;
    numDeleted = 0;
    numLocked = 0;
    numSelected = 0;
    entity: Entity;
    changedCounter = 0;
    stateTexture: Texture;
    transformTexture: Texture;
    selectionBoundStorage: BoundingBox;
    localBoundStorage: BoundingBox;
    worldBoundStorage: BoundingBox;
    selectionBoundDirty = true;
    localBoundDirty = true;
    worldBoundDirty = true;
    _visible = true;
    transformPalette: TransformPalette;

    selectionAlpha = 1;

    _name = '';
    _tintClr = new Color(1, 1, 1);
    _temperature = 0;
    _saturation = 1;
    _brightness = 0;
    _blackPoint = 0;
    _whitePoint = 1;
    _transparency = 1;

    measurePoints: Vec3[] = [];
    measureSelection = -1;

    rebuildMaterial: (bands: number) => void;

    constructor(asset: Asset, orientation: Vec3) {
        super(ElementType.splat);

        const splatResource = asset.resource as GSplatResource;
        const splatData = splatResource.gsplatData;
        const { device } = splatResource;

        this._name = (asset.file as any).filename;
        this.asset = asset;
        this.splatData = splatData as GSplatData;
        this.numSplats = splatData.numSplats;

        this.entity = new Entity('splatEntitiy');
        this.entity.setEulerAngles(orientation);
        this.entity.addComponent('gsplat', { asset });

        const instance = this.entity.gsplat.instance;

        // use custom render order distance calculation for splats
        instance.meshInstance.calculateSortDistance = (meshInstance: MeshInstance, pos: Vec3, dir: Vec3) => {
            const bound = this.localBound;
            const mat = this.entity.getWorldTransform();
            let maxDist;
            for (let i = 0; i < 8; ++i) {
                vec.x = bound.center.x + bound.halfExtents.x * (i & 1 ? 1 : -1);
                vec.y = bound.center.y + bound.halfExtents.y * (i & 2 ? 1 : -1);
                vec.z = bound.center.z + bound.halfExtents.z * (i & 4 ? 1 : -1);
                mat.transformPoint(vec, vec);
                const dist = vec.sub(pos).dot(dir);
                if (i === 0 || dist > maxDist) {
                    maxDist = dist;
                }
            }
            return maxDist;
        };

        // added per-splat state channel
        // bit 1: selected
        // bit 2: deleted
        // bit 3: locked
        if (!this.splatData.getProp('state')) {
            this.splatData.getElement('vertex').properties.push({
                type: 'uchar',
                name: 'state',
                storage: new Uint8Array(this.splatData.numSplats),
                byteSize: 1
            });
        }

        // per-splat transform matrix
        this.splatData.getElement('vertex').properties.push({
            type: 'ushort',
            name: 'transform',
            storage: new Uint16Array(this.splatData.numSplats),
            byteSize: 2
        });

        const { width, height } = splatResource.colorTexture;

        // pack spherical harmonic data
        const createTexture = (name: string, format: number) => {
            return new Texture(device, {
                name: name,
                width: width,
                height: height,
                format: format,
                mipmaps: false,
                minFilter: FILTER_NEAREST,
                magFilter: FILTER_NEAREST,
                addressU: ADDRESS_CLAMP_TO_EDGE,
                addressV: ADDRESS_CLAMP_TO_EDGE
            });
        };

        // create the state texture
        this.stateTexture = createTexture('splatState', PIXELFORMAT_R8);
        this.transformTexture = createTexture('splatTransform', PIXELFORMAT_R16U);

        // create the transform palette
        this.transformPalette = new TransformPalette(device);

        // blend mode for splats
        const blendState = new BlendState(true, BLENDEQUATION_ADD, BLENDMODE_ONE, BLENDMODE_ONE_MINUS_SRC_ALPHA);

        this.rebuildMaterial = (bands: number) => {
            const { material } = instance;
            // material.blendState = blendState;
            const { glsl } = material.shaderChunks;
            glsl.set('gsplatVS', vertexShader);
            glsl.set('gsplatPS', fragmentShader);
            glsl.set('gsplatCenterVS', gsplatCenter);

            const maxBands = this.numSplats > 1000000 ? 0 : (instance.resource as GSplatResource).shBands;
            material.setDefine('SH_BANDS', `${Math.min(bands, maxBands)}`);
            material.setParameter('splatState', this.stateTexture);
            material.setParameter('splatTransform', this.transformTexture);
            material.update();
        };

        this.selectionBoundStorage = new BoundingBox();
        this.localBoundStorage = instance.resource.aabb;
        // @ts-ignore
        this.worldBoundStorage = instance.meshInstance._aabb;

        // @ts-ignore
        instance.meshInstance._updateAabb = false;

        // when sort changes, re-render the scene
        instance.sorter.on('updated', () => {
            this.changedCounter++;
        });

        // Listen to render mode changes
        this.scene.events.on('view.setRenderMode', (mode: 'splat' | 'point') => {
            this.renderMode = mode;
        });

        this.createPointCloud();
    }

    pointCloudEntity: Entity;
    _renderMode: 'splat' | 'point' = 'splat';

    createPointCloud() {
        if (this.pointCloudEntity) return;

        const splatData = this.splatData;
        const numSplats = splatData.numSplats;

        // We need raw positions. 
        // GSplatData usually stores them in 'vertex' element.
        // But formatting varies. 
        // We can use the 'centers' from the instance sorter if initialized, or calcPositions.
        // Sorter centers are updated in updatePositions.

        // Let's use calcPositions from dataProcessor to be safe/consistent
        const data = this.scene.dataProcessor.calcPositions(this);
        // data array is float32, x,y,z, (maybe w?)
        // updatePositions says: data[i*4]... so stride is 4.

        const positions = new Float32Array(numSplats * 3);
        const colors = new Uint8ClampedArray(numSplats * 4); // r,g,b,a

        // We also need colors. GSplatData has f_dc_0, f_dc_1, f_dc_2 usually relative to SH.
        // Or we can just use white if SH is complex.
        // Actually, for point cloud mode, we want the base color.
        // Accessing SH 0 band (diffuse).
        // It's complex to extract exactly without SH eval.
        // For MVP, let's use a default color or try to fetch 'f_dc_0' etc.
        // splatData.getProp('f_dc_0') ?

        const f_dc_0 = splatData.getProp('f_dc_0');
        const f_dc_1 = splatData.getProp('f_dc_1');
        const f_dc_2 = splatData.getProp('f_dc_2');

        const SH_C0 = 0.28209479177387814;

        for (let i = 0; i < numSplats; i++) {
            positions[i * 3 + 0] = data[i * 4 + 0];
            positions[i * 3 + 1] = data[i * 4 + 1];
            positions[i * 3 + 2] = data[i * 4 + 2];

            if (f_dc_0 && f_dc_1 && f_dc_2) {
                // SH to RGB (approx)
                let r = f_dc_0[i] * SH_C0 + 0.5;
                let g = f_dc_1[i] * SH_C0 + 0.5;
                let b = f_dc_2[i] * SH_C0 + 0.5;

                // simple clamping
                r = Math.max(0, Math.min(1, r)) * 255;
                g = Math.max(0, Math.min(1, g)) * 255;
                b = Math.max(0, Math.min(1, b)) * 255;

                colors[i * 4 + 0] = r;
                colors[i * 4 + 1] = g;
                colors[i * 4 + 2] = b;
                colors[i * 4 + 3] = 255;
            } else {
                colors[i * 4 + 0] = 255;
                colors[i * 4 + 1] = 255;
                colors[i * 4 + 2] = 255;
                colors[i * 4 + 3] = 255;
            }
        }

        const mesh = new Mesh(this.asset.resource.device);
        mesh.setPositions(positions);
        mesh.setColors(colors);
        mesh.update(this.asset.resource.device.PRIMITIVE_POINTS);

        const material = new StandardMaterial();
        material.emissiveVertexColor = true;
        material.useLighting = false;

        this.pointCloudEntity = new Entity('pointCloud');
        this.pointCloudEntity.addComponent('render', {
            meshInstances: [new MeshInstance(mesh, material)]
        });

        this.entity.addChild(this.pointCloudEntity);
        this.pointCloudEntity.enabled = (this._renderMode === 'point');
    }

    set renderMode(mode: 'splat' | 'point') {
        if (this._renderMode !== mode) {
            this._renderMode = mode;
            if (mode === 'point') {
                if (!this.pointCloudEntity) this.createPointCloud();
                this.pointCloudEntity.enabled = true;
                this.entity.gsplat.enabled = false;
            } else {
                if (this.pointCloudEntity) this.pointCloudEntity.enabled = false;
                this.entity.gsplat.enabled = true;
            }
        }
    }

    get renderMode() {
        return this._renderMode;
    }

    destroy() {
        super.destroy();
        this.entity.destroy();
        this.asset.registry.remove(this.asset);
        this.asset.unload();
    }

    updateState(changedState = State.selected) {
        const state = this.splatData.getProp('state') as Uint8Array;

        // write state data to gpu texture
        const data = this.stateTexture.lock();
        data.set(state);
        this.stateTexture.unlock();

        let numSelected = 0;
        let numLocked = 0;
        let numDeleted = 0;

        for (let i = 0; i < state.length; ++i) {
            const s = state[i];
            if (s & State.deleted) {
                numDeleted++;
            } else if (s & State.locked) {
                numLocked++;
            } else if (s & State.selected) {
                numSelected++;
            }
        }

        this.numSplats = state.length - numDeleted;
        this.numLocked = numLocked;
        this.numSelected = numSelected;
        this.numDeleted = numDeleted;

        this.makeSelectionBoundDirty();

        // handle splats being added or removed
        if (changedState & State.deleted) {
            this.updateSorting();
        }

        this.scene.forceRender = true;
        this.scene.events.fire('splat.stateChanged', this);
    }

    updatePositions() {
        const data = this.scene.dataProcessor.calcPositions(this);

        // update the splat centers which are used for render-time sorting
        const state = this.splatData.getProp('state') as Uint8Array;
        const { sorter } = this.entity.gsplat.instance;
        const { centers } = sorter;
        for (let i = 0; i < this.splatData.numSplats; ++i) {
            if (state[i] === State.selected) {
                centers[i * 3 + 0] = data[i * 4];
                centers[i * 3 + 1] = data[i * 4 + 1];
                centers[i * 3 + 2] = data[i * 4 + 2];
            }
        }

        this.updateSorting();

        this.scene.forceRender = true;
        this.scene.events.fire('splat.positionsChanged', this);
    }

    updateSorting() {
        const state = this.splatData.getProp('state') as Uint8Array;

        this.makeLocalBoundDirty();

        let mapping;

        // create a sorter mapping to remove deleted splats
        if (this.numSplats !== state.length) {
            mapping = new Uint32Array(this.numSplats);
            let idx = 0;
            for (let i = 0; i < state.length; ++i) {
                if ((state[i] & State.deleted) === 0) {
                    mapping[idx++] = i;
                }
            }
        }

        // update sorting instance
        this.entity.gsplat.instance.sorter.setMapping(mapping);
    }

    get worldTransform() {
        return this.entity.getWorldTransform();
    }

    set name(newName: string) {
        if (newName !== this.name) {
            this._name = newName;
            this.scene.events.fire('splat.name', this);
        }
    }

    get name() {
        return this._name;
    }

    get filename() {
        return (this.asset.file as any).filename;
    }

    calcSplatWorldPosition(splatId: number, result: Vec3) {
        if (splatId >= this.splatData.numSplats) {
            return false;
        }

        // use centers data, which are updated when edits occur
        const { sorter } = this.entity.gsplat.instance;
        const { centers } = sorter;

        result.set(
            centers[splatId * 3 + 0],
            centers[splatId * 3 + 1],
            centers[splatId * 3 + 2]
        );

        this.worldTransform.transformPoint(result, result);

        return true;
    }

    add() {
        // add the entity to the scene
        this.scene.contentRoot.addChild(this.entity);

        this.scene.events.on('view.bands', this.rebuildMaterial, this);
        this.rebuildMaterial(this.scene.events.invoke('view.bands'));

        // we must update state in case the state data was loaded from ply
        this.updateState();
    }

    remove() {
        this.scene.events.off('view.bands', this.rebuildMaterial, this);

        this.scene.contentRoot.removeChild(this.entity);
        this.scene.boundDirty = true;
    }

    serialize(serializer: Serializer) {
        serializer.packa(this.entity.getWorldTransform().data);
        serializer.pack(this.changedCounter);
        serializer.pack(this.visible);
        serializer.pack(this.tintClr.r, this.tintClr.g, this.tintClr.b);
        serializer.pack(this.temperature, this.saturation, this.brightness, this.blackPoint, this.whitePoint, this.transparency);
    }

    onPreRender() {
        const events = this.scene.events;
        const selected = this.scene.camera.renderOverlays && events.invoke('selection') === this;
        const cameraMode = events.invoke('camera.mode');
        const cameraOverlay = events.invoke('camera.overlay');

        // configure rings rendering
        const material = this.entity.gsplat.instance.material;
        material.setParameter('mode', cameraMode === 'rings' ? 1 : 0);
        material.setParameter('ringSize', (selected && cameraOverlay && cameraMode === 'rings') ? 0.04 : 0);

        const selectionAlpha = selected && !events.invoke('view.outlineSelection') ? this.selectionAlpha : 0;

        // configure colors
        const selectedClr = events.invoke('selectedClr');
        const unselectedClr = events.invoke('unselectedClr');
        const lockedClr = events.invoke('lockedClr');
        material.setParameter('selectedClr', [selectedClr.r, selectedClr.g, selectedClr.b, selectedClr.a * selectionAlpha]);
        material.setParameter('unselectedClr', [unselectedClr.r, unselectedClr.g, unselectedClr.b, unselectedClr.a]);
        material.setParameter('lockedClr', [lockedClr.r, lockedClr.g, lockedClr.b, lockedClr.a]);

        // combine black pointer, white point and brightness
        const offset = -this.blackPoint + this.brightness;
        const scale = 1 / (this.whitePoint - this.blackPoint);

        material.setParameter('clrOffset', [offset, offset, offset]);
        material.setParameter('clrScale', [
            scale * this.tintClr.r * (1 + this.temperature),
            scale * this.tintClr.g,
            scale * this.tintClr.b * (1 - this.temperature),
            this.transparency
        ]);

        material.setParameter('saturation', this.saturation);
        material.setParameter('transformPalette', this.transformPalette.texture);

        if (this.visible && selected) {
            // render bounding box
            if (events.invoke('camera.bound')) {
                const bound = this.localBound;
                const scale = new Mat4().setTRS(bound.center, Quat.IDENTITY, bound.halfExtents);
                scale.mul2(this.entity.getWorldTransform(), scale);

                for (let i = 0; i < boundingPoints.length / 2; i++) {
                    const a = boundingPoints[i * 2];
                    const b = boundingPoints[i * 2 + 1];
                    scale.transformPoint(a, veca);
                    scale.transformPoint(b, vecb);

                    this.scene.app.drawLine(veca, vecb, Color.WHITE, true, this.scene.debugLayer);
                }
            }
        }

        this.entity.enabled = this.visible;
    }

    focalPoint() {
        // GSplatData has a function for calculating an weighted average of the splat positions
        // to get a focal point for the camera, but we use bound center instead
        return this.worldBound.center;
    }

    move(position?: Vec3, rotation?: Quat, scale?: Vec3) {
        const entity = this.entity;
        if (position) {
            entity.setLocalPosition(position);
        }
        if (rotation) {
            entity.setLocalRotation(rotation);
        }
        if (scale) {
            entity.setLocalScale(scale);
        }

        this.makeWorldBoundDirty();

        this.scene.events.fire('splat.moved', this);
    }

    makeSelectionBoundDirty() {
        this.selectionBoundDirty = true;
        this.makeLocalBoundDirty();
    }

    makeLocalBoundDirty() {
        this.localBoundDirty = true;
        this.makeWorldBoundDirty();
    }

    makeWorldBoundDirty() {
        this.worldBoundDirty = true;
        this.scene.boundDirty = true;
    }

    // get the selection bound
    get selectionBound() {
        const selectionBound = this.selectionBoundStorage;
        if (this.selectionBoundDirty) {
            this.scene.dataProcessor.calcBound(this, selectionBound, true);
            this.selectionBoundDirty = false;
        }
        return selectionBound;
    }

    // get local space bound
    get localBound() {
        const localBound = this.localBoundStorage;
        if (this.localBoundDirty) {
            this.scene.dataProcessor.calcBound(this, localBound, false);
            this.localBoundDirty = false;
            this.entity.getWorldTransform().transformPoint(localBound.center, vec);
        }
        return localBound;
    }

    // get world space bound
    get worldBound() {
        const worldBound = this.worldBoundStorage;
        if (this.worldBoundDirty) {
            // calculate meshinstance aabb (transformed local bound)
            worldBound.setFromTransformedAabb(this.localBound, this.entity.getWorldTransform());

            // flag scene bound as dirty
            this.worldBoundDirty = false;
        }
        return worldBound;
    }

    set visible(value: boolean) {
        if (value !== this.visible) {
            this._visible = value;
            this.scene.events.fire('splat.visibility', this);
        }
    }

    get visible() {
        return this._visible;
    }

    set tintClr(value: Color) {
        if (!this._tintClr.equals(value)) {
            this._tintClr.set(value.r, value.g, value.b);
            this.scene.events.fire('splat.tintClr', this);
        }
    }

    get tintClr() {
        return this._tintClr;
    }

    set temperature(value: number) {
        if (value !== this._temperature) {
            this._temperature = value;
            this.scene.events.fire('splat.temperature', this);
        }
    }

    get temperature() {
        return this._temperature;
    }

    set saturation(value: number) {
        if (value !== this._saturation) {
            this._saturation = value;
            this.scene.events.fire('splat.saturation', this);
        }
    }

    get saturation() {
        return this._saturation;
    }

    set brightness(value: number) {
        if (value !== this._brightness) {
            this._brightness = value;
            this.scene.events.fire('splat.brightness', this);
        }
    }

    get brightness() {
        return this._brightness;
    }

    set blackPoint(value: number) {
        if (value !== this._blackPoint) {
            this._blackPoint = value;
            this.scene.events.fire('splat.blackPoint', this);
        }
    }

    get blackPoint() {
        return this._blackPoint;
    }

    set whitePoint(value: number) {
        if (value !== this._whitePoint) {
            this._whitePoint = value;
            this.scene.events.fire('splat.whitePoint', this);
        }
    }

    get whitePoint() {
        return this._whitePoint;
    }

    set transparency(value: number) {
        if (value !== this._transparency) {
            this._transparency = value;
            this.scene.events.fire('splat.transparency', this);
        }
    }

    get transparency() {
        return this._transparency;
    }

    getPivot(mode: 'center' | 'boundCenter', selection: boolean, result: Transform) {
        const { entity } = this;
        switch (mode) {
            case 'center':
                result.set(entity.getLocalPosition(), entity.getLocalRotation(), entity.getLocalScale());
                break;
            case 'boundCenter':
                entity.getLocalTransform().transformPoint((selection ? this.selectionBound : this.localBound).center, vec);
                result.set(vec, entity.getLocalRotation(), entity.getLocalScale());
                break;
        }
    }

    docSerialize() {
        const pack3 = (v: Vec3) => [v.x, v.y, v.z];
        const pack4 = (q: Quat) => [q.x, q.y, q.z, q.w];
        const packC = (c: Color) => [c.r, c.g, c.b, c.a];
        return {
            name: this.name,
            position: pack3(this.entity.getLocalPosition()),
            rotation: pack4(this.entity.getLocalRotation()),
            scale: pack3(this.entity.getLocalScale()),
            visible: this.visible,
            tintClr: packC(this.tintClr),
            temperature: this.temperature,
            saturation: this.saturation,
            brightness: this.brightness,
            blackPoint: this.blackPoint,
            whitePoint: this.whitePoint,
            transparency: this.transparency
        };
    }

    docDeserialize(doc: any) {
        const { name, position, rotation, scale, visible, tintClr, temperature, saturation, brightness, blackPoint, whitePoint, transparency } = doc;

        this.name = name;
        this.move(new Vec3(position), new Quat(rotation), new Vec3(scale));
        this.visible = visible;
        this.tintClr = new Color(tintClr[0], tintClr[1], tintClr[2], tintClr[3]);
        this.temperature = temperature ?? 0;
        this.saturation = saturation ?? 1;
        this.brightness = brightness;
        this.blackPoint = blackPoint;
        this.whitePoint = whitePoint;
        this.transparency = transparency;
    }
}

export { Splat };
