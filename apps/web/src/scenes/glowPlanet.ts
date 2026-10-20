import * as THREE from "three";
import {
  BERGAMOT_PLANET_PALETTE,
  OBSIDIAN_PLANET_PALETTE,
  attachBandAdvection,
  createGlowMaterial,
  createPlanetSurfaceTexture,
  createSoftDotTexture,
  type PlanetPalette,
} from "./celestialBodies";
import { ORBIT_PLANET_RADIUS } from "./fileOrbitLayout";
import type { Disposable } from "./sceneStage";

export type PlanetTheme = "bergamot" | "obsidian";

export type GlowPlanet = {
  group: THREE.Group;
  haloColor: THREE.Color;
  update: (elapsedSeconds: number, motionScale: number, haloBoost: number) => void;
};

type PlanetStyle = {
  palette: PlanetPalette;
  seed: number;
  halo: string;
  rim: string;
  emissive: number;
  glowOpacity: number;
};

const PLANET_STYLES: Record<PlanetTheme, PlanetStyle> = {
  bergamot: { palette: BERGAMOT_PLANET_PALETTE, seed: 3.1, halo: "#e87a2e", rim: "#ffd7af", emissive: 0.22, glowOpacity: 0.45 },
  obsidian: { palette: OBSIDIAN_PLANET_PALETTE, seed: 7.3, halo: "#06b6d4", rim: "#64dcff", emissive: 0.06, glowOpacity: 0.16 },
};
const HALO_STRENGTH = 0.75;

export function createGlowPlanet(theme: PlanetTheme, disposables: Disposable[]): GlowPlanet {
  const planetStyle = PLANET_STYLES[theme];
  const surfaceTexture = createPlanetSurfaceTexture(planetStyle.palette, planetStyle.seed);
  const surfaceGeometry = new THREE.SphereGeometry(ORBIT_PLANET_RADIUS, 96, 96);
  const surfaceMaterial = new THREE.MeshStandardMaterial({
    map: surfaceTexture,
    emissive: "#ffffff",
    emissiveMap: surfaceTexture,
    emissiveIntensity: planetStyle.emissive,
    roughness: 0.85,
  });
  const bandTime = attachBandAdvection(surfaceMaterial);
  const haloColor = new THREE.Color(planetStyle.halo);
  const rimMaterial = createGlowMaterial("rim", planetStyle.rim, 0.85);
  const haloMaterial = createGlowMaterial("halo", haloColor, HALO_STRENGTH);
  haloMaterial.uniforms.glowColor.value = haloColor;
  const glowTexture = createSoftDotTexture();
  const glowMaterial = new THREE.SpriteMaterial({
    map: glowTexture,
    color: haloColor,
    transparent: true,
    opacity: planetStyle.glowOpacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  disposables.push(surfaceTexture, surfaceGeometry, surfaceMaterial, rimMaterial, haloMaterial, glowTexture, glowMaterial);

  const rim = new THREE.Mesh(surfaceGeometry, rimMaterial);
  rim.scale.setScalar(1.004);
  const halo = new THREE.Mesh(surfaceGeometry, haloMaterial);
  halo.scale.setScalar(1.24);
  const body = new THREE.Group();
  body.rotation.z = 0.42;
  body.add(new THREE.Mesh(surfaceGeometry, surfaceMaterial), rim, halo);
  const glow = new THREE.Sprite(glowMaterial);
  glow.scale.setScalar(5.4);
  glow.position.z = -0.6;
  const group = new THREE.Group();
  group.add(glow, body);

  return {
    group,
    haloColor,
    update: (elapsedSeconds, motionScale, haloBoost) => {
      bandTime.value = elapsedSeconds * motionScale;
      const haloWave = 1 - 0.08 * motionScale * (0.5 + 0.5 * Math.sin(elapsedSeconds * 0.7));
      haloMaterial.uniforms.glowIntensity.value = HALO_STRENGTH * haloWave * haloBoost;
      glowMaterial.color.copy(haloColor);
    },
  };
}
