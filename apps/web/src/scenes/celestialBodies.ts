import * as THREE from "three";
import type { Disposable } from "./sceneStage";

export type PlanetPalette = readonly [string, string, string, string];

export const BERGAMOT_PLANET_PALETTE: PlanetPalette = ["#682604", "#b85014", "#e87a2e", "#ffa366"];
export const OBSIDIAN_PLANET_PALETTE: PlanetPalette = ["#040507", "#0a0b0d", "#151921", "#26303d"];

const glowVertexShader = `
varying vec3 vNormal;
varying vec3 vViewDirection;
void main() {
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vViewDirection = normalize(-viewPosition.xyz);
  gl_Position = projectionMatrix * viewPosition;
}`;

const haloFragmentShader = `
uniform vec3 glowColor;
uniform float glowIntensity;
varying vec3 vNormal;
varying vec3 vViewDirection;
void main() {
  float towardCenter = clamp(-dot(vNormal, vViewDirection) * 1.6, 0.0, 1.0);
  gl_FragColor = vec4(glowColor, pow(towardCenter, 3.2) * glowIntensity);
  #include <colorspace_fragment>
}`;

const rimFragmentShader = `
uniform vec3 glowColor;
uniform float glowIntensity;
varying vec3 vNormal;
varying vec3 vViewDirection;
void main() {
  float rim = pow(1.0 - clamp(dot(vNormal, vViewDirection), 0.0, 1.0), 2.6);
  gl_FragColor = vec4(glowColor, rim * glowIntensity);
  #include <colorspace_fragment>
}`;

function hashLattice(x: number, y: number, z: number): number {
  const seeded = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return seeded - Math.floor(seeded);
}

function valueNoise(x: number, y: number, z: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const z0 = Math.floor(z);
  const fx = x - x0;
  const fy = y - y0;
  const fz = z - z0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const sz = fz * fz * (3 - 2 * fz);
  const corner = (dx: number, dy: number, dz: number) => hashLattice(x0 + dx, y0 + dy, z0 + dz);
  const bottom = THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(corner(0, 0, 0), corner(1, 0, 0), sx),
    THREE.MathUtils.lerp(corner(0, 1, 0), corner(1, 1, 0), sx),
    sy,
  );
  const top = THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(corner(0, 0, 1), corner(1, 0, 1), sx),
    THREE.MathUtils.lerp(corner(0, 1, 1), corner(1, 1, 1), sx),
    sy,
  );
  return THREE.MathUtils.lerp(bottom, top, sz);
}

function fractalNoise(x: number, y: number, z: number): number {
  let amplitude = 0.5;
  let frequency = 1;
  let total = 0;
  for (let octave = 0; octave < 5; octave += 1) {
    total += valueNoise(x * frequency, y * frequency, z * frequency) * amplitude;
    amplitude *= 0.5;
    frequency *= 2.03;
  }
  return total;
}

function samplePalette(palette: readonly THREE.Color[], position: number): THREE.Color {
  const scaled = THREE.MathUtils.clamp(position, 0, 0.999) * (palette.length - 1);
  const lowerIndex = Math.floor(scaled);
  const lower = palette[lowerIndex] ?? palette[0];
  const upper = palette[lowerIndex + 1] ?? lower;
  return lower.clone().lerp(upper, scaled - lowerIndex);
}

export function createPlanetSurfaceTexture(palette: PlanetPalette, seed: number): THREE.CanvasTexture {
  const width = 512;
  const height = 256;
  const surfaceCanvas = document.createElement("canvas");
  surfaceCanvas.width = width;
  surfaceCanvas.height = height;
  const surfaceContext = surfaceCanvas.getContext("2d");
  const paletteColors = palette.map((hex) => new THREE.Color(hex).convertLinearToSRGB());
  if (surfaceContext) {
    const pixels = surfaceContext.createImageData(width, height);
    for (let row = 0; row < height; row += 1) {
      const latitude = (row / height - 0.5) * Math.PI;
      for (let column = 0; column < width; column += 1) {
        const longitude = (column / width) * Math.PI * 2;
        const sphereX = Math.cos(latitude) * Math.cos(longitude) * 2.2 + seed;
        const sphereY = Math.sin(latitude) * 2.2;
        const sphereZ = Math.cos(latitude) * Math.sin(longitude) * 2.2;
        const turbulence = fractalNoise(sphereX, sphereY, sphereZ);
        const bands = Math.sin(latitude * 9 + turbulence * 5.5) * 0.5 + 0.5;
        const shade = samplePalette(paletteColors, 0.3 + turbulence * 0.5 + bands * 0.25);
        const pixelIndex = (row * width + column) * 4;
        pixels.data[pixelIndex] = shade.r * 255;
        pixels.data[pixelIndex + 1] = shade.g * 255;
        pixels.data[pixelIndex + 2] = shade.b * 255;
        pixels.data[pixelIndex + 3] = 255;
      }
    }
    surfaceContext.putImageData(pixels, 0, 0);
  }
  const surfaceTexture = new THREE.CanvasTexture(surfaceCanvas);
  surfaceTexture.colorSpace = THREE.SRGBColorSpace;
  surfaceTexture.wrapS = THREE.RepeatWrapping;
  return surfaceTexture;
}

export function createSoftDotTexture(): THREE.CanvasTexture {
  const dotCanvas = document.createElement("canvas");
  dotCanvas.width = 64;
  dotCanvas.height = 64;
  const dotContext = dotCanvas.getContext("2d");
  if (dotContext) {
    const falloff = dotContext.createRadialGradient(32, 32, 0, 32, 32, 32);
    falloff.addColorStop(0, "rgba(255,255,255,1)");
    falloff.addColorStop(0.35, "rgba(255,255,255,0.55)");
    falloff.addColorStop(1, "rgba(255,255,255,0)");
    dotContext.fillStyle = falloff;
    dotContext.fillRect(0, 0, 64, 64);
  }
  return new THREE.CanvasTexture(dotCanvas);
}

export function attachBandAdvection(material: THREE.MeshStandardMaterial): { value: number } {
  const bandTime = { value: 0 };
  material.onBeforeCompile = (parameters) => {
    parameters.uniforms.uBandTime = bandTime;
    parameters.vertexShader = parameters.vertexShader
      .replace("#include <uv_pars_vertex>", "#include <uv_pars_vertex>\nuniform float uBandTime;")
      .replace(
        "#include <uv_vertex>",
        `#include <uv_vertex>
        float bandLatitude = clamp(normalize(position).y, -1.0, 1.0);
        float jetSpeed = 0.008 + 0.022 * (1.0 - bandLatitude * bandLatitude);
        float bandShift = uBandTime * jetSpeed;
        #ifdef USE_MAP
          vMapUv.x += bandShift;
        #endif
        #ifdef USE_EMISSIVEMAP
          vEmissiveMapUv.x += bandShift;
        #endif`,
      );
  };
  material.customProgramCacheKey = () => "gas-band-advection";
  return bandTime;
}

export function createGlowMaterial(
  glowMode: "halo" | "rim",
  glowColor: THREE.ColorRepresentation,
  glowIntensity: number,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(glowColor) },
      glowIntensity: { value: glowIntensity },
    },
    vertexShader: glowVertexShader,
    fragmentShader: glowMode === "halo" ? haloFragmentShader : rimFragmentShader,
    transparent: true,
    depthWrite: false,
    side: glowMode === "halo" ? THREE.BackSide : THREE.FrontSide,
    blending: THREE.AdditiveBlending,
  });
}

const bergamotVertexPrelude = /* glsl */ `
uniform float uPlanetSeed;
uniform float uPlanetRadius;
uniform float uPlanetAmplitude;
varying float vBergamotHeight;
varying float vBergamotSlope;
varying vec3 vBergamotNormal;

float bergamotHash(vec3 cell) {
  cell = fract(cell * vec3(0.1031, 0.1030, 0.0973));
  cell += dot(cell, cell.yxz + 33.33);
  return fract((cell.x + cell.y) * cell.z);
}

float bergamotNoise(vec3 point) {
  vec3 cell = floor(point);
  vec3 blend = fract(point);
  blend = blend * blend * (3.0 - 2.0 * blend);
  float x0 = mix(bergamotHash(cell), bergamotHash(cell + vec3(1.0, 0.0, 0.0)), blend.x);
  float x1 = mix(bergamotHash(cell + vec3(0.0, 1.0, 0.0)), bergamotHash(cell + vec3(1.0, 1.0, 0.0)), blend.x);
  float x2 = mix(bergamotHash(cell + vec3(0.0, 0.0, 1.0)), bergamotHash(cell + vec3(1.0, 0.0, 1.0)), blend.x);
  float x3 = mix(bergamotHash(cell + vec3(0.0, 1.0, 1.0)), bergamotHash(cell + vec3(1.0, 1.0, 1.0)), blend.x);
  return mix(mix(x0, x1, blend.y), mix(x2, x3, blend.y), blend.z);
}

float bergamotFbm(vec3 point) {
  float amplitude = 0.5;
  float total = 0.0;
  for (int octave = 0; octave < 4; octave += 1) {
    total += bergamotNoise(point) * amplitude;
    point = point * 2.03 + 1.7;
    amplitude *= 0.5;
  }
  return total;
}

float bergamotCrater(vec3 direction, vec3 center, float angularRadius, float depth) {
  float unit = acos(clamp(dot(normalize(direction), normalize(center)), -1.0, 1.0)) / angularRadius;
  float bowl = smoothstep(0.72, 0.08, unit);
  float rim = exp(-pow((unit - 0.8) * 9.0, 2.0));
  float ejecta = exp(-pow((unit - 1.22) * 3.1, 2.0));
  return depth * (-bowl + rim * 0.55 + ejecta * 0.18);
}

float bergamotRelief(vec3 direction) {
  vec3 radial = normalize(direction);
  float altitude = max(length(cameraPosition - modelMatrix[3].xyz) - uPlanetRadius, 0.0);
  float detail = 1.0 - smoothstep(24.0, 140.0, altitude);
  vec3 warp = vec3(
    bergamotNoise(radial * 2.2 + uPlanetSeed),
    bergamotNoise(radial * 2.2 + uPlanetSeed + 19.0),
    bergamotNoise(radial * 2.2 + uPlanetSeed + 47.0)
  ) - 0.5;
  vec3 warped = normalize(radial + (warp - radial * dot(warp, radial)) * 0.22);
  float continental = bergamotFbm(warped * 2.4 + uPlanetSeed);
  float highlands = bergamotFbm(warped * 5.6 + uPlanetSeed);
  float ridges = 1.0 - abs(bergamotFbm(warped * 11.0 + uPlanetSeed) * 2.0 - 1.0);
  float height = (continental - 0.48) * 0.62;
  height += (highlands - 0.5) * 0.28 * detail;
  height += (ridges - 0.35) * 0.4 * detail;
  height += bergamotCrater(warped, vec3(0.15, 0.78, 0.60), 0.055, 0.55) * detail;
  height += bergamotCrater(warped, vec3(-0.62, 0.55, 0.56), 0.085, 0.70) * detail;
  height += bergamotCrater(warped, vec3(0.48, 0.64, 0.42), 0.032, 0.40) * detail;
  float pad = smoothstep(0.11, 0.045, length(radial - vec3(0.0, 1.0, 0.0)));
  return height * (1.0 - pad);
}
`;

export function createBergamotGroundMaterial(planetRadius: number): THREE.MeshStandardMaterial {
  const query = new URLSearchParams(window.location.search);
  const seedParam = query.get("planetSeed");
  const fieldParam = query.get("planetField");
  const parsedSeed = Number(seedParam);
  const parsedField = Number(fieldParam);
  const seed = seedParam !== null && Number.isFinite(parsedSeed) ? parsedSeed : 11.7;
  const field = fieldParam !== null && Number.isFinite(parsedField) ? parsedField : 0;
  const amplitude = query.has("planetExaggerate") ? 6.5 : 2.8;
  const basin = new THREE.Color("#682604");
  const plain = new THREE.Color("#b85014");
  const dust = new THREE.Color("#e87a2e");
  const rock = new THREE.Color("#4a2414");
  const material = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.84, metalness: 0.02 });
  material.customProgramCacheKey = () => "bergamot-ground";
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uPlanetSeed = { value: seed };
    shader.uniforms.uPlanetRadius = { value: planetRadius };
    shader.uniforms.uPlanetAmplitude = { value: amplitude };
    shader.uniforms.uPlanetField = { value: field };
    shader.uniforms.uBasinColor = { value: basin };
    shader.uniforms.uPlainColor = { value: plain };
    shader.uniforms.uDustColor = { value: dust };
    shader.uniforms.uRockColor = { value: rock };
    shader.vertexShader = bergamotVertexPrelude + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <beginnormal_vertex>",
      `
      vec3 bergamotRadial = normalize(position);
      float bergamotHeight = bergamotRelief(bergamotRadial);
      vec3 bergamotTangent = normalize(cross(bergamotRadial, abs(bergamotRadial.y) > 0.96 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0)));
      vec3 bergamotBitangent = cross(bergamotRadial, bergamotTangent);
      float bergamotStep = 0.012;
      float bergamotRight = bergamotRelief(normalize(bergamotRadial + bergamotTangent * bergamotStep));
      float bergamotForward = bergamotRelief(normalize(bergamotRadial + bergamotBitangent * bergamotStep));
      vec3 bergamotPoint = bergamotRadial * (uPlanetRadius + bergamotHeight * uPlanetAmplitude);
      vec3 bergamotPointRight = normalize(bergamotRadial + bergamotTangent * bergamotStep) * (uPlanetRadius + bergamotRight * uPlanetAmplitude);
      vec3 bergamotPointForward = normalize(bergamotRadial + bergamotBitangent * bergamotStep) * (uPlanetRadius + bergamotForward * uPlanetAmplitude);
      vec3 objectNormal = normalize(cross(bergamotPointRight - bergamotPoint, bergamotPointForward - bergamotPoint));
      vBergamotHeight = bergamotHeight;
      vBergamotSlope = 1.0 - abs(dot(normalize(objectNormal), bergamotRadial));
      vBergamotNormal = normalize(objectNormal);
      `,
    );
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "vec3 transformed = bergamotPoint;");
    shader.fragmentShader =
      `
      uniform float uPlanetField;
      uniform vec3 uBasinColor;
      uniform vec3 uPlainColor;
      uniform vec3 uDustColor;
      uniform vec3 uRockColor;
      varying float vBergamotHeight;
      varying float vBergamotSlope;
      varying vec3 vBergamotNormal;
      ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `
      #include <color_fragment>
      float bergamotShade = clamp(vBergamotHeight * 0.85 + 0.45, 0.0, 1.0);
      vec3 bergamotAlbedo = mix(uBasinColor, uPlainColor, smoothstep(0.18, 0.48, bergamotShade));
      bergamotAlbedo = mix(bergamotAlbedo, uDustColor, smoothstep(0.5, 0.82, bergamotShade));
      bergamotAlbedo = mix(bergamotAlbedo, uRockColor, clamp(vBergamotSlope * 1.6, 0.0, 1.0));
      diffuseColor.rgb *= bergamotAlbedo;
      `,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <roughnessmap_fragment>",
      `
      #include <roughnessmap_fragment>
      roughnessFactor = mix(0.94, 0.62, clamp(vBergamotHeight * 0.5 + 0.5, 0.0, 1.0));
      roughnessFactor = mix(roughnessFactor, 0.84, clamp(vBergamotSlope, 0.0, 1.0));
      `,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      `
      #include <opaque_fragment>
      if (uPlanetField > 0.5) {
        vec3 fieldColor = vec3(clamp(vBergamotHeight * 0.5 + 0.5, 0.0, 1.0));
        if (uPlanetField >= 1.5 && uPlanetField < 2.5) fieldColor = vec3(clamp(vBergamotSlope, 0.0, 1.0));
        if (uPlanetField >= 2.5 && uPlanetField < 3.5) fieldColor = vBergamotNormal * 0.5 + 0.5;
        if (uPlanetField >= 3.5) fieldColor = diffuseColor.rgb;
        gl_FragColor.rgb = fieldColor;
      }
      `,
    );
  };
  return material;
}

export function createStarField(
  disposables: Disposable[],
  starCount: number,
  innerRadius: number,
  outerRadius: number,
): THREE.Points {
  const starPositions = new Float32Array(starCount * 3);
  const starDirection = new THREE.Vector3();
  for (let starIndex = 0; starIndex < starCount; starIndex += 1) {
    starDirection.randomDirection().multiplyScalar(THREE.MathUtils.lerp(innerRadius, outerRadius, Math.random()));
    starPositions.set([starDirection.x, starDirection.y, starDirection.z], starIndex * 3);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  const starTexture = createSoftDotTexture();
  const starMaterial = new THREE.PointsMaterial({
    color: 0xe5e1e4,
    map: starTexture,
    size: innerRadius * 0.012,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  disposables.push(starGeometry, starMaterial, starTexture);
  return new THREE.Points(starGeometry, starMaterial);
}
