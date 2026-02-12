export type AppScreen =
  | 'home'
  | 'families'
  | 'rate'
  | 'recommendations'
  | 'schedule'
  | 'export'
  | 'settings';

export interface Family {
  id: string;
  name: string;
  homeBaseTown?: string;
}

export interface Member {
  id: string;
  familyId: string;
  name: string;
}

export interface Activity {
  id: string;
  name: string;
  category: string;
  town?: string;
  duration?: string;
  tags: string[];
  togetherFriendly: boolean;
  notes?: string;
}

export interface DaySlotAvailability {
  dateISO: string;
  amEnabled: boolean;
  pmEnabled: boolean;
}

export interface FamilyAvailabilityDay {
  dateISO: string;
  amGroupTime: boolean | null;
  pmGroupTime: boolean | null;
}

export type FamilyAvailability = Record<string, FamilyAvailabilityDay[]>;
export type RatingsMap = Record<string, number>;
export type ScheduleAssignments = Record<string, { amActivityId?: string; pmActivityId?: string }>;

export interface Thresholds {
  togetherGroupAvgMin: number;
  togetherDisagreementMax: number;
  separateFamilyAvgMin: number;
  separateGroupAvgMax: number;
  separateDisagreementMin: number;
}

export interface TripSettings {
  startDate: string;
  endDate: string;
  daySlots: DaySlotAvailability[];
  thresholds: Thresholds;
}

export interface AppDataV1 {
  version: 1;
  families: Family[];
  members: Member[];
  activities: Activity[];
  ratings: RatingsMap;
  familyAvailability: FamilyAvailability;
  schedule: ScheduleAssignments;
  trip: TripSettings;
}

export interface ActivityScore {
  activity: Activity;
  memberAverage: number;
  familyAverages: Record<string, number>;
  groupAverage: number;
  disagreement: number;
  togetherScore: number;
  separateScore: number;
}
