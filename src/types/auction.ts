/**
 * Tipos do The Q Vault (área de leilão).
 *
 * Espelha as tabelas `auction_items`/`auction_media` em
 * supabase/auction-schema.sql — se adicionar um campo aqui, adicione lá
 * também e em src/hooks/useAdminAuctions.ts / useAuctions.ts.
 */

export type AuctionStatus = 'scheduled' | 'live' | 'sold' | 'reserve_not_met' | 'unsold' | 'cancelled';

export type AuctionMediaKind = 'photo' | 'video';

export interface AuctionMedia {
  id: string;
  itemId: string;
  kind: AuctionMediaKind;
  url: string;
  isAthleteWearing: boolean;
  sortOrder: number;
}

export interface AuctionItem {
  id: string;
  slug: string;
  title: string;
  athleteName: string;
  athleteSlug: string | null;
  eventName: string | null;
  opponentName: string | null;
  fightDate: string | null;
  fightResult: string | null;
  athleteQuote: string | null;
  description: string;
  story: string;
  condition: string;
  autographLocation: string | null;
  authenticityNote: string | null;
  startingPriceCents: number;
  /** Nunca vem preenchido pro público — só admin lê o valor real. */
  reservePriceCents: number | null;
  minIncrementCents: number;
  currentBidCents: number;
  bidCount: number;
  startsAt: string;
  endsAt: string;
  originalEndsAt: string;
  extendedCount: number;
  status: AuctionStatus;
  fightWorn: boolean;
  autographed: boolean;
  oneOfOne: boolean;
  shipsDomesticCents: number;
  shipsInternationalCents: number | null;
  isActive: boolean;
  sortOrder: number;
  media: AuctionMedia[];
}

/** Texto de exibição de cada status — usado pelo admin (o público não vê 'scheduled'/'cancelled' como tal). */
export const AUCTION_STATUS_LABEL: Record<AuctionStatus, string> = {
  scheduled: 'Coming soon',
  live: 'Live',
  sold: 'Sold',
  reserve_not_met: 'Reserve not met',
  unsold: 'Unsold',
  cancelled: 'Cancelled',
};
