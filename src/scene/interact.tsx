import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useRef, type ReactNode } from 'react'
import { BackSide, Color, Group, Mesh, ShaderMaterial, type Object3D } from 'three'
import { sound } from '../audio/sound'
import { useUI, type PropId } from '../store'

/**
 * Furniture you can point at (technique from khanh020905/my-office): hovering draws a warm
 * shell just outside the object's own meshes (back faces pushed out along the normals), which
 * costs one extra draw per mesh instead of a full-screen outline pass. Clicking bounces the
 * object, runs its action and opens its info card.
 */
const outlineMat = new ShaderMaterial({
  side: BackSide,
  uniforms: { color: { value: new Color(2.6, 1.45, 0.3) }, thickness: { value: 0.03 } },
  vertexShader: /* glsl */ `
    uniform float thickness;
    void main() {
      vec3 p = position + normal * thickness;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform vec3 color;
    void main() { gl_FragColor = vec4(color, 1.0); }`,
  toneMapped: false,
})

const noRaycast = () => {}

function addShells(root: Object3D) {
  const shells: Mesh[] = []
  root.traverse(o => {
    const m = o as Mesh
    if (!m.isMesh || (m as { isInstancedMesh?: boolean }).isInstancedMesh || m.userData.shell || !m.geometry.attributes.normal) return
    const s = new Mesh(m.geometry, outlineMat)
    s.userData.shell = true
    s.raycast = noRaycast
    m.add(s)
    shells.push(s)
  })
  return shells
}

export interface InteractiveProps {
  /** info card to open on click; leave out for things that only react */
  id?: PropId
  name: string
  hint: string
  /** small reaction on click (sound, particles, a state change) */
  onActivate?: () => void
  /** squash-and-stretch on click (default true) */
  bounce?: boolean
  position?: [number, number, number]
  children: ReactNode
}

export function Interactive({ id, name, hint, onActivate, bounce = true, position, children }: InteractiveProps) {
  const ref = useRef<Group>(null)
  const shells = useRef<Mesh[]>([])
  const hovers = useRef(0)
  const bounceT = useRef(-1)

  const clear = () => {
    for (const s of shells.current) s.removeFromParent()
    shells.current = []
  }

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    if (hovers.current++ > 0 || !ref.current) return
    shells.current = addShells(ref.current)
    useUI.setState({ hoverProp: { name, hint } })
    document.body.classList.add('hover-prop')
  }
  const onOut = () => {
    hovers.current = Math.max(0, hovers.current - 1)
    if (hovers.current > 0) return
    clear()
    if (useUI.getState().hoverProp?.name === name) useUI.setState({ hoverProp: null })
    document.body.classList.remove('hover-prop')
  }
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (bounce) bounceT.current = 0
    sound.playBeep(880, 0.04)
    onActivate?.()
    if (id) useUI.setState({ openProp: id })
  }

  useFrame((_, dt) => {
    const g = ref.current
    if (!g || bounceT.current < 0) return
    bounceT.current += dt
    const k = Math.min(1, bounceT.current / 0.45)
    const s = 1 + 0.07 * Math.sin(k * Math.PI * 3) * (1 - k)
    g.scale.set(1 - (s - 1) * 0.5, s, 1 - (s - 1) * 0.5)
    if (k >= 1) { bounceT.current = -1; g.scale.set(1, 1, 1) }
  })

  return (
    <group ref={ref} position={position} onPointerOver={onOver} onPointerOut={onOut} onClick={onClick}>
      {children}
    </group>
  )
}

/** wobble used by plants and other small things that react without a card */
export function useWiggle() {
  const ref = useRef<Group>(null)
  const t = useRef(-1)
  useFrame((_, dt) => {
    const g = ref.current
    if (!g || t.current < 0) return
    t.current += dt
    const k = Math.min(1, t.current / 0.8)
    g.rotation.z = Math.sin(k * Math.PI * 5) * 0.12 * (1 - k)
    if (k >= 1) { t.current = -1; g.rotation.z = 0 }
  })
  return { ref, wiggle: () => { t.current = 0 } }
}
