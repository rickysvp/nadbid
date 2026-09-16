import LegalPage from './LegalPage';

/** 风险披露 — 参与 NADBID 拍卖前的风险说明 */
export default function RiskDisclaimerPage() {
  return (
    <LegalPage
      docName="Legal · Risk Disclaimer"
      title="Risk Disclaimer"
      updated="September 16, 2026"
      sections={[
        {
          heading: '1. High-Risk Activity',
          body: [
            'Participating in on-chain auctions involves significant risk. The value of cryptocurrencies and digital assets is highly volatile and can drop to zero. You should only participate with funds you can afford to lose completely.',
            'The Platform is experimental software operating on a blockchain test network and, in the future, main networks. Smart contracts may contain bugs, be exploited, or behave unexpectedly despite testing.',
          ],
        },
        {
          heading: '2. Non-Refundable Bids',
          body: [
            'Retained bids are non-refundable by design. Once your bid is retained as the valid bid for a price level, the amount is committed to the auction pool even if you do not win the asset. Dividends received from earlier positions are not guaranteed and depend entirely on future bidding activity.',
            'Only bids that lose the same-block random selection, and bids in auctions that fail to meet the reserve or receive no bids, are refunded in accordance with the protocol.',
          ],
        },
        {
          heading: '3. No Investment Advice',
          body: [
            'Nothing on the Platform constitutes investment, financial, legal, or tax advice. Auction prices, pool sizes, and potential dividends are not predictions, guarantees, or offers. Do not rely on marketing language when deciding whether to bid.',
          ],
        },
        {
          heading: '4. Smart Contract & Protocol Risk',
          body: [
            'The Platform relies on third-party infrastructure including RPC nodes, blockchain explorers, and wallet providers. Failures, censorship, or outages in any of these can prevent you from bidding, claiming, or withdrawing.',
            'You interact with smart contracts at your own risk. Before bidding, review the contract source code and any audit reports published by the project.',
          ],
        },
        {
          heading: '5. Regulatory Risk',
          body: [
            'The legal status of cryptocurrencies, auctions, and reward distributions varies by jurisdiction and remains uncertain in many places. You are solely responsible for ensuring that your participation is lawful where you reside.',
            'The Platform may restrict or exclude users from certain jurisdictions at any time. Restricted users must not attempt to bypass such restrictions.',
          ],
        },
        {
          heading: '6. Assets Listed by Third Parties',
          body: [
            'Assets offered in auctions are listed by independent sellers. The Platform does not verify, endorse, or guarantee the authenticity, value, legality, or transferability of any listed asset. Due diligence on the asset and seller is your responsibility.',
          ],
        },
        {
          heading: '7. No Guarantees of Return',
          body: [
            'There is no guarantee that any auction will reach its reserve, that any bidder will earn dividends, that listed assets will appreciate, or that sellers will fulfill obligations. Past activity on the Platform or elsewhere does not predict future results.',
          ],
        },
        {
          heading: '8. Acknowledgment',
          body: [
            'By bidding or interacting with the Platform, you acknowledge that you have read, understood, and accepted the risks described above and in the Terms of Service, and that you assume full responsibility for your decisions and any resulting losses.',
          ],
        },
        {
          heading: '9. Contact',
          body: ['For questions about these risks, contact: legal@nadbid.fun'],
        },
      ]}
    />
  );
}
