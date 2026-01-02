export function normalizeHHmm(value: string, fallback = "08:00") {
  // acepta "8:0", "08:0", etc.
  const m = value.trim().match(/^(\d{1,2}):(\d{1,2})$/);
  if (!m) return fallback;

  const hh = Number(m[1]);
  const mm = Number(m[2]);

  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return fallback;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return fallback;

  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function isEndAfterStart(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const s = sh * 60 + sm;
  const e = eh * 60 + em;
  return e > s;
}

export const addMinutesHHmm = (hhmm: string, minutesToAdd: number) => {
  const [hh, mm] = hhmm.split(":").map(Number);
  const total = (hh * 60 + mm + minutesToAdd) % (24 * 60);
  const nh = String(Math.floor(total / 60)).padStart(2, "0");
  const nm = String(total % 60).padStart(2, "0");
  return `${nh}:${nm}`;
};
