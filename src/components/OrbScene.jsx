import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing'
import { OrbitControls, Environment, Stats } from '@react-three/drei'
import { useControls, folder } from 'leva'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import AIOrb from './AIOrb'
import config from '../../ai-orb-config.json'

function ResponsiveOrb({ visibility, margin }) {
  const { size } = useThree()
  // Fixed standard visible height at Z=4.5 with FOV=50
  const visibleHeightAtDefaultZ = 2 * 4.5 * Math.tan(THREE.MathUtils.degToRad(50 / 2))
  
  const minDim = Math.min(size.width, size.height)
  // Ensure we don't scale to negative if margin is too large
  const targetPixels = Math.max(minDim - 2 * margin, 1)
  
  // Base scale calculation to fit the 4.2 bounding size to the target pixels
  const scale = (targetPixels * visibleHeightAtDefaultZ) / (4.2 * size.height)

  return (
    <group scale={scale}>
      <AIOrb visibility={visibility} />
    </group>
  )
}

export default function OrbScene({ visibility = 1.0, margin = 64 }) {
  const {
    bloomIntensity,
    bloomRadius,
    caOffset,
    caModulation,
    ambientIntensity,
    point1Intensity,
    point2Intensity,
    bgColor,
    transparentBg
  } = useControls('Post Processing & Lights', {
    bloomIntensity: { value: config['Post Processing & Lights.bloomIntensity'] ?? 0.0, min: 0, max: 5, step: 0.1 },
    bloomRadius: { value: config['Post Processing & Lights.bloomRadius'] ?? 0.0, min: 0, max: 2, step: 0.05 },
    caOffset: { value: config['Post Processing & Lights.caOffset'] ?? 0.0, min: 0, max: 0.05, step: 0.001 },
    caModulation: { value: config['Post Processing & Lights.caModulation'] ?? 0.0, min: 0, max: 2, step: 0.1 },
    ambientIntensity: { value: config['Post Processing & Lights.ambientIntensity'] ?? 0.15, min: 0, max: 1, step: 0.05 },
    point1Intensity: { value: config['Post Processing & Lights.point1Intensity'] ?? 0.4, min: 0, max: 2, step: 0.1 },
    point2Intensity: { value: config['Post Processing & Lights.point2Intensity'] ?? 0.1, min: 0, max: 2, step: 0.1 },
    bgColor: { value: config['Post Processing & Lights.bgColor'] ?? '#050505' },
    transparentBg: { value: config['Post Processing & Lights.transparentBg'] ?? false },
  })

  return (
    <Canvas
      camera={{ position: [0, 0, 4.5], fov: 50 }}
      performance={{ min: 0.5 }}
      gl={{
        alpha: true, // Crucial for transparent backgrounds
        antialias: false, 
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.5,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
    >
      {!transparentBg && <color attach="background" args={[bgColor]} />}
      
      <ambientLight intensity={ambientIntensity} />
      <pointLight position={[5, 5, 5]} intensity={point1Intensity} color="#4f8ef7" />
      <pointLight position={[-5, -3, 3]} intensity={point2Intensity} color="#f76b86" />

      {/* Environment for glass reflections */}
      <Environment preset="city" environmentIntensity={0.5} />

      <ResponsiveOrb visibility={visibility} margin={margin} />
      <Stats />

      <EffectComposer disableNormalPass multisampling={1}>
        <Bloom
          intensity={bloomIntensity}
          luminanceThreshold={0.0}
          luminanceSmoothing={0.9}
          mipmapBlur
          radius={bloomRadius}
        />
        <ChromaticAberration
          offset={[caOffset, caOffset]}
          radialModulation={true}
          modulationOffset={caModulation}
        />
      </EffectComposer>

      <OrbitControls
        enableZoom={true}
        enablePan={false}
        enableRotate={false}
        minDistance={2.5}
        maxDistance={8}
        autoRotate={false}
        autoRotateSpeed={0.5}
      />
    </Canvas>
  )
}
