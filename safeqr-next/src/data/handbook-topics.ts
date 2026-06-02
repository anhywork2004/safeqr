// ============================================
// SafeQR v2 — First-Aid Handbook Topics
// ============================================
import type { HandbookTopic, Spread } from "@/types";

export const COVER_INSIDE: HandbookTopic = { coverInside: true } as HandbookTopic;

export const TOPICS: HandbookTopic[] = [
  {
    num: "01",
    icon: "🔥",
    accent: "#e74c3c",
    title: "Sơ cứu khi bị bỏng",
    items: [
      "Làm mát vết bỏng dưới <strong>vòi nước sạch 15-20 phút</strong> – không dùng nước đá",
      "Tháo bỏ quần áo, trang sức quanh vùng bỏng <strong>trước khi sưng tấy</strong>",
      "Che vết bỏng bằng <strong>gạc sạch</strong> hoặc màng bọc thực phẩm",
      "<strong>Không</strong> bôi kem đánh răng, dầu, mỡ trăn, nước mắm lên vết bỏng",
      "<strong>Không</strong> làm vỡ các nốt phồng rộp – dễ gây nhiễm trùng",
      "Bỏng rộng hơn lòng bàn tay hoặc ở mặt, khớp, bộ phận sinh dục: đến viện ngay",
    ],
    call: "Gọi 115 nếu bỏng nặng, diện rộng",
  },
  {
    num: "02",
    icon: "🧯",
    accent: "#e67e22",
    title: "Thoát hiểm khi cháy",
    items: [
      "Bò thấp dưới khói – khói bay lên cao, không khí sạch ở dưới thấp",
      "Dùng <strong>khăn ướt che mũi miệng</strong> để lọc khói độc",
      "Kiểm tra cửa: sờ mu bàn tay vào cửa. <strong>Nóng = không mở</strong>",
      "Thoát theo lối thoát hiểm, <strong>không dùng thang máy</strong>",
      "Bị kẹt: bịt khe cửa bằng vải ướt, gọi <strong>114</strong> và báo vị trí",
      "Ra ngoài an toàn: không quay vào lấy đồ",
    ],
    fast: [
      "Gọi 114 ngay khi phát hiện cháy",
      "Bò thấp – khăn ướt – thoát nhanh",
      "Không thang máy – không quay lại",
    ],
    call: "Gọi 114 – Cảnh sát PCCC",
  },
  {
    num: "03",
    icon: "🧠",
    accent: "#c62828",
    title: "Nhận biết đột quỵ – FAST",
    items: [
      "<strong>F (Face – Mặt):</strong> cười méo, một bên mặt rủ xuống",
      "<strong>A (Arms – Tay):</strong> yếu/tê một bên, không nâng được cả hai tay",
      "<strong>S (Speech – Nói):</strong> nói khó, nói ngọng, không hiểu lời",
      "<strong>T (Time – Thời gian):</strong> gọi <strong>115 NGAY LẬP TỨC</strong>",
    ],
    tips: "Để nạn nhân nằm nghiêng an toàn. Không cho ăn uống. Ghi nhớ giờ khởi phát.",
    numbers: [
      { label: "Cấp cứu", num: "115", color: "#e74c3c" },
    ],
    call: "Mỗi phút trôi qua, 2 triệu neuron chết đi. Gọi 115 ngay!",
  },
  {
    num: "04",
    icon: "🚗",
    accent: "#2c3e50",
    title: "Tai nạn giao thông",
    items: [
      "Đảm bảo <strong>an toàn hiện trường</strong> – bật hazard lights, đặt cảnh báo",
      "Gọi <strong>115 (cấp cứu) và 113 (công an)</strong>",
      "<strong>Không di chuyển nạn nhân</strong> nếu không có nguy cơ cháy nổ",
      "Cầm máu vết thương hở bằng vải sạch, <strong>ấn chặt liên tục</strong>",
      "Giữ ấm và trấn an nạn nhân trong lúc chờ xe cấp cứu",
    ],
    numbers: [
      { label: "Cấp cứu", num: "115", color: "#e74c3c" },
      { label: "Công an", num: "113", color: "#2c3e50" },
    ],
    call: "Gọi 115 và 113 khi có tai nạn",
  },
  {
    num: "05",
    icon: "❤️",
    accent: "#e74c3c",
    title: "CPR – Ép tim ngoài lồng ngực",
    items: [
      "1. Kiểm tra an toàn & gọi <strong>115</strong>",
      "2. Kiểm tra phản ứng: lay gọi nạn nhân to",
      "3. Mở đường thở: ngửa đầu, nâng cằm",
      "4. Ép tim: 2 tay chồng lên giữa ngực, ấn sâu <strong>5–6 cm</strong>",
      "5. Tốc độ: <strong>100–120 lần/phút</strong> – theo nhịp bài \"Stayin' Alive\"",
    ],
    tips: "Thổi ngạt (nếu được đào tạo): 30 ép tim → 2 thổi ngạt. Tiếp tục cho đến khi xe cấp cứu đến.",
    fast: ["Gọi 115", "Ép tim 100-120/phút", "Sâu 5-6cm", "Không dừng"],
    numbers: [
      { label: "Cấp cứu", num: "115", color: "#e74c3c" },
    ],
    call: "Tiếp tục CPR đến khi xe cấp cứu tới – đừng dừng lại!",
  },
  {
    num: "06",
    icon: "⚡",
    accent: "#f39c12",
    title: "Sơ cứu điện giật",
    items: [
      "<strong>NGẮT NGUỒN ĐIỆN</strong> trước khi tiếp cận (cầu dao, aptomat)",
      "Không ngắt được: dùng vật <strong>khô không dẫn điện</strong> đẩy nạn nhân ra",
      "<strong>Không chạm trực tiếp</strong> vào nạn nhân khi chưa ngắt điện",
      "Kiểm tra hô hấp & mạch – <strong>CPR ngay nếu cần</strong>",
      "Gọi 115. Bỏng điện có thể <strong>sâu hơn nhìn thấy bên ngoài</strong>",
    ],
    call: "Gọi 115 – bỏng điện là chấn thương nặng",
  },
  {
    num: "07",
    icon: "🦴",
    accent: "#9b59b6",
    title: "Gãy xương & bong gân",
    items: [
      "<strong>Không di chuyển</strong> phần bị gãy – nẹp cố định tại chỗ",
      "Dùng nẹp cứng (gỗ, bìa cứng, tạp chí cuộn) dài hơn khớp trên và dưới",
      "Buộc cố định trên và dưới chỗ gãy – <strong>không buộc quá chặt</strong>",
      "Chườm đá giảm sưng – không chườm trực tiếp lên da",
      "Gãy hở (xương đâm ra ngoài): <strong>không đẩy xương vào</strong>, che bằng gạc sạch",
    ],
    call: "Gọi 115 nếu gãy lớn, gãy hở, hoặc nghi ngờ gãy cột sống",
  },
  {
    num: "08",
    icon: "🐍",
    accent: "#27ae60",
    title: "Rắn cắn & côn trùng độc",
    items: [
      "Giữ bình tĩnh – <strong>nằm yên</strong>, để vết cắn <strong>thấp hơn tim</strong>",
      "Rửa vết cắn bằng nước sạch",
      "Băng nhẹ (không garo chặt) quanh vết cắn",
      "<strong>Không</strong> rạch, châm, chích, hút nọc độc",
      "Chụp ảnh con rắn nếu an toàn – giúp bệnh viện chọn huyết thanh đúng",
    ],
    tips: "Cởi đồ trang sức gần vết cắn (sẽ sưng). Gọi 115 và đến bệnh viện có huyết thanh kháng nọc.",
    call: "Gọi 115 – đến viện có huyết thanh ngay",
  },
  {
    num: "09",
    icon: "💊",
    accent: "#e74c3c",
    title: "Ngộ độc thực phẩm & hóa chất",
    items: [
      "Gọi <strong>Trung tâm Chống độc hoặc 115</strong>",
      "<strong>Không tự ý gây nôn</strong> nếu nạn nhân uống chất ăn mòn (axit, kiềm)",
      "Giữ lại mẫu chất nghi ngờ để bác sĩ xác định",
      "Nới lỏng quần áo, để nạn nhân nằm nghiêng an toàn nếu nôn",
      "Ngộ độc khí: <strong>mở cửa sổ, đưa nạn nhân ra không khí sạch</strong>",
    ],
    numbers: [
      { label: "Cấp cứu", num: "115", color: "#e74c3c" },
      { label: "Chống độc", num: "1900.9095", color: "#e67e22" },
    ],
    call: "Gọi Trung tâm Chống độc hoặc 115 ngay lập tức",
  },
  {
    num: "10",
    icon: "🆘",
    accent: "#2c3e50",
    title: "Số khẩn cấp tại Việt Nam",
    closing: true,
    text: "Lưu tất cả các số này vào danh bạ điện thoại. Trong tình huống khẩn cấp, một cuộc gọi có thể cứu sống sinh mạng.",
    numbers: [
      { label: "Cấp cứu y tế", num: "115", color: "#e74c3c" },
      { label: "Cứu hỏa", num: "114", color: "#e67e22" },
      { label: "Công an", num: "113", color: "#2c3e50" },
      { label: "Tổng đài khẩn cấp", num: "112", color: "#9b59b6" },
    ],
    call: "Hãy lưu ngay các số này! Chia sẻ cho người thân và bạn bè.",
  },
];

export const SPREADS: Spread[] = [
  { index: 0, left: COVER_INSIDE, right: TOPICS[0], label: "🔥 Bỏng" },
  { index: 1, left: TOPICS[1], right: TOPICS[2], label: "🧯 Cháy & Đột quỵ" },
  { index: 2, left: TOPICS[3], right: TOPICS[4], label: "🚗 Tai nạn & CPR" },
  { index: 3, left: TOPICS[5], right: TOPICS[6], label: "⚡ Điện & Gãy xương" },
  { index: 4, left: TOPICS[7], right: TOPICS[8], label: "🐍 Rắn & Ngộ độc" },
  { index: 5, left: TOPICS[9], right: null, label: "🆘 Số khẩn cấp" },
];
