import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import { Group, MeshStandardMaterial } from 'three'
import { sound } from '../audio/sound'
import { ChibiHuman } from './Human'
import { glow } from './materials'

// Vị trí MyOffice AI Agency (Phía Đông Bắc, đối diện RoboCorp)
export const MYOFFICE_POS: [number, number, number] = [28, 0, -22]

/**
 * 🏢 MyOffice AI Agency
 * Tái hiện phòng làm việc hiện đại theo đúng ảnh chụp và repo `my-office`:
 * - Thang máy đón khách cửa mở vàng neon
 * - Phòng Giám đốc (Director Office) với bàn gỗ sồi, đèn chụp bàn cổ điển bấm bật/tắt (Desk Lamp)
 * - Tủ Rack Server với đèn LED chớp nháy và nút tắt "1 forgotten dev server"
 * - Phòng họp kính (Meeting Room) với bàn dài, 6 ghế xoay và bảng tiến độ "SHIP IT ✦"
 * - Bảng công việc Whiteboard treo tường bấm mở danh sách To-do / Agent Tasks
 * - Dàn Dev & Nhân viên người thật Chibi ngồi gõ máy tính phành phạch
 */
export function MyOfficeCompany() {
  const [lampOn, setLampOn] = useState(true)
  const [serverWarning, setServerWarning] = useState(true)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const ledRef = useRef<Group>(null)

  const mats = useMemo(() => ({
    floor: new MeshStandardMaterial({ color: '#F1F5F9', roughness: 0.6 }),
    woodDesk: new MeshStandardMaterial({ color: '#5C3826', roughness: 0.6 }),
    whiteDesk: new MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.3 }),
    glass: new MeshStandardMaterial({ color: '#BFDBFE', transparent: true, opacity: 0.25, roughness: 0.1 }),
    glassFrame: new MeshStandardMaterial({ color: '#1E293B', roughness: 0.4 }),
    blackChair: new MeshStandardMaterial({ color: '#0F172A', roughness: 0.7 }),
    lampGold: new MeshStandardMaterial({ color: '#D97706', metalness: 0.8, roughness: 0.2 }),
    lampGlow: glow('#FEF08A', 2.8),
    serverLedGreen: glow('#22C55E', 2.0),
    serverLedRed: glow('#EF4444', 3.0),
    elevatorDark: new MeshStandardMaterial({ color: '#0F172A', roughness: 0.4 }),
    elevatorDoor: new MeshStandardMaterial({ color: '#E2E8F0', metalness: 0.8, roughness: 0.2 }),
    elevatorGlow: glow('#F59E0B', 2.2),
  }), [])

  useFrame(state => {
    const t = state.clock.elapsedTime
    if (ledRef.current) {
      ledRef.current.position.y = Math.sin(t * 8) * 0.02
    }
  })

  const toggleLamp = (e: any) => {
    e.stopPropagation()
    sound.playBeep(980, 0.06)
    setLampOn(l => !l)
    setToastMsg(lampOn ? '💡 Đã tắt đèn bàn Giám đốc!' : '💡 Đã bật đèn bàn Giám đốc!')
    setTimeout(() => setToastMsg(null), 2500)
  }

  const toggleServer = (e: any) => {
    e.stopPropagation()
    sound.playWarning()
    setServerWarning(w => !w)
    setToastMsg(serverWarning ? '✅ Đã dừng Dev Server bị bỏ quên!' : '⚠️ Dev Server đang chạy nền!')
    setTimeout(() => setToastMsg(null), 2500)
  }

  return (
    <group position={MYOFFICE_POS}>
      {/* 1. Sàn văn phòng lát gạch trắng hiện đại */}
      <RoundedBox args={[18, 0.24, 15]} radius={0.08} position={[0, -0.12, 0]} receiveShadow castShadow>
        <primitive object={mats.floor} attach="material" />
      </RoundedBox>

      {/* 2. THANG MÁY ĐÓN KHÁCH (ELEVATOR) */}
      <group position={[-7.2, 0, 4.8]}>
        <mesh position={[0, 1.6, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.4, 3.2, 1.8]} />
          <primitive object={mats.elevatorDark} attach="material" />
        </mesh>
        {/* Cửa trượt thang máy inox */}
        <mesh position={[0, 1.25, 0.91]}>
          <planeGeometry args={[1.6, 2.5]} />
          <primitive object={mats.elevatorDoor} attach="material" />
        </mesh>
        {/* Đèn báo tầng vàng rực */}
        <mesh position={[0, 2.7, 0.92]}>
          <boxGeometry args={[0.6, 0.22, 0.04]} />
          <primitive object={mats.elevatorGlow} attach="material" />
        </mesh>
        {/* Chữ My Office trên cửa thang máy */}
        <mesh position={[0, 3.0, 0.92]}>
          <boxGeometry args={[1.5, 0.3, 0.04]} />
          <meshStandardMaterial color="#EA580C" />
        </mesh>
      </group>

      {/* 3. PHÒNG GIÁM ĐỐC (DIRECTOR OFFICE) CÓ ĐÈN BÀN BẬT/TẮT ĐƯỢC */}
      <group position={[-3.2, 0, -2.8]}>
        {/* Vách ngăn kính đen phòng Giám đốc */}
        <mesh position={[0, 1.2, 3.2]} material={mats.glass}>
          <boxGeometry args={[6.4, 2.4, 0.08]} />
        </mesh>
        <mesh position={[3.2, 1.2, 0]} rotation-y={Math.PI / 2} material={mats.glass}>
          <boxGeometry args={[6.4, 2.4, 0.08]} />
        </mesh>
        {/* Khung viền vách kính */}
        <mesh position={[0, 2.42, 3.2]} material={mats.glassFrame}>
          <boxGeometry args={[6.4, 0.08, 0.1]} />
        </mesh>

        {/* Bàn làm việc Giám đốc bằng gỗ sồi */}
        <RoundedBox args={[2.4, 0.08, 1.1]} radius={0.03} position={[0, 0.74, 0]} castShadow receiveShadow>
          <primitive object={mats.woodDesk} attach="material" />
        </RoundedBox>
        {/* Ghế da Giám đốc có tựa đầu cao */}
        <mesh position={[0, 0.65, -0.9]} castShadow>
          <boxGeometry args={[0.6, 0.9, 0.55]} />
          <primitive object={mats.blackChair} attach="material" />
        </mesh>

        {/* Giám đốc người thật Chibi ngồi làm việc */}
        <ChibiHuman pos={[0, 0, -0.85]} role="office" rot={0} action="type" shirtColor="#0F172A" pantsColor="#334155" />

        {/* Màn hình cong siêu rộng trên bàn Giám đốc */}
        <mesh position={[0, 1.15, 0.25]} castShadow>
          <boxGeometry args={[1.2, 0.45, 0.06]} />
          <meshStandardMaterial color="#1E293B" metalness={0.8} />
        </mesh>
        <mesh position={[0, 1.15, 0.28]}>
          <planeGeometry args={[1.15, 0.4]} />
          <meshBasicMaterial color="#38BDF8" />
        </mesh>

        {/* 💡 ĐÈN BÀN GIÁM ĐỐC (BẤM CHUỘT VÀO ĐỂ BẬT/TẮT THẬT) */}
        <group position={[-0.85, 0.78, 0.1]} onClick={toggleLamp}>
          <mesh position={[0, 0.15, 0]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
            <primitive object={mats.lampGold} attach="material" />
          </mesh>
          {/* Chụp đèn hình nón */}
          <mesh position={[0, 0.32, 0]} castShadow>
            <coneGeometry args={[0.16, 0.14, 16]} />
            <primitive object={mats.lampGold} attach="material" />
          </mesh>
          {/* Bóng đèn phát sáng */}
          {lampOn && (
            <mesh position={[0, 0.24, 0]}>
              <sphereGeometry args={[0.08, 12, 12]} />
              <primitive object={mats.lampGlow} attach="material" />
            </mesh>
          )}
        </group>
      </group>

      {/* 4. PHÒNG SERVER RACKS VỚI ĐÈN CHỚP VÀ CẢNH BÁO "1 FORGOTTEN DEV SERVER" */}
      <group position={[-7.0, 0, -3.2]}>
        {/* Tủ Server Rack đôi 7 tầng */}
        {[-0.6, 0.6].map((x, i) => (
          <group key={`rack-${i}`} position={[x, 0, 0]}>
            <RoundedBox args={[1.0, 2.5, 0.9]} radius={0.04} position={[0, 1.25, 0]} castShadow>
              <meshStandardMaterial color="#0B0F17" roughness={0.5} />
            </RoundedBox>
            {/* Cửa kính tủ rack */}
            <mesh position={[0, 1.25, 0.46]} material={mats.glass}>
              <planeGeometry args={[0.9, 2.4]} />
            </mesh>
            {/* Dãy đèn LED máy chủ nhấp nháy */}
            {[0.4, 0.8, 1.2, 1.6, 2.0].map((y, j) => (
              <mesh key={`led-${j}`} position={[0.25, y, 0.44]}>
                <boxGeometry args={[0.15, 0.04, 0.02]} />
                <primitive object={mats.serverLedGreen} attach="material" />
              </mesh>
            ))}
          </group>
        ))}

        {/* Nút bấm đỏ cảnh báo "1 forgotten dev server - Click to stop it" */}
        <group position={[0, 1.4, 0.55]} onClick={toggleServer}>
          <mesh>
            <boxGeometry args={[1.8, 0.35, 0.08]} />
            <meshStandardMaterial color="#0F172A" />
          </mesh>
          <mesh position={[-0.7, 0, 0.05]}>
            <sphereGeometry args={[0.08, 10, 10]} />
            <primitive object={serverWarning ? mats.serverLedRed : mats.serverLedGreen} attach="material" />
          </mesh>
        </group>
      </group>

      {/* 5. PHÒNG HỌP KÍNH (MEETING ROOM) & BẢNG "SHIP IT ✦" */}
      <group position={[4.2, 0, -2.8]}>
        {/* Vách ngăn kính trong suốt */}
        <mesh position={[-3.6, 1.2, 0]} rotation-y={Math.PI / 2} material={mats.glass}>
          <boxGeometry args={[6.4, 2.4, 0.08]} />
        </mesh>
        <mesh position={[0, 1.2, 3.2]} material={mats.glass}>
          <boxGeometry args={[7.2, 2.4, 0.08]} />
        </mesh>

        {/* Bàn họp dài cho 6 người */}
        <RoundedBox args={[3.8, 0.08, 1.5]} radius={0.04} position={[0, 0.74, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#FFFFFF" roughness={0.3} />
        </RoundedBox>

        {/* 6 Ghế họp công thái học xoay quanh bàn */}
        {[-1.2, 0, 1.2].flatMap(x =>
          [-1.1, 1.1].map(z => (
            <group key={`chair-${x}-${z}`} position={[x, 0, z]}>
              <mesh position={[0, 0.45, 0]} castShadow>
                <boxGeometry args={[0.5, 0.08, 0.48]} />
                <primitive object={mats.blackChair} attach="material" />
              </mesh>
              <mesh position={[0, 0.8, z < 0 ? -0.22 : 0.22]} castShadow>
                <boxGeometry args={[0.48, 0.65, 0.08]} />
                <primitive object={mats.blackChair} attach="material" />
              </mesh>
            </group>
          ))
        )}

        {/* 2 Lập trình viên đang họp và tranh luận */}
        <ChibiHuman pos={[-1.2, 0, 0.8]} role="office" rot={Math.PI} action="bow" shirtColor="#0284C7" pantsColor="#1E293B" />
        <ChibiHuman pos={[1.2, 0, -0.8]} role="office" rot={0} action="bow" shirtColor="#10B981" pantsColor="#334155" />

        {/* Biển hiệu đèn Neon "SHIP IT ✦" trên tường */}
        <mesh position={[0, 2.8, -3.15]}>
          <boxGeometry args={[2.8, 0.65, 0.1]} />
          <meshStandardMaterial color="#1E1B4B" />
        </mesh>
        <mesh position={[0, 2.8, -3.09]}>
          <planeGeometry args={[2.5, 0.5]} />
          <primitive object={glow('#EC4899', 2.8)} attach="material" />
        </mesh>
      </group>

      {/* 6. KHU VỰC BÀN LÀM VIỆC LẬP TRÌNH DEV CLUSTER (BẬN RỘN GÕ PHÍM) */}
      <group position={[1.5, 0, 4.2]}>
        {/* 4 Cụm bàn làm việc đôi màu trắng */}
        {[-2.5, 2.5].map((x, i) => (
          <group key={`desk-cluster-${i}`} position={[x, 0, 0]}>
            <RoundedBox args={[3.2, 0.08, 1.4]} radius={0.03} position={[0, 0.74, 0]} castShadow receiveShadow>
              <primitive object={mats.whiteDesk} attach="material" />
            </RoundedBox>
            {/* Màn hình đôi cho mỗi Dev */}
            {[-0.8, 0.8].flatMap(dx =>
              [-0.35, 0.35].map(dz => (
                <group key={`dev-screen-${dx}-${dz}`} position={[dx, 1.15, dz]}>
                  <mesh castShadow>
                    <boxGeometry args={[0.7, 0.44, 0.04]} />
                    <meshStandardMaterial color="#1E293B" />
                  </mesh>
                  <mesh position={[0, 0, dz > 0 ? -0.025 : 0.025]}>
                    <planeGeometry args={[0.66, 0.4]} />
                    <meshBasicMaterial color={dz > 0 ? '#10B981' : '#38BDF8'} />
                  </mesh>
                </group>
              ))
            )}
          </group>
        ))}

        {/* Các lập trình viên người thật Chibi ngồi gõ code */}
        <ChibiHuman pos={[-3.3, 0, -0.6]} role="office" rot={0} action="type" shirtColor="#F59E0B" pantsColor="#0F172A" />
        <ChibiHuman pos={[-1.7, 0, 0.6]} role="office" rot={Math.PI} action="type" shirtColor="#8B5CF6" pantsColor="#1E293B" />
        <ChibiHuman pos={[1.7, 0, -0.6]} role="office" rot={0} action="type" shirtColor="#06B6D4" pantsColor="#334155" />
        <ChibiHuman pos={[3.3, 0, 0.6]} role="office" rot={Math.PI} action="type" shirtColor="#E11D48" pantsColor="#0F172A" />
      </group>

      {/* Thông báo tương tác Toast khi bấm đồ vật */}
      {toastMsg && (
        <group position={[0, 4.2, 0]}>
          <mesh>
            <boxGeometry args={[5.2, 0.7, 0.1]} />
            <meshStandardMaterial color="#0F172A" />
          </mesh>
        </group>
      )}
    </group>
  )
}
