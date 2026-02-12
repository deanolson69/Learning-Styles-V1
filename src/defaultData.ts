import { Activity, AppDataV1, DaySlotAvailability, Thresholds } from './types';

const DEFAULT_START = '2026-06-13';
const DEFAULT_END = '2026-06-20';

const defaultThresholds: Thresholds = {
  togetherGroupAvgMin: 3.5,
  togetherDisagreementMax: 1,
  separateFamilyAvgMin: 4,
  separateGroupAvgMax: 3,
  separateDisagreementMin: 1.5,
};

const defaultActivities: Activity[] = [
  { id: crypto.randomUUID(), name: 'Green Gables Heritage Place', category: 'Anne of Green Gables', town: 'Cavendish', tags: ['Anne', 'Historic'], togetherFriendly: true },
  { id: crypto.randomUUID(), name: 'Avonlea Village', category: 'Anne of Green Gables', tags: ['Anne', 'Shopping'], togetherFriendly: true },
  { id: crypto.randomUUID(), name: 'Anne of Green Gables Museum', category: 'Anne of Green Gables', town: 'Park Corner', tags: ['Anne', 'Museum'], togetherFriendly: true },
  { id: crypto.randomUUID(), name: "Lucy Maud Montgomery's Cavendish Home Site", category: 'Anne of Green Gables', town: 'Cavendish', tags: ['Anne', 'Historic'], togetherFriendly: true },
  { id: crypto.randomUUID(), name: 'Anne themed gift shops and experiences', category: 'Anne of Green Gables', tags: ['Anne', 'Shopping'], togetherFriendly: true },
  { id: crypto.randomUUID(), name: 'Anne stage musical or performance', category: 'Anne of Green Gables', tags: ['Anne', 'Show', 'Rainy-day'], togetherFriendly: true },
  { id: crypto.randomUUID(), name: 'Anne scenic photo stops', category: 'Anne of Green Gables', tags: ['Anne', 'Outdoor'], togetherFriendly: true },

  { id: crypto.randomUUID(), name: 'Cows Creamery', category: 'Food and Treats', town: 'Charlottetown', tags: ['Food'], togetherFriendly: true },
  { id: crypto.randomUUID(), name: 'Cows (Cavendish)', category: 'Food and Treats', town: 'Cavendish', tags: ['Food'], togetherFriendly: true },
  { id: crypto.randomUUID(), name: 'PEI seafood dinner', category: 'Food and Treats', tags: ['Food', 'Optional'], togetherFriendly: true },
  { id: crypto.randomUUID(), name: 'Potato-focused local spot', category: 'Food and Treats', tags: ['Food'], togetherFriendly: true },
  { id: crypto.randomUUID(), name: 'Local bakery and pies stop', category: 'Food and Treats', tags: ['Food'], togetherFriendly: true },

  { id: crypto.randomUUID(), name: 'Cavendish Beach / PEI National Park beach day', category: 'Classic PEI Tourism', tags: ['Outdoor'], togetherFriendly: true },
  { id: crypto.randomUUID(), name: 'Greenwich Dunes trail and beach', category: 'Classic PEI Tourism', tags: ['Outdoor', 'Trail'], togetherFriendly: true },
  { id: crypto.randomUUID(), name: 'Basin Head (singing sands) beach', category: 'Classic PEI Tourism', tags: ['Outdoor'], togetherFriendly: true },
  { id: crypto.randomUUID(), name: 'Brackley Beach', category: 'Classic PEI Tourism', tags: ['Outdoor'], togetherFriendly: true },
  { id: crypto.randomUUID(), name: 'Confederation Bridge photo stop', category: 'Classic PEI Tourism', tags: ['Scenic'], togetherFriendly: true },
  { id: crypto.randomUUID(), name: 'Victoria-by-the-Sea stroll', category: 'Classic PEI Tourism', tags: ['Scenic'], togetherFriendly: true },
  { id: crypto.randomUUID(), name: 'Charlottetown waterfront and shops', category: 'Classic PEI Tourism', tags: ['Shopping'], togetherFriendly: true },
  { id: crypto.randomUUID(), name: 'Confederation Centre of the Arts', category: 'Classic PEI Tourism', town: 'Charlottetown', tags: ['Show', 'Rainy-day'], togetherFriendly: true },
  { id: crypto.randomUUID(), name: 'Kayaking / paddle / boat cruise', category: 'Classic PEI Tourism', tags: ['Outdoor', 'Water'], togetherFriendly: false },
  { id: crypto.randomUUID(), name: 'Lighthouse loop', category: 'Classic PEI Tourism', tags: ['Scenic'], togetherFriendly: true },
  { id: crypto.randomUUID(), name: 'Red sandstone cliffs scenic drive', category: 'Classic PEI Tourism', tags: ['Scenic'], togetherFriendly: true },
  { id: crypto.randomUUID(), name: 'Farmers market', category: 'Classic PEI Tourism', tags: ['Food', 'Shopping'], togetherFriendly: true },

  { id: crypto.randomUUID(), name: 'Mini golf in Cavendish', category: 'Optional / Niche', tags: ['Outdoor'], togetherFriendly: true },
  { id: crypto.randomUUID(), name: 'Deep sea fishing tour', category: 'Optional / Niche', tags: ['Outdoor', 'Water'], togetherFriendly: false },
  { id: crypto.randomUUID(), name: 'Cycling trail segment', category: 'Optional / Niche', tags: ['Outdoor'], togetherFriendly: false },
  { id: crypto.randomUUID(), name: 'Rainy-day indoor options (museum, shopping)', category: 'Optional / Niche', tags: ['Rainy-day'], togetherFriendly: true },
];

export const generateDaySlots = (startDate: string, endDate: string): DaySlotAvailability[] => {
  const days: DaySlotAvailability[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  while (current <= end) {
    const dateISO = current.toISOString().slice(0, 10);
    const isStart = dateISO === startDate;
    const isEnd = dateISO === endDate;
    days.push({
      dateISO,
      amEnabled: isStart ? false : true,
      pmEnabled: isEnd ? false : true,
    });
    current.setDate(current.getDate() + 1);
  }
  return days;
};

export const makeDefaultData = (): AppDataV1 => ({
  version: 1,
  families: [],
  members: [],
  activities: defaultActivities,
  ratings: {},
  familyAvailability: {},
  schedule: {},
  trip: {
    startDate: DEFAULT_START,
    endDate: DEFAULT_END,
    daySlots: generateDaySlots(DEFAULT_START, DEFAULT_END),
    thresholds: defaultThresholds,
  },
});
