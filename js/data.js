const SITE_CONFIG = {
  appName: 'SafeQR – QR Khẩn Cấp',
  tagline: 'Quét nhanh, hỗ trợ kịp thời',
  locality: 'TP. Thủ Đức, TP. Hồ Chí Minh',
  sosPhone: '112',
  version: '1.0.0'
};

const emergencyContacts = [
  {
    id: 'medical',
    name: 'Cấp cứu y tế',
    phone: '115',
    address: 'Bệnh viện Đa khoa khu vực Thủ Đức\n64 Lê Văn Việt, P. Hiệp Phú',
    mapsQuery: 'Bệnh viện Đa khoa khu vực Thủ Đức',
    icon: '🚑',
    color: '#e74c3c',
    description: 'Gọi cấp cứu khi có tai nạn, đột quỵ, khó thở, chấn thương nặng.'
  },
  {
    id: 'fire',
    name: 'Cảnh sát PCCC & CNCH',
    phone: '114',
    address: 'Đội PCCC Thủ Đức\n6A Đường số 12, P. Linh Trung',
    mapsQuery: 'Đội PCCC Thủ Đức',
    icon: '🚒',
    color: '#e67e22',
    description: 'Gọi khi xảy ra cháy nổ, sập nhà, cứu nạn trong đám cháy.'
  },
  {
    id: 'police',
    name: 'Công an địa phương',
    phone: '113',
    address: 'Công an phường sở tại\nLiên hệ theo địa bàn cư trú',
    mapsQuery: 'Công an phường gần nhất',
    icon: '👮',
    color: '#2c3e50',
    description: 'Gọi khi cần hỗ trợ an ninh, trộm cắp, tai nạn giao thông.'
  },
  {
    id: 'electricity',
    name: 'Điện lực',
    phone: '19001006',
    address: 'Điện lực Thủ Đức\n72 Võ Văn Ngân, P. Bình Thọ',
    mapsQuery: 'Điện lực Thủ Đức',
    icon: '⚡',
    color: '#f39c12',
    description: 'Báo sự cố điện: chập điện, đứt dây, mất điện kéo dài.'
  },
  {
    id: 'water',
    name: 'Cấp nước',
    phone: '19001047',
    address: 'Công ty Cấp nước Thủ Đức\nSố 2 Đường số 8, P. Linh Xuân',
    mapsQuery: 'Công ty Cấp nước Thủ Đức',
    icon: '💧',
    color: '#3498db',
    description: 'Báo vỡ đường ống, rò rỉ nước, mất nước đột ngột.'
  },
  {
    id: 'ward',
    name: 'Đường dây nóng UBND phường',
    phone: '19001133',
    address: 'UBND phường sở tại\nLiên hệ theo địa bàn cư trú',
    mapsQuery: 'UBND phường gần nhất',
    icon: '🆘',
    color: '#9b59b6',
    description: 'Phản ánh khẩn cấp về an ninh trật tự, sự cố hạ tầng, cứu trợ.'
  }
];

const externalEmergencyNumbers = [
  { name: 'Tổng đài khẩn cấp quốc gia', phone: '112' },
  { name: 'Bảo vệ dân phòng', phone: '069.2348560' },
  { name: 'Cứu hộ giao thông', phone: '19008099' },
  { name: 'Đường dây nóng Bộ Y tế', phone: '1900.9095' }
];
