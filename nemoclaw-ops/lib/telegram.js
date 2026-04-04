// lib/telegram.js — Shared Telegram API helpers (raw HTTPS, no SDK)
const https = require('https');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

/**
 * Raw HTTPS POST to Telegram Bot API
 */
function apiCall(method, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const url = new URL(`${API_BASE}/${method}`);

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let chunks = '';
      res.on('data', (chunk) => (chunks += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(chunks);
          resolve(parsed);
        } catch (err) {
          reject(new Error(`Failed to parse Telegram response: ${chunks}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/**
 * Send a text message to a chat
 */
async function sendMessage(chatId, text, options = {}) {
  const chunks = chunkMessage(text);
  for (const chunk of chunks) {
    await apiCall('sendMessage', {
      chat_id: chatId,
      text: chunk,
      parse_mode: options.parse_mode || undefined,
      ...options,
    });
  }
}

/**
 * Send typing indicator
 */
async function sendTyping(chatId) {
  await apiCall('sendChatAction', {
    chat_id: chatId,
    action: 'typing',
  });
}

/**
 * Send a message with inline keyboard buttons
 */
async function sendInlineKeyboard(chatId, text, buttons) {
  return apiCall('sendMessage', {
    chat_id: chatId,
    text,
    reply_markup: {
      inline_keyboard: buttons,
    },
  });
}

/**
 * Answer a callback query (button press acknowledgment)
 */
async function answerCallbackQuery(callbackQueryId, text, showAlert = false) {
  return apiCall('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
    show_alert: showAlert,
  });
}

/**
 * Edit an existing message's text
 */
async function editMessageText(chatId, messageId, text, options = {}) {
  return apiCall('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    ...options,
  });
}

/**
 * Long-poll for updates
 */
async function getUpdates(offset, timeout = 30) {
  return apiCall('getUpdates', {
    offset,
    timeout,
    allowed_updates: ['message', 'callback_query'],
  });
}

/**
 * Chunk long messages to stay under Telegram's 4096 char limit
 */
function chunkMessage(text, maxLen = 4000) {
  if (text.length <= maxLen) return [text];

  const chunks = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }

    // Try to break at a newline
    let splitAt = remaining.lastIndexOf('\n', maxLen);
    if (splitAt === -1 || splitAt < maxLen / 2) {
      // Fall back to space
      splitAt = remaining.lastIndexOf(' ', maxLen);
    }
    if (splitAt === -1 || splitAt < maxLen / 2) {
      // Hard cut
      splitAt = maxLen;
    }

    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }

  return chunks;
}

module.exports = {
  apiCall,
  sendMessage,
  sendTyping,
  sendInlineKeyboard,
  answerCallbackQuery,
  editMessageText,
  getUpdates,
  chunkMessage,
};
