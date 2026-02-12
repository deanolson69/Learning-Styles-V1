import { makeDefaultData } from './defaultData';
import { AppDataV1 } from './types';

const KEY = 'pei-planner-data';

export const loadData = (): AppDataV1 => {
  const fallback = makeDefaultData();
  const raw = localStorage.getItem(KEY);
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw) as Partial<AppDataV1> & { version?: number };
    if (!parsed.version) {
      return fallback;
    }
    if (parsed.version === 1) {
      return {
        ...fallback,
        ...parsed,
        trip: {
          ...fallback.trip,
          ...parsed.trip,
          thresholds: {
            ...fallback.trip.thresholds,
            ...parsed.trip?.thresholds,
          },
        },
      } as AppDataV1;
    }
    return fallback;
  } catch {
    return fallback;
  }
};

export const saveData = (data: AppDataV1) => {
  localStorage.setItem(KEY, JSON.stringify(data));
};

export const resetData = () => {
  const next = makeDefaultData();
  saveData(next);
  return next;
};
