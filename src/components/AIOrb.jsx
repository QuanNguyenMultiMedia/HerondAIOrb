import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useControls, folder } from 'leva'
import { MeshTransmissionMaterial } from '@react-three/drei'
import orbVertexShader from '../shaders/orbVertex.glsl?raw'
import orbFragmentShader from '../shaders/orbFragment.glsl?raw'
import SwarmLayer from './SwarmLayer'
import config from '../../ai-orb-config.json'

function GlassShell() {
  const glassRef = useRef()

  const glassConfig = useControls('Glass Lens', {
    transmission: { value: config['Glass Lens.transmission'] ?? 1.00, min: 0, max: 1 },
    thickness: { value: config['Glass Lens.thickness'] ?? 3.6, min: 0, max: 10 },
    roughness: { value: config['Glass Lens.roughness'] ?? 0.3, min: 0, max: 1 },
    ior: { value: config['Glass Lens.ior'] ?? 1.18, min: 1, max: 3 },
    chromaticAberration: { value: config['Glass Lens.chromaticAberration'] ?? 0.00, min: 0, max: 1 },
    distortion: { value: config['Glass Lens.distortion'] ?? 0.00, min: 0, max: 2 },
    distortionScale: { value: config['Glass Lens.distortionScale'] ?? 0.00, min: 0, max: 2 },
    temporalDistortion: { value: config['Glass Lens.temporalDistortion'] ?? 0.55, min: 0, max: 1 },
  })

  // The glass lens remains completely stationary to preserve the fixed refractive distortion mapping

  return (
    <mesh ref={glassRef} frustumCulled={false}>
      <sphereGeometry args={[1.8, 48, 48]} />
      <MeshTransmissionMaterial
        resolution={128}
        samples={6}
        transmissionSampler={true}
        backside={true}
        transmission={glassConfig.transmission}
        thickness={glassConfig.thickness}
        roughness={glassConfig.roughness}
        ior={glassConfig.ior}
        chromaticAberration={glassConfig.chromaticAberration}
        distortion={glassConfig.distortion}
        distortionScale={glassConfig.distortionScale}
        temporalDistortion={0.0}
        color="#ffffff"
        transparent={true}
        depthWrite={false}
        background={new THREE.Color('#000000')}
      />
    </mesh>
  )
}

const ORB_LAYERS = [
  {
    name: 'Inner Core',
    radius: 0.8,
    isCore: true,
    renderOrder: 1,
    inLens: true,
    defaultColor: "#f76b86",
    defaultFresnel: 10.0,
    defaultNoiseFreq: 0.2,
    defaultNoiseAmp: 0.35,
    defaultGrain: 1.0,
    defaultAlpha: 2.0,
    defaultTimeSpeed: 0.05
  },
  {
    name: 'Outer Aurora',
    radius: 1.2,
    isCore: false,
    renderOrder: 10,
    inLens: false,
    defaultColor: "#2661d9",
    defaultFresnel: 9.0,
    defaultNoiseFreq: 0.2,
    defaultNoiseAmp: 0.10,
    defaultGrain: 1.0,
    defaultAlpha: 2.0,
    defaultTimeSpeed: 0.05
  },
  {
    name: 'Mid Aurora A',
    radius: 1.05,
    isCore: false,
    renderOrder: 11,
    inLens: false,
    defaultColor: "#46d9ff",
    defaultFresnel: 8.0,
    defaultNoiseFreq: 0.3,
    defaultNoiseAmp: 0.15,
    defaultGrain: 0.8,
    defaultAlpha: 0.6,
    defaultTimeSpeed: 0.08
  },
  {
    name: 'Mid Aurora B',
    radius: 0.9,
    isCore: false,
    renderOrder: 12,
    inLens: false,
    defaultColor: "#9d46ff",
    defaultFresnel: 8.5,
    defaultNoiseFreq: 0.4,
    defaultNoiseAmp: 0.2,
    defaultGrain: 0.8,
    defaultAlpha: 0.5,
    defaultTimeSpeed: 0.1
  }
]

function OrbShell({
  folderName,
  radius = 1,
  defaultColor = '#00f0ff',
  defaultFresnel = 2.5,
  defaultNoiseFreq = 1.0,
  defaultNoiseAmp = 0.5,
  defaultGrain = 0.4,
  defaultAlpha = 1.0,
  defaultTimeSpeed = 0.05,
  visibility = 1.0,
  rotationSpeedX = 0.05,
  rotationSpeedY = 0.1,
  rotationSpeedZ = 0.0,
  rotationX = 0.0,
  rotationY = 0.0,
  rotationZ = 0.0,
  rotationSpeed = 0.5,
  scale = 1.0,
  positionOffset = [0, 0, 0],
  renderOrder = 1,
  isCore = false
}) {
  const meshRef = useRef()
  const materialRef = useRef()

  const controls = useControls(folderName, {
    colorA: config[`${folderName}.colorA`] ?? defaultColor,
    colorB: config[`${folderName}.colorB`] ?? defaultColor,
    colorC: config[`${folderName}.colorC`] ?? "#ffffff",
    fresnelPower: { value: config[`${folderName}.fresnelPower`] ?? defaultFresnel, min: 0, max: 10, step: 0.1 },
    noiseFreq: { value: config[`${folderName}.noiseFreq`] ?? defaultNoiseFreq, min: 0, max: 5, step: 0.1 },
    noiseAmp: { value: config[`${folderName}.noiseAmp`] ?? defaultNoiseAmp, min: 0, max: 2, step: 0.05 },
    grainIntensity: { value: config[`${folderName}.grainIntensity`] ?? defaultGrain, min: 0, max: 1, step: 0.05 },
    alphaBase: { value: config[`${folderName}.alphaBase`] ?? defaultAlpha, min: 0, max: 2, step: 0.1 },
    timeSpeed: { value: config[`${folderName}.timeSpeed`] ?? defaultTimeSpeed, min: 0, max: 2, step: 0.05 },
    bandRadius: { value: config[`${folderName}.bandRadius`] ?? 0.7, min: 0.1, max: 1.0, step: 0.01 },
    bandWidth: { value: config[`${folderName}.bandWidth`] ?? 0.15, min: 0.01, max: 0.5, step: 0.01 },
    streakiness: { value: config[`${folderName}.streakiness`] ?? 8.0, min: 1, max: 20, step: 1 },
    layerScale: { value: config[`${folderName}.layerScale`] ?? 1.0, min: 0.1, max: 3, step: 0.05 },
    layerOffsetX: { value: config[`${folderName}.layerOffsetX`] ?? 0, min: -2, max: 2, step: 0.01 },
    layerOffsetY: { value: config[`${folderName}.layerOffsetY`] ?? 0, min: -2, max: 2, step: 0.01 },
    layerOffsetZ: { value: config[`${folderName}.layerOffsetZ`] ?? 0, min: -2, max: 2, step: 0.01 },
  })

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uVisibility: { value: visibility },
      uColorA: { value: new THREE.Color() },
      uColorB: { value: new THREE.Color() },
      uColorC: { value: new THREE.Color() },
      uFresnelPower: { value: 0 },
      uNoiseFreq: { value: 0 },
      uNoiseAmp: { value: 0 },
      uGrainIntensity: { value: 0 },
      uAlphaBase: { value: 0 },
      uBandRadius: { value: 0.8 },
      uBandWidth: { value: 0.2 },
      uStreakiness: { value: 5.0 },
      uIsCore: { value: isCore ? 1.0 : 0.0 },
    }),
    [] 
  )

  useFrame(({ clock }) => {
    // Early exit if the layer is completely invisible per config
    if (controls.alphaBase <= 0 && visibility <= 0.01) {
      if (meshRef.current) meshRef.current.visible = false;
      return;
    }
    if (meshRef.current) meshRef.current.visible = true;

    if (materialRef.current) {
      materialRef.current.uniforms.uColorA.value.set(controls.colorA)
      materialRef.current.uniforms.uColorB.value.set(controls.colorB)
      materialRef.current.uniforms.uColorC.value.set(controls.colorC)
      materialRef.current.uniforms.uFresnelPower.value = controls.fresnelPower
      materialRef.current.uniforms.uNoiseFreq.value = controls.noiseFreq
      materialRef.current.uniforms.uNoiseAmp.value = controls.noiseAmp
      materialRef.current.uniforms.uGrainIntensity.value = controls.grainIntensity
      materialRef.current.uniforms.uAlphaBase.value = controls.alphaBase
      materialRef.current.uniforms.uBandRadius.value = controls.bandRadius
      materialRef.current.uniforms.uBandWidth.value = controls.bandWidth
      materialRef.current.uniforms.uStreakiness.value = controls.streakiness
      materialRef.current.uniforms.uIsCore.value = isCore ? 1.0 : 0.0

      materialRef.current.uniforms.uTime.value = clock.elapsedTime * controls.timeSpeed
      
      const current = materialRef.current.uniforms.uVisibility.value
      materialRef.current.uniforms.uVisibility.value +=
        (visibility - current) * 0.04
    }
    if (meshRef.current) {
        const qBase = new THREE.Quaternion().setFromEuler(new THREE.Euler(rotationX, rotationY, rotationZ, 'YXZ'));
        const qInitial = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
        
        const qAnimX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), clock.elapsedTime * rotationSpeedX * rotationSpeed);
        const qAnimY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), clock.elapsedTime * rotationSpeedY * rotationSpeed);
        const qAnimZ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), clock.elapsedTime * rotationSpeedZ * rotationSpeed);
        
        const finalQ = new THREE.Quaternion()
            .multiplyQuaternions(qAnimZ, qAnimY)
            .multiply(qAnimX)
            .multiply(qBase)
            .multiply(qInitial);
            
        meshRef.current.quaternion.copy(finalQ);
        
        const finalScale = scale * controls.layerScale;
        meshRef.current.scale.setScalar(finalScale);
        
        meshRef.current.position.set(
            positionOffset[0] + controls.layerOffsetX, 
            positionOffset[1] + controls.layerOffsetY, 
            positionOffset[2] + controls.layerOffsetZ
        );
    }
  })

  return (
    <mesh ref={meshRef} renderOrder={renderOrder} rotation-x={Math.PI / 2} frustumCulled={false}>
      <cylinderGeometry args={[radius, radius, 0.04, 80]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={orbVertexShader}
        fragmentShader={orbFragmentShader}
        uniforms={uniforms}
        transparent={false}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.FrontSide}
        depthTest={false}
      />
    </mesh>
  )
}

export default function AIOrb({ visibility = 1.0, position = [0, 0, 0] }) {
  const groupRef = useRef()

  const transformConfig = useControls('Transform', {
    positionX: { value: config['Transform.positionX'] ?? 0.0, min: -10, max: 10, step: 0.1 },
    positionY: { value: config['Transform.positionY'] ?? 0.0, min: -10, max: 10, step: 0.1 },
    positionZ: { value: config['Transform.positionZ'] ?? 0.0, min: -10, max: 10, step: 0.1 },
    rotationSpeedX: { value: config['Transform.rotationSpeedX'] ?? 0.05, min: 0, max: 1, step: 0.01 },
    rotationSpeedY: { value: config['Transform.rotationSpeedY'] ?? 0.1, min: 0, max: 1, step: 0.01 },
    rotationSpeedZ: { value: config['Transform.rotationSpeedZ'] ?? 0.0, min: 0, max: 1, step: 0.01 },
    rotationX: { value: config['Transform.rotationX'] ?? 0.0, min: -Math.PI, max: Math.PI, step: 0.01 },
    rotationY: { value: config['Transform.rotationY'] ?? 0.0, min: -Math.PI, max: Math.PI, step: 0.01 },
    rotationZ: { value: config['Transform.rotationZ'] ?? 0.0, min: -Math.PI, max: Math.PI, step: 0.01 },
    rotationSpeed: { value: config['Transform.rotationSpeed'] ?? 0.5, min: 0, max: 5, step: 0.01 },
    scale: { value: config['Transform.scale'] ?? 1.0, min: 0.1, max: 5, step: 0.1 },
    artworkSize: { value: config['Transform.artworkSize'] ?? 1.0, min: 0.1, max: 3, step: 0.05 },
  })

  return (
    <group ref={groupRef} scale={transformConfig.artworkSize}>
      {/* 1. Refracted Layers (Inside Lens) */}
      <group position={[transformConfig.positionX, transformConfig.positionY, transformConfig.positionZ]}>
        {/* Core Black Backdrop to prevent transparent/colored background bleed */}
        <mesh renderOrder={0}>
          <sphereGeometry args={[1.75, 48, 48]} />
          <meshBasicMaterial color="#000000" side={THREE.BackSide} depthWrite={false} />
        </mesh>

        {ORB_LAYERS.filter(l => l.inLens).map(layer => (
          <OrbShell
            key={layer.name}
            folderName={layer.name}
            radius={layer.radius}
            defaultColor={layer.defaultColor}
            defaultFresnel={layer.defaultFresnel}
            defaultNoiseFreq={layer.defaultNoiseFreq}
            defaultNoiseAmp={layer.defaultNoiseAmp}
            defaultGrain={layer.defaultGrain}
            defaultAlpha={layer.defaultAlpha}
            defaultTimeSpeed={layer.defaultTimeSpeed}
            visibility={visibility}
            rotationSpeedX={transformConfig.rotationSpeedX}
            rotationSpeedY={transformConfig.rotationSpeedY}
            rotationSpeedZ={transformConfig.rotationSpeedZ}
            rotationX={transformConfig.rotationX}
            rotationY={transformConfig.rotationY}
            rotationZ={transformConfig.rotationZ}
            rotationSpeed={transformConfig.rotationSpeed}
            scale={transformConfig.scale}
            renderOrder={layer.renderOrder}
            isCore={layer.isCore}
          />
        ))}
        {/* Swarm Layer (Inside lens for refraction) */}
        <SwarmLayer visibility={visibility} radius={0.8} />
      </group>

      {/* 2. Glass Lens Layer */}
      <GlassShell />

      {/* 3. Non-Refracted Layers (Above Lens) */}
      <group position={[transformConfig.positionX, transformConfig.positionY, transformConfig.positionZ]}>
        {ORB_LAYERS.filter(l => !l.inLens).map(layer => (
          <OrbShell
            key={layer.name}
            folderName={layer.name}
            radius={layer.radius}
            defaultColor={layer.defaultColor}
            defaultFresnel={layer.defaultFresnel}
            defaultNoiseFreq={layer.defaultNoiseFreq}
            defaultNoiseAmp={layer.defaultNoiseAmp}
            defaultGrain={layer.defaultGrain}
            defaultAlpha={layer.defaultAlpha}
            defaultTimeSpeed={layer.defaultTimeSpeed}
            visibility={visibility}
            rotationSpeedX={transformConfig.rotationSpeedX}
            rotationSpeedY={transformConfig.rotationSpeedY}
            rotationSpeedZ={transformConfig.rotationSpeedZ}
            rotationX={transformConfig.rotationX}
            rotationY={transformConfig.rotationY}
            rotationZ={transformConfig.rotationZ}
            rotationSpeed={transformConfig.rotationSpeed}
            scale={transformConfig.scale}
            renderOrder={layer.renderOrder}
            isCore={layer.isCore}
          />
        ))}
      </group>
    </group>
  )
}
