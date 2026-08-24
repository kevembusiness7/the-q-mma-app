export type PromoContentType = 'story' | 'feed_post' | 'reel';

export const ROTULO_CONTEUDO: Record<PromoContentType, string> = {
  story: 'Instagram Story',
  feed_post: 'Feed Post',
  reel: 'Reel',
};

export type PromoReviewStatus =
  | 'pending_review'
  | 'under_review'
  | 'approved'
  | 'scheduled'
  | 'posted'
  | 'rejected'
  | 'cancelled';

export const ROTULO_REVIEW: Record<PromoReviewStatus, string> = {
  pending_review: 'Pending review',
  under_review: 'Under review',
  approved: 'Approved',
  scheduled: 'Scheduled',
  posted: 'Posted',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export type PromoPaymentStatus = 'awaiting_payment' | 'paid' | 'cancelled' | 'refunded';

export const ROTULO_PROMO_PAGAMENTO: Record<PromoPaymentStatus, string> = {
  awaiting_payment: 'Awaiting payment',
  paid: 'Paid',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export interface PromotionAthlete {
  slug: string;
  name: string;
  photoUrl: string | null;
  bio: string | null;
  instagramHandle: string;
  followers: number;
  engagementRate: number | null;
  avgStoryViews: number | null;
  avgReelViews: number | null;
  allowPromotions: boolean;
  maxPromotionsPerWeek: number;
  statsUpdatedAt: string | null;
}

export interface PromotionPackage {
  id: string;
  athleteSlug: string;
  title: string;
  contentType: PromoContentType;
  priceCents: number;
  contentCreationFeeCents: number;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
}

/** Atleta com os próprios pacotes já juntados — o que a vitrine e a ficha usam. */
export interface PromotionAthleteWithPackages extends PromotionAthlete {
  packages: PromotionPackage[];
}

export interface PromotionRequest {
  id: string;
  requestNumber: string;
  athleteSlug: string | null;
  athleteName: string;
  packageTitle: string;
  packageContentType: PromoContentType;
  packagePriceCents: number;
  needsContentCreation: boolean;
  contentCreationFeeCents: number;
  requestedDate: string;
  scheduledDate: string | null;
  reviewStatus: PromoReviewStatus;
  rejectionReason: string | null;
  paymentStatus: PromoPaymentStatus;
  totalCents: number;
  campaignLogoPath: string | null;
  campaignMediaPath: string;
  campaignCaption: string | null;
  campaignWebsiteLink: string | null;
  campaignBusinessInstagram: string;
  campaignCta: string | null;
  campaignNotes: string | null;
  createdAt: string;
  paidAt: string | null;
  postedAt: string | null;
}

/**
 * Percentual repassado ao atleta — hoje é só um número exibido (nenhum
 * pagamento automático acontece nesta v1, ver README/plano da feature).
 * Trocar aqui não mexe em preço nem em banco, é cosmético.
 */
export const ATHLETE_SPLIT_PERCENT = 70;
