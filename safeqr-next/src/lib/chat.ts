// ============================================
// SafeQR v2 — Local Chat Knowledge Base (Vietnamese First-Aid)
// ============================================

interface LocalAnswer {
  keywords: string[];
  reply: string;
}

const KNOWLEDGE_BASE: LocalAnswer[] = [
  {
    keywords: ["bỏng", "phỏng", "lửa", "nhiệt"],
    reply:
      "🚑 Sơ cứu BỎNG:\n\n1. Làm mát vết bỏng dưới vòi nước sạch 15-20 phút (không dùng nước đá)\n2. Tháo bỏ quần áo, trang sức quanh vùng bỏng trước khi sưng\n3. Che vết bỏng bằng gạc sạch hoặc màng bọc thực phẩm\n4. KHÔNG bôi kem đánh răng, dầu, nước mắm lên vết bỏng\n5. Gọi 115 nếu bỏng rộng > lòng bàn tay hoặc ở mặt, tay, chân, bộ phận sinh dục",
  },
  {
    keywords: ["cháy", "thoát hiểm", "khói", "cứu hỏa", "đám cháy"],
    reply:
      "🔥 THOÁT HIỂM KHI CHÁY:\n\n1. Bò thấp dưới khói, dùng khăn ướt che mũi miệng\n2. Kiểm tra cửa trước khi mở: sờ tay vào cửa, nếu nóng thì KHÔNG mở\n3. Thoát theo lối thoát hiểm, KHÔNG dùng thang máy\n4. Nếu kẹt trong phòng: bịt khe cửa bằng vải ướt, gọi 114 báo vị trí\n5. Gọi 114 ngay khi an toàn",
  },
  {
    keywords: ["đột quỵ", "tai biến", "stroke", "méo miệng"],
    reply:
      "⚠️ Dấu hiệu ĐỘT QUỴ — FAST:\n\nF (Face) — Mặt bị lệch, cười méo\nA (Arms) — Yếu/tê một bên tay, không nâng được 2 tay\nS (Speech) — Nói khó, nói ngọng, không hiểu lời nói\nT (Time) — GỌI 115 NGAY LẬP TỨC\n\nTrong khi chờ:\n- Để nạn nhân nằm nghiêng an toàn\n- KHÔNG cho ăn uống (nguy cơ sặc)\n- Ghi nhớ thời điểm khởi phát triệu chứng",
  },
  {
    keywords: ["tai nạn", "giao thông", "va chạm", "xe"],
    reply:
      "🚗 Sơ cứu TAI NẠN GIAO THÔNG:\n\n1. Đảm bảo an toàn hiện trường (bật hazard lights, đặt cảnh báo)\n2. Gọi 115 (cấp cứu) và 113 (công an)\n3. KHÔNG di chuyển nạn nhân nếu không có nguy cơ cháy nổ\n4. Cầm máu vết thương hở bằng vải sạch, ấn chặt\n5. Giữ ấm, trấn an nạn nhân",
  },
  {
    keywords: ["cpr", "tim", "ngừng tim", "hô hấp", "ép tim"],
    reply:
      "❤️ HƯỚNG DẪN CPR (ÉP TIM NGOÀI LỒNG NGỰC):\n\n1. Kiểm tra an toàn & gọi 115\n2. Kiểm tra phản ứng: lay gọi nạn nhân\n3. Mở đường thở: ngửa đầu, nâng cằm\n4. Ép tim: Đặt 2 tay chồng lên giữa ngực, ấn sâu 5-6cm, tốc độ 100-120 lần/phút\n5. Thổi ngạt (nếu được đào tạo): 30 lần ép tim → 2 lần thổi ngạt\n\nTiếp tục cho đến khi xe cấp cứu đến hoặc nạn nhân tỉnh.",
  },
  {
    keywords: ["điện", "giật", "điện giật", "chập"],
    reply:
      "⚡ Sơ cứu ĐIỆN GIẬT:\n\n1. NGẮT NGUỒN ĐIỆN trước khi tiếp cận (cầu dao, aptomat)\n2. Nếu không ngắt được: dùng vật KHÔ dẫn điện (cây gỗ, chổi nhựa) đẩy nạn nhân khỏi nguồn điện\n3. KHÔNG chạm trực tiếp vào nạn nhân khi chưa ngắt điện\n4. Kiểm tra hô hấp và mạch — CPR nếu cần\n5. Gọi 115 — bỏng điện có thể sâu hơn nhìn thấy bên ngoài",
  },
  {
    keywords: ["rắn", "cắn", "rết", "côn trùng", "ong"],
    reply:
      "🐍 Sơ cứu RẮN CẮN:\n\n1. Giữ bình tĩnh, nằm yên, để vùng bị cắn THẤP hơn tim\n2. Rửa vết cắn bằng nước sạch, băng nhẹ (không garo chặt)\n3. Cởi đồ trang sức gần vết cắn (sẽ sưng)\n4. KHÔNG rạch, châm, chích, hút nọc\n5. Chụp ảnh con rắn nếu an toàn (để xác định loài)\n6. Gọi 115 và đến bệnh viện có huyết thanh kháng nọc",
  },
];

/**
 * Find a local knowledge base answer for a query.
 */
export function findLocalAnswer(query: string): string | null {
  const q = query.toLowerCase().trim();
  if (!q) return null;

  // Exact match first
  for (const entry of KNOWLEDGE_BASE) {
    for (const kw of entry.keywords) {
      if (q.includes(kw)) {
        return entry.reply;
      }
    }
  }

  // Fallback: count keyword matches
  let bestMatch: LocalAnswer | null = null;
  let bestScore = 0;

  for (const entry of KNOWLEDGE_BASE) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (q.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  if (bestMatch && bestScore > 0) return bestMatch.reply;

  // General fallback
  return null;
}

export function getDefaultWelcomeMessage(): string {
  return (
    "Xin chào! Tôi là trợ lý sơ cứu SafeQR. 🏥\n\n" +
    "Tôi có thể hướng dẫn bạn sơ cứu cơ bản trong các tình huống khẩn cấp. " +
    "Hãy chọn một chủ đề bên dưới hoặc nhập câu hỏi của bạn.\n\n" +
    "⚠️ Lưu ý: Đây chỉ là hướng dẫn sơ bộ. Trong tình huống khẩn cấp, hãy gọi ngay 115!"
  );
}

export function getFallbackMessage(): string {
  return (
    "Tôi chưa có thông tin về vấn đề này. Vui lòng gọi 115 để được hỗ trợ khẩn cấp. " +
    "Bạn cũng có thể thử hỏi về: bỏng, cháy, đột quỵ, tai nạn giao thông, CPR, điện giật."
  );
}
