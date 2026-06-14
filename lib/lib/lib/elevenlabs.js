// lib/elevenlabs.js
// Converts agent text into audio Twilio can play directly (mu-law 8kHz).

const axios = require("axios");

const CHUNK_BYTES = 160; // 20ms of audio at 8000 bytes/sec (mulaw 8-bit, 8kHz)

/**
 * Calls ElevenLabs and returns an array of base64-encoded mulaw audio chunks
 * ready to send to Twilio as media events.
 */
async function textToTwilioAudio({ apiKey, voiceId, text }) {
  if (!text || !text.trim()) return [];

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=ulaw_8000`;

  const response = await axios.post(
    url,
    {
      text,
      model_id: "eleven_turbo_v2_5",
      voice_settings: {
        stability: 0.45,
        similarity_boost: 0.8,
        style: 0.35,
        use_speaker_boost: true,
      },
    },
    {
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/basic",
      },
      responseType: "arraybuffer",
      timeout: 30000,
    }
  );

  const buffer = Buffer.from(response.data);
  const chunks = [];
  for (let i = 0; i < buffer.length; i += CHUNK_BYTES) {
    chunks.push(buffer.subarray(i, i + CHUNK_BYTES).toString("base64"));
  }
  return chunks;
}

module.exports = { textToTwilioAudio };
