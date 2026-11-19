/** 当前开放自由创意与 FDE 企业命题报名。 */
export const isTrackRegistrationOpen = (track: string): boolean => track === 'creator' || track === 'industry';
export const isRegistrationRouteOpen = isTrackRegistrationOpen;

export const registrationAvailability = {
  zh: '自由创意赛道与 FDE 赛道开放报名。',
  en: 'Free Creation and FDE registration are open.',
};
