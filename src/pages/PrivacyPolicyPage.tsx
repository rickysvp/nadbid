import LegalPage from './LegalPage';

/** 隐私政策 — 说明平台收集与处理哪些数据 */
export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      docName="Legal · Privacy Policy"
      title="Privacy Policy"
      updated="September 16, 2026"
      sections={[
        {
          heading: '1. Overview',
          body: [
            'This Privacy Policy explains what information is collected when you use nadbid.fun (the "Platform") and how it is used. The Platform is a non-custodial, on-chain interface: it does not require an account, email, or KYC, and it never stores your private keys.',
          ],
        },
        {
          heading: '2. Information We Collect',
          body: [
            'Wallet address: your connected wallet address is used to display your bids, claim entitlements, and auction state. It is a public blockchain address and is inherently visible on-chain.',
            'On-chain data: bid amounts, auction participation, and transaction hashes are public blockchain data stored on the Monad network. We do not control or delete this data.',
            'Usage data: basic analytics (pages visited, device type, approximate region) may be collected to improve the product. This data is not linked to your wallet identity.',
            'Local storage: we may store lightweight preferences (e.g. last connected network) in your browser local storage. You can clear this at any time.',
            'We do NOT collect: government IDs, email addresses, phone numbers, or any KYC information.',
          ],
        },
        {
          heading: '3. How We Use Information',
          body: [
            'We use the information above to: (a) render your auction state and claim entitlements; (b) operate and improve the Platform; (c) detect and prevent abuse or illegal activity; (d) comply with legal obligations.',
          ],
        },
        {
          heading: '4. Third-Party Services',
          body: [
            'Wallet connections may be handled by third-party providers (e.g. WalletConnect / Reown, MetaMask, OKX Wallet). Your interactions with those providers are governed by their own privacy policies.',
            'Blockchain data is read through RPC providers and public explorers. Those providers may log requests including your IP address and the queried on-chain data.',
            'The Platform may be hosted on infrastructure providers (e.g. Vercel) that process standard server logs.',
          ],
        },
        {
          heading: '5. Cookies & Analytics',
          body: [
            'The Platform uses only essential local storage and, if enabled, privacy-respecting analytics. We do not use third-party advertising cookies. You can block scripts and still use the core auction features.',
          ],
        },
        {
          heading: '6. Data Retention & Deletion',
          body: [
            'On-chain data is permanent and public by design; it cannot be deleted or altered by the Platform. Off-chain usage analytics are retained only as long as needed for product improvement and are anonymized where practical.',
          ],
        },
        {
          heading: '7. Data Security',
          body: [
            'We apply industry-standard security practices to protect the Platform. However, no method of transmission or storage is fully secure, and we cannot guarantee absolute security. Your wallet security is ultimately your own responsibility.',
          ],
        },
        {
          heading: '8. Your Rights',
          body: [
            'Depending on your jurisdiction (e.g. under GDPR or PDPA), you may have rights to access, correct, or delete personal data we hold. Because the Platform stores minimal personal data and most records are on-chain, these rights are limited in practice. To exercise any right, contact us using the details below.',
          ],
        },
        {
          heading: '9. Children',
          body: ['The Platform is not directed to individuals under 18 and we do not knowingly collect their data. If you believe a minor has used the Platform, contact us so we can take appropriate action.'],
        },
        {
          heading: '10. Changes to This Policy',
          body: [
            'We may update this Privacy Policy from time to time. Material changes will be indicated by an updated "Last updated" date at the top of this page.',
          ],
        },
        {
          heading: '11. Contact',
          body: ['For privacy questions or requests, contact: privacy@nadbid.fun'],
        },
      ]}
    />
  );
}
