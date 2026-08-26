/**
 * Termo de responsabilidade do visitante -- texto RASCUNHO, não revisado por
 * advogado. `content_snapshot` em visitor_waivers grava este texto exato no
 * momento da assinatura, então trocar WAIVER_TEXT depois não muda o que já
 * foi assinado -- só afeta quem assinar dali pra frente. Suba WAIVER_VERSION
 * junto de qualquer mudança de texto real.
 *
 * IS_PLACEHOLDER_WAIVER = true mostra o aviso de rascunho na tela de
 * assinatura. Só virar false depois que um advogado licenciado em Nevada
 * revisar WAIVER_TEXT -- nenhuma outra mudança de código é necessária.
 */
export const WAIVER_VERSION = 'draft-v1'
export const IS_PLACEHOLDER_WAIVER = true

export const WAIVER_TEXT = `DRAFT -- PLACEHOLDER TEXT. This is not a legally reviewed document. Replace with attorney-reviewed Nevada liability waiver text before this gates real training.

COMBAT SPORTS ASSUMPTION OF RISK, RELEASE OF LIABILITY, AND WAIVER

THE Q MMA -- Las Vegas, NV

By signing this document, I acknowledge and agree to the following:

1. ASSUMPTION OF RISK

I understand that mixed martial arts, Muay Thai, boxing, jiu-jitsu, and related combat sports training involve inherent and significant risks, including but not limited to: bruising, sprains, fractures, dislocations, concussions and other head injuries, cuts, and in rare cases, permanent disability or death. I voluntarily choose to participate in training at THE Q MMA with full knowledge of these risks.

2. MEDICAL FITNESS

I represent that I am in good physical health and have no medical condition that would prevent my safe participation in combat sports training. I am not aware of any injury, illness, or condition that increases my risk of harm from training. I agree to inform academy staff of any relevant medical condition before participating.

3. RELEASE OF LIABILITY

To the fullest extent permitted by Nevada law, I release, waive, discharge, and covenant not to sue THE Q MMA, its owners, coaches, staff, and affiliated athletes from any and all liability, claims, demands, or causes of action arising out of my participation in training, whether caused by negligence or otherwise, except for gross negligence or intentional misconduct.

4. RULES AND CONDUCT

I agree to follow all instructions from coaches and staff, to train within my ability level, to use protective equipment as directed, and to conduct myself safely and respectfully toward other participants at all times. I understand that failure to follow academy rules may result in removal from training.

5. VOLUNTARY AGREEMENT

I have read this document in its entirety, I understand its contents, and I am signing it voluntarily and of my own free will. I understand this is a legally binding agreement.

[END OF PLACEHOLDER TEXT -- REPLACE WITH ATTORNEY-REVIEWED LANGUAGE]`

export interface WaiverAcknowledgment {
  key: 'risk' | 'medical' | 'release' | 'rules'
  label: string
}

export const WAIVER_ACKNOWLEDGMENTS: WaiverAcknowledgment[] = [
  {
    key: 'risk',
    label: 'I understand and accept the risks of combat sports training described above.',
  },
  {
    key: 'medical',
    label: 'I confirm I am medically fit to participate in training.',
  },
  {
    key: 'release',
    label: 'I release THE Q MMA from liability as described above.',
  },
  {
    key: 'rules',
    label: 'I agree to follow academy rules and coach instructions at all times.',
  },
]
