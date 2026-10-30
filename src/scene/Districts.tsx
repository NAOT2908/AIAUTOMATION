import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Group, MeshStandardMaterial } from 'three'
import { useUI } from '../store'
import { ChibiHuman } from './Human'
import { glow } from './materials'

// -------------------------------------------------------------
// Vị trí các khu vực trong RoboCity (Dời lùi xuống z = 31 để cách xa mặt đường chính z = 14):
export const BISTRO_POS: [number, number, number] = [26, 0, 0]
export const PAGODA_POS: [number, number, number] = [-2, 0, 31]
export const CLUB_POS: [number, number, number] = [26, 0, 31]

// =============================================================
// 1. PHỐ ẨM THỰC ROBOBISTRO & BAR (CÓ KHÁCH NGƯỜI THẬT)
// =============================================================
function RoboBistro() {
  const steamRef = useRef<Group>(null)
  const droneRef = useRef<Group>(null)
  const setDistrict = useUI(s => s.setDistrict)

  const mats = useMemo(() => ({
    deck: new MeshStandardMaterial({ color: '#E2D9CC', roughness: 0.8 }),
    woodCounter: new MeshStandardMaterial({ color: '#5C3317', roughness: 0.6 }),
    woodDark: new MeshStandardMaterial({ color: '#3A1E0D', roughness: 0.7 }),
    roofTile: new MeshStandardMaterial({ color: '#C0392B', roughness: 0.5 }),
    lanternRed: glow('#FF2E2E', 2.8),
    neonSign: glow('#FF8A3D', 2.2),
    droneGlow: glow('#38BDF8', 2.0),
    soupHot: glow('#FFA500', 1.6),
    clothStool: new MeshStandardMaterial({ color: '#B91C1C', roughness: 0.9 }),
  }), [])

  useFrame(state => {
    const t = state.clock.elapsedTime
    if (steamRef.current) {
      steamRef.current.position.y = 1.25 + Math.sin(t * 4) * 0.08
    }
    if (droneRef.current) {
      droneRef.current.position.y = 2.6 + Math.sin(t * 2.5) * 0.25
      droneRef.current.rotation.y = t * 1.5
    }
  })

  return (
    <group position={BISTRO_POS} onClick={(e) => { e.stopPropagation(); setDistrict('bistro') }}>
      {/* Sàn sân quán ăn */}
      <RoundedBox args={[16, 0.22, 14]} radius={0.08} position={[0, -0.11, 0]} receiveShadow castShadow>
        <primitive object={mats.deck} attach="material" />
      </RoundedBox>

      {/* Quán Ramen & Bếp chính mở */}
      <mesh position={[0, 1.4, -2.8]} castShadow receiveShadow>
        <boxGeometry args={[13.6, 2.8, 6.8]} />
        <meshStandardMaterial color="#2B2625" roughness={0.6} />
      </mesh>

      {/* Mái ngói đỏ Á Đông */}
      <mesh position={[0, 2.9, -2.6]} rotation-x={0.12} castShadow>
        <boxGeometry args={[14.6, 0.25, 7.8]} />
        <primitive object={mats.roofTile} attach="material" />
      </mesh>

      {/* Biển hiệu Ramen & Lồng đèn đỏ */}
      <mesh position={[0, 3.4, 0.8]} castShadow>
        <boxGeometry args={[8.5, 0.75, 0.2]} />
        <primitive object={mats.neonSign} attach="material" />
      </mesh>

      {[-5, -2.5, 0, 2.5, 5].map((x, i) => (
        <group key={`lan-${i}`} position={[x, 2.6, 1.1]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.2, 0.2, 0.38, 12]} />
            <primitive object={mats.lanternRed} attach="material" />
          </mesh>
          <mesh position={[0, 0.22, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.12, 6]} />
            <meshStandardMaterial color="#111" />
          </mesh>
        </group>
      ))}

      {/* Quầy Bar bếp mở */}
      <group position={[0, 0, 0.6]}>
        <RoundedBox args={[10.5, 0.9, 1.2]} radius={0.06} position={[0, 0.45, 0]} castShadow receiveShadow>
          <primitive object={mats.woodCounter} attach="material" />
        </RoundedBox>
        {/* Nồi nấu nước dùng Ramen đang bốc khói */}
        <mesh position={[-2.4, 0.96, 0.1]} castShadow>
          <cylinderGeometry args={[0.35, 0.32, 0.3, 16]} />
          <meshStandardMaterial color="#94A3B8" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[-2.4, 1.1, 0.1]}>
          <circleGeometry args={[0.32, 16]} />
          <primitive object={mats.soupHot} attach="material" />
        </mesh>
        <group ref={steamRef} position={[-2.4, 1.25, 0.1]}>
          <mesh>
            <sphereGeometry args={[0.18, 12, 12]} />
            <meshStandardMaterial color="#FFF" transparent opacity={0.4} roughness={1} />
          </mesh>
          <mesh position={[0.06, 0.15, -0.04]}>
            <sphereGeometry args={[0.22, 12, 12]} />
            <meshStandardMaterial color="#FFF" transparent opacity={0.3} roughness={1} />
          </mesh>
        </group>

        {/* Bát Ramen trên quầy */}
        {[-0.8, 1.2, 3.2].map((x, i) => (
          <group key={`bowl-${i}`} position={[x, 0.98, 0.2]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.18, 0.12, 0.14, 14]} />
              <meshStandardMaterial color="#FFFFFF" roughness={0.2} />
            </mesh>
            <mesh position={[0, 0.08, 0]} rotation-z={0.2}>
              <boxGeometry args={[0.36, 0.02, 0.03]} />
              <primitive object={mats.woodDark} attach="material" />
            </mesh>
          </group>
        ))}

        {/* Ghế bar đẩu đệm đỏ */}
        {[-3.8, -2.0, -0.2, 1.6, 3.4].map((x, i) => (
          <group key={`stool-${i}`} position={[x, 0, 1.3]}>
            <mesh position={[0, 0.28, 0]} castShadow>
              <cylinderGeometry args={[0.04, 0.05, 0.56, 8]} />
              <meshStandardMaterial color="#333" metalness={0.7} />
            </mesh>
            <mesh position={[0, 0.58, 0]} castShadow>
              <cylinderGeometry args={[0.26, 0.26, 0.08, 16]} />
              <primitive object={mats.clothStool} attach="material" />
            </mesh>
          </group>
        ))}

        {/* Chef-Bot đầu bếp */}
        <group position={[-1.2, 0, -0.8]}>
          <mesh position={[0, 0.65, 0]} castShadow>
            <cylinderGeometry args={[0.24, 0.26, 0.65, 16]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.3} />
          </mesh>
          <mesh position={[0, 1.15, 0]} castShadow>
            <sphereGeometry args={[0.22, 16, 16]} />
            <meshStandardMaterial color="#E2E8F0" roughness={0.2} metalness={0.4} />
          </mesh>
          <mesh position={[0, 1.45, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.18, 0.38, 16]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.5} />
          </mesh>
          <mesh position={[0, 1.15, 0.19]}>
            <boxGeometry args={[0.24, 0.08, 0.04]} />
            <meshStandardMaterial color="#38BDF8" emissive="#38BDF8" emissiveIntensity={2} />
          </mesh>
        </group>

        {/* Khách hàng người thật ăn mì Ramen tại quầy */}
        <ChibiHuman pos={[-2.0, 0, 1.4]} role="guest" rot={0} action="eat" shirtColor="#0284C7" pantsColor="#334155" />
        <ChibiHuman pos={[1.6, 0, 1.4]} role="guest" rot={0} action="eat" shirtColor="#EC4899" pantsColor="#1E293B" />
      </group>

      {/* Bàn cafe ngoài trời & Dù che */}
      {[-4.8, 4.8].map((x, i) => (
        <group key={`out-${i}`} position={[x, 0, 4.4]}>
          <mesh position={[0, 0.42, 0]} castShadow>
            <cylinderGeometry args={[0.85, 0.85, 0.06, 20]} />
            <meshStandardMaterial color="#FFFDF7" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.21, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.42, 8]} />
            <meshStandardMaterial color="#333" />
          </mesh>
          <mesh position={[0, 2.2, 0]} castShadow>
            <coneGeometry args={[1.65, 0.75, 18]} />
            <primitive object={mats.roofTile} attach="material" />
          </mesh>
        </group>
      ))}

      {/* Drone AI Giao Đồ Ăn */}
      <group position={[0, 0, 4.5]}>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.015, 0]}>
          <ringGeometry args={[1.2, 1.4, 32]} />
          <meshBasicMaterial color="#F97316" />
        </mesh>
        <group ref={droneRef} position={[0, 2.6, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.26, 16, 16]} />
            <meshStandardMaterial color="#1E293B" metalness={0.7} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.65, 0.65, 0.04, 4]} />
            <primitive object={mats.droneGlow} attach="material" />
          </mesh>
          <mesh position={[0, -0.32, 0]} castShadow>
            <boxGeometry args={[0.28, 0.24, 0.28]} />
            <meshStandardMaterial color="#EA580C" />
          </mesh>
        </group>
      </group>
    </group>
  )
}

// =============================================================
// 2. CHÙA KHÁNH AN AI (CÓ SƯ THẦY & PHẬT TỬ NGƯỜI THẬT)
// =============================================================
function CyberPagoda() {
  const setDistrict = useUI(s => s.setDistrict)
  const incenseSmoke = useRef<Group>(null)

  const mats = useMemo(() => ({
    stoneSlab: new MeshStandardMaterial({ color: '#E5D5C5', roughness: 0.85 }),
    terracottaWall: new MeshStandardMaterial({ color: '#E09F5C', roughness: 0.7 }),
    crimsonWood: new MeshStandardMaterial({ color: '#882222', roughness: 0.6 }),
    pagodaRoof: new MeshStandardMaterial({ color: '#B34728', roughness: 0.45 }),
    goldFinial: new MeshStandardMaterial({ color: '#F59E0B', metalness: 0.85, roughness: 0.2 }),
    jadeBuddha: glow('#10B981', 2.4),
    auraGold: glow('#FBBF24', 2.8),
    incenseFire: glow('#EF4444', 2.2),
    lotusPink: glow('#F472B6', 2.0),
    robeOrange: new MeshStandardMaterial({ color: '#EA580C', roughness: 0.8 }),
    windowDark: new MeshStandardMaterial({ color: '#2B1810', roughness: 0.3 }),
    railing: new MeshStandardMaterial({ color: '#4A1D15', roughness: 0.5 }),
  }), [])

  useFrame(state => {
    const t = state.clock.elapsedTime
    if (incenseSmoke.current) {
      incenseSmoke.current.position.y = 1.35 + Math.sin(t * 3) * 0.05
    }
  })

  return (
    <group position={PAGODA_POS} onClick={(e) => { e.stopPropagation(); setDistrict('pagoda') }}>
      <RoundedBox args={[17, 0.26, 14]} radius={0.08} position={[0, -0.09, 0]} receiveShadow castShadow>
        <primitive object={mats.stoneSlab} attach="material" />
      </RoundedBox>

      {/* CỤM TÒA CHÍNH ĐIỆN */}
      <group position={[0.5, 0, -1.8]}>
        <mesh position={[0, 1.35, 0]} castShadow receiveShadow>
          <boxGeometry args={[9.5, 2.7, 6.5]} />
          <primitive object={mats.terracottaWall} attach="material" />
        </mesh>
        {[-3, 0, 3].map((x, i) => (
          <group key={`arch-${i}`} position={[x, 1.1, 3.26]}>
            <mesh>
              <boxGeometry args={[1.4, 2.1, 0.04]} />
              <primitive object={mats.windowDark} attach="material" />
            </mesh>
            <mesh position={[0, 1.05, 0]}>
              <cylinderGeometry args={[0.7, 0.7, 0.05, 16, 1, false, 0, Math.PI]} rotation-z={Math.PI / 2} />
              <primitive object={mats.crimsonWood} attach="material" />
            </mesh>
          </group>
        ))}

        {/* Mái cong Tầng 1 */}
        <group position={[0, 2.8, 0]}>
          <mesh castShadow>
            <boxGeometry args={[11.2, 0.28, 8.2]} />
            <primitive object={mats.pagodaRoof} attach="material" />
          </mesh>
          {[-5.6, 5.6].flatMap((x, idx) =>
            [-4.1, 4.1].map((z, jdx) => (
              <mesh key={`up1-${idx}-${jdx}`} position={[x, 0.24, z]} rotation-z={x < 0 ? 0.5 : -0.5} castShadow>
                <coneGeometry args={[0.4, 0.9, 4]} />
                <primitive object={mats.pagodaRoof} attach="material" />
              </mesh>
            ))
          )}
        </group>

        {/* Tầng 2 */}
        <mesh position={[0, 4.1, 0]} castShadow receiveShadow>
          <boxGeometry args={[7.2, 2.3, 5.2]} />
          <primitive object={mats.terracottaWall} attach="material" />
        </mesh>
        {[-2, 2].map((x, i) => (
          <mesh key={`win2-${i}`} position={[x, 4.1, 2.62]}>
            <boxGeometry args={[1.0, 1.4, 0.04]} />
            <primitive object={mats.windowDark} attach="material" />
          </mesh>
        ))}

        {/* Mái cong Tầng 2 */}
        <group position={[0, 5.35, 0]}>
          <mesh castShadow>
            <boxGeometry args={[8.8, 0.26, 6.8]} />
            <primitive object={mats.pagodaRoof} attach="material" />
          </mesh>
          {[-4.4, 4.4].flatMap((x, idx) =>
            [-3.4, 3.4].map((z, jdx) => (
              <mesh key={`up2-${idx}-${jdx}`} position={[x, 0.22, z]} rotation-z={x < 0 ? 0.5 : -0.5} castShadow>
                <coneGeometry args={[0.35, 0.8, 4]} />
                <primitive object={mats.pagodaRoof} attach="material" />
              </mesh>
            ))
          )}
        </group>

        {/* Tầng 3 */}
        <mesh position={[0, 6.2, 0]} castShadow>
          <boxGeometry args={[4.2, 1.5, 3.6]} />
          <primitive object={mats.terracottaWall} attach="material" />
        </mesh>
        <mesh position={[0, 7.15, 0]} castShadow>
          <coneGeometry args={[2.8, 1.4, 4]} />
          <primitive object={mats.pagodaRoof} attach="material" />
        </mesh>
        <mesh position={[0, 8.0, 0]} castShadow>
          <sphereGeometry args={[0.35, 16, 16]} />
          <primitive object={mats.goldFinial} attach="material" />
        </mesh>
      </group>

      {/* BẢO THÁP LỤC GIÁC */}
      <group position={[-5.8, 0, -0.5]}>
        {[0, 1, 2, 3, 4].map(level => {
          const yBase = level * 1.5
          const radius = 1.6 - level * 0.16
          return (
            <group key={`tower-${level}`} position={[0, yBase, 0]}>
              <mesh position={[0, 0.65, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[radius * 0.95, radius, 1.3, 6]} />
                <primitive object={mats.terracottaWall} attach="material" />
              </mesh>
              <mesh position={[0, 0.65, radius * 0.9]}>
                <boxGeometry args={[0.45, 0.7, 0.05]} />
                <primitive object={mats.windowDark} attach="material" />
              </mesh>
              <mesh position={[0, 1.38, 0]} castShadow>
                <cylinderGeometry args={[radius * 0.75, radius * 1.35, 0.18, 6]} />
                <primitive object={mats.pagodaRoof} attach="material" />
              </mesh>
              <mesh position={[0, 1.5, 0]}>
                <cylinderGeometry args={[radius * 1.25, radius * 1.25, 0.18, 6, 1, true]} />
                <primitive object={mats.railing} attach="material" />
              </mesh>
            </group>
          )
        })}
        <mesh position={[0, 7.8, 0]} castShadow>
          <coneGeometry args={[0.9, 1.6, 6]} />
          <primitive object={mats.pagodaRoof} attach="material" />
        </mesh>
        <mesh position={[0, 8.7, 0]} castShadow>
          <sphereGeometry args={[0.26, 12, 12]} />
          <primitive object={mats.goldFinial} attach="material" />
        </mesh>
      </group>

      {/* SÂN CHÙA */}
      <group position={[1.0, 0, 3.2]}>
        <group position={[0, 0, -0.6]}>
          <mesh position={[0, 0.28, 0]} castShadow>
            <cylinderGeometry args={[1.0, 0.8, 0.35, 16]} />
            <primitive object={mats.lotusPink} attach="material" />
          </mesh>
          <mesh position={[0, 0.92, 0]} castShadow>
            <capsuleGeometry args={[0.34, 0.55, 8, 16]} />
            <primitive object={mats.jadeBuddha} attach="material" />
          </mesh>
          <mesh position={[0, 1.45, 0]} castShadow>
            <sphereGeometry args={[0.26, 16, 16]} />
            <primitive object={mats.jadeBuddha} attach="material" />
          </mesh>
          <mesh position={[0, 1.35, -0.32]} rotation-x={Math.PI / 2}>
            <torusGeometry args={[0.7, 0.07, 16, 32]} />
            <primitive object={mats.auraGold} attach="material" />
          </mesh>
        </group>

        {/* Lư hương */}
        <group position={[0, 0, 1.1]}>
          <mesh position={[0, 0.42, 0]} castShadow>
            <cylinderGeometry args={[0.55, 0.42, 0.5, 16]} />
            <meshStandardMaterial color="#6B2D17" metalness={0.7} roughness={0.3} />
          </mesh>
          {[-0.12, 0, 0.12].map((dx, i) => (
            <group key={`inc-${i}`} position={[dx, 0.75, (i - 1) * 0.08]}>
              <mesh>
                <cylinderGeometry args={[0.015, 0.015, 0.35, 6]} />
                <meshStandardMaterial color="#B91C1C" />
              </mesh>
              <mesh position={[0, 0.18, 0]}>
                <sphereGeometry args={[0.035, 8, 8]} />
                <primitive object={mats.incenseFire} attach="material" />
              </mesh>
            </group>
          ))}
          <group ref={incenseSmoke} position={[0, 1.15, 0]}>
            <mesh>
              <sphereGeometry args={[0.16, 12, 12]} />
              <meshStandardMaterial color="#E0E7FF" transparent opacity={0.35} />
            </mesh>
          </group>
        </group>

        {/* 3 Monk-Bot Robot Phật tử quỳ thiền */}
        {[-2.2, 0, 2.2].map((x, i) => (
          <group key={`monk-${i}`} position={[x, 0, i === 1 ? 2.1 : 1.2]} rotation-y={i === 0 ? 0.3 : i === 2 ? -0.3 : 0}>
            <mesh position={[0, 0.08, 0]} castShadow>
              <cylinderGeometry args={[0.42, 0.45, 0.14, 16]} />
              <meshStandardMaterial color="#B45309" roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.44, 0]} castShadow>
              <cylinderGeometry args={[0.24, 0.28, 0.5, 16]} />
              <primitive object={mats.robeOrange} attach="material" />
            </mesh>
            <mesh position={[0, 0.88, 0]} castShadow>
              <sphereGeometry args={[0.2, 16, 16]} />
              <meshStandardMaterial color="#F1F5F9" metalness={0.5} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0.66, 0.15]}>
              <torusGeometry args={[0.18, 0.03, 8, 20]} />
              <meshStandardMaterial color="#78350F" />
            </mesh>
            <mesh position={[0, 0.56, 0.26]} rotation-x={-0.3} castShadow>
              <boxGeometry args={[0.16, 0.14, 0.1]} />
              <meshStandardMaterial color="#F8FAFC" />
            </mesh>
            <mesh position={[0, 0.88, 0.18]}>
              <sphereGeometry args={[0.035, 8, 8]} />
              <meshStandardMaterial color="#10B981" emissive="#10B981" emissiveIntensity={2} />
            </mesh>
          </group>
        ))}

        {/* Thầy sư & Phật tử người thật đứng chắp tay búp sen chiêm bái */}
        <ChibiHuman pos={[-3.6, 0, 0.6]} role="monk" rot={0.4} action="bow" shirtColor="#EA580C" />
        <ChibiHuman pos={[3.6, 0, 0.6]} role="monk" rot={-0.4} action="bow" shirtColor="#78716C" />
      </group>
    </group>
  )
}

// =============================================================
// 3. VŨ TRƯỜNG NEON BEATS CLUB (CÓ KHÁCH QUẨY NGƯỜI THẬT)
// =============================================================
function NeonClub() {
  const djHead = useRef<Group>(null)
  const laserRig = useRef<Group>(null)
  const dancer1 = useRef<Group>(null)
  const dancer2 = useRef<Group>(null)
  const setDistrict = useUI(s => s.setDistrict)

  const mats = useMemo(() => ({
    clubFloor: new MeshStandardMaterial({ color: '#090514', roughness: 0.3, metalness: 0.8 }),
    neonPurple: glow('#A855F7', 2.8),
    neonCyan: glow('#06B6D4', 2.6),
    neonPink: glow('#EC4899', 2.8),
    laserBeam1: glow('#38BDF8', 3.5),
    laserBeam2: glow('#F43F5E', 3.5),
    discoMirror: new MeshStandardMaterial({ color: '#FFFFFF', metalness: 0.95, roughness: 0.05 }),
    speakerBlack: new MeshStandardMaterial({ color: '#020617', roughness: 0.3 }),
    goldTrim: new MeshStandardMaterial({ color: '#F59E0B', metalness: 0.9, roughness: 0.2 }),
  }), [])

  useFrame(state => {
    const t = state.clock.elapsedTime
    if (djHead.current) {
      djHead.current.position.y = 1.95 + Math.abs(Math.sin(t * 5.0)) * 0.14
      djHead.current.rotation.y = Math.sin(t * 3.0) * 0.3
    }
    if (laserRig.current) {
      laserRig.current.rotation.y = t * 1.8
    }
    if (dancer1.current) {
      dancer1.current.position.y = 0.55 + Math.abs(Math.sin(t * 6.0)) * 0.18
      dancer1.current.rotation.z = Math.sin(t * 6.0) * 0.2
    }
    if (dancer2.current) {
      dancer2.current.position.y = 0.55 + Math.abs(Math.cos(t * 6.0)) * 0.18
      dancer2.current.rotation.z = -Math.cos(t * 6.0) * 0.2
    }
  })

  return (
    <group position={CLUB_POS} onClick={(e) => { e.stopPropagation(); setDistrict('club') }}>
      <RoundedBox args={[16, 0.22, 14]} radius={0.08} position={[0, -0.11, 0]} receiveShadow castShadow>
        <primitive object={mats.clubFloor} attach="material" />
      </RoundedBox>

      {/* Tòa nhà Club hộp đêm */}
      <mesh position={[0, 1.8, -2.5]} castShadow receiveShadow>
        <boxGeometry args={[14.2, 3.6, 7.5]} />
        <meshStandardMaterial color="#0A071B" roughness={0.4} metalness={0.6} />
      </mesh>

      {/* Màn hình LED khổng lồ phía sau DJ */}
      <mesh position={[0, 2.7, 1.3]}>
        <boxGeometry args={[9.5, 2.4, 0.1]} />
        <primitive object={mats.neonPurple} attach="material" />
      </mesh>

      {/* Biển hiệu tên Club Neon */}
      <mesh position={[0, 4.1, 1.3]} castShadow>
        <boxGeometry args={[8.8, 0.7, 0.25]} />
        <primitive object={mats.neonPink} attach="material" />
      </mesh>

      {/* Quả cầu gương Disco */}
      <mesh position={[0, 3.4, 3.2]} castShadow>
        <sphereGeometry args={[0.55, 24, 24]} />
        <primitive object={mats.discoMirror} attach="material" />
      </mesh>

      {/* Cụm đèn Laser xoay */}
      <group ref={laserRig} position={[0, 3.3, 3.2]}>
        {[-3.5, 3.5].map((x, i) => (
          <mesh key={`laser-x-${i}`} position={[x / 2, -0.8, 0]} rotation-z={i === 0 ? 0.7 : -0.7}>
            <cylinderGeometry args={[0.02, 0.08, 3.2, 6]} />
            <primitive object={i === 0 ? mats.laserBeam1 : mats.laserBeam2} attach="material" />
          </mesh>
        ))}
      </group>

      {/* Sân khấu DJ */}
      <group position={[0, 0, 1.2]}>
        <RoundedBox args={[5.8, 0.6, 2.8]} radius={0.08} position={[0, 0.3, 0]} castShadow receiveShadow>
          <primitive object={mats.goldTrim} attach="material" />
        </RoundedBox>

        <RoundedBox args={[3.2, 0.55, 1.1]} radius={0.04} position={[0, 0.85, 0]} castShadow>
          <primitive object={mats.neonCyan} attach="material" />
        </RoundedBox>

        {[-0.8, 0.8].map((x, i) => (
          <mesh key={`vinyl-${i}`} position={[x, 1.14, 0]} castShadow>
            <cylinderGeometry args={[0.34, 0.34, 0.04, 20]} />
            <meshStandardMaterial color="#111827" metalness={0.9} roughness={0.1} />
          </mesh>
        ))}

        {/* DJ Robot */}
        <group position={[0, 0.9, -0.4]}>
          <mesh position={[0, 0.5, 0]} castShadow>
            <cylinderGeometry args={[0.26, 0.28, 0.65, 16]} />
            <meshStandardMaterial color="#0F172A" metalness={0.8} roughness={0.2} />
          </mesh>
          <group ref={djHead} position={[0, 1.95, 0]}>
            <mesh castShadow>
              <sphereGeometry args={[0.26, 20, 20]} />
              <meshStandardMaterial color="#F8FAFC" roughness={0.2} />
            </mesh>
            <mesh position={[0, 0, 0.22]}>
              <boxGeometry args={[0.38, 0.12, 0.1]} />
              <primitive object={mats.neonPink} attach="material" />
            </mesh>
            <mesh position={[0, 0.08, 0]}>
              <torusGeometry args={[0.32, 0.07, 12, 24, Math.PI]} />
              <primitive object={mats.neonPurple} attach="material" />
            </mesh>
            {[-0.28, 0.28].map((x, i) => (
              <mesh key={`cup-${i}`} position={[x, 0, 0]}>
                <cylinderGeometry args={[0.1, 0.1, 0.12, 12]} />
                <primitive object={mats.neonCyan} attach="material" />
              </mesh>
            ))}
          </group>
        </group>

        {/* Dàn Loa Subwoofer Bass */}
        {[-2.4, 2.4].map((x, i) => (
          <group key={`spk-${i}`} position={[x, 0.9, 0]}>
            <mesh castShadow>
              <boxGeometry args={[1.0, 1.8, 0.8]} />
              <primitive object={mats.speakerBlack} attach="material" />
            </mesh>
            {[0.4, -0.4].map((dy, j) => (
              <mesh key={`cone-${j}`} position={[0, dy, 0.41]}>
                <circleGeometry args={[0.3, 16]} />
                <primitive object={mats.neonPurple} attach="material" />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {/* Sàn nhảy LED & 2 Dancers */}
      <group position={[0, 0.015, 4.6]}>
        {[-3, -1, 1, 3].flatMap(x =>
          [-1.5, 0.5].map(z => (
            <mesh key={`tile-${x}-${z}`} rotation-x={-Math.PI / 2} position={[x, 0, z]}>
              <planeGeometry args={[1.6, 1.6]} />
              <primitive object={(x + z) % 2 === 0 ? mats.neonPink : mats.neonCyan} attach="material" />
            </mesh>
          ))
        )}

        {/* Dancer Robot */}
        <group ref={dancer1} position={[-1.5, 0.55, -0.5]}>
          <mesh castShadow>
            <capsuleGeometry args={[0.2, 0.6, 8, 16]} />
            <meshStandardMaterial color="#EC4899" roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.52, 0]} castShadow>
            <sphereGeometry args={[0.16, 16, 16]} />
            <meshStandardMaterial color="#FFFFFF" />
          </mesh>
        </group>

        <group ref={dancer2} position={[1.5, 0.55, 0.5]}>
          <mesh castShadow>
            <capsuleGeometry args={[0.2, 0.6, 8, 16]} />
            <meshStandardMaterial color="#06B6D4" roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.52, 0]} castShadow>
            <sphereGeometry args={[0.16, 16, 16]} />
            <meshStandardMaterial color="#FFFFFF" />
          </mesh>
        </group>

        {/* Khách nhảy người thật quẩy trên sàn LED */}
        <ChibiHuman pos={[-0.2, 0, 0.2]} role="dancer" rot={0} action="dance" shirtColor="#F43F5E" pantsColor="#0F172A" />
        <ChibiHuman pos={[0.5, 0, -0.6]} role="dancer" rot={Math.PI} action="dance" shirtColor="#8B5CF6" pantsColor="#1E293B" />
      </group>
    </group>
  )
}

// -------------------------------------------------------------
// Tổ hợp Campus RoboCity
// -------------------------------------------------------------
export function RoboCityCampus() {
  return (
    <group>
      <RoboBistro />
      <CyberPagoda />
      <NeonClub />
    </group>
  )
}
