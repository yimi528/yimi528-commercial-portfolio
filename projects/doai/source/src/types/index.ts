export type Language = 'zh' | 'en';

export type UserRole = 'maker' | 'speaker' | 'judge' | 'admin' | 'channel_operator' | 'visitor';

export interface User {
  id: string;
  phone: string;
  maskedPhone?: string;
  name: string;
  avatar: string;
  city: string;
  bio: string;
  skills: string[];
  role: UserRole;
  operatorChannel?: import('../lib/registrationChannel.ts').RegistrationChannel;
  registrationChannelsEnabled?: boolean;
  atomclubBound: boolean;
  isPublicInSquare: boolean;
  allowCardExchange: boolean;
  privacyReady?: boolean;
  notifySettings: {
    system: boolean;
    review: boolean;
    team: boolean;
    forum: boolean;
    live: boolean;
  };
}

export type TicketType = 'maker' | 'guest' | 'staff' | 'forum';
export type TicketStatus = 'unclaimed' | 'claimed' | 'checked_in' | 'pending_review' | 'rejected';

export interface DigitalTicket {
  channel?: import('../lib/registrationChannel.ts').RegistrationChannel | null;
  bookingKey?: string;
  id: string;
  title: string;
  titleEn: string;
  type: TicketType;
  holderName: string;
  holderPhone: string;
  qrCode: string;
  status: TicketStatus;
  sessionTime?: string;
  venue?: string;
  issuedAt: string;
  checkedInAt?: string;
  ownerUserId?: string;
  organization?: string;
  passType?: string;
  reviewFeedback?: string;
  reviewedAt?: string;
  startsAt?: string;
  endsAt?: string;
  cancellationDeadline?: string;
}

export type RegistrationStatus = 'submitted' | 'reviewing' | 'needs_info' | 'shortlisted' | 'rejected';
export type TrackType = 'industry' | 'creator';

export interface TeamMember {
  id: string;
  name: string;
  phone: string;
  roleTitle: string;
  isLeader: boolean;
  avatar?: string;
}

/** 报名后的作品链接：视频必填，在线 Demo、GitHub 与项目文档选填。 */
export interface WorkSubmission {
  videoUrl: string;
  demoUrl: string;
  githubUrl: string;
  docUrl?: string;
  submittedAt: string;
}

export interface Registration {
  channel?: import('../lib/registrationChannel.ts').RegistrationChannel | null;
  teamId?: string;
  teamBinding?: { kind: 'create' } | { kind: 'existing'; id: string };
  id: string;
  makerId: string;
  type: 'individual' | 'team';
  track: TrackType;
  teamName: string;
  projectName: string;
  projectSummary: string;
  videoUrl: string;
  docUrl: string;
  members: TeamMember[];
  inviteCode: string;
  status: RegistrationStatus;
  reviewFeedback?: string;
  needsInfoDetails?: string;
  submittedAt: string;
  reviewedAt?: string;
  ownerUserId?: string;
  submission?: WorkSubmission;
  accountContact?: { userId: string; phone: string; source: 'account'; capturedAt: string };
  applicant?: { userId: string; name: string; city: string; skills: string[]; organization?: string; position?: string; age?: number; email?: string; bio?: string };
}

export interface RecruitmentPost {
  id: string;
  track: TrackType;
  title: string;
  summary: string;
  neededRoles: string[];
  skills: string[];
  stage: 'idea' | 'prototype' | 'demo';
  city: string;
  isRemote: boolean;
  leader: {
    id: string;
    name: string;
    avatar: string;
    city: string;
  };
  likes: number;
  hasLiked?: boolean;
  hasApplied?: boolean;
  applicationStatus?: 'pending' | 'accepted' | 'declined' | 'handled';
  applicationsCount: number;
  status: 'open' | 'filled';
  createdAt: string;
}

export interface TalentProfile {
  id: string;
  name: string;
  avatar: string;
  skills: string[];
  city: string;
  availableTime: string;
  roleIntent: string;
  bio: string;
  likes: number;
  hasLiked?: boolean;
  atomclubVerified: boolean;
  isPublic: boolean;
}

export interface ForumSession {
  startsAt?: string;
  endsAt?: string;
  cancellationDeadline?: string;
  publication?: 'draft' | 'published';
  bookingEnabled?: boolean;
  capacity?: number | null;
  id: string;
  title: string;
  titleEn: string;
  track: string;
  trackEn: string;
  date: string;
  time: string;
  venue: string;
  venueEn: string;
  bookedCount: number;
  checkedInCount?: number;
  speakers: {
    name: string;
    nameEn: string;
    role: string;
    roleEn: string;
    org: string;
    avatar: string;
  }[];
  description: string;
  descriptionEn: string;
  isBooked?: boolean;
  status: 'upcoming' | 'ongoing' | 'finished';
}

export interface NotificationItem {
  id: string;
  type: 'system' | 'review' | 'team' | 'forum' | 'live' | 'card' | 'community';
  title: string;
  titleEn?: string;
  content: string;
  contentEn?: string;
  time: string;
  read: boolean;
  link?: string;
  toUserId?: string;          // 接收人；'all' = 全员公告；缺省视为 all
  applicationId?: string;     // 组队申请类通知：消息中心内可直接确认/拒绝
  applicationKind?: 'application' | 'invitation';
  applicationStatus?: 'pending' | 'accepted' | 'declined';
  handled?: boolean;          // 组队申请是否已处理
}

export interface CMSData {
  stats: {
    makers: number;
    finalistProjects: number;
    prizePool: string;
    prizePoolEn: string;
    judges: number;
  };
  announcement: string;
  announcementEn: string;
  streamUrl: string;
}

export interface ExchangeCard {
  id: string;
  name: string;
  avatar: string;
  phone: string;
  contactStatus?: 'not_shared' | 'unavailable';
  org: string;
  skills: string[];
  city: string;
  exchangedAt: string;
  direction?: 'in' | 'out';   // in = 对方换给我的；out = 我换给对方的（对方盒子里有我的）
  peerName?: string;
}

/* ==========================================================================
   Detail-page models
   ========================================================================== */

export interface ScheduleItem {
  id: string;
  day: 'day1' | 'day2';
  startTime: string;
  endTime: string;
  title: string;
  titleEn: string;
  venue: string;
  venueEn: string;
  type: 'keynote' | 'symposium' | 'roadshow' | 'workshop' | 'social' | 'break';
  track: TrackType | 'general';
  speaker?: string;
  description: string;
  descriptionEn: string;
}

export interface Venue {
  id: string;
  name: string;
  nameEn: string;
  address: string;
  district: string;
  capacity: number;
  image: string;
  tags: string[];
  intro: string;
  facilities: string[];
  transit: string;
}

export interface ProgramBlock {
  id: string;
  eyebrow: string;
  title: string;
  titleEn: string;
  summary: string;
  bullets: { title: string; desc: string; icon: 'spark' | 'people' | 'globe' | 'trophy' | 'shield' | 'bolt' }[];
  image: string;
  stats?: { label: string; value: string }[];
}

export interface Application {
  id: string;
  recruitId: string;
  applicantId: string;
  applicantName: string;
  applicantAvatar: string;
  city: string;
  skills: string[];
  message: string;
  status: 'pending' | 'accepted' | 'declined';
  appliedAt: string;
}

export type ProjectStage = RegistrationStatus;
