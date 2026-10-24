import { useEffect, useState, type RefObject } from "react";

type DisposableScene = { dispose: () => void };

export type SceneLoader<SceneHandle extends DisposableScene> = (host: HTMLElement) => Promise<SceneHandle | null>;

export function useLazyScene<SceneHandle extends DisposableScene>(
  hostRef: RefObject<HTMLElement | null>,
  loadScene: SceneLoader<SceneHandle>,
): SceneHandle | null {
  const [sceneHandle, setSceneHandle] = useState<SceneHandle | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let unmounted = false;
    let mountedScene: SceneHandle | null = null;

    loadScene(host)
      .then((loadedScene) => {
        if (!loadedScene) {
          host.dataset.webgl = "off";
          return;
        }
        if (unmounted) {
          loadedScene.dispose();
          return;
        }
        mountedScene = loadedScene;
        setSceneHandle(loadedScene);
      })
      .catch(() => {
        host.dataset.webgl = "off";
      });

    return () => {
      unmounted = true;
      mountedScene?.dispose();
      setSceneHandle(null);
    };
  }, [hostRef, loadScene]);

  return sceneHandle;
}
