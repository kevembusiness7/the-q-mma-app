import { LegalPage } from '../components/legal/LegalPage'

export function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="August 25, 2026">
      <p>
        This policy explains what information THE Q MMA ("we", "us") collects through this app and
        website, why we collect it, and who we share it with. It applies to the mobile app and to
        the-q-mma-app.vercel.app.
      </p>

      <h2>Information we collect</h2>
      <p>
        <strong>Account information.</strong> When you create an account we collect your email
        address and name. Authentication is handled by Supabase; we never see or store your
        password in plain text.
      </p>
      <p>
        <strong>Orders and shipping.</strong> When you buy merchandise, book an athlete promotion,
        or win an item in The Q Vault, we collect the shipping name and address needed to fulfill
        that order.
      </p>
      <p>
        <strong>Payment information.</strong> Payments are processed entirely by Stripe. We never
        receive or store your full card number. For The Q Vault, verifying a card before bidding
        creates a Stripe-hosted, reusable payment method reference on our side (not the card
        details themselves) so the winning bidder's card can be charged automatically if they win
        — see "The Q Vault and bidding" below.
      </p>
      <p>
        <strong>Uploaded content.</strong> If you attach a screenshot to a support ticket, or (for
        athlete/business accounts) upload campaign media for an Athlete Promotion booking, we store
        that file to fulfill the request it was submitted for.
      </p>
      <p>
        <strong>Usage data.</strong> We keep a record of the actions this app is built around —
        your orders, promotion bookings, support tickets, and (if you use The Q Vault) your bids,
        watchlist, and any items you've won.
      </p>

      <h2>How we use this information</h2>
      <ul>
        <li>To create and secure your account.</li>
        <li>To process and ship orders, and to fulfill promotion bookings and auction wins.</li>
        <li>To respond to support requests.</li>
        <li>To send transactional emails — order confirmations, shipping updates, bidding alerts
          (outbid, won, payment reminders) — never marketing email without your consent.</li>
        <li>To prevent fraud, including the card-verification step required before bidding in
          The Q Vault.</li>
      </ul>

      <h2>The Q Vault and bidding</h2>
      <p>
        Placing a bid requires verifying a card first. That verification does not charge you
        anything — it confirms the card is valid and saves a reference to it for later use. If you
        win an auction, that same card is charged automatically for the winning bid amount. If the
        charge fails, you have a limited window to resolve it before the item is offered to the
        next-highest bidder and your account is temporarily restricted from further bidding. Bid
        history (amount and time) is visible to other users of the app; your identity is not shown
        alongside a bid to other bidders.
      </p>

      <h2>Who we share information with</h2>
      <p>We do not sell your information. We share it only with the service providers that run
        this app on our behalf:</p>
      <ul>
        <li><strong>Supabase</strong> — database, authentication, and file storage.</li>
        <li><strong>Stripe</strong> — payment processing and card storage.</li>
        <li><strong>Resend</strong> — transactional email delivery.</li>
        <li><strong>Vercel</strong> — hosting.</li>
      </ul>

      <h2>Cookies and local storage</h2>
      <p>
        The app uses browser local storage to keep you signed in between visits. We do not use
        third-party advertising trackers.
      </p>

      <h2>Your rights</h2>
      <p>
        You can review and update your profile information from the You tab at any time. To
        request a copy of your data or ask us to delete your account, contact us through Help &amp;
        Support in the app — account deletion is currently handled as a support request rather than
        a self-service button.
      </p>

      <h2>Children's privacy</h2>
      <p>This app is not directed at children under 13, and we do not knowingly collect
        information from them.</p>

      <h2>Changes to this policy</h2>
      <p>If this policy changes in a material way, we'll update the date at the top of this page.</p>

      <h2>Contact</h2>
      <p>Questions about this policy can be sent through Help &amp; Support in the app.</p>

      <div className="legal-note">
        This page is provided as a starting point and describes the app's actual data practices as
        implemented, but it is not a substitute for review by a lawyer — particularly given the
        real-money bidding, card authorization, and account-suspension mechanics in The Q Vault.
      </div>
    </LegalPage>
  )
}

export default PrivacyPolicyPage
