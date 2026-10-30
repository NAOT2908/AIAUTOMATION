import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import { Group, MeshStandardMaterial } from 'three'
import { sound } from '../audio/sound'
import { glow } from './materials'

// -------------------------------------------------------------
// 1. MÈO CÔNG SỞ VÀNG TỰ DO ĐI DẠO & TƯƠNG TÁC (PET MEOW)
// -------------------------------------------------------------
export function OfficeCat({ startPos = [0, 0, 5] }: { startPos?: [number, number, number] }) {
  const catRef = useRef<Group>(null)
  const [hearts, setHearts] = useState(false)
  const target = useRef({ x: startPos[0], z: startPos[2], angle: 0, timer: 0 })

  const mats = useMemo(() => ({
    catOrange: new MeshStandardMaterial({ color: '#F97316', roughness: 0.8 }),
    catWhite: new MeshStandardMaterial({ color: '#FFFDF7', roughness: 0.7 }),
    catPink: new MeshStandardMaterial({ color: '#F472B6', roughness: 0.5 }),
    heart: glow('#EF4444', 3.0),
  }), [])

  const onClickCat = (e: any) => {
    e.stopPropagation()
    sound.playBeep(880, 0.12)
    setHearts(true)
    setTimeout(() => setHearts(false), 2000)
  }

  useFrame((state, dt) => {
    if (!catRef.current) return
    const t = state.clock.elapsedTime
    target.current.timer += dt

    // Đổi hướng đi dạo ngẫu nhiên mỗi 4-8 giây
    if (target.current.timer > 5.5) {
      target.current.timer = 0
      const range = 6.0
      target.current.x = (Math.random() - 0.5) * range
      target.current.z = 4.0 + (Math.random() - 0.5) * range
    }

    const dx = target.current.x - catRef.current.position.x
    const dz = target.current.z - catRef.current.position.z
    const dist = Math.hypot(dx, dz)

    if (dist > 0.1) {
      const step = Math.min(dist, dt * 0.9)
      catRef.current.position.x += (dx / dist) * step
      catRef.current.position.z += (dz / dist) * step
      catRef.current.rotation.y = Math.atan2(dx, dz)
      // Nhấp nhô chân đi
      catRef.current.position.y = Math.abs(Math.sin(t * 8)) * 0.04
    } else {
      catRef.current.position.y = 0
    }
  })

  return (
    <group ref={catRef} position={startPos} onClick={onClickCat}>
      {/* Thân mèo vàng */}
      <mesh position={[0, 0.22, 0]} castShadow>
        <capsuleGeometry args={[0.13, 0.28, 6, 12]} />
        <primitive object={mats.catOrange} attach="material" />
      </mesh>
      {/* Đầu mèo */}
      <mesh position={[0, 0.36, 0.2]} castShadow>
        <sphereGeometry args={[0.14, 14, 14]} />
        <primitive object={mats.catOrange} attach="material" />
      </mesh>
      {/* Yếm ngực trắng */}
      <mesh position={[0, 0.24, 0.15]}>
        <sphereGeometry args={[0.1, 10, 10]} />
        <primitive object={mats.catWhite} attach="material" />
      </mesh>
      {/* 2 Tai mèo nhọn */}
      {[-0.08, 0.08].map((x, i) => (
        <group key={`ear-${i}`} position={[x, 0.48, 0.18]}>
          <mesh rotation-z={i === 0 ? 0.3 : -0.3} castShadow>
            <coneGeometry args={[0.045, 0.1, 4]} />
            <primitive object={mats.catOrange} attach="material" />
          </mesh>
          <mesh position={[0, 0, 0.02]} rotation-z={i === 0 ? 0.3 : -0.3}>
            <coneGeometry args={[0.025, 0.07, 4]} />
            <primitive object={mats.catPink} attach="material" />
          </mesh>
        </group>
      ))}
      {/* Mũi hồng & Mắt */}
      <mesh position={[0, 0.35, 0.33]}>
        <sphereGeometry args={[0.02, 6, 6]} />
        <primitive object={mats.catPink} attach="material" />
      </mesh>
      {/* Đuôi mèo cong cong vểnh lên */}
      <mesh position={[0, 0.32, -0.22]} rotation-x={-0.8} castShadow>
        <cylinderGeometry args={[0.03, 0.025, 0.28, 8]} />
        <primitive object={mats.catOrange} attach="material" />
      </mesh>

      {/* Tim bay lên khi vuốt ve mèo */}
      {hearts && (
        <group position={[0, 0.65, 0]}>
          <mesh>
            <sphereGeometry args={[0.08, 12, 12]} />
            <primitive object={mats.heart} attach="material" />
          </mesh>
        </group>
      )}
    </group>
  )
}

// -------------------------------------------------------------
// 2. ROBOT HÚT BỤI TỰ ĐỘNG CHẠY QUANH SÀN (VACUUM BOT)
// -------------------------------------------------------------
export function RobotVacuum() {
  const vacRef = useRef<Group>(null)
  const angle = useRef(0)

  const mats = useMemo(() => ({
    body: new MeshStandardMaterial({ color: '#1E293B', roughness: 0.3, metalness: 0.7 }),
    rim: new MeshStandardMaterial({ color: '#334155', roughness: 0.4 }),
    led: glow('#10B981', 2.5),
  }), [])

  useFrame((_, dt) => {
    if (!vacRef.current) return
    angle.current += dt * 0.45
    // Chạy theo quỹ đạo hình oval elip trong hành lang công ty
    const x = Math.sin(angle.current) * 6.5
    const z = Math.cos(angle.current * 0.8) * 3.5
    vacRef.current.position.set(x, 0.04, z)
    vacRef.current.rotation.y = -angle.current + Math.PI / 2
  })

  return (
    <group ref={vacRef} position={[0, 0.04, 0]}>
      {/* Thân tròn dẹt */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.34, 0.36, 0.08, 24]} />
        <primitive object={mats.body} attach="material" />
      </mesh>
      {/* Vòng viền bumper va chạm */}
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.36, 0.36, 0.04, 24]} />
        <primitive object={mats.rim} attach="material" />
      </mesh>
      {/* Mắt thần lidar radar & LED xanh */}
      <mesh position={[0.1, 0.05, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.04, 16]} />
        <primitive object={mats.rim} attach="material" />
      </mesh>
      <mesh position={[0.1, 0.075, 0]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <primitive object={mats.led} attach="material" />
      </mesh>
    </group>
  )
}

// -------------------------------------------------------------
// 3. XE GIAO HÀNG & XE TAXI XANH SM CHẠY TRÊN ĐƯỜNG PHỐ
// -------------------------------------------------------------
export function StreetTraffic() {
  const carVinFast = useRef<Group>(null) // Taxi Xanh SM (Cyan đặc trưng)
  const carDelivery = useRef<Group>(null) // Xe tải giao hàng công nghệ

  const mats = useMemo(() => ({
    xanhSM: new MeshStandardMaterial({ color: '#06B6D4', roughness: 0.2, metalness: 0.3 }), // Xanh lơ Xanh SM
    white: new MeshStandardMaterial({ color: '#F8FAFC', roughness: 0.3 }),
    darkGlass: new MeshStandardMaterial({ color: '#0F172A', roughness: 0.1 }),
    wheel: new MeshStandardMaterial({ color: '#111827', roughness: 0.8 }),
    headlight: glow('#FFFBEB', 2.5),
    taillight: glow('#EF4444', 2.0),
    deliveryOrange: new MeshStandardMaterial({ color: '#F97316', roughness: 0.4 }),
  }), [])

  useFrame((_, dt) => {
    // Taxi Xanh SM chạy dọc trục Đông - Tây (z = 14)
    if (carVinFast.current) {
      carVinFast.current.position.x += dt * 9.0
      if (carVinFast.current.position.x > 55) carVinFast.current.position.x = -45
    }

    // Xe giao hàng chạy dọc trục Bắc - Nam (x = 13.4)
    if (carDelivery.current) {
      carDelivery.current.position.z += dt * 8.0
      if (carDelivery.current.position.z > 55) carDelivery.current.position.z = -35
    }
  })

  return (
    <group>
      {/* 1. Taxi Xanh SM (VinFast Sedan VF) trên đại lộ z = 14 */}
      <group ref={carVinFast} position={[-20, 0, 14.8]} rotation-y={Math.PI / 2}>
        {/* Thân xe */}
        <RoundedBox args={[1.5, 0.46, 3.2]} radius={0.08} position={[0, 0.32, 0]} castShadow>
          <primitive object={mats.xanhSM} attach="material" />
        </RoundedBox>
        {/* Mui kính xe */}
        <RoundedBox args={[1.3, 0.42, 1.8]} radius={0.06} position={[0, 0.68, -0.2]} castShadow>
          <primitive object={mats.darkGlass} attach="material" />
        </RoundedBox>
        {/* Mào Taxi trên nóc xe */}
        <mesh position={[0, 0.94, -0.2]}>
          <boxGeometry args={[0.42, 0.1, 0.18]} />
          <primitive object={mats.white} attach="material" />
        </mesh>
        {/* 4 Bánh xe */}
        {[-0.78, 0.78].flatMap(x =>
          [-1.0, 1.0].map(z => (
            <mesh key={`wh-${x}-${z}`} position={[x, 0.22, z]} rotation-z={Math.PI / 2} castShadow>
              <cylinderGeometry args={[0.22, 0.22, 0.16, 16]} />
              <primitive object={mats.wheel} attach="material" />
            </mesh>
          ))
        )}
        {/* Đèn pha trước */}
        {[-0.55, 0.55].map((x, i) => (
          <mesh key={`hl-${i}`} position={[x, 0.32, 1.62]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <primitive object={mats.headlight} attach="material" />
          </mesh>
        ))}
        {/* Đèn hậu đỏ */}
        {[-0.55, 0.55].map((x, i) => (
          <mesh key={`tl-${i}`} position={[x, 0.35, -1.62]}>
            <boxGeometry args={[0.18, 0.08, 0.02]} />
            <primitive object={mats.taillight} attach="material" />
          </mesh>
        ))}
      </group>

      {/* 2. Xe Tải Giao Hàng Chuyển Phát trên đại lộ x = 13.4 */}
      <group ref={carDelivery} position={[12.2, 0, -10]}>
        {/* Đầu xe tải */}
        <RoundedBox args={[1.5, 0.85, 1.4]} radius={0.08} position={[0, 0.55, 1.2]} castShadow>
          <primitive object={mats.white} attach="material" />
        </RoundedBox>
        {/* Thùng xe giao hàng màu cam */}
        <RoundedBox args={[1.65, 1.3, 2.6]} radius={0.06} position={[0, 0.85, -0.8]} castShadow>
          <primitive object={mats.deliveryOrange} attach="material" />
        </RoundedBox>
        {/* 4 Bánh xe tải */}
        {[-0.85, 0.85].flatMap(x =>
          [-1.1, 1.0].map(z => (
            <mesh key={`twh-${x}-${z}`} position={[x, 0.26, z]} rotation-z={Math.PI / 2} castShadow>
              <cylinderGeometry args={[0.26, 0.26, 0.18, 16]} />
              <primitive object={mats.wheel} attach="material" />
            </mesh>
          ))
        )}
      </group>
    </group>
  )
}
