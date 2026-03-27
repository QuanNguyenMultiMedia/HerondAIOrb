uniform float uTime;
uniform float uVisibility;
uniform vec3 uColorA; // #f76b86 Soft Rose
uniform vec3 uColorB; // #2661d9 Electric Blue

varying float vRandom;
varying float vOffset;
varying float vDart;

void main() {
  // Circular mask
  float r = length(gl_PointCoord - 0.5);
  if (r > 0.5) discard;
  
  float alpha = smoothstep(0.5, 0.4, r);

  // Gradual color shift based on time and individual offset
  float t = sin(uTime * 0.5 + vOffset * 10.0) * 0.5 + 0.5;
  vec3 baseColor = mix(uColorA, uColorB, t);

  // Add a bit of glow effect
  float glow = max(0.0, 1.0 - r * 2.0);
  
  // Darting brightness: Increase intensity when the dot "dashes"
  vec3 color = baseColor * (1.1 + glow * 1.5 + vDart * 5.0);

  // Final alpha with some flicker based on darting and random
  float flicker = 0.8 + 0.2 * sin(uTime * 20.0 + vRandom * 10.0);
  gl_FragColor = vec4(color, alpha * uVisibility * flicker);
}
