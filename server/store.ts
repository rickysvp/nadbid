// server/store.ts
// 索引器存储层 — JSON 文件原子写入（零依赖、零编译）。
// 接口保持简单，未来可无缝替换为 SQLite / Vercel KV / Redis。
import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

export interface SyncState {
  /** 已同步到的区块高度 */
  lastBlock: number;
  /** 最后同步时间（ISO） */
  lastSyncAt: string;
  /** 起始同步区块（合约部署区块） */
  startBlock: number;
}

export interface StoredAuction {
  auctionId: number;
  seller: string;
  assetType: number;
  assetAddr: string;
  tokenId: string;
  amount: string;
  startPrice: string;
  incrementBps: string;
  reservePrice: string;
  createdAtBlock: number;
  /** 状态：0 CREATED,1 LIVE,2 SETTLED,3 CANCELLED */
  status: number;
  winner?: string;
  finalPrice?: string;
  pool?: string;
}

export interface StoredBid {
  auctionId: number;
  batchId: number;
  bidder: string;
  price: string;
  fee: string;
  deadline: string;
  block: number;
  /** 是否被保留（BatchResolved 后 true） */
  retained?: boolean;
}

export interface StoredClaim {
  type: 'refund' | 'reward' | 'seller';
  auctionId: number;
  batchId: number;
  bidder: string;
  amount: string;
  block: number;
}

export interface IndexData {
  sync: SyncState;
  auctions: Record<string, StoredAuction>; // auctionId -> auction
  bids: StoredBid[];
  claims: StoredClaim[];
}

const DEFAULTS: IndexData = {
  sync: { lastBlock: 0, lastSyncAt: '', startBlock: 0 },
  auctions: {},
  bids: [],
  claims: [],
};

export function defaultIndexPath(): string {
  const base = process.env.INDEX_DATA_DIR || join(process.cwd(), '.indexer');
  return join(base, 'index.json');
}

export class IndexStore {
  private path: string;
  private data: IndexData;

  constructor(path = defaultIndexPath()) {
    this.path = path;
    this.data = this.load();
  }

  private load(): IndexData {
    if (!existsSync(this.path)) return structuredClone(DEFAULTS);
    try {
      const raw = readFileSync(this.path, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<IndexData>;
      return {
        sync: { ...DEFAULTS.sync, ...(parsed.sync ?? {}) },
        auctions: parsed.auctions ?? {},
        bids: parsed.bids ?? [],
        claims: parsed.claims ?? [],
      };
    } catch {
      return structuredClone(DEFAULTS);
    }
  }

  /** 原子写入：先写临时文件再 rename，避免进程中断导致 JSON 损坏 */
  save() {
    mkdirSync(dirname(this.path), { recursive: true });
    const tmp = `${this.path}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.data), 'utf-8');
    renameSync(tmp, this.path);
  }

  get dataRef(): IndexData {
    return this.data;
  }

  updateSync(lastBlock: number, startBlock?: number) {
    this.data.sync.lastBlock = lastBlock;
    this.data.sync.lastSyncAt = new Date().toISOString();
    if (startBlock !== undefined) this.data.sync.startBlock = startBlock;
  }

  upsertAuction(a: StoredAuction) {
    this.data.auctions[String(a.auctionId)] = { ...this.data.auctions[String(a.auctionId)], ...a };
  }

  getAuction(id: number): StoredAuction | undefined {
    return this.data.auctions[String(id)];
  }

  addBids(bids: StoredBid[]) {
    this.data.bids.push(...bids);
  }

  addClaims(claims: StoredClaim[]) {
    this.data.claims.push(...claims);
  }
}
