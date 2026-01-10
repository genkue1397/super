import { Container, Label } from '@playcanvas/pcui';
import { Events } from '../events';

class PerformanceMonitor extends Container {
    fpsLabel: Label;
    lastTime: number;
    frameCount: number;
    visible: boolean;

    constructor(events: Events, args = {}) {
        args = {
            id: 'performance-monitor',
            class: 'performance-monitor',
            ...args
        };
        super(args);

        this.fpsLabel = new Label({
            text: 'FPS: 0',
            class: 'fps-label'
        });
        this.append(this.fpsLabel);

        this.lastTime = performance.now();
        this.frameCount = 0;
        this.visible = false;
        this.hidden = true;

        this.dom.style.position = 'absolute';
        this.dom.style.top = '10px';
        this.dom.style.left = '10px';
        this.dom.style.zIndex = '100';
        this.dom.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        this.dom.style.padding = '5px';
        this.dom.style.borderRadius = '4px';
        this.dom.style.color = '#fff';
        this.dom.style.pointerEvents = 'none';

        events.on('frame', () => this.update());
        events.on('view.toggleFPS', () => this.toggle());
    }

    update() {
        if (!this.visible) return;

        this.frameCount++;
        const now = performance.now();
        if (now - this.lastTime >= 1000) {
            const fps = Math.round((this.frameCount * 1000) / (now - this.lastTime));
            this.fpsLabel.text = `FPS: ${fps}`;
            this.lastTime = now;
            this.frameCount = 0;
        }
    }

    toggle() {
        this.visible = !this.visible;
        this.hidden = !this.visible;
    }
}

export { PerformanceMonitor };
