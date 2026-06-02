// POST /api/chat — AI Chat (emergency guidance, secure)
// Sanitizes all user input to prevent XSS.
import {
  parseBody,
  sanitizeInput,
  validateStringLength,
  jsonResponse,
  errorResponse,
  handleOptions,
  MAX_CHAT_MESSAGE_LENGTH,
} from './_security.js';

// Emergency first-aid guide responses (Vietnamese)
const EMERGENCY_GUIDE = {
  'bỏng': '🩹 **Sơ cứu bỏng:**\n1. Làm mát vết bỏng dưới vòi nước sạch 15-20 phút\n2. Không bôi kem đánh răng, dầu, nước mắm\n3. Che vết bỏng bằng gạc sạch\n4. Không làm vỡ bọng nước\n5. Gọi 115 nếu bỏng nặng (>10% cơ thể)',
  'cháy': '🚒 **Khi có cháy trong nhà:**\n1. Bình tĩnh, hô hoán mọi người\n2. Cúi thấp người, dùng khăn ướt che mũi miệng\n3. Thoát ra ngoài theo lối thoát hiểm gần nhất\n4. Không dùng thang máy\n5. Gọi 114 ngay khi ra ngoài\n6. Nếu quần áo bắt lửa: nằm xuống, lăn qua lại',
  'đột quỵ': '🧠 **Dấu hiệu đột quỵ (FAST):**\n- F (Face): Mặt lệch, méo miệng\n- A (Arms): Yếu liệt tay chân một bên\n- S (Speech): Nói khó, nói ngọng\n- T (Time): Gọi 115 NGAY LẬP TỨC\n\nTrong khi chờ: đặt nạn nhân nằm nghiêng an toàn, nới lỏng quần áo, không cho ăn uống.',
  'tai nạn': '🚗 **Sơ cứu tai nạn giao thông:**\n1. Đảm bảo an toàn hiện trường\n2. Gọi 115 và 113\n3. Không di chuyển nạn nhân nếu nghi chấn thương cột sống\n4. Cầm máu vết thương hở bằng vải sạch\n5. Giữ ấm cho nạn nhân\n6. Nếu ngưng tim ngưng thở: thực hiện CPR',
  'cpr': '❤️ **Cách thực hiện CPR (Hồi sinh tim phổi):**\n1. Đảm bảo an toàn\n2. Kiểm tra nạn nhân có tỉnh không\n3. Gọi 115\n4. Ép tim: đặt 2 tay giữa ngực, ấn sâu 5-6cm, tần suất 100-120/phút\n5. 30 lần ép tim → 2 lần thổi ngạt\n6. Tiếp tục đến khi cấp cứu đến',
  'điện': '⚡ **Sơ cứu điện giật:**\n1. KHÔNG chạm vào nạn nhân khi chưa ngắt nguồn điện\n2. Ngắt cầu dao, rút phích cắm\n3. Dùng vật khô không dẫn điện (gậy gỗ, nhựa) gạt dây điện\n4. Kiểm tra hô hấp và mạch\n5. Nếu ngưng thở: thực hiện CPR ngay\n6. Gọi 115\n7. Điều trị bỏng điện nếu có',
};

// Blocklist: reject messages containing these patterns
const BLOCKLIST = [
  /<script/i,
  /<iframe/i,
  /<object/i,
  /<embed/i,
  /<link/i,
  /<meta/i,
  /javascript:/i,
  /data:text\/html/i,
  /on\w+\s*=/i,   // inline event handlers (onclick=, onerror=, etc.)
  /<\/?\w+/i,      // any HTML-like tags
];

function isSafeMessage(message) {
  for (const pattern of BLOCKLIST) {
    if (pattern.test(message)) return false;
  }
  return true;
}

export async function onRequestPost(context) {
  const { request } = context;

  try {
    // Parse and validate body
    const { data: body, error: parseError } = await parseBody(request, 4096);
    if (parseError) return errorResponse(parseError, 400);

    // Sanitize and validate the message
    const rawMessage = String(body.message || '');
    const message = sanitizeInput(rawMessage).trim();

    if (!validateStringLength(message, 1, MAX_CHAT_MESSAGE_LENGTH)) {
      return errorResponse('Message must be between 1 and 500 characters', 400);
    }

    // Blocklist check on the original (pre-sanitization) input
    if (!isSafeMessage(rawMessage)) {
      return errorResponse('Invalid message content', 400);
    }

    const lowerMessage = message.toLowerCase();
    let reply = '';

    // Match against known emergency topics
    for (const [key, guide] of Object.entries(EMERGENCY_GUIDE)) {
      if (lowerMessage.includes(key)) {
        reply = guide;
        break;
      }
    }

    if (!reply) {
      reply = '🤖 **Trợ lý SafeQR:**\n\nTôi có thể hướng dẫn sơ cứu về:\n• 🔥 Bỏng\n• 🚒 Thoát hiểm khi cháy\n• 🧠 Đột quỵ\n• 🚗 Tai nạn giao thông\n• ❤️ CPR (Hồi sinh tim phổi)\n• ⚡ Điện giật\n\nHãy hỏi cụ thể một trong các chủ đề trên.\n\n📞 **Số khẩn cấp:** 112 - 113 - 114 - 115';
    }

    return jsonResponse({ reply });
  } catch (e) {
    console.error('[Chat] Error:', e.message);
    return errorResponse('Internal error', 500);
  }
}

export async function onRequestOptions() {
  return handleOptions('POST, OPTIONS');
}
