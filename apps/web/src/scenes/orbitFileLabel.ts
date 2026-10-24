import * as THREE from "three";
import type { Disposable } from "./sceneStage";

export type FileLabelTone = "plain" | "sealed" | "node";

const LABEL_FONT = "500 38px 'JetBrains Mono', ui-monospace, Menlo, monospace";
const LABEL_CANVAS_HEIGHT = 88;

const LABEL_TONES: Record<FileLabelTone, { fill: string; stroke: string; dot: string; ink: string }> = {
  plain: { fill: "rgba(28, 27, 30, 0.94)", stroke: "rgba(68, 71, 74, 0.9)", dot: "#ffa366", ink: "#e5e1e4" },
  sealed: { fill: "rgba(22, 22, 40, 0.94)", stroke: "rgba(192, 193, 255, 0.55)", dot: "#c0c1ff", ink: "#e1e0ff" },
  node: { fill: "rgba(14, 14, 16, 0.9)", stroke: "rgba(143, 145, 148, 0.45)", dot: "#38bdf8", ink: "#c5c6c9" },
};

export function loadLabelFont(): Promise<void> {
  return document.fonts
    .load(LABEL_FONT)
    .then(() => undefined)
    .catch(() => undefined);
}

export function createFileLabelSprite(
  labelText: string,
  tone: FileLabelTone,
  worldHeight: number,
  disposables: Disposable[],
): THREE.Sprite {
  const measureContext = document.createElement("canvas").getContext("2d");
  const toneStyle = LABEL_TONES[tone];
  let textWidth = labelText.length * 23;
  if (measureContext) {
    measureContext.font = LABEL_FONT;
    textWidth = measureContext.measureText(labelText).width;
  }
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = Math.ceil(textWidth + 104);
  labelCanvas.height = LABEL_CANVAS_HEIGHT;
  const labelContext = labelCanvas.getContext("2d");
  if (labelContext) {
    labelContext.fillStyle = toneStyle.fill;
    labelContext.strokeStyle = toneStyle.stroke;
    labelContext.lineWidth = 3;
    labelContext.beginPath();
    labelContext.roundRect(3, 3, labelCanvas.width - 6, LABEL_CANVAS_HEIGHT - 6, 22);
    labelContext.fill();
    labelContext.stroke();
    labelContext.fillStyle = toneStyle.dot;
    labelContext.shadowColor = toneStyle.dot;
    labelContext.shadowBlur = 14;
    labelContext.beginPath();
    labelContext.arc(42, LABEL_CANVAS_HEIGHT / 2, 8, 0, Math.PI * 2);
    labelContext.fill();
    labelContext.shadowBlur = 0;
    labelContext.fillStyle = toneStyle.ink;
    labelContext.font = LABEL_FONT;
    labelContext.textBaseline = "middle";
    labelContext.fillText(labelText, 66, LABEL_CANVAS_HEIGHT / 2 + 2);
  }
  const labelTexture = new THREE.CanvasTexture(labelCanvas);
  labelTexture.colorSpace = THREE.SRGBColorSpace;
  labelTexture.anisotropy = 4;
  const labelMaterial = new THREE.SpriteMaterial({ map: labelTexture, transparent: true, depthWrite: false });
  disposables.push(labelTexture, labelMaterial);
  const labelSprite = new THREE.Sprite(labelMaterial);
  labelSprite.scale.set((worldHeight * labelCanvas.width) / LABEL_CANVAS_HEIGHT, worldHeight, 1);
  labelSprite.renderOrder = 10;
  return labelSprite;
}
