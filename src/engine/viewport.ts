// 3Dビューポート：レンダラー・カメラ・選択・視点管理・スクリーンショット
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface CameraPreset {
  label: string;
  position: [number, number, number];
  target: [number, number, number];
}

/** 標準視点（身長1.65mを想定、target はモデル中央） */
export const CAMERA_PRESETS: Record<string, CameraPreset> = {
  front: { label: '正面', position: [0, 1.0, 2.6], target: [0, 0.95, 0] },
  back: { label: '背面', position: [0, 1.0, -2.6], target: [0, 0.95, 0] },
  left: { label: '左側面', position: [2.6, 1.0, 0], target: [0, 0.95, 0] },
  right: { label: '右側面', position: [-2.6, 1.0, 0], target: [0, 0.95, 0] },
  obliqueL: { label: '左斜め', position: [1.8, 1.1, 1.8], target: [0, 0.95, 0] },
  obliqueR: { label: '右斜め', position: [-1.8, 1.1, 1.8], target: [0, 0.95, 0] },
  top: { label: '真上', position: [0, 3.4, 0.01], target: [0, 0.9, 0] },
  bottom: { label: '真下', position: [0, -0.6, 1.4], target: [0, 0.9, 0] },
  face: { label: '顔アップ', position: [0, 1.56, 0.7], target: [0, 1.55, 0] },
  chest: { label: '胸部（医療標準）', position: [0, 1.25, 1.0], target: [0, 1.22, 0] },
  genital: { label: '外陰部（医療標準）', position: [0, 0.72, 0.8], target: [0, 0.78, 0] },
};

export class Viewport {
  renderer: THREE.WebGLRenderer | null = null;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls | null = null;
  canvas: HTMLCanvasElement;
  onSelect: ((partId: string | null) => void) | null = null;
  onPickPoint: ((point: THREE.Vector3) => void) | null = null;
  pickMode = false;
  private bodyGroup: THREE.Group | null = null;
  private importedModel: THREE.Object3D | null = null;
  private raycaster = new THREE.Raycaster();
  private needsRender = true;
  private rafId = 0;
  private annotationGroup = new THREE.Group();
  private measureGroup = new THREE.Group();
  private disposed = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.01, 50);
    this.camera.position.set(0, 1.0, 2.6);
    this.scene.background = new THREE.Color('#2a2f38');
    this.scene.add(this.annotationGroup);
    this.scene.add(this.measureGroup);

    try {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.0;
    } catch {
      this.renderer = null;
      return;
    }

    // 照明（3点＋環境）
    const ambient = new THREE.HemisphereLight(0xffffff, 0x445566, 0.9);
    this.scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(1.5, 2.5, 2);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xccddff, 0.6);
    fill.position.set(-2, 1.2, 1.5);
    this.scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffeedd, 0.5);
    rim.position.set(0, 1.5, -2.5);
    this.scene.add(rim);

    const grid = new THREE.GridHelper(2, 20, 0x555555, 0x3a3f4a);
    grid.position.y = 0;
    this.scene.add(grid);
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(1.2, 48),
      new THREE.MeshStandardMaterial({ color: '#333944', roughness: 0.95 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.001;
    this.scene.add(floor);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.set(0, 0.95, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.minDistance = 0.05;
    this.controls.maxDistance = 10;
    this.controls.addEventListener('change', () => this.requestRender());

    canvas.addEventListener('pointerdown', this.handlePick);

    const loop = () => {
      if (this.disposed) return;
      if (this.needsRender && this.renderer) {
        this.controls?.update();
        this.renderer.render(this.scene, this.camera);
        this.needsRender = false;
      }
      this.rafId = requestAnimationFrame(loop);
    };
    loop();
  }

  get isWebGlAvailable(): boolean {
    return this.renderer !== null;
  }

  requestRender(): void {
    this.needsRender = true;
  }

  resize(width: number, height: number): void {
    if (!this.renderer) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.requestRender();
  }

  /** モデル全体を差し替える */
  setBody(group: THREE.Group): void {
    if (this.bodyGroup) {
      this.scene.remove(this.bodyGroup);
      disposeObject(this.bodyGroup);
    }
    this.bodyGroup = group;
    this.scene.add(group);
    this.requestRender();
  }

  getBody(): THREE.Group | null {
    return this.bodyGroup;
  }

  /** GLB を読み込み、参照モデルとして追加（編集モデルは置き換えない） */
  async importGlb(file: File): Promise<void> {
    const buf = await file.arrayBuffer();
    const loader = new GLTFLoader();
    const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) =>
      loader.parse(buf, '', resolve, reject),
    );
    if (this.importedModel) {
      this.scene.remove(this.importedModel);
      disposeObject(this.importedModel);
    }
    this.importedModel = gltf.scene;
    gltf.scene.traverse((o) => {
      o.userData.partId = o.userData.partId ?? 'imported';
    });
    this.scene.add(gltf.scene);
    this.requestRender();
  }

  /** GLB エクスポート（編集モデル＋読込モデル） */
  async exportGlb(): Promise<Blob> {
    if (!this.bodyGroup) throw new Error('出力対象のモデルがありません');
    const exporter = new GLTFExporter();
    const container = new THREE.Group();
    container.add(this.bodyGroup.clone());
    const result = await new Promise<ArrayBuffer | object>((resolve, reject) =>
      exporter.parse(container, resolve, reject, { binary: true }),
    );
    if (result instanceof ArrayBuffer) return new Blob([result], { type: 'model/gltf-binary' });
    return new Blob([JSON.stringify(result)], { type: 'model/gltf+json' });
  }

  applyPreset(name: string): void {
    const p = CAMERA_PRESETS[name];
    if (!p || !this.controls) return;
    this.camera.position.set(...p.position);
    this.controls.target.set(...p.target);
    this.controls.update();
    this.requestRender();
  }

  /** 部位へフォーカス */
  focusPart(partId: string): void {
    if (!this.bodyGroup || !this.controls) return;
    const box = new THREE.Box3();
    let found = false;
    this.bodyGroup.traverse((o) => {
      if (o.userData.partId === partId && (o as THREE.Mesh).isMesh) {
        box.expandByObject(o);
        found = true;
      }
    });
    if (!found || box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    const dist = Math.max(size * 2.2, 0.15);
    this.camera.position.copy(center.clone().add(dir.multiplyScalar(dist)));
    this.controls.target.copy(center);
    this.controls.update();
    this.requestRender();
  }

  getCameraState(): { position: { x: number; y: number; z: number }; target: { x: number; y: number; z: number } } {
    return {
      position: { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z },
      target: this.controls
        ? { x: this.controls.target.x, y: this.controls.target.y, z: this.controls.target.z }
        : { x: 0, y: 0.95, z: 0 },
    };
  }

  setCameraState(s: { position: { x: number; y: number; z: number }; target: { x: number; y: number; z: number } }): void {
    if (!this.controls) return;
    this.camera.position.set(s.position.x, s.position.y, s.position.z);
    this.controls.target.set(s.target.x, s.target.y, s.target.z);
    this.controls.update();
    this.requestRender();
  }

  /** 画像出力。format: png/jpeg/webp, transparent は png/webp のみ有効 */
  captureImage(opts: { width: number; height: number; format: 'png' | 'jpeg' | 'webp'; transparent: boolean; background?: string }): string {
    if (!this.renderer) throw new Error('WebGL が利用できません');
    const maxSize = 4096;
    const w = Math.min(opts.width, maxSize);
    const h = Math.min(opts.height, maxSize);
    const prevBg = this.scene.background;
    const prevAlpha = this.renderer.getClearAlpha();
    if (opts.transparent && opts.format !== 'jpeg') {
      this.scene.background = null;
      this.renderer.setClearAlpha(0);
    } else if (opts.background) {
      this.scene.background = new THREE.Color(opts.background);
    }
    this.renderer.setSize(w, h, false);
    const prevAspect = this.camera.aspect;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);
    const mime = opts.format === 'png' ? 'image/png' : opts.format === 'webp' ? 'image/webp' : 'image/jpeg';
    const dataUrl = this.canvas.toDataURL(mime, 0.92);
    this.scene.background = prevBg;
    this.renderer.setClearAlpha(prevAlpha);
    this.camera.aspect = prevAspect;
    this.camera.updateProjectionMatrix();
    this.requestRender();
    return dataUrl;
  }

  setAnnotations(annotations: { id: string; text: string; position: { x: number; y: number; z: number } }[]): void {
    clearGroup(this.annotationGroup);
    for (const a of annotations) {
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.006, 8, 6),
        new THREE.MeshBasicMaterial({ color: '#ffcc44' }),
      );
      marker.position.set(a.position.x, a.position.y, a.position.z);
      this.annotationGroup.add(marker);
    }
    this.requestRender();
  }

  setMeasurementMarkers(points: { x: number; y: number; z: number }[]): void {
    clearGroup(this.measureGroup);
    const mat = new THREE.MeshBasicMaterial({ color: '#44ccff' });
    const pts = points.map((p) => new THREE.Vector3(p.x, p.y, p.z));
    for (const p of pts) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.005, 8, 6), mat);
      m.position.copy(p);
      this.measureGroup.add(m);
    }
    if (pts.length >= 2) {
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: '#44ccff' }));
      this.measureGroup.add(line);
    }
    this.requestRender();
  }

  private handlePick = (e: PointerEvent): void => {
    if (!this.renderer) return;
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const targets: THREE.Object3D[] = [];
    this.bodyGroup?.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) targets.push(o);
    });
    const hits = this.raycaster.intersectObjects(targets, false);
    if (this.pickMode) {
      if (hits.length > 0 && this.onPickPoint) this.onPickPoint(hits[0].point.clone());
      return;
    }
    if (hits.length > 0) {
      const partId = hits[0].object.userData.partId ?? null;
      this.onSelect?.(partId);
    } else {
      this.onSelect?.(null);
    }
  };

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    this.canvas.removeEventListener('pointerdown', this.handlePick);
    this.controls?.dispose();
    if (this.bodyGroup) disposeObject(this.bodyGroup);
    this.renderer?.dispose();
  }
}

export function disposeObject(obj: THREE.Object3D): void {
  obj.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.geometry?.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[];
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    }
  });
}

function clearGroup(group: THREE.Group): void {
  while (group.children.length > 0) {
    const child = group.children[0];
    group.remove(child);
    disposeObject(child);
  }
}
