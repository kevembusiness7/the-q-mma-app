export type VisitorRequestStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved_pending_waiver'
  | 'cleared_to_train'
  | 'rejected'
  | 'cancelled'
  | 'expired'

export const ROTULO_VISITOR_STATUS: Record<VisitorRequestStatus, string> = {
  draft: 'Draft',
  submitted: 'Pending review',
  under_review: 'Under review',
  approved_pending_waiver: 'Waiver required',
  cleared_to_train: 'Cleared to train',
  rejected: 'Not approved',
  cancelled: 'Cancelled',
  expired: 'Expired',
}

/**
 * Ativo = ocupa a vaga única por usuário (mesma lista do índice parcial em
 * visitor-schema.sql). Reaproveitado tanto pra decidir se mostra o CTA "Request
 * a Visitor Class" quanto pelo filtro "All" do admin -- nunca redefinir essa
 * lista em outro lugar, ela tem que bater com o banco sempre.
 */
export const ACTIVE_VISITOR_STATUSES: VisitorRequestStatus[] = [
  'submitted',
  'under_review',
  'approved_pending_waiver',
  'cleared_to_train',
]

export type VisitorExperienceLevel = 'none' | 'beginner' | 'intermediate' | 'advanced'

export const ROTULO_EXPERIENCE: Record<VisitorExperienceLevel, string> = {
  none: 'First time',
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

export type VisitorRejectionReasonCode =
  | 'incomplete_information'
  | 'schedule_conflict'
  | 'capacity_full'
  | 'policy_violation'
  | 'duplicate_request'
  | 'age_requirement_not_met'
  | 'other'

export const ROTULO_REJECTION: Record<VisitorRejectionReasonCode, string> = {
  incomplete_information: 'Incomplete information',
  schedule_conflict: 'Schedule conflict',
  capacity_full: 'Class is at capacity',
  policy_violation: 'Policy violation',
  duplicate_request: 'Duplicate request',
  age_requirement_not_met: 'Does not meet the 18+ requirement',
  other: 'Other',
}

export interface VisitorClassRequest {
  id: string
  userId: string | null
  fullName: string
  email: string
  phone: string | null
  dateOfBirth: string
  requestedClassName: string
  requestedDate: string
  requestedTime: string | null
  experienceLevel: VisitorExperienceLevel
  martialArtsExperience: string | null
  notesFromVisitor: string | null
  status: VisitorRequestStatus
  reviewedBy: string | null
  reviewedAt: string | null
  approvedAt: string | null
  rejectedAt: string | null
  rejectionReasonCode: VisitorRejectionReasonCode | null
  rejectionReason: string | null
  clearedAt: string | null
  expiresAt: string | null
  waiverId: string | null
  createdAt: string
  pass: VisitorPass | null
}

export interface VisitorPass {
  id: string
  passCode: string
  requestId: string
  fullName: string
  requestedClassName: string
  waiverVersion: string
  status: 'cleared_to_train' | 'expired'
  clearedAt: string
  expiresAt: string | null
}
