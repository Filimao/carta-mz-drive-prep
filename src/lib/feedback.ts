/** Small device-feedback helpers (vibration + text-to-speech). Safe no-ops when unsupported. */
export function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}

export const haptics = {
  select: () => vibrate(10),
  correct: () => vibrate(40),
  wrong: () => vibrate([60, 60, 60]),
};

export function canSpeak() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(text: string, onEnd?: () => void) {
  if (!canSpeak()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "pt-PT";
  const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith("pt"));
  if (voice) u.voice = voice;
  u.rate = 0.95;
  if (onEnd) u.onend = onEnd;
  synth.speak(u);
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
}
