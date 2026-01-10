import { path, Quat, Vec3 } from 'playcanvas';

import { CreateDropHandler } from './drop-handler';
import { ElementType } from './element';
import { Events } from './events';
import { AssetSource } from './loaders/asset-source';
import { Scene } from './scene';
import { DownloadWriter, FileStreamWriter } from './serialize/writer';
import { Splat } from './splat';
import { serializePly, serializePlyCompressed, SerializeSettings, serializeSog, serializeSplat, serializeViewer, SogSettings, ViewerExportSettings } from './splat-serialize';
import { localize } from './ui/localization';

// ts compiler and vscode find this type, but eslint does not
type FilePickerAcceptType = unknown;

type ExportType = 'ply' | 'splat' | 'sog' | 'viewer' | 'obj' | 'fbx';

type FileType = 'ply' | 'compressedPly' | 'splat' | 'sog' | 'htmlViewer' | 'packageViewer' | 'obj' | 'fbx';

interface SceneExportOptions {
    filename: string;
    splatIdx: 'all' | number;
    serializeSettings: SerializeSettings;

    // ply
    compressedPly?: boolean;

    // sog
    sogIterations?: number;

    // viewer
    viewerExportSettings?: ViewerExportSettings;
}

const filePickerTypes: { [key: string]: FilePickerAcceptType } = {
    'ply': {
        description: 'Gaussian Splat PLY File',
        accept: {
            'application/ply': ['.ply']
        }
    },
    'compressedPly': {
        description: 'Compressed Gaussian Splat PLY File',
        accept: {
            'application/ply': ['.ply']
        }
    },
    'sog': {
        description: 'SOG Scene',
        accept: {
            'application/x-gaussian-splat': ['.json', '.sog'],
            'image/webp': ['.webp']
        }
    },
    'lcc': {
        description: 'LCC Scene',
        accept: {
            'application/json': ['.lcc'],
            'application/octet-stream': ['.bin']
        }
    },
    'splat': {
        description: 'Splat File',
        accept: {
            'application/x-gaussian-splat': ['.splat']
        }
    },
    'indexTxt': {
        description: 'Colmap Poses (Images.txt)',
        accept: {
            'text/plain': ['.txt']
        }
    },
    'htmlViewer': {
        description: 'Viewer HTML',
        accept: {
            'text/html': ['.html']
        }
    },
    'packageViewer': {
        description: 'Viewer ZIP',
        accept: {
            'application/zip': ['.zip']
        }
    },
    'obj': {
        description: 'Wavefront OBJ',
        accept: {
            'model/obj': ['.obj']
        }
    },
    'fbx': {
        description: 'Autodesk FBX',
        accept: {
            'application/octet-stream': ['.fbx']
        }
    }
};

const allImportTypes = {
    description: 'Supported Files',
    accept: {
        'application/ply': ['.ply'],
        'application/x-gaussian-splat': ['.json', '.sog', '.splat'],
        'image/webp': ['.webp'],
        'application/json': ['.lcc'],
        'application/octet-stream': ['.bin', '.fbx', '.dxf', '.obj'],
        'text/plain': ['.txt', '.obj', '.dxf']
    }
};

// ... (rest of the file until scene.export)

events.function('scene.export', async (exportType: ExportType) => {
    const splats = getSplats();

    const hasFilePicker = !!window.showSaveFilePicker;

    // show viewer export options
    const options = await events.invoke('show.exportPopup', exportType, splats.map(s => s.name), !hasFilePicker) as SceneExportOptions;

    // return if user cancelled
    if (!options) {
        return;
    }

    const fileType: FileType =
        (exportType === 'viewer') ? (options.viewerExportSettings!.type === 'zip' ? 'packageViewer' : 'htmlViewer') :
            (exportType === 'ply') ? (options.compressedPly ? 'compressedPly' : 'ply') :
                (exportType === 'sog') ? 'sog' :
                    (exportType === 'obj') ? 'obj' :
                        (exportType === 'fbx') ? 'fbx' : 'splat';

    if (hasFilePicker) {
        try {
            const fileHandle = await window.showSaveFilePicker({
                id: 'SuperSplatFileExport',
                types: [filePickerTypes[fileType]],
                suggestedName: options.filename
            });
            await events.invoke('scene.write', fileType, options, await fileHandle.createWritable());
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error(error);
            }
        }
    } else {
        await events.invoke('scene.write', fileType, options);
    }
});

events.function('scene.write', async (fileType: FileType, options: SceneExportOptions, stream?: FileSystemWritableFileStream) => {
    events.fire('startSpinner');

    try {
        // setTimeout so spinner has a chance to activate
        await new Promise<void>((resolve) => {
            setTimeout(resolve);
        });

        const { filename, splatIdx, serializeSettings, viewerExportSettings } = options;

        const writer = stream ? new FileStreamWriter(stream) : new DownloadWriter(filename);

        try {
            const splats = splatIdx === 'all' ? getSplats() : [getSplats()[splatIdx]];

            switch (fileType) {
                case 'ply':
                    await serializePly(splats, serializeSettings, writer);
                    break;
                case 'compressedPly':
                    serializeSettings.minOpacity = 1 / 255;
                    serializeSettings.removeInvalid = true;
                    await serializePlyCompressed(splats, serializeSettings, writer);
                    break;
                case 'splat':
                    await serializeSplat(splats, serializeSettings, writer);
                    break;
                case 'sog': {
                    const sogSettings: SogSettings = {
                        ...serializeSettings,
                        minOpacity: 1 / 255,
                        removeInvalid: true,
                        iterations: options.sogIterations ?? 10
                    };
                    await serializeSog(splats, sogSettings, writer);
                    break;
                }
                case 'htmlViewer':
                case 'packageViewer':
                    await serializeViewer(splats, serializeSettings, viewerExportSettings!, writer);
                    break;
                case 'obj':
                    await serializeObj(splats, serializeSettings, writer);
                    break;
                case 'fbx':
                    await serializeFbx(splats, serializeSettings, writer);
                    break;
            }
        } finally {
            await writer.close();
        }

    } catch (error) {
        await events.invoke('showPopup', {
            type: 'error',
            header: localize('popup.error-loading'),
            message: `${error.message ?? error} while saving file`
        });
    } finally {
        events.fire('stopSpinner');
    }
});
};

export { initFileHandler, ExportType, SceneExportOptions };
