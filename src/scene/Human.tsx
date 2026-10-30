import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import { Group, MeshStandardMaterial } from 'three'
import { sound } from '../audio/sound'
import { glow } from './materials'

export type HumanRole = 'monk' | 'guest' | 'dancer' | 'office'

interface HumanProps {
  pos: [number, number, number]
  role: HumanRole
  rot?: number
  name?: string
  skinTone?: string
  shirtColor?: string
  pantsColor?: string
  action?: 'bow' | 'eat' | 'dance' | 'type' | 'idle'
}

/**
 * 3D Chibi Human Model (Phong cách Chibi cách điệu từ my-office)
 * Có đầu tóc, khuôn mặt, biểu cảm, thân áo, quần, giày, cử động IK tay và đầu
 */
export function ChibiHuman({
  pos,
  role,
  rot = 0,
  skinTone = '#F7CBAA',
  shirtColor = '#2563EB',
  pantsColor = '#1E293B',
  action = 'idle',
}: HumanProps) {
  const rootRef = useRef<Group>(null)
  const headRef = useRef<Group>(null)
  const armLRef = useRef<Group>(null)
  const armRRef = useRef<Group>(null)
  const [greeted, setGreeted] = useState(false)

  const mats = useMemo(() => ({
    skin: new MeshStandardMaterial({ color: skinTone, roughness: 0.6 }),
    shirt: new MeshStandardMaterial({ color: shirtColor, roughness: 0.7 }),
    pants: new MeshStandardMaterial({ color: pantsColor, roughness: 0.8 }),
    shoes: new MeshStandardMaterial({ color: '#0F172A', roughness: 0.5 }),
    hairBlack: new MeshStandardMaterial({ color: '#18181B', roughness: 0.9 }),
    hairBrown: new MeshStandardMaterial({ color: '#451A03', roughness: 0.9 }),
    robeOrange: new MeshStandardMaterial({ color: '#EA580C', roughness: 0.8 }), // Y áo nâu sồng/cà sa
    robeGrey: new MeshStandardMaterial({ color: '#78716C', roughness: 0.8 }), // Áo lam phật tử
    eyes: new MeshStandardMaterial({ color: '#18181B', roughness: 0.2 }),
    beads: new MeshStandardMaterial({ color: '#78350F', roughness: 0.7 }),
    heart: glow('#EF4444', 3.0),
  }), [skinTone, shirtColor, pantsColor])

  const onClickHuman = (e: any) => {
    e.stopPropagation()
    sound.playBeep(role === 'monk' ? 520 : 660, 0.15)
    setGreeted(true)
    setTimeout(() => setGreeted(false), 2200)
  }

  useFrame((state) => {
    const t = state.clock.elapsedTime

    if (action === 'dance') {
      // Nhảy quẩy vũ trường
      if (rootRef.current) {
        rootRef.current.position.y = pos[1] + Math.abs(Math.sin(t * 6.0)) * 0.12
        rootRef.current.rotation.y = rot + Math.sin(t * 3.0) * 0.35
      }
      if (armLRef.current) armLRef.current.rotation.z = Math.sin(t * 6.0) * 0.8 + 1.2
      if (armRRef.current) armRRef.current.rotation.z = -Math.sin(t * 6.0) * 0.8 - 1.2
      if (headRef.current) headRef.current.rotation.x = Math.sin(t * 6.0) * 0.2
    } else if (action === 'bow') {
      // Phật tử lạy/chắp tay tụng kinh
      if (headRef.current) {
        headRef.current.rotation.x = Math.sin(t * 1.8) * 0.15 + 0.1
      }
      if (armLRef.current && armRRef.current) {
        armLRef.current.rotation.x = -0.7 + Math.sin(t * 1.8) * 0.05
        armRRef.current.rotation.x = -0.7 + Math.sin(t * 1.8) * 0.05
      }
    } else if (action === 'eat') {
      // Ăn mì ramen/uống cafe
      if (headRef.current) {
        headRef.current.rotation.x = Math.sin(t * 2.5) * 0.12 + 0.1
      }
      if (armRRef.current) {
        armRRef.current.rotation.x = -0.9 + Math.sin(t * 2.5) * 0.2
      }
    } else {
      // Đứng thở nhẹ nhàng
      if (headRef.current) headRef.current.rotation.y = Math.sin(t * 1.2) * 0.1
    }
  })

  const isMonk = role === 'monk'
  const isLam = role === 'monk' && shirtColor.includes('lam')

  return (
    <group ref={rootRef} position={pos} rotation-y={rot} onClick={onClickHuman}>
      {/* 1. Đôi chân & Giày */}
      {[-0.1, 0.1].map((x, i) => (
        <group key={`leg-${i}`} position={[x, 0, 0]}>
          <mesh position={[0, 0.22, 0]} castShadow>
            <capsuleGeometry args={[0.07, 0.25, 6, 12]} />
            <primitive object={isMonk ? mats.robeOrange : mats.pants} attach="material" />
          </mesh>
          <mesh position={[0, 0.05, 0.04]} castShadow>
            <boxGeometry args={[0.13, 0.08, 0.18]} />
            <primitive object={mats.shoes} attach="material" />
          </mesh>
        </group>
      ))}

      {/* 2. Thân người (Áo sơ mi/Áo lam/Áo thun) */}
      <mesh position={[0, 0.58, 0]} castShadow>
        <RoundedBox args={[0.38, 0.44, 0.24]} radius={0.06} castShadow>
          <primitive object={isMonk ? (isLam ? mats.robeGrey : mats.robeOrange) : mats.shirt} attach="material" />
        </RoundedBox>
      </mesh>

      {/* Chuỗi tràng hạt nếu là Phật tử/Nhà sư */}
      {isMonk && (
        <mesh position={[0, 0.65, 0.13]}>
          <torusGeometry args={[0.16, 0.025, 8, 20]} />
          <primitive object={mats.beads} attach="material" />
        </mesh>
      )}

      {/* 3. Đôi tay */}
      <group ref={armLRef} position={[-0.23, 0.72, 0]}>
        <mesh position={[0, -0.16, isMonk ? 0.08 : 0]} rotation-x={isMonk ? -0.5 : 0} castShadow>
          <capsuleGeometry args={[0.05, 0.22, 6, 12]} />
          <primitive object={isMonk ? mats.robeOrange : mats.shirt} attach="material" />
        </mesh>
        <mesh position={[0, -0.3, isMonk ? 0.15 : 0]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <primitive object={mats.skin} attach="material" />
        </mesh>
      </group>

      <group ref={armRRef} position={[0.23, 0.72, 0]}>
        <mesh position={[0, -0.16, isMonk ? 0.08 : 0]} rotation-x={isMonk ? -0.5 : 0} castShadow>
          <capsuleGeometry args={[0.05, 0.22, 6, 12]} />
          <primitive object={isMonk ? mats.robeOrange : mats.shirt} attach="material" />
        </mesh>
        <mesh position={[0, -0.3, isMonk ? 0.15 : 0]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <primitive object={mats.skin} attach="material" />
        </mesh>
      </group>

      {/* 4. Đầu Chibi & Tóc & Khuôn mặt */}
      <group ref={headRef} position={[0, 0.98, 0]}>
        {/* Khuôn mặt tròn Chibi dễ thương */}
        <mesh castShadow>
          <sphereGeometry args={[0.24, 18, 18]} />
          <primitive object={mats.skin} attach="material" />
        </mesh>

        {/* Tóc (Nếu không phải sư thầy cạo đầu) */}
        {!isMonk ? (
          <group position={[0, 0.08, -0.02]}>
            <mesh position={[0, 0.12, 0]} castShadow>
              <sphereGeometry args={[0.25, 16, 16, 0, Math.PI * 2, 0, Math.PI / 1.7]} />
              <primitive object={mats.hairBlack} attach="material" />
            </mesh>
            {/* Mái tóc trước trán */}
            <mesh position={[0, 0.12, 0.2]}>
              <boxGeometry args={[0.26, 0.08, 0.08]} />
              <primitive object={mats.hairBlack} attach="material" />
            </mesh>
          </group>
        ) : (
          /* Nón lá hoặc chấm giới tử trên đầu sư */
          <mesh position={[0, 0.25, 0]}>
            <coneGeometry args={[0.34, 0.14, 16]} />
            <meshStandardMaterial color="#D97706" roughness={0.9} />
          </mesh>
        )}

        {/* Đôi mắt đen to tròn Chibi */}
        {[-0.08, 0.08].map((x, i) => (
          <mesh key={`eye-${i}`} position={[x, 0.02, 0.22]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <primitive object={mats.eyes} attach="material" />
          </mesh>
        ))}

        {/* Má hồng hào */}
        {[-0.13, 0.13].map((x, i) => (
          <mesh key={`blush-${i}`} position={[x, -0.05, 0.19]}>
            <circleGeometry args={[0.035, 12]} />
            <meshBasicMaterial color="#FDA4AF" transparent opacity={0.6} />
          </mesh>
        ))}
      </group>

      {/* Biểu cảm tim hoặc lời chào khi click */}
      {greeted && (
        <group position={[0, 1.45, 0]}>
          <mesh>
            <sphereGeometry args={[0.1, 12, 12]} />
            <primitive object={mats.heart} attach="material" />
          </mesh>
        </group>
      )}
    </group>
  )
}
