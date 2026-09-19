import LegalPage from './LegalPage';

/** 服务条款 — 适用所有访问与使用 nadbid.fun 的用户 */
export default function TermsOfServicePage() {
  return (
    <LegalPage
      docName="Legal · Terms of Service"
      title="Terms of Service"
      updated="September 16, 2026"
      sections={[
        {
          heading: '1. Acceptance of Terms',
          body: [
            'By accessing or using nadbid.fun (the "Platform"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to any part of these Terms, you must not use the Platform.',
            'The Platform is a non-custodial, on-chain auction interface. It does not hold, control, or custody any user funds or assets; all value transfers occur on the Monad blockchain via smart contracts you interact with directly.',
          ],
        },
        {
          heading: '2. Eligibility',
          body: [
            'You must be at least 18 years old (or the age of majority in your jurisdiction) to use the Platform.',
            'You must not use the Platform if you are located in, or a citizen or resident of, any jurisdiction where use of the Platform or participation in cryptocurrency auctions is prohibited by law. You are solely responsible for compliance with the laws applicable to you.',
            'The Platform does not offer services to users in the United States or other restricted jurisdictions without separate regulatory clearance.',
          ],
        },
        {
          heading: '3. Auction Mechanics & Non-Refundable Bids',
          body: [
            'Auctions listed on the Platform allow users to place bids in MON at the next required price level. Bids that are retained (selected by the protocol as the valid bid for that price level) are final and non-refundable, and become part of the auction pool.',
            'If multiple users bid at the same price level in the same block, the protocol retains one bid at random and refunds the others in full. Random selection is performed on-chain and cannot be influenced by transaction ordering.',
            'The last retained bidder when the countdown expires wins the asset. Sellers set start price, increment, reserve price, and duration. The platform charges a protocol fee (5% of the pool) and a bid fee (1% per bid).',
            'A portion of each new retained bid (15% of the pool) is distributed to earlier bidders as dividends, subject to protocol caps. Dividend entitlements are not guaranteed income and depend entirely on subsequent bidding activity.',
          ],
        },
        {
          heading: '4. No Custody & Wallet Responsibility',
          body: [
            'The Platform never takes custody of your private keys, tokens, or NFTs. You interact with the protocol using your own wallet (e.g. MetaMask, OKX Wallet, WalletConnect).',
            'You are solely responsible for safeguarding your private keys, seed phrases, and wallet access. Any transaction you sign is irreversible. The Platform cannot reverse, recover, or refund transactions executed on-chain.',
            'Never share your private keys. No legitimate party will ever ask you for them.',
          ],
        },
        {
          heading: '5. Prohibited Conduct',
          body: [
            'You agree not to: (a) use the Platform for any unlawful purpose, including money laundering, fraud, or sanctions evasion; (b) interfere with or disrupt the Platform or its underlying networks; (c) impersonate any person or entity; (d) create accounts or bids using automated means to manipulate auction outcomes, where such manipulation violates applicable law.',
            'The Platform reserves the right to restrict access to users or jurisdictions at its sole discretion, including where required for regulatory compliance.',
          ],
        },
        {
          heading: '6. Disclaimers',
          body: [
            'The Platform and all associated smart contracts are provided "as is" and "as available", without warranties of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.',
            'The Platform does not guarantee the accuracy, completeness, or availability of any auction, asset, or data. Assets listed by sellers are provided by third parties and are not endorsed or verified by the Platform.',
          ],
        },
        {
          heading: '7. Limitation of Liability',
          body: [
            'To the maximum extent permitted by law, nadbid.fun and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, revenue, data, or digital assets, arising out of or related to your use of the Platform, even if advised of the possibility of such damages.',
            'You acknowledge that blockchain transactions are subject to network conditions, gas prices, and smart-contract risks beyond the Platform\u2019s control.',
          ],
        },
        {
          heading: '8. Termination',
          body: [
            'We may suspend or terminate your access to the Platform at any time, with or without cause, including for violations of these Terms. On-chain records and your wallet interactions are not affected by termination.',
          ],
        },
        {
          heading: '9. Changes to These Terms',
          body: [
            'We may update these Terms from time to time. Material changes will be reflected by an updated "Last updated" date. Continued use of the Platform after changes take effect constitutes acceptance of the revised Terms.',
          ],
        },
        {
          heading: '10. Governing Law',
          body: [
            'These Terms are governed by the laws of Singapore, without regard to conflict-of-law principles. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts of Singapore.',
            'Nothing in these Terms constitutes legal, financial, or tax advice. Consult a qualified professional before participating in any auction.',
          ],
        },
        {
          heading: '11. Contact',
          body: ['For questions about these Terms, contact: legal@nadbid.fun'],
        },
      ]}
    />
  );
}
