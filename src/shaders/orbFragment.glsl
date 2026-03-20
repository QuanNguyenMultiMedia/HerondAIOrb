// ============================================================
// AI Orb — Fragment Shader
// Holographic Aurora + Grain + Deep Fresnel
// ============================================================

uniform float uTime;
uniform float uVisibility;
uniform vec3  uColorA; // Cyan
uniform vec3  uColorB; // Purple/Pink
uniform vec3  uColorC; // White/Core
uniform float uFresnelPower;
uniform float uNoiseFreq;
uniform float uGrainIntensity;
uniform float uAlphaBase;
uniform float uBandRadius; // Center of the ring
uniform float uBandWidth;  // Full width of the ring
uniform float uStreakiness; // Noise stretching
uniform float uIsCore;     // 1.0 = solid, 0.0 = hollow band

varying vec3  vNormal;
varying vec3  vWorldPosition;
varying vec2  vUv;
varying float vDisplacement;
varying vec3  vLocalPosition;

// ---- Simplex 3D Noise ----
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

// Grain
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  // 1. Fresnel to hollow out the center (looks like a ring/torus)
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  vec3 n = normalize(vNormal);
  float dotVN = abs(dot(viewDir, n));
  
  // Aggressive edge highlight, but SOLID center
  float fresnel = clamp(1.0 - dotVN, 0.0001, 1.0);
  float sharpFresnel = pow(fresnel, max(uFresnelPower, 0.0001));

  // 2. Aurora Noise
  // Simplified: Use vLocalPosition for stability
  float noise1 = snoise3(vLocalPosition * uNoiseFreq + uTime * 0.4) * 0.5 + 0.5;
  float noise2 = snoise3(vLocalPosition * (uNoiseFreq * 1.5) - uTime * 0.3) * 0.5 + 0.5;
  
  // 3. Color bands
  vec3 color = mix(uColorA, uColorB, smoothstep(0.2, 0.8, noise1));
  
  // Add white aurora hotspots
  float hotspot = smoothstep(0.6, 1.0, noise2 * noise1 + sharpFresnel * 0.5);
  color = mix(color, uColorC, hotspot);

  // Boost color intensity toward edges
  color *= 1.3 + sharpFresnel * 1.5;

  // 4. Alpha logic
  float dist = length(vUv - 0.5) * 2.0; // 0 to 1 radial distance
  
  // Radial band-pass for auroras, solid for core
  float band = (uIsCore > 0.5) ? 1.0 : 
               (smoothstep(uBandRadius - uBandWidth, uBandRadius, dist) * 
                (1.0 - smoothstep(uBandRadius, uBandRadius + uBandWidth, dist)));

  // 4. Aurora "Streaks": noise stretched along the radius
  vec3 streakPos = vLocalPosition;
  streakPos.x *= uStreakiness;
  float streaks = snoise3(streakPos * 2.0 + uTime) * 0.5 + 0.5;

  float alpha = band * uAlphaBase;
  alpha *= (noise1 * 0.5 + 0.5); // Large scale clouds
  alpha *= (streaks * 0.7 + 0.3); // High frequency vertical streaks
  
  // Add Fresnel to pop the "edges" of the ribbon
  alpha *= (0.5 + sharpFresnel * 1.5);

  // Give it that heavy "diffuse" fade off
  alpha = smoothstep(0.01, 1.0, alpha);

  // 5. Heavy grainy dither
  float grain = hash(gl_FragCoord.xy * 0.1 + uTime); // Screen space grain
  
  // Increase brightness where grain hits
  color += (grain - 0.5) * uGrainIntensity * 2.0;
  
  // Dither alpha
  alpha -= (grain) * 0.3; // Poke subpixel holes in alpha
  
  // Extra layer of chunky grain mask
  alpha *= (snoise3(vWorldPosition * 100.0) * 0.5 + 0.5) > (1.0 - uGrainIntensity) ? 1.0 : 0.6;

  alpha = clamp(alpha, 0.0, 1.0) * uVisibility;

  gl_FragColor = vec4(color, alpha);
}
