// lib/deepgram.js
// Live speech-to-text for the prospect's voice, streamed from Twilio.
// Emits 'transcript' for finalized speech and 'speechStarted' for barge-in detection.

const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");

function createLiveTranscriber({ apiKey, onTranscript, onSpeechStarted, onError }) {
  const deepgram = createClient(apiKey);

  const connection = deepgram.listen.live({
    model: "nova-2-phonecall",
    language: "en-US",
    encoding: "mulaw",
    sample_rate: 8000,
    channels: 1,
    smart_format: true,
    interim_results: true,
    endpointing: 400, // ms of silence before finalizing
    vad_events: true,
    punctuate: true,
  });

  connection.on(LiveTranscriptionEvents.Open, () => {
    console.log("[deepgram] connection open");
  });

  connection.on(LiveTranscriptionEvents.Transcript, (data) => {
    const alt = data?.channel?.alternatives?.[0];
    const text = alt?.transcript || "";
    if (!text) return;

    if (data.is_final && data.speech_final) {
      onTranscript && onTranscript(text.trim());
    }
  });

  connection.on(LiveTranscriptionEvents.SpeechStarted, () => {
    onSpeechStarted && onSpeechStarted();
  });

  connection.on(LiveTranscriptionEvents.Error, (err) => {
    console.error("[deepgram] error:", err);
    onError && onError(err);
  });

  connection.on(LiveTranscriptionEvents.Close, () => {
    console.log("[deepgram] connection closed");
  });

  return {
    sendAudio: (base64MulawChunk) => {
      try {
        const buf = Buffer.from(base64MulawChunk, "base64");
        connection.send(buf);
      } catch (e) {
        console.error("[deepgram] send error:", e.message);
      }
    },
    close: () => {
      try {
        connection.requestClose();
      } catch (e) {}
    },
  };
}

module.exports = { createLiveTranscriber };
