// City Simulation: RoboBistro (Food), CyberPagoda (Chùa An Lạc AI), NeonClub (Vũ trường Cyber DJ)
// Ultra-lightweight logic: runs smoothly in parallel with RoboCorp without overhead.

export interface CompanyMetrics {
  id: string
  name: string
  tagline: string
  icon: string
  color: string
  cash: number
  revenue: number
  ordersToday: number
  todayRevenue: number
  satisfaction: number
  statusText: string
}

export class CitySimulation {
  myoffice: CompanyMetrics = {
    id: 'myoffice',
    name: 'MyOffice AI Agency',
    tagline: 'Phòng Lab Lập trình & Đại bản doanh Dev',
    icon: '🏢',
    color: '#10B981',
    cash: 78000,
    revenue: 34500,
    ordersToday: 28,
    todayRevenue: 2800,
    satisfaction: 98,
    statusText: 'Director đang họp phòng Meeting, Dev đang code và gõ máy tính liên hồi.',
  }

  bistro: CompanyMetrics = {
    id: 'bistro',
    name: 'RoboBistro & Bar',
    tagline: 'Phố Ẩm thực, Bếp Ramen & Cafe AI',
    icon: '🍜',
    color: '#F97316',
    cash: 52000,
    revenue: 21400,
    ordersToday: 64,
    todayRevenue: 1250,
    satisfaction: 95,
    statusText: 'Chef-Bot đang xào mì Ramen bốc khói. Khách đang ngồi thưởng thức tại quầy bar.',
  }

  pagoda: CompanyMetrics = {
    id: 'pagoda',
    name: 'Chùa An Lạc AI',
    tagline: 'Thiền viện Công nghệ & Phật tử Robot',
    icon: '🛕',
    color: '#EAB308',
    cash: 38000,
    revenue: 14200,
    ordersToday: 32,
    todayRevenue: 680,
    satisfaction: 99,
    statusText: '3 Monk-Bot đang ngồi thiền quanh đỉnh trầm hương, chuông đồng ngân vang thanh tịnh.',
  }

  club: CompanyMetrics = {
    id: 'club',
    name: 'Neon Beats Club',
    tagline: 'Vũ trường Cyberpunk & DJ Robot',
    icon: '🪩',
    color: '#8B5CF6',
    cash: 95000,
    revenue: 41200,
    ordersToday: 42,
    todayRevenue: 2450,
    satisfaction: 98,
    statusText: 'DJ-Bot đang drop beat EDM cực bốc. Đèn laser xoay tròn, sàn nhảy quẩy nhiệt tình!',
  }

  private timer = 0

  advance(gameMinutes: number) {
    this.timer += gameMinutes

    // Every ~15 game minutes, simulate an order or activity
    if (this.timer >= 15) {
      this.timer = 0

      // MyOffice tasks & revenue
      if (Math.random() < 0.55) {
        const orderVal = Math.round(50 + Math.random() * 120)
        this.myoffice.ordersToday++
        this.myoffice.todayRevenue += orderVal
        this.myoffice.revenue += orderVal
        this.myoffice.cash += Math.round(orderVal * 0.8)
      }

      // Bistro order
      if (Math.random() < 0.65) {
        const orderVal = Math.round(18 + Math.random() * 40)
        this.bistro.ordersToday++
        this.bistro.todayRevenue += orderVal
        this.bistro.revenue += orderVal
        this.bistro.cash += Math.round(orderVal * 0.6)
      }

      // Pagoda công đức / phước lành
      if (Math.random() < 0.40) {
        const meritVal = Math.round(20 + Math.random() * 50)
        this.pagoda.ordersToday++
        this.pagoda.todayRevenue += meritVal
        this.pagoda.revenue += meritVal
        this.pagoda.cash += meritVal
      }

      // Club vé & đồ uống
      if (Math.random() < 0.50) {
        const clubVal = Math.round(35 + Math.random() * 85)
        this.club.ordersToday++
        this.club.todayRevenue += clubVal
        this.club.revenue += clubVal
        this.club.cash += Math.round(clubVal * 0.75)
      }
    }
  }

  resetNewDay() {
    this.myoffice.ordersToday = 0
    this.myoffice.todayRevenue = 0
    this.bistro.ordersToday = 0
    this.bistro.todayRevenue = 0
    this.pagoda.ordersToday = 0
    this.pagoda.todayRevenue = 0
    this.club.ordersToday = 0
    this.club.todayRevenue = 0
  }
}

export const citySim = new CitySimulation()
