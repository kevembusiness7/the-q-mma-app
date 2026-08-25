import { LegalPage } from '../components/legal/LegalPage'

export function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="August 25, 2026">
      <p>
        These terms cover your use of THE Q MMA — the app, the-q-mma-app.vercel.app, the shop,
        Athlete Promotions, and The Q Vault auctions. By creating an account or using any of these,
        you agree to them.
      </p>

      <h2>Accounts</h2>
      <p>
        You're responsible for the activity on your account and for keeping your login secure. You
        must be able to form a binding contract to create an account — if you're a minor, use this
        app with a parent or guardian's involvement.
      </p>

      <h2>Orders and merchandise</h2>
      <p>
        Prices are shown at checkout in USD. Payment is processed by Stripe. Shipping timelines and
        return eligibility are shown on each product and in your order confirmation. We reserve the
        right to cancel and refund an order if an item turns out to be unavailable after purchase.
      </p>

      <h2>Athlete Promotions</h2>
      <p>
        Booking a promotion reserves a spot on the athlete's schedule for the date you select and is
        subject to review and approval before it's confirmed. Payment is collected at booking time;
        approval or rejection follows afterward, and does not happen automatically just because
        payment succeeded.
      </p>

      <h2>The Q Vault — auctions</h2>
      <p>These terms are specific to bidding, because real money and a binding sale are involved:</p>
      <ul>
        <li><strong>Card verification.</strong> You must verify a valid card before placing any
          bid. This does not charge you, but it authorizes us to charge that card automatically if
          you win.</li>
        <li><strong>Bids are binding.</strong> Placing a bid is a commitment to buy the item at
          that price if you're the winning bidder when the auction closes. Bids cannot be
          retracted.</li>
        <li><strong>Reserve price.</strong> Some items have a confidential minimum price. If the
          highest bid doesn't reach it, the item is not sold, and the reserve amount is never
          disclosed.</li>
        <li><strong>Anti-sniping.</strong> A bid placed in the final two minutes of an auction
          extends it by two minutes, so no bid can be placed with no chance of response.</li>
        <li><strong>Winning and payment.</strong> If you win, your verified card is charged
          automatically for the winning bid amount. If that charge fails, you have 24 hours to
          resolve it. After that window, the sale is offered to the next-highest bidder, and your
          account is suspended from bidding for 90 days.</li>
        <li><strong>All sales are final.</strong> Auction items are sold as-is and described as
          accurately as we can; they are not eligible for return except where required by law.</li>
        <li><strong>Certificate of authenticity.</strong> A won item ships with a digital
          certificate confirming it was sold through The Q Vault as described at the time of sale.</li>
      </ul>

      <h2>Prohibited conduct</h2>
      <ul>
        <li>Bidding without the intent or ability to pay.</li>
        <li>Using multiple accounts to bid against yourself or manipulate a price.</li>
        <li>Attempting to interfere with the operation of the app, including automated bidding
          tools not provided by us.</li>
      </ul>

      <h2>Intellectual property</h2>
      <p>
        Athlete names, images, and likenesses shown in the app are used with permission. Content you
        upload (support attachments, promotion campaign media) remains yours; you grant us the
        rights needed to use it for the purpose you submitted it for.
      </p>

      <h2>Disclaimers and liability</h2>
      <p>
        The app is provided "as is." To the extent permitted by law, we're not liable for indirect
        or consequential damages arising from your use of it. Nothing here limits liability that
        can't be limited by law.
      </p>

      <h2>Changes to these terms</h2>
      <p>If these terms change in a material way, we'll update the date at the top of this page.</p>

      <h2>Contact</h2>
      <p>Questions about these terms can be sent through Help &amp; Support in the app.</p>

      <div className="legal-note">
        This page is a starting point grounded in how the app actually works today, not a
        substitute for a lawyer's review. The Vault's binding-bid, automatic-charge, and
        account-suspension mechanics move real money — worth having actually checked, including
        against the consumer-protection rules of whichever places you plan to operate in, before
        relying on this page as-is.
      </div>
    </LegalPage>
  )
}

export default TermsPage
