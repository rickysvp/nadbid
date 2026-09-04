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
        answer: 'nadbid runs fixed-bid penny auctions. Every bid costs the same fixed amount (0.1 MON on testnet, 99 MON on mainnet) and every bid is kept — being outbid never refunds your bid. When the countdown expires with no new bid, the last bidder wins the KOL\u2019s fulfillment.',
      },
      {
        question: 'How much does a bid cost?',
        answer: 'The bid amount is fixed by the platform and identical for every bid in an auction. You pay exactly that amount per bid, and it is charged on-chain with every bid you place.',
      },
      {
        question: 'What happens when I place a bid?',
        answer: 'You must hold at least one PASS of that KOL to bid. Each bid resets the auction countdown to 40 seconds. When 40 seconds pass with no new bid, the auction ends and the last bidder is the winner.',
      },
      {
        question: 'Can I cancel my bid?',
        answer: 'No. All bids are final and kept. There is no outbid refund and no bid cancellation — the auction model is "every bid counts".',
      },
      {
        question: 'How is an auction settled?',
        answer: 'After the auction ends, anyone can trigger settlement. 80% of the total volume goes to the KOL and 20% is the platform fee. Both sides claim their share via pull payments — settlement never blocks on either party.',
      },
      {
        question: 'Can a KOL run more than one auction at a time?',
        answer: 'No. A KOL can only have one active (unsettled) auction. The next auction can be created only after the current one is settled.',
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
        answer: 'A PASS is a soulbound token issued by a KOL. Holding it is required to bid in that KOL\u2019s auctions, and it represents access to the KOL\u2019s fulfillment (private group, content, sessions, etc.).',
      },
      {
        question: 'How does the bonding curve work?',
        answer: 'PASS price follows a quadratic curve: price = basePrice × (supply / 1000)². As more PASS are minted the price rises; burning PASS reduces the live supply and lowers the price, enabling curve-based buyback.',
      },
      {
        question: 'What fees apply to minting and burning?',
        answer: 'A total 8% fee applies to both mint and burn: 5% goes to the KOL (claimed via pull payments) and 3% to the platform. Refund amounts on burn are computed on-chain at execution time.',
      },
      {
        question: 'Can I transfer my PASS?',
        answer: 'No. PASS is soulbound and non-transferable by design — it cannot be sent, sold, or listed on secondary markets.',
      },
      {
        question: 'Can a KOL mint more than one PASS contract?',
        answer: 'No. Each KOL can create exactly one PASS contract. Additional auctions reuse the same PASS.',
      },
    ],
  },
  {
    id: 'staking',
    title: 'Staking',
    icon: Coins,
    content: [
      {
        question: 'Is staking available?',
        answer: 'Not yet. Staking is planned for a future release. The Staking page is currently a placeholder and no staking functionality exists on-chain.',
      },
      {
        question: 'When will staking launch?',
        answer: 'Staking is part of the post-MVP roadmap. Watch the docs and announcements for a launch date.',
      },
    ],
  },
  {
    id: 'claim',
    title: 'Claiming Rewards',
    icon: Zap,
    content: [
      {
        question: 'What can KOLs claim?',
        answer: 'After an auction settles, the KOL claims 80% of the auction volume (pull payment). KOLs also accumulate 5% of PASS mint/burn fees on their own PASS contract and can claim those at any time.',
      },
      {
        question: 'What can the platform claim?',
        answer: 'The platform claims 20% of settled auction volume and 3% of PASS mint/burn fees. Both are pull payments from the respective contracts.',
      },
      {
        question: 'How do I get my bond back?',
        answer: 'KOLs deposit a 1 MON bond to create PASS and auctions. After requesting redemption and a 48-hour cooldown (with no unsettled auctions), the bond is returned.',
      },
      {
        question: 'Is there a claim fee?',
        answer: 'No. Claiming your share or bond costs only the gas for the claim transaction.',
      },
    ],
  },
  {
    id: 'arbitration',
    title: 'Arbitration',
    icon: Scale,
    content: [
      {
        question: 'Is arbitration available?',
        answer: 'Not yet. Dispute resolution, evidence submission, and KOL-collateral slashing are part of the post-MVP roadmap. On the current testnet build, settlement happens automatically when an auction ends.',
      },
      {
        question: 'What will arbitration cover?',
        answer: 'Planned scope: the auction winner confirms KOL fulfillment, or raises a dispute; PASS holders vote; a slash result refunds the winner from the KOL\u2019s bond. Nothing here is live yet.',
      },
    ],
  },
  {
    id: 'points',
    title: 'Points & Referrals',
    icon: BookOpen,
    content: [
      {
        question: 'Are points live?',
        answer: 'Not yet. Points, seasons, and the referral program are planned for a future release and do not exist on-chain today.',
      },
      {
        question: 'What is planned?',
        answer: 'Earning points through minting, bidding, and referrals; seasonal snapshots for airdrop weighting. Details will be published when the program launches.',
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
            How nadbid.fun auctions, PASS tokens, and settlement actually work on-chain. Features marked "not yet"
            are roadmap items and are not live on the testnet build.
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
          <p className="text-white/50 text-[14px] mb-6">Reach out on X for help with auctions, PASS, or settlement.</p>
          <div className="flex justify-center gap-4">
            <Button variant="secondary">Contact Support</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
