import random

NUM_USERS = 100
ASSET_VALUE = 1_000_000
START_PRICE = 100
INCREMENT_PCT = 0.01

PLATFORM_FEE_BID = 0.03
PLATFORM_FEE_POOL = 0.07
SELLER_SHARE = 0.60
REWARD_SHARE = 0.33
MAX_REWARD_MULTIPLE = 30
PLATFORM_TARGET_PROFIT = 0.10  # 平台赚够10%就停

random.seed(42)

users = {}
for i in range(NUM_USERS):
    users[f"User_{i+1:03d}"] = {
        "total_bid": 0.0,
        "rewards": 0.0,
        "bid_count": 0,
        "won": False,
    }

current_price = float(START_PRICE)
total_gross_bids = 0.0
total_bid_fee = 0.0
total_net_pool = 0.0
bid_history = []

all_bidders = []
for i in range(NUM_USERS):
    n_bids = random.randint(5, 30)
    all_bidders.extend([f"User_{i+1:03d}"] * n_bids)
random.shuffle(all_bidders)

bid_count = 0
max_bids = 3000
last_bidder = None

while bid_count < max_bids:
    bidder = random.choice(all_bidders)
    bid_amount = current_price * (1 + INCREMENT_PCT)
    
    bid_fee = bid_amount * PLATFORM_FEE_BID
    net_amount = bid_amount - bid_fee
    
    users[bidder]["total_bid"] += bid_amount
    users[bidder]["bid_count"] += 1
    total_gross_bids += bid_amount
    total_bid_fee += bid_fee
    total_net_pool += net_amount
    
    reward_pool = net_amount * REWARD_SHARE
    
    if bid_count > 0 and reward_pool > 0:
        total_bids = len(bid_history)
        early_cutoff = int(total_bids * 0.3)
        mid_cutoff = int(total_bids * 0.6)
        
        early_pool = reward_pool * 0.40
        mid_pool = reward_pool * 0.35
        late_pool = reward_pool * 0.25
        
        early_count = min(early_cutoff, total_bids)
        mid_count = min(mid_cutoff - early_cutoff, total_bids - early_cutoff)
        late_count = max(total_bids - mid_cutoff, 1)
        
        for i in range(early_cutoff):
            if i < total_bids:
                u = bid_history[i]["bidder"]
                share = early_pool / max(early_count, 1)
                max_allowed = users[u]["total_bid"] * MAX_REWARD_MULTIPLE
                users[u]["rewards"] = min(users[u]["rewards"] + share, max_allowed)
        
        for i in range(early_cutoff, mid_cutoff):
            if i < total_bids:
                u = bid_history[i]["bidder"]
                share = mid_pool / max(mid_count, 1)
                max_allowed = users[u]["total_bid"] * MAX_REWARD_MULTIPLE
                users[u]["rewards"] = min(users[u]["rewards"] + share, max_allowed)
        
        for i in range(mid_cutoff, total_bids):
            u = bid_history[i]["bidder"]
            share = late_pool / late_count
            max_allowed = users[u]["total_bid"] * MAX_REWARD_MULTIPLE
            users[u]["rewards"] = min(users[u]["rewards"] + share, max_allowed)
    
    bid_history.append({"bidder": bidder})
    last_bidder = bidder
    current_price = bid_amount
    bid_count += 1
    
    # 平台赚够 10% 就停
    pool_fee = total_net_pool * PLATFORM_FEE_POOL
    seller_income = (total_net_pool - pool_fee) * SELLER_SHARE
    platform_total_income = seller_income + total_bid_fee + pool_fee
    platform_profit = platform_total_income - ASSET_VALUE
    
    if platform_profit >= ASSET_VALUE * PLATFORM_TARGET_PROFIT:
        break

users[last_bidder]["won"] = True

pool_fee = total_net_pool * PLATFORM_FEE_POOL
net_after_pool_fee = total_net_pool - pool_fee
seller_income = net_after_pool_fee * SELLER_SHARE
reward_pool_total = net_after_pool_fee * REWARD_SHARE
platform_total_income = seller_income + total_bid_fee + pool_fee
platform_profit = platform_total_income - ASSET_VALUE

results = []
for username, data in users.items():
    total_cost = data["total_bid"]
    total_return = data["rewards"]
    if data["won"]:
        total_return += ASSET_VALUE
    profit = total_return - total_cost
    results.append({
        "user": username,
        "bids": data["bid_count"],
        "total_bid": total_cost,
        "rewards": data["rewards"],
        "won": data["won"],
        "profit": profit,
        "roi": (profit / total_cost * 100) if total_cost > 0 else 0,
        "reward_multiple": (data["rewards"] / total_cost) if total_cost > 0 else 0,
    })

results.sort(key=lambda x: x["profit"], reverse=True)
winners = [r for r in results if r["profit"] > 0]
capped = [r for r in results if r["reward_multiple"] >= MAX_REWARD_MULTIPLE - 0.1]

print("=" * 90)
print("  最终经济模型 — 起拍价 100 MON")
print("=" * 90)
print(f"  【参数】")
print(f"  起拍价: {START_PRICE} MON | 增幅: 1% | 分红上限: {MAX_REWARD_MULTIPLE}x")
print(f"  手续费: 出价 {PLATFORM_FEE_BID*100:.0f}% + 池子 {PLATFORM_FEE_POOL*100:.0f}%")
print(f"  卖家占比: {SELLER_SHARE*100:.0f}% | 奖励池: {REWARD_SHARE*100:.0f}%")
print()
print(f"  【资金流水】")
print(f"  用户总出价:           {total_gross_bids:>15,.0f} MON")
print(f"  ├─ 出价手续费 (3%):   {total_bid_fee:>15,.0f} MON  → 平台")
print(f"  └─ 净资金池:          {total_net_pool:>15,.0f} MON")
print(f"     ├─ 池手续费 (7%):  {pool_fee:>15,.0f} MON  → 平台")
print(f"     └─ 净池分配:       {net_after_pool_fee:>15,.0f} MON")
print(f"        ├─ 卖家收益(60%): {seller_income:>14,.0f} MON")
print(f"        └─ 奖励池(33%):  {reward_pool_total:>15,.0f} MON")
print()
print(f"  【平台账】")
print(f"  成本（资产价值）:     {ASSET_VALUE:>15,.0f} MON")
print(f"  平台总收入:           {platform_total_income:>15,.0f} MON")
print(f"  平台净利润:           {platform_profit:>15,.0f} MON")
print(f"  平台盈利率:           {platform_profit/ASSET_VALUE*100:>15.1f}%")
print(f"  最终成交价:           {current_price:>15,.0f} MON")
print(f"  总出价次数:           {bid_count:>15,} 次")
print()
print(f"  【用户盈亏】")
print(f"  盈利用户: {len(winners)} 人 ({len(winners)}%)")
print(f"  亏损用户: {100-len(winners)} 人 ({100-len(winners)}%)")
print(f"  分红触达 30x 上限: {len(capped)} 人")
print()
print(f"  盈利分布:")
print(f"    >50万:  {len([r for r in results if r['profit'] > 500_000]):>2} 人")
print(f"    1-10万: {len([r for r in results if 10_000 < r['profit'] <= 100_000]):>2} 人")
print(f"    1千-1万:{len([r for r in results if 1_000 < r['profit'] <= 10_000]):>2} 人")
print(f"    0-1千:  {len([r for r in results if 0 < r['profit'] <= 1_000]):>2} 人")
print()

print("  Top 10 盈利用户:")
print(f"  {'用户':<12} {'出价':>4} {'总出价':>10} {'分红':>10} {'盈亏':>12} {'ROI':>8} {'分红倍数':>8} {'赢得'}")
print("  " + "-" * 80)
for r in results[:10]:
    won = "★WIN" if r["won"] else ""
    capped_mark = " [上限]" if r["reward_multiple"] >= MAX_REWARD_MULTIPLE - 0.1 else ""
    print(f"  {r['user']:<12} {r['bids']:>4} {r['total_bid']:>10,.0f} {r['rewards']:>10,.0f} {r['profit']:>12,.0f} {r['roi']:>7.0f}% {r['reward_multiple']:>7.1f}x {won}{capped_mark}")

print()
print("=" * 90)
