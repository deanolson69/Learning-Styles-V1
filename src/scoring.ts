import { ActivityScore, Family, Member, RatingsMap, Activity, Thresholds } from './types';

const ratingKey = (memberId: string, activityId: string) => `${memberId}:${activityId}`;

const average = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);

const standardDeviation = (nums: number[]) => {
  if (!nums.length) return 0;
  const mean = average(nums);
  const variance = nums.reduce((acc, n) => acc + (n - mean) ** 2, 0) / nums.length;
  return Math.sqrt(variance);
};

export const computeScores = (
  activities: Activity[],
  families: Family[],
  members: Member[],
  ratings: RatingsMap,
): ActivityScore[] => {
  return activities.map((activity) => {
    const memberRatings = members
      .map((m) => ratings[ratingKey(m.id, activity.id)])
      .filter((r): r is number => typeof r === 'number');

    const memberAverage = average(memberRatings);
    const familyAverages: Record<string, number> = {};

    families.forEach((family) => {
      const famMembers = members.filter((m) => m.familyId === family.id);
      const famRatings = famMembers
        .map((m) => ratings[ratingKey(m.id, activity.id)])
        .filter((r): r is number => typeof r === 'number');
      familyAverages[family.id] = average(famRatings);
    });

    const familyAvgValues = Object.values(familyAverages).filter((v) => v > 0);
    const groupAverage = memberAverage;
    const disagreement = standardDeviation(memberRatings);

    // Explicit rule: Together score = group average * (1 - normalized disagreement).
    // Normalized disagreement assumes rating scale 0-5 and caps at 1.
    const normalizedDisagreement = Math.min(disagreement / 2.5, 1);
    const togetherFriendlyBoost = activity.togetherFriendly ? 0.25 : 0;
    const togetherScore = groupAverage * (1 - normalizedDisagreement) + togetherFriendlyBoost;

    // Explicit rule: Separate score favors one-family-high vs group mean, plus disagreement pressure.
    const maxFamily = familyAvgValues.length ? Math.max(...familyAvgValues) : 0;
    const separateScore = (maxFamily - groupAverage) + disagreement;

    return {
      activity,
      memberAverage,
      familyAverages,
      groupAverage,
      disagreement,
      togetherScore,
      separateScore,
    };
  });
};

export const classifyRecommendations = (scores: ActivityScore[], thresholds: Thresholds, families: Family[]) => {
  const together = scores
    .filter(
      (s) =>
        s.groupAverage >= thresholds.togetherGroupAvgMin &&
        s.disagreement <= thresholds.togetherDisagreementMax,
    )
    .sort((a, b) => b.togetherScore - a.togetherScore);

  const separate = scores
    .filter((s) => {
      const hasFamilySpike = Object.values(s.familyAverages).some((avg) => avg >= thresholds.separateFamilyAvgMin);
      const ruleA = hasFamilySpike && s.groupAverage <= thresholds.separateGroupAvgMax;
      const ruleB = s.disagreement >= thresholds.separateDisagreementMin;
      return ruleA || ruleB;
    })
    .sort((a, b) => b.separateScore - a.separateScore);

  const pairSuggestions = families
    .flatMap((f1, idx) =>
      families.slice(idx + 1).map((f2) => {
        const ranked = [...scores]
          .map((s) => ({
            score: ((s.familyAverages[f1.id] ?? 0) + (s.familyAverages[f2.id] ?? 0)) / 2 - s.disagreement,
            activity: s.activity.name,
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);
        return { familyA: f1.name, familyB: f2.name, topActivities: ranked };
      }),
    );

  return { together, separate, pairSuggestions };
};
