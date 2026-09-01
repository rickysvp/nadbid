import { useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Gavel, Coins, Layers, Scale, Zap, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { cn } from '../utils/cn';

interface DocSection {
  id: string;
  title: string;
  icon: typeof BookOpen;
  content: { question: string; answer: string }[];
}

const docSections: DocSection[] = [
  {
    id: 'auctions',
    title: 'Auctions',
    icon: Gavel,
    content: [
      {
        question: 'How do KOL auctions work?',
        answer: 'KOLs list exclusive access passes, experiences, or services for auction. Users bid with $MON tokens. The highest bidder at auction end wins the PASS NFT and associated benefits. Outbid amounts are automatically refunded.',
      },
      {
        question: 'What is the minimum bid increment?',
        answer: 'The minimum bid increment is 5% of the current highest bid. This prevents trivial 1-cent bids and ensures meaningful price discovery.',
      },
      {
        question: 'What happens if I get outbid?',
        answer: 'Your bid amount is automatically refunded to your wallet upon being outbid. Refunds are instant and incur no gas fees.',
      },
      {
        question: 'Can I cancel my bid?',
        answer: 'No, all bids are final and cannot be reversed once confirmed on-chain. This ensures auction integrity and prevents bid manipulation.',
      },
      {
        question: 'What is auction extension?',
        answer: 'If a bid is placed within the last 5 minutes of an auction, the auction time is automatically extended by 5 minutes. This prevents last-second sniping and gives all bidders a fair chance.',
      },
    ],
  },
  {
    id: 'pass',
    title: 'PASS NFT',
    icon: Layers,
    content: [
      {
        question: 'What is a PASS NFT?',
        answer: 'A PASS NFT represents ownership of a KOL access pass. Each PASS grants the holder specific benefits defined by the KOL, such as private group access, alpha calls, 1-on-1 sessions, or exclusive content.',
      },
      {
        question: 'How does the bonding curve work?',
        answer: 'PASS tokens use a quadratic bonding curve: price = basePrice × (supply / referenceSupply)². As more PASS are minted, the price increases. Burning PASS reduces supply and lowers the price. A 3% spread applies to burns.',
      },
      {
        question: 'What is the protocol fee for minting?',
        answer: 'A 3% protocol fee applies to all mint transactions. This fee supports platform development, security audits, and ecosystem growth.',
      },
      {
        question: 'Can I transfer my PASS?',
        answer: 'Yes, PASS NFTs are fully transferable on-chain. You can send them to any wallet address or list them on secondary markets.',
      },
    ],
  },
  {
    id: 'staking',
    title: 'Staking',
    icon: Coins,
    content: [
      {
        question: 'How does staking work?',
        answer: 'Stake your PASS tokens to earn a share of the KOL\'s auction revenue. Staked PASS generates yield based on the KOL\'s revenue share percentage and total auction volume.',
      },
      {
        question: 'What is the activation period?',
        answer: 'New stakes require a 24-hour activation period before they begin earning yield. This prevents flash-staking attacks and ensures fair yield distribution.',
      },
      {
        question: 'What is the unlock period?',
        answer: 'When you unstake, there is a 7-day cooldown period before your PASS is returned. During this time, your PASS continues to earn yield. This prevents market manipulation from sudden mass unstaking.',
      },
      {
        question: 'How is yield calculated?',
        answer: 'Yield is calculated daily based on: (your staked PASS / total staked PASS) × KOL auction revenue × revenue share percentage. Yield is distributed every 24 hours and can be claimed from the Claim page.',
      },
    ],
  },
  {
    id: 'claim',
    title: 'Claiming Rewards',
    icon: Zap,
    content: [
      {
        question: 'What rewards can I claim?',
        answer: 'You can claim staking yields, auction refunds, and referral bonuses. All rewards are denominated in $MON tokens.',
      },
      {
        question: 'Is there a claim fee?',
        answer: 'A 1% protocol fee applies to all claimed yields. This fee supports the Monad ecosystem and platform operations. Auction refunds have no fee.',
      },
      {
        question: 'Is there a minimum claim amount?',
        answer: 'No, there is no minimum balance requirement for claiming rewards. You can claim any amount at any time.',
      },
      {
        question: 'When are staking rewards distributed?',
        answer: 'Staking rewards are calculated and unlocked every 24 hours based on the previous day\'s active staked PASS volume. Rewards become claimable immediately after distribution.',
      },
    ],
  },
  {
    id: 'arbitration',
    title: 'Arbitration',
    icon: Scale,
    content: [
      {
        question: 'What is the arbitration system?',
        answer: 'Arbitration is a decentralized dispute resolution mechanism. If a KOL fails to fulfill auction promises, the winner can raise a dispute. PASS holders then vote on whether to slash (return funds to winner) or release (pay KOL).',
      },
      {
        question: 'Who can vote?',
        answer: 'Only holders of the relevant KOL\'s PASS tokens can vote on disputes for that KOL. Voting power is proportional to the number of PASS held (1 PASS = 1 vote).',
      },
      {
        question: 'How long does voting last?',
        answer: 'The voting period lasts 48 hours from when the dispute is raised. During this time, PASS holders can cast their votes.',
      },
      {
        question: 'What happens to slashed funds?',
        answer: 'If the vote results in a slash, the KOL\'s staked collateral is slashed and returned to the auction winner. Any excess goes to the platform treasury.',
      },
      {
        question: 'What if the vote is tied?',
        answer: 'If the vote is tied (50/50), the dispute goes to manual review by the platform team. The team will review all evidence and make a final decision within 72 hours.',
      },
    ],
  },
  {
    id: 'points',
    title: 'Points & Referrals',
    icon: BookOpen,
    content: [
      {
        question: 'What are points used for?',
        answer: 'Points are used for airdrop weighting. Users with more points receive a larger share of future token airdrops. Points do not have monetary value and cannot be traded or transferred.',
      },
      {
        question: 'How do I earn points?',
        answer: 'You earn points through: minting PASS, bidding activity, referral bonuses, staking multipliers, and auction wins. Each activity has a different points multiplier.',
      },
      {
        question: 'How does the referral system work?',
        answer: 'Share your unique referral link. When someone signs up using your link, both you and your friend earn a 5% bonus on their base point generation. This bonus is ongoing as long as they remain active.',
      },
      {
        question: 'Do points expire?',
        answer: 'Points are tracked by season. At the end of each season, points are snapshot for airdrop calculation. New seasons reset the points balance, but historical rankings are preserved.',
      },
    ],
  },
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState<string>('auctions');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleItem = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const activeData = docSections.find((s) => s.id === activeSection);

  return (
    <div className="min-h-screen bg-transparent pt-32 pb-24">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[#3ec470]/10 border border-[#3ec470]/30 flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-[#3ec470]" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-3">Documentation & Rules</h1>
          <p className="text-white/50 text-[15px] max-w-2xl mx-auto">
            Everything you need to know about nadbid.fun auctions, PASS tokens, staking, and the decentralized arbitration system.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-[#161616] border border-white/[0.04] rounded-2xl p-4 sticky top-28">
              <div className="text-[10px] text-white/40 font-bold uppercase tracking-[0.15em] mb-3 px-2">Sections</div>
              <nav className="space-y-1">
                {docSections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-[13px] font-bold transition-all',
                        activeSection === section.id
                          ? 'bg-[#3ec470]/10 text-[#3ec470]'
                          : 'text-white/50 hover:text-white hover:bg-white/5',
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {section.title}
                      {activeSection === section.id && <ChevronRight className="w-4 h-4 ml-auto" />}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            {activeData && (
              <motion.div
                key={activeData.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-[#3ec470]/10 border border-[#3ec470]/30 flex items-center justify-center">
                    <activeData.icon className="w-5 h-5 text-[#3ec470]" />
                  </div>
                  <h2 className="text-2xl font-black text-white">{activeData.title}</h2>
                </div>

                <div className="space-y-4">
                  {activeData.content.map((item, index) => {
                    const itemId = `${activeData.id}-${index}`;
                    const isExpanded = expandedItems[itemId] ?? index === 0;
                    return (
                      <div
                        key={itemId}
                        className="bg-[#161616] border border-white/[0.04] rounded-xl overflow-hidden"
                      >
                        <button
                          onClick={() => toggleItem(itemId)}
                          className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[#3ec470] font-bold text-sm">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <span className="font-bold text-white text-[15px]">{item.question}</span>
                          </div>
                          <ChevronDown
                            className={cn(
                              'w-5 h-5 text-white/40 transition-transform shrink-0',
                              isExpanded && 'rotate-180',
                            )}
                          />
                        </button>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            transition={{ duration: 0.2 }}
                            className="border-t border-white/[0.04]"
                          >
                            <div className="p-5 pl-14">
                              <p className="text-white/60 text-[14px] leading-relaxed">{item.answer}</p>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="mt-16 bg-gradient-to-r from-[#3ec470]/10 to-transparent border border-[#3ec470]/30 rounded-2xl p-8 text-center">
          <h3 className="text-xl font-bold text-white mb-2">Still have questions?</h3>
          <p className="text-white/50 text-[14px] mb-6">Join our community or reach out to support for more help.</p>
          <div className="flex justify-center gap-4">
            <Button>Join Discord</Button>
            <Button variant="secondary">Contact Support</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
