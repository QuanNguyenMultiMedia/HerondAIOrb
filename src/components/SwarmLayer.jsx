import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useControls } from 'leva'
import config from '../../ai-orb-config.json'
import swarmVertexShader from '../shaders/swarmVertex.glsl?raw'
import swarmFragmentShader from '../shaders/swarmFragment.glsl?raw'

export default function SwarmLayer({ count = 5000, radius = 1.2, visibility = 1.0 }) {
  const meshRef = useRef()
  const materialRef = useRef()

  const { swarmDensity, swarmSize, swarmSpeed, swarmNoiseFreq, swarmNoiseAmp, swarmDarting } = useControls('Swarm', {
    swarmDensity: { value: config['Swarm.swarmDensity'] ?? count, min: 100, max: 10000, step: 100 },
    swarmSize: { value: config['Swarm.swarmSize'] ?? 20.0, min: 1, max: 100, step: 1 },
    swarmSpeed: { value: config['Swarm.swarmSpeed'] ?? 0.5, min: 0, max: 2, step: 0.05 },
    swarmNoiseFreq: { value: config['Swarm.swarmNoiseFreq'] ?? 0.5, min: 0, max: 2, step: 0.1 },
    swarmNoiseAmp: { value: config['Swarm.swarmNoiseAmp'] ?? 0.2, min: 0, max: 1, step: 0.05 },
    swarmDarting: { value: config['Swarm.swarmDarting'] ?? 1.0, min: 0, max: 5, step: 0.1 },
  })

  const { positions, offsets, randoms } = useMemo(() => {
    const pos = new Float32Array(swarmDensity * 3)
    const off = new Float32Array(swarmDensity)
    const rnd = new Float32Array(swarmDensity)

    for (let i = 0; i < swarmDensity; i++) {
      // Uniform distribution on a disk
      const r = Math.sqrt(Math.random()) * radius
      const theta = Math.random() * Math.PI * 2
      
      pos[i * 3] = r * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(theta)
      pos[i * 3 + 2] = 0 // Will be deformed in shader

      off[i] = Math.random() * Math.PI * 2
      rnd[i] = Math.random()
    }

    return { 
      positions: pos, 
      offsets: off, 
      randoms: rnd 
    }
  }, [swarmDensity, radius])

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uVisibility: { value: visibility },
    uPointSize: { value: 20 },
    uNoiseFreq: { value: 0.5 },
    uNoiseAmp: { value: 0.2 },
    uDarting: { value: 1.0 },
    uPointer: { value: new THREE.Vector3(0, 0, 0) },
    uPointerImpact: { value: 0 },
    uColorA: { value: new THREE.Color('#f76b86') },
    uColorB: { value: new THREE.Color('#2661d9') },
  }), [])

  useFrame(({ clock, pointer }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.elapsedTime * swarmSpeed
      materialRef.current.uniforms.uVisibility.value = visibility
      materialRef.current.uniforms.uPointSize.value = swarmSize
      materialRef.current.uniforms.uNoiseFreq.value = swarmNoiseFreq
      materialRef.current.uniforms.uNoiseAmp.value = swarmNoiseAmp
      materialRef.current.uniforms.uDarting.value = swarmDarting

      // Map 2D pointer to a 3D circle on the orb
      // Pointer is [-1, 1], we map it to roughly the orb area
      const pX = pointer.x * 2.0
      const pY = pointer.y * 2.0
      materialRef.current.uniforms.uPointer.value.set(pX, pY, 0)
      
      const dist = Math.sqrt(pointer.x * pointer.x + pointer.y * pointer.y)
      const impact = Math.max(0, 1.0 - dist * 1.5) 
      materialRef.current.uniforms.uPointerImpact.value = impact
    }
  })

  return (
    <points ref={meshRef} renderOrder={15}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aOffset"
          count={offsets.length}
          array={offsets}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          count={randoms.length}
          array={randoms}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={swarmVertexShader}
        fragmentShader={swarmFragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        depthTest={false}
      />
    </points>
  )
}
