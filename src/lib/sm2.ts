// SM-2 spaced repetition
// quality: 0=again, 3=hard, 4=good, 5=easy
export type SM2Input = { ease: number; interval_days: number; reps: number };
export type SM2Output = { ease: number; interval_days: number; reps: number; due_at: string };

export function sm2(prev: SM2Input, quality: 0 | 3 | 4 | 5): SM2Output {
  let { ease, interval_days, reps } = prev;
  if (quality < 3) {
    reps = 0;
    interval_days = 1;
  } else {
    reps += 1;
    if (reps === 1) interval_days = 1;
    else if (reps === 2) interval_days = 3;
    else interval_days = Math.round(interval_days * ease);
    ease = Math.max(1.3, ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  }
  const due = new Date(Date.now() + interval_days * 86400_000);
  return { ease, interval_days, reps, due_at: due.toISOString() };
}

export function qualityLabel(q: 0 | 3 | 4 | 5) {
  return { 0: "Again", 3: "Hard", 4: "Good", 5: "Easy" }[q];
}
