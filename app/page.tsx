"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

type TrainingType =
  | "Kein Training"
  | "Ruhetag"
  | "Spaziergang"
  | "Walken"
  | "Laufen"
  | "Zone 2"
  | "Intervall"
  | "Schwelle"
  | "Kraft Oberkörper"
  | "Kraft Beine"
  | "Kraft Ganzkörper"
  | "Mobility"
  | "Sonstiges";

type PreferredTraining = "Egal" | "Rad" | "Laufen" | "Walken" | "Spaziergang" | "Kraft";
type TrainingSession = {
  type: TrainingType;
  note: string;
  load: number;
};

type DayEntry = {
  date: string;
  weight: number;
  waist: number;
  sleepHours: number;
  sleepScore: number;
  hrvNight: number;
  hrv7d: number;
  restingHr: number;
  stressAvg: number;
  bodyBatteryMorning: number;
  soreness: number;
  energyFeeling: number;
  preferredTraining: PreferredTraining;
  yesterdaySessions: TrainingSession[];
  completedWorkout: boolean;
  completedTrainingType: TrainingType;
  completedLoad: number;
  completedDuration: number;
  completedRpe: number;
  completedNote: string;
};

type Recommendation = {
  ampel: "GRUEN" | "GELB" | "ROT";
  recommendation: string;
  hint: string;
  bmi: number;
  bmiText: string;
  trendHint: string;
  primaryWorkout: string;
  workoutTitle: string;
  workoutDescription: string;
  durationText: string;
  heartRateText: string;
  strengthFocus: string;
  alternativeWorkout: string;
};

type HeartRateZones = {
  zone1Min: number;
  zone1Max: number;
  zone2Min: number;
  zone2Max: number;
  zone3Min: number;
  zone3Max: number;
  zone4Min: number;
  zone4Max: number;
  zone5Min: number;
  zone5Max: number;
};

type Profile = {
  id: string;
  name: string;
  heightCm: number;
  zones: HeartRateZones;
  entries: DayEntry[];
};

type TrainingFeedbackForm = {
  completedWorkout: boolean;
  completedTrainingType: TrainingType;
  completedLoad: number;
  completedDuration: number;
  completedRpe: number;
  completedNote: string;
};

const STORAGE_KEY = "mario-coach-profiles-v2";
const ACTIVE_PROFILE_KEY = "mario-coach-active-profile-v2";

const trainingOptions: TrainingType[] = [
  "Kein Training",
  "Ruhetag",
  "Spaziergang",
  "Walken",
  "Laufen",
  "Zone 2",
  "Intervall",
  "Schwelle",
  "Kraft Oberkörper",
  "Kraft Beine",
  "Kraft Ganzkörper",
  "Mobility",
  "Sonstiges",
];

const preferredTrainingOptions: PreferredTraining[] = [
  "Egal",
  "Rad",
  "Laufen",
  "Walken",
  "Spaziergang",
  "Kraft",
];

const defaultZonesMario: HeartRateZones = {
  zone1Min: 95,
  zone1Max: 114,
  zone2Min: 110,
  zone2Max: 129,
  zone3Min: 130,
  zone3Max: 148,
  zone4Min: 149,
  zone4Max: 165,
  zone5Min: 166,
  zone5Max: 180,
};

const defaultZonesManuela: HeartRateZones = {
  zone1Min: 90,
  zone1Max: 110,
  zone2Min: 111,
  zone2Max: 128,
  zone3Min: 129,
  zone3Max: 145,
  zone4Min: 146,
  zone4Max: 160,
  zone5Min: 161,
  zone5Max: 175,
};

const emptyForm: DayEntry = {
  date: "",
  weight: "" as unknown as number,
  waist: "" as unknown as number,
  sleepHours: "" as unknown as number,
  sleepScore: "" as unknown as number,
  hrvNight: "" as unknown as number,
  hrv7d: "" as unknown as number,
  restingHr: "" as unknown as number,
  stressAvg: "" as unknown as number,
  bodyBatteryMorning: "" as unknown as number,
  soreness: "" as unknown as number,
  energyFeeling: "" as unknown as number,
  preferredTraining: "Egal",
  yesterdaySessions: [
    {
      type: "Kein Training",
      note: "",
      load: 0,
    },
  ],
  completedWorkout: false,
  completedTrainingType: "Kein Training",
  completedLoad: 0,
  completedDuration: 0,
  completedRpe: 0,
  completedNote: "",
};

const emptyFeedback: TrainingFeedbackForm = {
  completedWorkout: false,
  completedTrainingType: "Kein Training",
  completedLoad: 0,
  completedDuration: 0,
  completedRpe: 0,
  completedNote: "",
};

const defaultProfiles: Profile[] = [
  {
    id: "mario",
    name: "Mario",
    heightCm: 178,
    zones: defaultZonesMario,
    entries: [],
  },
  {
    id: "manuela",
    name: "Manuela",
    heightCm: 168,
    zones: defaultZonesManuela,
    entries: [],
  },
];

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalize(text: string) {
  return text.toLowerCase().trim();
}

function isHardTraining(type: TrainingType, note?: string) {
  const t = normalize(type);
  const n = normalize(note ?? "");
  return (
    t.includes("intervall") ||
    t.includes("schwelle") ||
    t.includes("kraft beine") ||
    t.includes("ganzkörper") ||
    n.includes("intervall") ||
    n.includes("schwelle") ||
    n.includes("vo2")
  );
}

function calcBmi(weight: number, heightCm: number) {
  const heightM = heightCm / 100;
  if (!heightM) return 0;
  return weight / (heightM * heightM);
}

function getBmiText(bmi: number) {
  if (bmi === 0) return "";
  if (bmi < 18.5) return "Untergewicht";
  if (bmi < 25) return "Normalbereich";
  if (bmi < 30) return "Leicht erhöht";
  return "Erhöht";
}

function compareDatesAsc(a: DayEntry, b: DayEntry) {
  return a.date.localeCompare(b.date);
}

function getTrainingLabel(entry: DayEntry) {
  if (!entry.yesterdaySessions || entry.yesterdaySessions.length === 0) {
    return "Kein Training";
  }

  return entry.yesterdaySessions
    .map((session) => {
      const note = session.note?.trim();
      const loadText = session.load > 0 ? ` (Load ${session.load})` : "";
      return note
        ? `${session.type} – ${note}${loadText}`
        : `${session.type}${loadText}`;
    })
    .join(" | ");
}

function formatZone(min: number, max: number) {
  return `${min}–${max} bpm`;
}

function getCompletionLabel(entry: DayEntry) {
  if (!entry.completedWorkout) return "Nicht als erledigt markiert";
  const parts: string[] = ["Erledigt"];
  if (entry.completedDuration > 0) parts.push(`${entry.completedDuration} min`);
  if (entry.completedLoad > 0) parts.push(`Load ${entry.completedLoad}`);
  if (entry.completedRpe > 0) parts.push(`RPE ${entry.completedRpe}/10`);
  return parts.join(" · ");
}

function getZone2ShortPlan(zones: HeartRateZones) {
  return {
    primaryWorkout: "Zone 2 Rad",
    workoutTitle: "Zone 2 kurz",
    workoutDescription:
      "10 min locker einrollen, danach 30–35 min gleichmäßig im Grundlagenbereich fahren, zum Schluss 5–10 min ausrollen.",
    durationText: "45–55 min",
    heartRateText: `Zone 2: ${formatZone(zones.zone2Min, zones.zone2Max)}`,
    strengthFocus: "Kein schweres Beintraining zusätzlich",
  };
}

function getZone2LongPlan(zones: HeartRateZones) {
  return {
    primaryWorkout: "Zone 2 Rad",
    workoutTitle: "Zone 2 lang",
    workoutDescription:
      "10 min locker einrollen, danach 45–60 min sauber und ruhig im Grundlagenbereich fahren, zum Schluss 5–10 min locker ausfahren.",
    durationText: "60–80 min",
    heartRateText: `Zone 2: ${formatZone(zones.zone2Min, zones.zone2Max)}`,
    strengthFocus: "Nur leichtes Oberkörper- oder Mobility-Training zusätzlich",
  };
}

function getThresholdPlan(zones: HeartRateZones) {
  return {
    primaryWorkout: "Schwelle Rad",
    workoutTitle: "Schwelle 3×8 min",
    workoutDescription:
      "15 min locker einrollen, dann 3×8 min kontrolliert hart im oberen Bereich mit 4 min locker dazwischen, danach 10 min ausrollen.",
    durationText: "55–70 min",
    heartRateText: `Belastung vor allem Zone 4: ${formatZone(zones.zone4Min, zones.zone4Max)}`,
    strengthFocus: "Keine harten Beine zusätzlich",
  };
}

function getIntervalPlan(zones: HeartRateZones) {
  return {
    primaryWorkout: "Intervall Rad",
    workoutTitle: "Intervall 5×3 min",
    workoutDescription:
      "15 min locker einrollen, dann 5×3 min hart mit 3 min sehr locker dazwischen, danach 10–15 min ausrollen.",
    durationText: "50–65 min",
    heartRateText: `Belastung Zone 4–5: ${formatZone(zones.zone4Min, zones.zone4Max)} / ${formatZone(
      zones.zone5Min,
      zones.zone5Max
    )}`,
    strengthFocus: "Keine zusätzliche harte Beinkraft",
  };
}

function getUpperBodyPlan() {
  return {
    primaryWorkout: "Kraft",
    workoutTitle: "Oberkörper Standard",
    workoutDescription:
      "5–10 min mobilisieren, dann 5–6 Übungen für Brust, Rücken, Schulter, Arme und Core. 2–4 Sätze je Übung, sauber und kontrolliert.",
    durationText: "35–50 min",
    heartRateText: "-",
    strengthFocus: "Oberkörper",
  };
}

function getFullBodyShortPlan() {
  return {
    primaryWorkout: "Kraft",
    workoutTitle: "Ganzkörper kurz",
    workoutDescription:
      "5–10 min mobilisieren, dann 4–6 Übungen für Beine, Drücken, Ziehen und Rumpf. Nicht bis ans Limit gehen, sondern technisch sauber bleiben.",
    durationText: "30–45 min",
    heartRateText: "-",
    strengthFocus: "Ganzkörper moderat",
  };
}

function getLegPlan() {
  return {
    primaryWorkout: "Kraft",
    workoutTitle: "Beine fokussiert",
    workoutDescription:
      "5–10 min mobilisieren, dann 4–5 Übungen für Beine und Gesäß. Saubere Technik, genug Satzpausen, nicht zusätzlich noch hartes Radtraining.",
    durationText: "40–55 min",
    heartRateText: "-",
    strengthFocus: "Kraft Beine",
  };
}

function getMobilityPlan() {
  return {
    primaryWorkout: "Regeneration",
    workoutTitle: "Mobility + Spaziergang",
    workoutDescription:
      "10–15 min Mobility für Hüfte, Rücken, Schulter und anschließend 20–30 min lockere Bewegung oder Spaziergang.",
    durationText: "20–45 min",
    heartRateText: "-",
    strengthFocus: "Nur locker bewegen",
  };
}

function getRecoveryRidePlan(zones: HeartRateZones) {
  return {
    primaryWorkout: "Regeneration",
    workoutTitle: "Lockeres Rad",
    workoutDescription:
      "Ganz locker fahren, Beine nur durchbewegen, kein Druck aufbauen. Alternativ Spaziergang.",
    durationText: "20–40 min",
    heartRateText: `Zone 1: ${formatZone(zones.zone1Min, zones.zone1Max)}`,
    strengthFocus: "Kein Krafttraining",
  };
}

function getRecommendation(
  entries: DayEntry[],
  selectedDate: string,
  heightCm: number,
  zones: HeartRateZones
): Recommendation {
  const sorted = [...entries].sort(compareDatesAsc);
  const index = sorted.findIndex((entry) => entry.date === selectedDate);

  if (index === -1) {
    return {
      ampel: "GELB",
      recommendation: "Noch keine Daten",
      hint: "Bitte zuerst Eintrag erfassen",
      bmi: 0,
      bmiText: "",
      trendHint: "",
      primaryWorkout: "Noch kein Vorschlag",
      workoutTitle: "-",
      workoutDescription: "-",
      durationText: "-",
      heartRateText: "-",
      strengthFocus: "-",
      alternativeWorkout: "-",
    };
  }

  const current = sorted[index];
  const recent = sorted.slice(Math.max(0, index - 2), index + 1);

  const avgSleep = average(recent.map((entry) => entry.sleepHours));
  const avgStress = average(recent.map((entry) => entry.stressAvg));
  const avgBattery = average(recent.map((entry) => entry.bodyBatteryMorning));
  const avgLoad = average(
    recent.map((entry) =>
      (entry.yesterdaySessions ?? []).reduce(
        (sum, session) => sum + Number(session.load || 0),
        0
      )
    )
  );

  const bmi = calcBmi(current.weight, heightCm);

  const currentTotalLoad = (current.yesterdaySessions ?? []).reduce(
    (sum, session) => sum + Number(session.load || 0),
    0
  );

  const hardYesterday = (current.yesterdaySessions ?? []).some((session) =>
    isHardTraining(session.type, session.note)
  );

  let score = 0;

  if (current.bodyBatteryMorning >= 85) score += 3;
  else if (current.bodyBatteryMorning >= 75) score += 2;
  else if (current.bodyBatteryMorning >= 65) score += 1;
  else if (current.bodyBatteryMorning < 45) score -= 2;
  else if (current.bodyBatteryMorning < 55) score -= 1;

  if (current.sleepScore >= 85) score += 2;
  else if (current.sleepScore >= 78) score += 1;
  else if (current.sleepScore < 65) score -= 2;
  else if (current.sleepScore < 75) score -= 1;

  if (current.sleepHours >= 7.5) score += 1;
  else if (current.sleepHours < 6.5) score -= 1;

  if (current.hrv7d > 0) {
    const hrvDelta = current.hrvNight - current.hrv7d;
    if (hrvDelta >= 2) score += 2;
    else if (hrvDelta >= -1) score += 1;
    else if (hrvDelta <= -6) score -= 2;
    else if (hrvDelta <= -3) score -= 1;
  }

  if (current.restingHr <= 48) score += 1;
  else if (current.restingHr >= 56) score -= 1;

  if (current.stressAvg <= 25) score += 1;
  else if (current.stressAvg >= 40) score -= 1;

  if (current.soreness <= 2) score += 1;
  else if (current.soreness >= 6) score -= 2;
  else if (current.soreness >= 4) score -= 1;

  if (current.energyFeeling >= 8) score += 2;
  else if (current.energyFeeling >= 6) score += 1;
  else if (current.energyFeeling <= 3) score -= 2;
  else if (current.energyFeeling <= 4) score -= 1;

  if (currentTotalLoad >= 170) score -= 3;
  else if (currentTotalLoad >= 140) score -= 2;
  else if (currentTotalLoad >= 110) score -= 1;
  else if (currentTotalLoad <= 60) score += 1;

  if (hardYesterday) {
    if (currentTotalLoad >= 140) score -= 2;
    else if (currentTotalLoad >= 100) score -= 1;
  }

  if (avgSleep >= 7.2) score += 1;
  else if (avgSleep < 6.8) score -= 1;

  if (avgStress > 35) score -= 1;
  if (avgBattery >= 75) score += 1;
  if (avgLoad >= 130) score -= 1;

  if (bmi >= 30) score -= 1;
  if (current.waist >= 105) score -= 1;

  const excellentRecovery =
    current.bodyBatteryMorning >= 72 &&
    current.sleepScore >= 78 &&
    current.hrvNight >= current.hrv7d - 1 &&
    current.stressAvg <= 32 &&
    current.soreness <= 3 &&
    current.energyFeeling >= 6;

  const poorRecovery =
    current.bodyBatteryMorning < 55 ||
    current.sleepScore < 70 ||
    current.hrvNight < current.hrv7d - 5 ||
    current.stressAvg >= 40 ||
    current.soreness >= 6 ||
    current.energyFeeling <= 3;

  if (hardYesterday && currentTotalLoad >= 140 && poorRecovery) {
    const recoveryPlan =
      current.preferredTraining === "Kraft" ? getMobilityPlan() : getRecoveryRidePlan(zones);

    return {
      ampel: "ROT",
      recommendation: "REGENERATION",
      hint: "Gestern war hart und die Erholung heute ist nicht gut genug",
      bmi,
      bmiText: getBmiText(bmi),
      trendHint: "Heute zuerst regenerieren, dann wieder Qualität.",
      ...recoveryPlan,
      alternativeWorkout: "Kompletter Ruhetag",
    };
  }

  if (hardYesterday && excellentRecovery && currentTotalLoad <= 120 && score >= 5) {
    if (current.preferredTraining === "Kraft") {
      const plan = hardYesterday ? getUpperBodyPlan() : getLegPlan();
      return {
        ampel: "GRUEN",
        recommendation: "KRAFT",
        hint: "Trotz hartem Vortag sind Erholung und Tagesform heute stark",
        bmi,
        bmiText: getBmiText(bmi),
        trendHint: "Readiness ist hoch – Qualitätstraining ist vertretbar.",
        ...plan,
        alternativeWorkout: getThresholdPlan(zones).workoutTitle,
      };
    }

    const plan = current.energyFeeling >= 8 ? getIntervalPlan(zones) : getThresholdPlan(zones);

    return {
      ampel: "GRUEN",
      recommendation: "QUALITÄT",
      hint: "Trotz hartem Vortag sind Erholung und Tagesform heute stark",
      bmi,
      bmiText: getBmiText(bmi),
      trendHint: "Readiness ist hoch – Qualitätstraining ist vertretbar.",
      ...plan,
      alternativeWorkout: "Oberkörper Standard",
    };
  }

  if (score >= 6) {
    if (current.preferredTraining === "Kraft") {
      const plan = hardYesterday ? getUpperBodyPlan() : current.energyFeeling >= 8 ? getLegPlan() : getFullBodyShortPlan();
      return {
        ampel: "GRUEN",
        recommendation: "KRAFT",
        hint: "Körper bereit für starken Trainingsreiz",
        bmi,
        bmiText: getBmiText(bmi),
        trendHint: "Readiness und Verlauf passen für Qualität.",
        ...plan,
        alternativeWorkout: getZone2LongPlan(zones).workoutTitle,
      };
    }

    const plan = current.energyFeeling >= 8 ? getIntervalPlan(zones) : getThresholdPlan(zones);

    return {
      ampel: "GRUEN",
      recommendation: "INTERVALL",
      hint: "Körper bereit für harten Reiz",
      bmi,
      bmiText: getBmiText(bmi),
      trendHint: "Readiness und Verlauf passen für Qualität.",
      ...plan,
      alternativeWorkout: hardYesterday ? "Oberkörper Standard" : "Zone 2 lang",
    };
  }

  if (score >= 3) {
    if (current.preferredTraining === "Kraft") {
      const plan = hardYesterday ? getUpperBodyPlan() : getFullBodyShortPlan();
      return {
        ampel: "GELB",
        recommendation: "KRAFT MODERAT",
        hint: hardYesterday
          ? "Gestern war fordernd – heute eher kontrolliert statt Vollgas"
          : "Heute kontrolliert trainieren und Reserven nicht komplett verbrauchen",
        bmi,
        bmiText: getBmiText(bmi),
        trendHint:
          avgSleep < 7 ? "Schlaftrend bremst heute etwas." : "Solide Basis, aber nicht Vollgas.",
        ...plan,
        alternativeWorkout: getZone2ShortPlan(zones).workoutTitle,
      };
    }

    const plan = current.energyFeeling >= 7 ? getZone2LongPlan(zones) : getZone2ShortPlan(zones);

    return {
      ampel: "GELB",
      recommendation: "ZONE 2 oder KRAFT",
      hint: hardYesterday
        ? "Gestern war fordernd – heute eher kontrolliert statt Vollgas"
        : "Heute kontrolliert trainieren und Reserven nicht komplett verbrauchen",
      bmi,
      bmiText: getBmiText(bmi),
      trendHint:
        avgSleep < 7 ? "Schlaftrend bremst heute etwas." : "Solide Basis, aber nicht Vollgas.",
      ...plan,
      alternativeWorkout: hardYesterday ? "Oberkörper Standard" : "Ganzkörper kurz",
    };
  }

  const recoveryPlan =
    current.preferredTraining === "Kraft" ? getMobilityPlan() : getRecoveryRidePlan(zones);

  return {
    ampel: "ROT",
    recommendation: "REGENERATION",
    hint: "Zu viele Signale sprechen heute gegen hohe Intensität",
    bmi,
    bmiText: getBmiText(bmi),
    trendHint:
      avgStress > 35
        ? "Stressverlauf ist derzeit zu hoch für harte Reize."
        : "Heute zuerst Reserven aufbauen.",
    ...recoveryPlan,
    alternativeWorkout: "Kompletter Ruhetag",
  };
}

function getAmpelStyle(ampel: Recommendation["ampel"]) {
  if (ampel === "GRUEN") {
    return {
      bg: "#dcfce7",
      border: "#86efac",
      text: "#166534",
      badge: "#bbf7d0",
      icon: "🟢",
    };
  }

  if (ampel === "GELB") {
    return {
      bg: "#fef9c3",
      border: "#fde047",
      text: "#854d0e",
      badge: "#fef08a",
      icon: "🟡",
    };
  }

  return {
    bg: "#fee2e2",
    border: "#fca5a5",
    text: "#991b1b",
    badge: "#fecaca",
    icon: "🔴",
  };
}

function formatDisplayDate(date: string) {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getTodayDateString() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

function sanitizeLoadedProfiles(raw: unknown): Profile[] {
  if (!Array.isArray(raw)) return defaultProfiles;

  const loaded = raw.map((profile) => {
    const p = profile as Partial<Profile> & {
      zones?: Partial<HeartRateZones>;
    };

    const entriesRaw = Array.isArray(p.entries) ? p.entries : [];
    const fallbackZones = p.id === "manuela" ? defaultZonesManuela : defaultZonesMario;

    const entries: DayEntry[] = entriesRaw
      .map((item) => {
        const entry = item as Partial<DayEntry> & { yesterdayTraining?: string };

        const mappedType: TrainingType =
          trainingOptions.includes((entry as any).yesterdayTrainingType as TrainingType)
            ? ((entry as any).yesterdayTrainingType as TrainingType)
            : trainingOptions.includes(entry.yesterdayTraining as TrainingType)
              ? (entry.yesterdayTraining as TrainingType)
              : "Kein Training";

        const preferredTraining: PreferredTraining =
          preferredTrainingOptions.includes(entry.preferredTraining as PreferredTraining)
            ? (entry.preferredTraining as PreferredTraining)
            : "Egal";

        const yesterdaySessions: TrainingSession[] = Array.isArray((entry as any).yesterdaySessions)
          ? (entry as any).yesterdaySessions.map((session: any) => ({
            type: trainingOptions.includes(session?.type as TrainingType)
              ? (session.type as TrainingType)
              : "Kein Training",
            note: String(session?.note ?? ""),
            load: Number(session?.load ?? 0),
          }))
          : [
            {
              type: mappedType,
              note: String((entry as any).yesterdayTrainingNote ?? ""),
              load: Number((entry as any).yesterdayLoad ?? 0),
            },
          ];

        return {
          date: String(entry.date ?? ""),
          weight: Number(entry.weight ?? 0),
          waist: Number(entry.waist ?? 0),
          sleepHours: Number(entry.sleepHours ?? 0),
          sleepScore: Number(entry.sleepScore ?? 0),
          hrvNight: Number(entry.hrvNight ?? 0),
          hrv7d: Number(entry.hrv7d ?? 0),
          restingHr: Number(entry.restingHr ?? 0),
          stressAvg: Number(entry.stressAvg ?? 0),
          bodyBatteryMorning: Number(entry.bodyBatteryMorning ?? 0),
          soreness: Number(entry.soreness ?? 0),
          energyFeeling: Number(entry.energyFeeling ?? 5),
          preferredTraining,
          yesterdaySessions,
          completedWorkout: Boolean(entry.completedWorkout ?? false),
          completedTrainingType: trainingOptions.includes(entry.completedTrainingType as TrainingType)
            ? (entry.completedTrainingType as TrainingType)
            : "Kein Training",
          completedLoad: Number(entry.completedLoad ?? 0),
          completedDuration: Number(entry.completedDuration ?? 0),
          completedRpe: Number(entry.completedRpe ?? 0),
          completedNote: String(entry.completedNote ?? ""),
        };
      })
      .filter((entry) => entry.date);

    return {
      id: String(p.id ?? ""),
      name: String(p.name ?? ""),
      heightCm: Number(p.heightCm ?? 0),
      zones: {
        zone1Min: Number(p.zones?.zone1Min ?? fallbackZones.zone1Min),
        zone1Max: Number(p.zones?.zone1Max ?? fallbackZones.zone1Max),
        zone2Min: Number(p.zones?.zone2Min ?? fallbackZones.zone2Min),
        zone2Max: Number(p.zones?.zone2Max ?? fallbackZones.zone2Max),
        zone3Min: Number(p.zones?.zone3Min ?? fallbackZones.zone3Min),
        zone3Max: Number(p.zones?.zone3Max ?? fallbackZones.zone3Max),
        zone4Min: Number(p.zones?.zone4Min ?? fallbackZones.zone4Min),
        zone4Max: Number(p.zones?.zone4Max ?? fallbackZones.zone4Max),
        zone5Min: Number(p.zones?.zone5Min ?? fallbackZones.zone5Min),
        zone5Max: Number(p.zones?.zone5Max ?? fallbackZones.zone5Max),
      },
      entries,
    };
  });

  const merged = defaultProfiles.map((defaultProfile) => {
    const found = loaded.find((p) => p.id === defaultProfile.id);
    return found
      ? {
        ...defaultProfile,
        ...found,
        entries: found.entries ?? [],
        heightCm: found.heightCm || defaultProfile.heightCm,
        zones: {
          ...defaultProfile.zones,
          ...(found.zones ?? {}),
        },
      }
      : defaultProfile;
  });

  return merged;
}
function getFormTrendLabel(result: Recommendation, selectedEntry: DayEntry | null) {
  if (!selectedEntry) return "Noch keine Daten";

  if (result.ampel === "GRUEN") {
    if (
      result.recommendation.includes("INTERVALL") ||
      result.recommendation.includes("QUALITÄT")
    ) {
      return "Frisch für Qualität";
    }
    if (result.recommendation.includes("KRAFT")) {
      return "Belastbar";
    }
    return "Form steigt";
  }

  if (result.ampel === "GELB") {
    return "Formerhalt";
  }

  return "Erholung nötig";
}
function getLoadLabel(load: number) {
  if (load <= 0) return "-";
  if (load < 60) return "leicht";
  if (load < 120) return "mittel";
  return "hart";
}
export default function Home() {
  const [profiles, setProfiles] = useState<Profile[]>(defaultProfiles);
  const [activeProfileId, setActiveProfileId] = useState<string>("mario");
  const [activeTab, setActiveTab] = useState<
    "heute" | "eingabe" | "verlauf" | "analyse" | "zonen"
  >("eingabe");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<TrainingFeedbackForm>(emptyFeedback);
  const [form, setForm] = useState<DayEntry>({
    ...emptyForm,
    date: getTodayDateString(),
  });

  useEffect(() => {
    try {
      const rawProfiles = localStorage.getItem(STORAGE_KEY);
      const rawActiveProfile = localStorage.getItem(ACTIVE_PROFILE_KEY);

      if (rawProfiles) {
        const parsedProfiles = sanitizeLoadedProfiles(JSON.parse(rawProfiles));
        setProfiles(parsedProfiles);

        const initialProfileId =
          rawActiveProfile && parsedProfiles.some((p) => p.id === rawActiveProfile)
            ? rawActiveProfile
            : parsedProfiles[0]?.id ?? "mario";

        setActiveProfileId(initialProfileId);

        const activeProfile = parsedProfiles.find((p) => p.id === initialProfileId);
        const sorted = [...(activeProfile?.entries ?? [])].sort(compareDatesAsc);
        setSelectedDate(sorted.length > 0 ? sorted[sorted.length - 1].date : "");
      } else {
        setProfiles(defaultProfiles);
        setActiveProfileId("mario");
      }
    } catch (error) {
      console.error("Fehler beim Laden aus localStorage:", error);
      setProfiles(defaultProfiles);
      setActiveProfileId("mario");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_PROFILE_KEY, activeProfileId);
  }, [activeProfileId]);

  const activeProfile = useMemo(() => {
    return profiles.find((profile) => profile.id === activeProfileId) ?? profiles[0];
  }, [profiles, activeProfileId]);

  const entries = activeProfile?.entries ?? [];
  const heightCm = activeProfile?.heightCm ?? 178;
  const zones = activeProfile?.zones ?? defaultZonesMario;

  const sortedEntries = useMemo(() => {
    return [...entries].sort(compareDatesAsc);
  }, [entries]);

  const selectedEntry = useMemo(() => {
    if (sortedEntries.length === 0) return null;
    return (
      sortedEntries.find((entry) => entry.date === selectedDate) ??
      sortedEntries[sortedEntries.length - 1]
    );
  }, [sortedEntries, selectedDate]);

  useEffect(() => {
    if (!selectedEntry) {
      setFeedback(emptyFeedback);
      return;
    }

    setFeedback({
      completedWorkout: selectedEntry.completedWorkout,
      completedTrainingType: selectedEntry.completedTrainingType,
      completedLoad: selectedEntry.completedLoad,
      completedDuration: selectedEntry.completedDuration,
      completedRpe: selectedEntry.completedRpe,
      completedNote: selectedEntry.completedNote,
    });
  }, [selectedEntry]);

  const result = useMemo(() => {
    if (!selectedEntry) {
      return {
        ampel: "GELB" as const,
        recommendation: "Noch keine Daten",
        hint: "Bitte zuerst Eintrag erfassen",
        bmi: 0,
        bmiText: "",
        trendHint: "",
        primaryWorkout: "Noch kein Vorschlag",
        workoutTitle: "-",
        workoutDescription: "-",
        durationText: "-",
        heartRateText: "-",
        strengthFocus: "-",
        alternativeWorkout: "-",
      };
    }

    return getRecommendation(sortedEntries, selectedEntry.date, heightCm, zones);
  }, [sortedEntries, selectedEntry, heightCm, zones]);

  const ampelStyle = getAmpelStyle(result.ampel);
  const formTrendLabel = getFormTrendLabel(result, selectedEntry);
  const last3 = sortedEntries.slice(-3);
  const avgSleep3 = average(last3.map((entry) => entry.sleepHours)).toFixed(1);
  const avgStress3 = average(last3.map((entry) => entry.stressAvg)).toFixed(0);
  const avgBattery3 = average(last3.map((entry) => entry.bodyBatteryMorning)).toFixed(0);
  const avgLoad3 = average(
    last3.map((entry) =>
      (entry.yesterdaySessions ?? []).reduce(
        (sum, session) => sum + Number(session.load || 0),
        0
      )
    )
  ).toFixed(0);

  function updateActiveProfile(updater: (profile: Profile) => Profile) {
    setProfiles((prev) =>
      prev.map((profile) =>
        profile.id === activeProfileId ? updater(profile) : profile
      )
    );
  }

  function handleProfileChange(nextProfileId: string) {
    setActiveProfileId(nextProfileId);
    setEditingDate(null);
    setFeedback(emptyFeedback);
    setForm({
      ...emptyForm,
      date: getTodayDateString(),
    });

    const nextProfile = profiles.find((profile) => profile.id === nextProfileId);
    const nextSorted = [...(nextProfile?.entries ?? [])].sort(compareDatesAsc);
    setSelectedDate(nextSorted.length > 0 ? nextSorted[nextSorted.length - 1].date : "");
    setActiveTab("heute");
  }

  function updateForm<K extends keyof DayEntry>(key: K, value: DayEntry[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addYesterdaySession() {
    setForm((prev) => ({
      ...prev,
      yesterdaySessions: [
        ...prev.yesterdaySessions,
        { type: "Kein Training", note: "", load: 0 },
      ],
    }));
  }

  function updateYesterdaySession(
    index: number,
    key: keyof TrainingSession,
    value: string | number
  ) {
    setForm((prev) => ({
      ...prev,
      yesterdaySessions: prev.yesterdaySessions.map((session, i) =>
        i === index
          ? {
            ...session,
            [key]: key === "load" ? Number(value) : value,
          }
          : session
      ),
    }));
  }

  function removeYesterdaySession(index: number) {
    setForm((prev) => ({
      ...prev,
      yesterdaySessions:
        prev.yesterdaySessions.length <= 1
          ? [{ type: "Kein Training", note: "", load: 0 }]
          : prev.yesterdaySessions.filter((_, i) => i !== index),
    }));
  }

  function updateFeedback<K extends keyof TrainingFeedbackForm>(
    key: K,
    value: TrainingFeedbackForm[K]
  ) {
    setFeedback((prev) => ({ ...prev, [key]: value }));
  }

  function updateHeight(value: number) {
    updateActiveProfile((profile) => ({
      ...profile,
      heightCm: value,
    }));
  }

  function updateZone<K extends keyof HeartRateZones>(key: K, value: number) {
    updateActiveProfile((profile) => ({
      ...profile,
      zones: {
        ...profile.zones,
        [key]: value,
      },
    }));
  }

  function resetForm() {
    setForm({
      ...emptyForm,
      date: getTodayDateString(),
    });
    setEditingDate(null);
  }

  function copyFromLastEntry() {
    if (sortedEntries.length === 0) {
      alert("Noch kein Eintrag vorhanden, von dem übernommen werden kann.");
      return;
    }

    const latest = sortedEntries[sortedEntries.length - 1];
    setForm({
      ...latest,
      date: getTodayDateString(),
    });
    setEditingDate(null);
    setActiveTab("eingabe");
  }

  function copyEntryToForm(entry: DayEntry) {
    setForm({ ...entry });
    setEditingDate(entry.date);
    setActiveTab("eingabe");
  }

  function duplicateEntryToNewDate(entry: DayEntry) {
    setForm({
      ...entry,
      date: getTodayDateString(),
      completedWorkout: false,
      completedTrainingType: "Kein Training",
      completedLoad: 0,
      completedDuration: 0,
      completedRpe: 0,
      completedNote: "",
    });
    setEditingDate(null);
    setActiveTab("eingabe");
  }

  function deleteEntry(date: string) {
    const ok = window.confirm(
      `Eintrag vom ${formatDisplayDate(date)} bei ${activeProfile?.name} wirklich löschen?`
    );
    if (!ok) return;

    updateActiveProfile((profile) => ({
      ...profile,
      entries: profile.entries.filter((entry) => entry.date !== date),
    }));

    if (selectedDate === date) {
      const nextEntries = entries.filter((entry) => entry.date !== date).sort(compareDatesAsc);
      setSelectedDate(nextEntries.length > 0 ? nextEntries[nextEntries.length - 1].date : "");
    }

    if (editingDate === date) {
      resetForm();
    }
  }

  function saveEntry() {
    if (!form.date) {
      alert("Bitte zuerst ein Datum eingeben.");
      return;
    }

    const cleaned: DayEntry = {
      ...form,
      weight: Number(form.weight),
      waist: Number(form.waist),
      sleepHours: Number(form.sleepHours),
      sleepScore: Number(form.sleepScore),
      hrvNight: Number(form.hrvNight),
      hrv7d: Number(form.hrv7d),
      restingHr: Number(form.restingHr),
      stressAvg: Number(form.stressAvg),
      bodyBatteryMorning: Number(form.bodyBatteryMorning),
      soreness: Number(form.soreness),
      energyFeeling: Number(form.energyFeeling),
      yesterdaySessions: (form.yesterdaySessions ?? []).map((session) => ({
        type: session.type,
        note: session.note,
        load: Number(session.load),
      })),
      completedLoad: Number(form.completedLoad),
      completedDuration: Number(form.completedDuration),
      completedRpe: Number(form.completedRpe),
    };

    const nextEntries = [...entries.filter((entry) => entry.date !== cleaned.date), cleaned].sort(
      compareDatesAsc
    );

    updateActiveProfile((profile) => ({
      ...profile,
      entries: nextEntries,
    }));

    setSelectedDate(cleaned.date);
    resetForm();
    setActiveTab("heute");
  }

  function saveFeedbackForSelectedEntry() {
    if (!selectedEntry) return;

    const selectedEntryDate = selectedEntry.date;

    updateActiveProfile((profile) => ({
      ...profile,
      entries: profile.entries
        .map((entry) =>
          entry.date === selectedEntryDate
            ? {
              ...entry,
              completedWorkout: feedback.completedWorkout,
              completedTrainingType: feedback.completedTrainingType,
              completedLoad: Number(feedback.completedLoad),
              completedDuration: Number(feedback.completedDuration),
              completedRpe: Number(feedback.completedRpe),
              completedNote: feedback.completedNote,
            }
            : entry
        )
        .sort(compareDatesAsc),
    }));
  }

  function markSelectedAsDone() {
    if (!selectedEntry) return;

    const durationFallback =
      feedback.completedDuration > 0
        ? feedback.completedDuration
        : parseInt(result.durationText, 10) || 45;

    setFeedback((prev) => ({
      ...prev,
      completedWorkout: true,
      completedTrainingType:
        prev.completedTrainingType !== "Kein Training"
          ? prev.completedTrainingType
          : ((selectedEntry?.yesterdaySessions?.[0]?.type ?? "Kein Training") as TrainingType),
      completedLoad: prev.completedLoad > 0 ? prev.completedLoad : 60,
      completedDuration: durationFallback,
      completedRpe: prev.completedRpe > 0 ? prev.completedRpe : 6,
    }));
  }

  function resetSelectedFeedback() {
    setFeedback(emptyFeedback);

    if (!selectedEntry) return;

    const selectedEntryDate = selectedEntry.date;

    updateActiveProfile((profile) => ({
      ...profile,
      entries: profile.entries
        .map((entry) =>
          entry.date === selectedEntryDate
            ? {
              ...entry,
              completedWorkout: false,
              completedTrainingType: "Kein Training" as TrainingType,
              completedLoad: 0,
              completedDuration: 0,
              completedRpe: 0,
              completedNote: "",
            }
            : entry
        )
        .sort(compareDatesAsc),
    }));
  }

  return (
    <main style={styles.page}>
      <div style={styles.phone}>
        <section style={styles.headerCard}>
          <div>
            <div style={styles.kicker}>Trainings-App Mehrbenutzer</div>
            <h1 style={styles.title}>PeakForm</h1>
            <p style={styles.subtitle}>
              Train smarter. Perform better
            </p>
          </div>
          <div style={styles.headerIcon}>
            <img
              src="/icon.png"
              alt="PeakForm Icon"
              style={{ width: 32, height: 32, objectFit: "contain" }}
            />
          </div>
        </section>

        <section style={styles.card}>
          <div style={styles.cardHeaderRow}>
            <h3 style={styles.cardTitle}>Profil</h3>
            <select
              value={activeProfileId}
              onChange={(e) => handleProfileChange(e.target.value)}
              style={styles.select}
            >
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.profileInfoBox}>
            <div style={styles.profileName}>{activeProfile?.name}</div>
            <div style={styles.profileMeta}>Tendenz: {formTrendLabel}</div>
          </div>
        </section>

        {activeTab === "heute" && (
          <>
            <section
              style={{
                ...styles.heroCard,
                background: ampelStyle.bg,
                borderColor: ampelStyle.border,
              }}
            >
              <div style={styles.heroTop}>
                <span style={{ ...styles.heroBadge, background: ampelStyle.badge }}>
                  {ampelStyle.icon}{" "}
                  {selectedEntry ? formatDisplayDate(selectedEntry.date) : "Kein Tag gewählt"}
                </span>
                <span style={{ ...styles.heroAmpel, color: ampelStyle.text }}>
                  {result.ampel}
                </span>
              </div>
              <h2 style={{ ...styles.heroTitle, color: ampelStyle.text }}>
                {result.recommendation}
              </h2>
              <p style={styles.heroText}>{result.hint}</p>
              <p style={styles.heroSmall}>
                {activeProfile?.name}: {result.trendHint}
              </p>
            </section>

            <section style={styles.card}>
              <h3 style={styles.cardTitle}>Konkreter Trainingsvorschlag</h3>
              <div style={styles.gridTwo}>
                <Metric label="Hauptempfehlung" textValue={result.primaryWorkout} />
                <Metric label="Einheit" textValue={result.workoutTitle} />
                <Metric label="Dauer" textValue={result.durationText} />
                <Metric label="Pulsbereich Rad" textValue={result.heartRateText} />
                <Metric label="Kraftfokus" textValue={result.strengthFocus} />
                <Metric label="Alternative" textValue={result.alternativeWorkout} />
              </div>

              <div style={styles.noteList}>
                <div style={styles.noteItem}>
                  <strong>Ablauf:</strong> {result.workoutDescription}
                </div>
                <div style={styles.noteItem}>
                  <strong>Trainingsart:</strong> {selectedEntry?.completedTrainingType || "-"}
                </div>
                <div style={styles.noteItem}>
                  <strong>Belastungswert:</strong> {selectedEntry?.completedLoad ?? 0} · {getLoadLabel(selectedEntry?.completedLoad ?? 0)}
                </div>
              </div>
            </section>

            <section style={styles.card}>
              <div style={styles.cardHeaderRow}>
                <h3 style={styles.cardTitle}>Training erledigt</h3>
                <span
                  style={{
                    ...styles.statusBadge,
                    background: selectedEntry?.completedWorkout ? "#dcfce7" : "#f8fafc",
                    color: selectedEntry?.completedWorkout ? "#166534" : "#475569",
                    borderColor: selectedEntry?.completedWorkout ? "#86efac" : "#cbd5e1",
                  }}
                >
                  {selectedEntry?.completedWorkout ? "Erledigt" : "Offen"}
                </span>
              </div>

              {selectedEntry ? (
                <>
                  <div style={styles.noteList}>
                    <div style={styles.noteItem}>
                      <strong>Ablauf:</strong> {result.workoutDescription}
                    </div>
                    <div style={styles.noteItem}>
                      <strong>Trainingsart:</strong> {selectedEntry?.completedTrainingType || "-"}
                    </div>
                    <div style={styles.noteItem}>
                      <strong>Belastungswert:</strong> {selectedEntry?.completedLoad ?? 0} · {getLoadLabel(selectedEntry?.completedLoad ?? 0)}
                    </div>
                  </div>

                  <div style={styles.formGrid}>
                    <label style={styles.checkboxWrap}>
                      <input
                        type="checkbox"
                        checked={feedback.completedWorkout}
                        onChange={(e) => updateFeedback("completedWorkout", e.target.checked)}
                      />
                      <span style={styles.checkboxLabel}>Training durchgeführt</span>
                    </label>

                    <div />

                    <SelectField
                      label="Art des Trainings"
                      value={feedback.completedTrainingType}
                      options={trainingOptions}
                      onChange={(v) => updateFeedback("completedTrainingType", v as TrainingType)}
                    />
                    <Field
                      label="Belastungswert"
                      type="number"
                      value={feedback.completedLoad}
                      onChange={(v) => updateFeedback("completedLoad", Number(v))}
                    />
                    <Field
                      label="Tatsächliche Dauer (min)"
                      type="number"
                      value={feedback.completedDuration}
                      onChange={(v) => updateFeedback("completedDuration", Number(v))}
                    />
                    <Field
                      label="Anstrengung / RPE (1-10)"
                      type="number"
                      value={feedback.completedRpe}
                      onChange={(v) => updateFeedback("completedRpe", Number(v))}
                    />
                    <div style={{ ...styles.noteItem, gridColumn: "1 / -1" }}>
                      <strong>Belastung bewertet als:</strong> {getLoadLabel(feedback.completedLoad)}
                    </div>
                    <Field
                      label="Notiz zum Training"
                      type="text"
                      value={feedback.completedNote}
                      onChange={(v) => updateFeedback("completedNote", v)}
                      full
                    />
                  </div>

                  <div style={styles.buttonTriple}>
                    <button onClick={markSelectedAsDone} style={styles.secondaryButton}>
                      Als erledigt vorfüllen
                    </button>
                    <button onClick={saveFeedbackForSelectedEntry} style={styles.primaryButton}>
                      Feedback speichern
                    </button>
                    <button onClick={resetSelectedFeedback} style={styles.ghostButton}>
                      Feedback löschen
                    </button>
                  </div>
                </>
              ) : (
                <div style={styles.emptyBox}>Bitte zuerst einen Tag auswählen.</div>
              )}
            </section>

            <section style={styles.card}>
              <div style={styles.cardHeaderRow}>
                <h3 style={styles.cardTitle}>Garmin-Tagesdaten</h3>
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={styles.select}
                  disabled={sortedEntries.length === 0}
                >
                  {sortedEntries.length === 0 ? (
                    <option value="">Noch keine Daten</option>
                  ) : (
                    sortedEntries.map((entry) => (
                      <option key={entry.date} value={entry.date}>
                        {formatDisplayDate(entry.date)}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {selectedEntry ? (
                <div style={styles.gridTwo}>
                  <Metric label="Body Battery morgens" value={selectedEntry.bodyBatteryMorning} />
                  <Metric label="Sleep Score" value={selectedEntry.sleepScore} />
                  <Metric label="HFV Nacht" value={selectedEntry.hrvNight} suffix=" ms" />
                  <Metric label="HFV 7T-Schnitt" value={selectedEntry.hrv7d} suffix=" ms" />
                  <Metric label="Stress Garmin Ø" value={selectedEntry.stressAvg} />
                  <Metric label="Ruhepuls" value={selectedEntry.restingHr} />
                  <Metric label="Schlafdauer" value={selectedEntry.sleepHours} suffix=" h" />
                  <Metric label="Muskelkater" value={selectedEntry.soreness} suffix=" /10" />
                </div>
              ) : (
                <div style={styles.emptyBox}>
                  Noch keine Tagesdaten für {activeProfile?.name} vorhanden. Bitte unter Eingabe starten.
                </div>
              )}
            </section>

            <section style={styles.card}>
              <h3 style={styles.cardTitle}>Zusatzsignale</h3>
              {selectedEntry ? (
                <div style={styles.gridTwo}>
                  <Metric label="Gewicht" value={selectedEntry.weight} suffix=" kg" />
                  <Metric label="Bauchumfang" value={selectedEntry.waist} suffix=" cm" />
                  <Metric label="Größe" value={heightCm} suffix=" cm" />
                  <Metric label="BMI" value={Number(result.bmi.toFixed(1))} />
                  <Metric label="Training gestern" textValue={getTrainingLabel(selectedEntry)} />
                  <Metric
                    label="Belastung gestern"
                    value={(selectedEntry.yesterdaySessions ?? []).reduce(
                      (sum, session) => sum + Number(session.load || 0),
                      0
                    )}
                  />
                  <Metric label="Energiegefühl" value={selectedEntry.energyFeeling} suffix=" /10" />
                  <Metric label="Bevorzugt heute" textValue={selectedEntry.preferredTraining} />
                </div>
              ) : (
                <div style={styles.emptyBox}>
                  Hier erscheinen Gewicht, BMI und Trainingshistorie.
                </div>
              )}
            </section>
          </>
        )}

        {activeTab === "eingabe" && (
          <section style={styles.card}>
            <div style={styles.cardHeaderStack}>
              <div>
                <h3 style={styles.cardTitle}>
                  {editingDate
                    ? `${activeProfile?.name} bearbeiten: ${formatDisplayDate(editingDate)}`
                    : `${activeProfile?.name} erfassen`}
                </h3>
                <p style={styles.cardText}>
                  Jedes Profil hat seinen eigenen Verlauf, eigene Größe und eigene Pulszonen.
                </p>
              </div>

              <div style={styles.buttonRow}>
                <button onClick={copyFromLastEntry} style={styles.secondaryButton}>
                  Letzten Eintrag übernehmen
                </button>
                <button onClick={resetForm} style={styles.ghostButton}>
                  Formular leeren
                </button>
              </div>
            </div>

            <div style={{ ...styles.card, background: "#eff6ff", borderColor: "#bfdbfe" }}>
              <h4 style={{ margin: 0, marginBottom: 10 }}>Pflichtdaten für Empfehlung</h4>

              <div style={styles.formGrid}>
                <Field
                  label="Datum"
                  type="date"
                  value={form.date}
                  onChange={(v) => updateForm("date", v)}
                />
                <Field
                  label="Body Battery morgens"
                  type="number"
                  value={form.bodyBatteryMorning}
                  onChange={(v) => updateForm("bodyBatteryMorning", Number(v))}
                />
                <Field
                  label="Sleep Score"
                  type="number"
                  value={form.sleepScore}
                  onChange={(v) => updateForm("sleepScore", Number(v))}
                />
                <Field
                  label="HFV Nacht (ms)"
                  type="number"
                  value={form.hrvNight}
                  onChange={(v) => updateForm("hrvNight", Number(v))}
                />
                <Field
                  label="Stress Garmin Ø"
                  type="number"
                  value={form.stressAvg}
                  onChange={(v) => updateForm("stressAvg", Number(v))}
                />
                <Field
                  label="Energiegefühl heute (1-10)"
                  type="number"
                  value={form.energyFeeling}
                  onChange={(v) => updateForm("energyFeeling", Number(v))}
                />
                <SelectField
                  label="Heute lieber"
                  value={form.preferredTraining}
                  options={preferredTrainingOptions}
                  onChange={(v) => updateForm("preferredTraining", v as PreferredTraining)}
                />
                <div style={{ ...styles.noteItem, gridColumn: "1 / -1" }}>
                  <strong>Training gestern / mehrere Einheiten</strong>
                </div>

                <div style={{ gridColumn: "1 / -1", display: "grid", gap: 10 }}>
                  {form.yesterdaySessions.map((session, index) => (
                    <div
                      key={index}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.2fr 1fr auto",
                        gap: 10,
                        alignItems: "end",
                      }}
                    >
                      <SelectField
                        label={`Einheit ${index + 1}`}
                        value={session.type}
                        options={trainingOptions}
                        onChange={(v) => updateYesterdaySession(index, "type", v as TrainingType)}
                      />

                      <Field
                        label="Load"
                        type="number"
                        value={session.load}
                        onChange={(v) => updateYesterdaySession(index, "load", Number(v))}
                      />

                      <button
                        type="button"
                        onClick={() => removeYesterdaySession(index)}
                        style={styles.smallDangerButton}
                      >
                        Löschen
                      </button>

                      <div style={{ gridColumn: "1 / -1" }}>
                        <Field
                          label="Notiz"
                          type="text"
                          value={session.note}
                          onChange={(v) => updateYesterdaySession(index, "note", v)}
                          full
                        />
                      </div>
                    </div>
                  ))}

                  <button type="button" onClick={addYesterdaySession} style={styles.secondaryButton}>
                    + Weitere Trainingseinheit
                  </button>
                </div>
              </div>
            </div>

            <div style={{ ...styles.card, background: "#f8fafc", marginTop: 12 }}>
              <h4 style={{ margin: 0, marginBottom: 10 }}>Optionale Zusatzdaten</h4>

              <div style={styles.formGrid}>
                <Field
                  label="Größe (cm)"
                  type="number"
                  value={heightCm}
                  onChange={(v) => updateHeight(Number(v))}
                />
                <Field
                  label="Gewicht (kg)"
                  type="number"
                  value={form.weight}
                  onChange={(v) => updateForm("weight", Number(v))}
                  step="0.1"
                />
                <Field
                  label="Bauchumfang (cm)"
                  type="number"
                  value={form.waist}
                  onChange={(v) => updateForm("waist", Number(v))}
                  step="0.1"
                />
                <Field
                  label="Schlafdauer (h)"
                  type="number"
                  value={form.sleepHours}
                  onChange={(v) => updateForm("sleepHours", Number(v))}
                  step="0.1"
                />
                <Field
                  label="HFV 7T-Schnitt (ms)"
                  type="number"
                  value={form.hrv7d}
                  onChange={(v) => updateForm("hrv7d", Number(v))}
                  step="0.1"
                />
                <Field
                  label="Ruhepuls"
                  type="number"
                  value={form.restingHr}
                  onChange={(v) => updateForm("restingHr", Number(v))}
                />
                <Field
                  label="Muskelkater (1-10)"
                  type="number"
                  value={form.soreness}
                  onChange={(v) => updateForm("soreness", Number(v))}
                />
              </div>
            </div>

            <div style={styles.buttonColumn}>
              <button onClick={saveEntry} style={styles.primaryButton}>
                {editingDate ? "Änderungen speichern" : "Eintrag speichern und Empfehlung berechnen"}
              </button>
            </div>
          </section>
        )}

        {activeTab === "verlauf" && (
          <section style={styles.card}>
            <h3 style={styles.cardTitle}>Verlauf von {activeProfile?.name}</h3>
            {sortedEntries.length === 0 ? (
              <div style={styles.emptyBox}>Noch keine Einträge vorhanden.</div>
            ) : (
              <div style={styles.noteList}>
                {sortedEntries
                  .slice()
                  .reverse()
                  .map((entry) => {
                    const itemResult = getRecommendation(sortedEntries, entry.date, heightCm, zones);
                    const itemStyle = getAmpelStyle(itemResult.ampel);

                    return (
                      <div
                        key={entry.date}
                        style={{
                          ...styles.historyItem,
                          borderColor: itemStyle.border,
                          background: itemStyle.bg,
                        }}
                      >
                        <div style={styles.historyTop}>
                          <div style={styles.historyDate}>{formatDisplayDate(entry.date)}</div>
                          <div style={{ ...styles.historyAmpel, color: itemStyle.text }}>
                            {itemStyle.icon} {itemResult.ampel}
                          </div>
                        </div>

                        <div style={styles.historyLine}>
                          <strong>Empfehlung:</strong> {itemResult.recommendation}
                        </div>
                        <div style={styles.historyLine}>
                          <strong>Einheit:</strong> {itemResult.workoutTitle}
                        </div>
                        <div style={styles.historyLine}>
                          <strong>Puls:</strong> {itemResult.heartRateText}
                        </div>
                        <div style={styles.historyLine}>
                          <strong>Training gestern:</strong> {getTrainingLabel(entry)}
                        </div>
                        <div style={styles.historyLine}>
                          <strong>Belastung gestern:</strong>{" "}
                          {(entry.yesterdaySessions ?? []).reduce(
                            (sum, session) => sum + Number(session.load || 0),
                            0
                          )}
                        </div>
                        <div style={styles.historyLine}>
                          <strong>Status:</strong> {getCompletionLabel(entry)}
                        </div>
                        {entry.completedNote?.trim() ? (
                          <div style={styles.historyLine}>
                            <strong>Notiz:</strong> {entry.completedNote}
                          </div>
                        ) : null}
                        <div style={styles.historyLine}>
                          <strong>Coach-Hinweis:</strong> {itemResult.hint}
                        </div>

                        <div style={styles.historyActions}>
                          <button
                            onClick={() => copyEntryToForm(entry)}
                            style={styles.smallSecondaryButton}
                          >
                            Bearbeiten
                          </button>
                          <button
                            onClick={() => duplicateEntryToNewDate(entry)}
                            style={styles.smallGhostButton}
                          >
                            Übernehmen
                          </button>
                          <button
                            onClick={() => deleteEntry(entry.date)}
                            style={styles.smallDangerButton}
                          >
                            Löschen
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </section>
        )}

        {activeTab === "analyse" && (
          <>
            <section style={styles.card}>
              <h3 style={styles.cardTitle}>3-Tage-Analyse von {activeProfile?.name}</h3>
              <div style={styles.gridTwo}>
                <Metric label="Ø Schlaf" value={Number(avgSleep3)} suffix=" h" />
                <Metric label="Ø Stress" value={Number(avgStress3)} />
                <Metric label="Ø Body Battery" value={Number(avgBattery3)} />
                <Metric label="Ø Belastung gestern" value={Number(avgLoad3)} />
              </div>
            </section>

            <section style={styles.card}>
              <h3 style={styles.cardTitle}>Hinterlegte Einheiten</h3>
              <div style={styles.ruleList}>
                <Rule color="#dcfce7" title="GRUEN" text="Intervall 5×3, Schwelle 3×8, Beine oder Ganzkörper" />
                <Rule color="#fef9c3" title="GELB" text="Zone 2 kurz/lang, Oberkörper oder Ganzkörper moderat" />
                <Rule color="#fee2e2" title="ROT" text="Lockeres Rad, Spaziergang oder Mobility" />
              </div>
            </section>

            <section style={styles.card}>
              <h3 style={styles.cardTitle}>Wichtig</h3>
              <div style={styles.noteList}>
                <div style={styles.noteItem}>Deine bisherigen Daten bleiben erhalten</div>
                <div style={styles.noteItem}>Du kannst jetzt pro Tag speichern, ob du das Training wirklich gemacht hast</div>
                <div style={styles.noteItem}>Dauer, Anstrengung und Notiz werden im Verlauf mitgespeichert</div>
              </div>
            </section>
          </>
        )}

        {activeTab === "zonen" && (
          <section style={styles.card}>
            <h3 style={styles.cardTitle}>Pulszonen von {activeProfile?.name}</h3>
            <p style={styles.cardText}>
              Diese Werte nutzt die App für konkrete Rad-Empfehlungen.
            </p>

            <div style={styles.formGrid}>
              <Field
                label="Zone 1 Min"
                type="number"
                value={zones.zone1Min}
                onChange={(v) => updateZone("zone1Min", Number(v))}
              />
              <Field
                label="Zone 1 Max"
                type="number"
                value={zones.zone1Max}
                onChange={(v) => updateZone("zone1Max", Number(v))}
              />
              <Field
                label="Zone 2 Min"
                type="number"
                value={zones.zone2Min}
                onChange={(v) => updateZone("zone2Min", Number(v))}
              />
              <Field
                label="Zone 2 Max"
                type="number"
                value={zones.zone2Max}
                onChange={(v) => updateZone("zone2Max", Number(v))}
              />
              <Field
                label="Zone 3 Min"
                type="number"
                value={zones.zone3Min}
                onChange={(v) => updateZone("zone3Min", Number(v))}
              />
              <Field
                label="Zone 3 Max"
                type="number"
                value={zones.zone3Max}
                onChange={(v) => updateZone("zone3Max", Number(v))}
              />
              <Field
                label="Zone 4 Min"
                type="number"
                value={zones.zone4Min}
                onChange={(v) => updateZone("zone4Min", Number(v))}
              />
              <Field
                label="Zone 4 Max"
                type="number"
                value={zones.zone4Max}
                onChange={(v) => updateZone("zone4Max", Number(v))}
              />
              <Field
                label="Zone 5 Min"
                type="number"
                value={zones.zone5Min}
                onChange={(v) => updateZone("zone5Min", Number(v))}
              />
              <Field
                label="Zone 5 Max"
                type="number"
                value={zones.zone5Max}
                onChange={(v) => updateZone("zone5Max", Number(v))}
              />
            </div>

            <div style={styles.noteList}>
              <div style={styles.noteItem}>
                <strong>Zone 1:</strong> {formatZone(zones.zone1Min, zones.zone1Max)}
              </div>
              <div style={styles.noteItem}>
                <strong>Zone 2:</strong> {formatZone(zones.zone2Min, zones.zone2Max)}
              </div>
              <div style={styles.noteItem}>
                <strong>Zone 3:</strong> {formatZone(zones.zone3Min, zones.zone3Max)}
              </div>
              <div style={styles.noteItem}>
                <strong>Zone 4:</strong> {formatZone(zones.zone4Min, zones.zone4Max)}
              </div>
              <div style={styles.noteItem}>
                <strong>Zone 5:</strong> {formatZone(zones.zone5Min, zones.zone5Max)}
              </div>
            </div>
          </section>
        )}

        <nav style={styles.tabBarFive}>
          <TabButton label="Heute" active={activeTab === "heute"} onClick={() => setActiveTab("heute")} />
          <TabButton label="Eingabe" active={activeTab === "eingabe"} onClick={() => setActiveTab("eingabe")} />
          <TabButton label="Verlauf" active={activeTab === "verlauf"} onClick={() => setActiveTab("verlauf")} />
          <TabButton label="Analyse" active={activeTab === "analyse"} onClick={() => setActiveTab("analyse")} />
          <TabButton label="Zonen" active={activeTab === "zonen"} onClick={() => setActiveTab("zonen")} />
        </nav>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
  suffix = "",
  textValue,
}: {
  label: string;
  value?: number;
  suffix?: string;
  textValue?: string;
}) {
  return (
    <div style={styles.metricBox}>
      <div style={styles.metricLabel}>{label}</div>
      <div style={styles.metricValue}>{textValue ?? `${value ?? 0}${suffix}`}</div>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  step = "1",
  full = false,
}: {
  label: string;
  type: string;
  value: string | number;
  onChange: (value: string) => void;
  step?: string;
  full?: boolean;
}) {
  return (
    <label style={{ ...styles.fieldWrap, ...(full ? styles.fullWidth : {}) }}>
      <span style={styles.fieldLabel}>{label}</span>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={styles.input}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label style={styles.fieldWrap}>
      <span style={styles.fieldLabel}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={styles.input}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Rule({
  color,
  title,
  text,
}: {
  color: string;
  title: string;
  text: string;
}) {
  return (
    <div style={{ ...styles.ruleItem, background: color }}>
      <div style={styles.ruleTitle}>{title}</div>
      <div style={styles.ruleText}>{text}</div>
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.tabBarButton,
        ...(active ? styles.tabBarButtonActive : {}),
      }}
    >
      {label}
    </button>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #dbeafe 0%, #eff6ff 22%, #f8fafc 100%)",
    padding: "16px 12px 110px",
    display: "flex",
    justifyContent: "center",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  phone: {
    width: "100%",
    maxWidth: 430,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  headerCard: {
    background: "rgba(255,255,255,0.92)",
    border: "1px solid #dbeafe",
    borderRadius: 26,
    padding: 20,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
  },
  kicker: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 6,
  },
  title: {
    margin: 0,
    fontSize: 30,
    lineHeight: 1.05,
    fontWeight: 800,
    color: "#0f172a",
  },
  subtitle: {
    margin: "8px 0 0 0",
    fontSize: 14,
    color: "#475569",
  },
  headerIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 26,
  },
  heroCard: {
    border: "1px solid",
    borderRadius: 26,
    padding: 20,
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)",
  },
  heroTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  heroBadge: {
    borderRadius: 999,
    padding: "7px 12px",
    fontSize: 12,
    fontWeight: 700,
    color: "#334155",
  },
  heroAmpel: {
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: 0.4,
  },
  heroTitle: {
    margin: "0 0 6px 0",
    fontSize: 28,
    lineHeight: 1.05,
    fontWeight: 800,
  },
  heroText: {
    margin: 0,
    fontSize: 15,
    color: "#334155",
  },
  heroSmall: {
    margin: "10px 0 0 0",
    fontSize: 13,
    color: "#475569",
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 24,
    padding: 18,
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)",
  },
  cardHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  cardHeaderStack: {
    display: "grid",
    gap: 12,
    marginBottom: 10,
  },
  cardTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 800,
    color: "#0f172a",
  },
  cardText: {
    margin: "8px 0 0 0",
    fontSize: 14,
    color: "#475569",
  },
  profileInfoBox: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 18,
    padding: 14,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 800,
    color: "#0f172a",
    marginBottom: 4,
  },
  profileMeta: {
    fontSize: 14,
    color: "#475569",
  },
  gridTwo: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  metricBox: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 18,
    padding: 14,
    minHeight: 86,
  },
  metricLabel: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 800,
    color: "#0f172a",
    lineHeight: 1.15,
    wordBreak: "break-word",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginTop: 14,
  },
  fieldWrap: {
    display: "grid",
    gap: 6,
  },
  fullWidth: {
    gridColumn: "1 / -1",
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: "#334155",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid #cbd5e1",
    fontSize: 16,
    boxSizing: "border-box",
    outline: "none",
    background: "#fff",
  },
  select: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    background: "#fff",
    fontSize: 14,
  },
  checkboxWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid #cbd5e1",
    background: "#fff",
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: 700,
    color: "#334155",
  },
  buttonRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },
  buttonTriple: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 10,
    marginTop: 16,
  },
  buttonColumn: {
    display: "grid",
    gap: 10,
    marginTop: 16,
  },
  primaryButton: {
    width: "100%",
    border: "none",
    background: "#2563eb",
    color: "white",
    borderRadius: 16,
    padding: "14px 16px",
    fontSize: 15,
    fontWeight: 800,
    cursor: "pointer",
  },
  secondaryButton: {
    width: "100%",
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#1d4ed8",
    borderRadius: 16,
    padding: "12px 14px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  ghostButton: {
    width: "100%",
    border: "1px solid #e2e8f0",
    background: "#fff",
    color: "#334155",
    borderRadius: 16,
    padding: "12px 14px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  statusBadge: {
    border: "1px solid",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 800,
  },
  noteList: {
    display: "grid",
    gap: 10,
    marginTop: 12,
  },
  noteItem: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 12,
    fontSize: 14,
    color: "#334155",
    lineHeight: 1.45,
  },
  historyItem: {
    border: "1px solid",
    borderRadius: 18,
    padding: 14,
  },
  historyTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: 800,
    color: "#0f172a",
  },
  historyAmpel: {
    fontSize: 13,
    fontWeight: 800,
  },
  historyLine: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 1.4,
    marginBottom: 4,
  },
  historyActions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 8,
    marginTop: 12,
  },
  smallSecondaryButton: {
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#1d4ed8",
    borderRadius: 12,
    padding: "10px 8px",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  },
  smallGhostButton: {
    border: "1px solid #e2e8f0",
    background: "#fff",
    color: "#334155",
    borderRadius: 12,
    padding: "10px 8px",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  },
  smallDangerButton: {
    border: "1px solid #fecaca",
    background: "#fff1f2",
    color: "#b91c1c",
    borderRadius: 12,
    padding: "10px 8px",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  },
  ruleList: {
    display: "grid",
    gap: 10,
    marginTop: 12,
  },
  ruleItem: {
    borderRadius: 18,
    padding: 14,
    border: "1px solid rgba(15,23,42,0.06)",
  },
  ruleTitle: {
    fontSize: 13,
    fontWeight: 800,
    color: "#0f172a",
    marginBottom: 4,
  },
  ruleText: {
    fontSize: 14,
    color: "#334155",
  },
  emptyBox: {
    background: "#f8fafc",
    border: "1px dashed #cbd5e1",
    borderRadius: 16,
    padding: 16,
    fontSize: 14,
    color: "#475569",
  },
  tabBarFive: {
    position: "sticky",
    bottom: 12,
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: 8,
    background: "rgba(255,255,255,0.95)",
    border: "1px solid #dbeafe",
    borderRadius: 22,
    padding: 8,
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
  },
  tabBarButton: {
    border: "none",
    background: "transparent",
    color: "#475569",
    borderRadius: 14,
    padding: "12px 6px",
    fontSize: 11,
    fontWeight: 800,
    cursor: "pointer",
  },
  tabBarButtonActive: {
    background: "#dbeafe",
    color: "#1d4ed8",
  },
};