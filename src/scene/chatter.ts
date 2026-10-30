import type { Object3D } from 'three'

/**
 * Ambient speech for the city's people (separate from the robots' work bubbles).
 * People register a voice; CitySpeech picks someone on screen every second or two and gives
 * them a line from their voice's script. Diners at the same table answer each other.
 */
export type Voice =
  | 'monk' | 'buddhist' | 'ringer'
  | 'dj' | 'singer' | 'dancer' | 'queue' | 'bouncer'
  | 'diner' | 'chef' | 'waiter'
  | 'walker'
  | 'vendor'
  | 'park' | 'fan' | 'player' | 'kid' | 'teacher' | 'seller' | 'buyer' | 'rider'

export interface Speaker {
  obj: Object3D
  voice: Voice
  /** people sharing a table reply to each other */
  table?: string
  /** height of the speech anchor above the person's origin */
  head: number
}

export interface Line { text: string; until: number; key: number; voice: Voice }

export const speakers = new Map<string, Speaker>()
export const lines = new Map<string, Line>()
let keySeq = 0

export function speak(id: string, text: string, ms = 3600) {
  const s = speakers.get(id)
  if (!s) return
  lines.set(id, { text, until: performance.now() + ms, key: ++keySeq, voice: s.voice })
}

const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)]

export const SCRIPTS: Record<Voice, string[]> = {
  monk: [
    'Nam mô A Di Đà Phật 🙏',
    'Nam mô Bổn Sư Thích Ca Mâu Ni Phật',
    'Nam mô Đại Từ Đại Bi Quán Thế Âm Bồ Tát',
    'Nguyện cho chúng sinh an lạc 🪷',
    'Tâm tịnh thì cõi tịnh…',
    'Buông xả muộn phiền, sống trọn hiện tại',
  ],
  buddhist: [
    'A Di Đà Phật 🙏',
    'Nam mô A Di Đà Phật…',
    'Con xin cầu cho gia đình bình an',
    'Cầu cho ba mẹ mạnh khỏe sống lâu 🙏',
    'Con xin sám hối những lỗi lầm',
    'Nguyện cầu quốc thái dân an',
    'Cầu cho RoboCorp làm ăn phát đạt 🙏',
    'Cầu cho con thi đỗ đại học…',
    'Thắp nén nhang, lòng thanh thản',
  ],
  ringer: ['Boong… boong… 🔔', 'Thỉnh chuông cầu an', 'Tiếng chuông ngân xa, phiền não tan'],
  dj: ['Are you ready?! 🎧', 'Drop the beat! 🔊', 'Tay lên trời nào! 🙌', 'Ồn ào lên nào RoboCity!', 'Bài tiếp theo cực cháy 🔥', 'Một… hai… ba… QUẨY!'],
  singer: [
    '♪ Đêm nay ta cùng say nhịp phố ♪',
    '♪ Neon sáng rực, tim đập theo bass ♪',
    '♪ Robot hay người cũng chung một điệu ♪',
    '♪ Oh oh oh, đừng dừng lại nhé ♪',
    '♪ Cầm tay em lướt giữa ánh đèn ♪',
    '🎤 Cả nhà hát cùng tôi nào!',
  ],
  dancer: ['Quẩy lên nào! 🔥', 'Bài này hay quá trời!', 'La la la ~ 🎵', 'Hands up! 🙌', 'DJ đỉnh thật sự!', 'Nhảy tới sáng luôn 💃', 'Mỏi chân mà vẫn muốn nhảy 😆'],
  queue: ['Hôm nay đông thế nhỉ', 'Nghe nói DJ mới xịn lắm', 'Sắp tới lượt mình rồi!', 'Nhạc nghe từ đây đã thấy phê'],
  bouncer: ['Cho xem vé nhé', 'Xếp hàng trật tự giúp mình', 'Mời vào, chúc vui vẻ!'],
  diner: [
    'Phở ở đây ngon nhất phố! 🍜',
    'Cho thêm chén nước mắm nhé',
    'Hôm nay deadline căng quá…',
    'Cuối tuần đi Đà Lạt không?',
    'Robot giao hàng nhanh ghê',
    'Em ơi, một ly trà đá!',
    'Nước dùng đậm đà thật',
    'Tính tiền giúp mình nhé',
    'Ăn xong làm ly cà phê muối nha ☕',
    'Nghe nói RoboCorp đang tuyển người',
  ],
  chef: ['Phở bò tái nạm ra đây! 🍜', 'Bún chả xong rồi!', 'Bàn nào gọi gyoza?', 'Nước dùng hầm 12 tiếng đấy!', 'Thêm hành, thêm rau thơm nha!'],
  waiter: ['Món của anh chị đây ạ! 🍜', 'Chúc cả nhà ngon miệng!', 'Dạ, có ngay ạ!', 'Cẩn thận nóng nha!'],
  vendor: ['Ai mua xôi không…', 'Bánh mì nóng giòn đây! 🥖', 'Chè đậu đỏ, chè thập cẩm đây!', 'Cốm Vòng thơm ngon đây!', 'Hoa quả tươi, mua đi cô ơi!'],
  park: ['Hít thở thật sâu… 🌿', 'Hồ hôm nay đẹp quá', 'Đi đạp vịt không em? 🦢', 'Chạy thêm một vòng nữa!', 'Gió hồ mát ghê', 'Chụp tấm ảnh trên cầu đỏ nha 📸'],
  fan: ['Vàooo!!! ⚽', 'Sút đi!', 'Hay quá trời!', 'Trọng tài ơi!!', 'Cố lên đội xanh! 💙', 'Đội đỏ vô địch! ❤️'],
  player: ['Chuyền đây!', 'Sút!', 'Theo người!', 'Lên bóng nhanh!', 'Gooool! ⚽'],
  kid: ['Ra chơi rồi! 🎉', 'Đuổi bắt không?', 'Hôm nay học toán khó ghê', 'Tớ được điểm 10! 💯', 'Chơi nhảy dây đi!', 'Trốn tìm nha!'],
  teacher: ['Các em xếp hàng ngay ngắn nào', 'Sắp vào lớp rồi nhé!', 'Nhớ làm bài tập về nhà nha'],
  seller: ['Rau tươi mới hái đây! 🥬', 'Cam ngọt lắm, mua đi em! 🍊', 'Cá tươi rói đây!', 'Mở hàng cho chị nha', 'Thanh long mới về! 🐉'],
  buyer: ['Bao nhiêu một ký vậy chị?', 'Bớt chút đi chị!', 'Lấy cho em hai bó rau', 'Hôm nay giá rẻ ghê', 'Cho em thêm hành nha'],
  rider: ['Tàu tới rồi! 🚝', 'Ga sau là ga RoboCorp', 'Đi metro nhanh thật', 'Nhớ giữ khoảng cách nhé'],
  walker: ['Trời hôm nay đẹp ghê', 'Đi ăn phở không?', 'Muộn giờ làm rồi!', 'Tối nay đi club nhé 🎶', 'Ghé chùa thắp nén nhang'],
}

/** replies that make a table sound like a conversation */
const REPLIES = [
  'Chuẩn luôn! 👍', 'Haha đúng rồi đó', 'Thật hả?', 'Để mình gọi thêm nhé', 'Ừ, đi chứ!', 'Công nhận ngon', 'Thôi ăn đi kẻo nguội 😄',
]

/** choose who speaks next; returns a follow-up to schedule for table talk */
export function chatter(candidates: string[]): { id: string; reply?: { id: string; text: string } } | null {
  const free = candidates.filter(id => !lines.has(id))
  if (!free.length) return null
  const id = pick(free)
  const s = speakers.get(id)!
  speak(id, pick(SCRIPTS[s.voice]))
  if (s.table) {
    const mates = [...speakers.entries()].filter(([o, t]) => o !== id && t.table === s.table).map(([o]) => o)
    if (mates.length && Math.random() < 0.75) return { id, reply: { id: pick(mates), text: pick(REPLIES) } }
  }
  return { id }
}
