import { normalizeHHmm } from "./time";

export function deriveStartEnd(params: {
  time?: string;
  startTime?: string;
  endTime?: string;
}) {
  const start = normalizeHHmm(params.startTime ?? params.time ?? "08:00");

  // si viene endTime úsalo, si no: +30 min
  let end = params.endTime ? normalizeHHmm(params.endTime, "08:30") : "";

  if (!end) {
    const [h, m] = start.split(":").map(Number);
    const total = h * 60 + m + 30;
    const hh = Math.floor((total % (24 * 60)) / 60);
    const mm = total % 60;
    end = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  }

  return { startTime: start, endTime: end };
}
