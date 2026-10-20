import * as THREE from "three";

export type Disposable = { dispose: () => void };

export type FrameCallback = (deltaSeconds: number, elapsedSeconds: number) => void;

export type SceneStage = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  disposables: Disposable[];
  prefersReducedMotion: boolean;
  aspect: () => number;
  start: (onFrame: FrameCallback) => void;
  dispose: () => void;
};

export function createSceneStage(host: HTMLElement, fieldOfView: number): SceneStage | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.localClippingEnabled = true;
  renderer.domElement.style.display = "block";
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fieldOfView, 1, 0.1, 600);
  const disposables: Disposable[] = [];
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let hostVisible = true;

  const resizeObserver = new ResizeObserver(() => {
    if (host.clientWidth === 0 || host.clientHeight === 0) return;
    renderer.setSize(host.clientWidth, host.clientHeight);
    camera.aspect = host.clientWidth / host.clientHeight;
    camera.updateProjectionMatrix();
  });
  resizeObserver.observe(host);

  const visibilityObserver = new IntersectionObserver(([hostEntry]) => {
    hostVisible = hostEntry?.isIntersecting ?? true;
  });
  visibilityObserver.observe(host);

  const timer = new THREE.Timer();

  return {
    scene,
    camera,
    disposables,
    prefersReducedMotion,
    aspect: () => camera.aspect,
    start: (onFrame) => {
      renderer.setAnimationLoop((timestamp: number) => {
        timer.update(timestamp);
        if (!hostVisible) return;
        onFrame(Math.min(timer.getDelta(), 0.1), timer.getElapsed());
        renderer.render(scene, camera);
      });
    },
    dispose: () => {
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      disposables.forEach((disposable) => disposable.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
