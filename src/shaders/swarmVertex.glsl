uniform float uTime;
uniform float uVisibility;
uniform float uNoiseFreq;
uniform float uNoiseAmp;
uniform float uPointSize;
uniform float uDarting;
uniform vec3 uPointer;
uniform float uPointerImpact;

attribute float aOffset;
attribute float aRandom;

varying float vRandom;
varying float vOffset;
varying vec3 vColor;
varying float vDart;

// ---- Simplex 3D Noise ----
// (Keeping noise functions as is)
vec3 mod289_3(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289_4(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute_4(vec4 x) { return mod289_4(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt_4(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise3(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289_3(i);
  vec4 p = permute_4(permute_4(permute_4(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt_4(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

void main() {
  vRandom = aRandom;
  vOffset = aOffset;

  // 1. Pringles deformation
  vec3 pringlePos = position;
  pringlePos.z += (position.x * position.x - position.y * position.y) * 0.5;

  // 2. Swarm Dynamics
  // Noise-based "drift"
  vec3 noiseInput = vec3(pringlePos.xy * uNoiseFreq, uTime * 0.15 + aOffset * 2.0);
  
  float nx = snoise3(noiseInput + vec3(100.0, 0.0, 0.0));
  float ny = snoise3(noiseInput + vec3(0.0, 101.0, 0.0));
  float nz = snoise3(noiseInput + vec3(0.0, 0.0, 102.0));
  
  // "Darting" effect: Sudden bursts of movement
  vDart = pow(abs(nx), 4.0) * uDarting;
  vec3 flow = vec3(nx, ny, nz) + (normalize(vec3(nx, ny, nz)) * vDart);

  // Pointer Interaction
  vec3 toPointer = uPointer - pringlePos;
  float distToPointer = length(toPointer);
  float attRadius = 2.0;
  vec3 attraction = normalize(toPointer) * smoothstep(attRadius, 0.0, distToPointer) * uPointerImpact;
  
  vec3 swarmPos = pringlePos + (flow * uNoiseAmp + attraction) * uVisibility;

  // 3D Organic Jitter
  swarmPos.z += sin(uTime * 15.0 + aRandom * 100.0) * 0.02 * uVisibility;

  // Rotation & Scale
  vec4 worldPos = modelMatrix * vec4(swarmPos, 1.0);
  vec4 viewPos = viewMatrix * worldPos;

  // gl_PointSize attenuation
  gl_PointSize = uPointSize * (1.0 / -viewPos.z) * uVisibility;
  // Increase size during "darting"
  gl_PointSize *= (0.7 + aRandom * 0.6 + vDart * 0.5);

  gl_Position = projectionMatrix * viewPos;
}
