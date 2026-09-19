import random

# 配置
NUM_USERS = 100
ASSET_VALUE = 1_000_000  # 资产价值 100万 MON
START_PRICE = 1000  # 起拍价改成 1000 MON
INCREMENT_PCT = 0.01
PLATFORM_FEE_BID = 0.01
PLATFORM_FEE_POOL = 0.05
SELLER_SHARE = 0.85
REWARD_SHARE = 0.15

random.seed(42)

users = {}
for i in range(NUM_USERS):
    users[f"User_{i+1:03d}"] = {
        "total_bid": 0.0,
        "rewards": 0.0,
        "bids": [],
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
    
    users[bidder]["bids"].append(bid_amount)
    users[bidder]["total_bid"] += bid_amount
    total_gross_bids += bid_amount
    total_bid_fee += bid_fee
    total_net_pool += net_amount
    
    reward_pool = net_amount * REWARD_SHARE
    
    if bid_count > 0 and reward_pool > 0:
        rpu_map = {}
        total_rpu = 0
        for prev_bid in bid_history:
            b = prev_bid["bidder"]
            rpu_map[b] = rpu_map.get(b, 0) + 1
            total_rpu += 1
        
        for b, rpu in rpu_map.items():
            share = rpu / total_rpu
            users[b]["rewards"] += reward_pool * share
    
    bid_history.append({"bidder": bidder, "price": bid_amount})
    last_bidder = bidder
    current_price = bid_amount
    bid_count += 1
    
    # 平台赚够 10% 就停
    pool_fee = total_net_pool * PLATFORM_FEE_POOL
    seller_income = (total_net_pool - pool_fee) * SELLER_SHARE
    platform_total_income = seller_income + total_bid_fee + pool_fee
    platform_profit = platform_total_income - ASSET_VALUE
    
    if platform_profit >= ASSET_VALUE * 0.1:
        break

users[last_bidder]["won"] = True

# 结算
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
        "bids": len(data["bids"]),
        "total_bid": total_cost,
        "rewards": data["rewards"],
        "won": data["won"],
        "profit": profit,
        "roi": (profit / total_cost * 100) if total_cost > 0 else 0,
    })

results.sort(key=lambda x: x["profit"], reverse=True)

print("=" * 90)
print(f"  NADBID 拍卖模拟 — 起拍价 1000 MON（对比之前的 10 MON）")
print("=" * 90)
print(f"  【资金流水】")
print(f"  用户总出价（总流水）:     {total_gross_bids:>15,.0f} MON")
print(f"  ├─ 出价手续费 (1%):       {total_bid_fee:>15,.0f} MON  → 平台")
print(f"  └─ 进入净资金池:          {total_net_pool:>15,.0f} MON")
print(f"     ├─ 池手续费 (5%):     {pool_fee:>15,.0f} MON  → 平台")
print(f"     └─ 净池分配:           {net_after_pool_fee:>15,.0f} MON")
print(f"        ├─ 卖家收益 (85%):  {seller_income:>15,.0f} MON  → 平台")
print(f"        └─ 奖励池 (15%):    {reward_pool_total:>15,.0f} MON")
print()
print(f"  【平台账】")
print(f"  成本（资产价值）:         {ASSET_VALUE:>15,.0f} MON")
print(f"  平台净利润:               {platform_profit:>15,.0f} MON")
print(f"  平台盈利率:               {platform_profit/ASSET_VALUE*100:>15.1f}%")
print(f"  最终成交价:               {current_price:>15,.0f} MON")
print(f"  总出价次数:               {bid_count:>15,} 次")
print()

winners = [r for r in results if r["profit"] > 0]
losers = [r for r in results if r["profit"] <= 0]

print(f"  【用户盈亏】")
print(f"  盈利用户: {len(winners)} 人 ({len(winners)}%)")
print(f"  亏损用户: {len(losers)} 人 ({len(losers)}%)")
print()

print("  盈亏分布:")
print(f"    盈利 > 50万:   {len([r for r in results if r['profit'] > 500_000]):>3} 人")
print(f"    盈利 10-50万:  {len([r for r in results if 100_000 < r['profit'] <= 500_000]):>3} 人")
print(f"    盈利 1-10万:   {len([r for r in results if 10_000 < r['profit'] <= 100_000]):>3} 人")
print(f"    盈利 1千-1万:  {len([r for r in results if 1_000 < r['profit'] <= 10_000]):>3} 人")
print(f"    盈利 0-1千:    {len([r for r in results if 0 < r['profit'] <= 1_000]):>3} 人")
print(f"    亏损 0-1千:    {len([r for r in results if -1_000 <= r['profit'] < 0]):>3} 人")
print(f"    亏损 1千-1万:  {len([r for r in results if -10_000 <= r['profit'] < -1_000]):>3} 人")
print(f"    亏损 1万-10万: {len([r for r in results if -100_000 <= r['profit'] < -10_000]):>3} 人")
print(f"    亏损 > 10万:   {len([r for r in results if r['profit'] < -100_000]):>3} 人")
print()

print("  Top 10 盈利用户:")
print(f"  {'用户':<12} {'出价次数':>6} {'总出价':>12} {'累计分红':>12} {'盈亏':>14} {'ROI':>8}  {'赢得'}")
print("  " + "-" * 85)
for r in results[:10]:
    won = "✓ WINNER" if r["won"] else ""
    print(f"  {r['user']:<12} {r['bids']:>6} {r['total_bid']:>12,.0f} {r['rewards']:>12,.0f} {r['profit']:>14,.0f} {r['roi']:>7.1f}%  {won}")

print()
print("  Bottom 10 亏损用户:")
print(f"  {'用户':<12} {'出价次数':>6} {'总出价':>12} {'累计分红':>12} {'盈亏':>14} {'ROI':>8}  {'赢得'}")
print("  " + "-" * 85)
for r in results[-10:]:
    won = "✓ WINNER" if r["won"] else ""
    print(f"  {r['user']:<12} {r['bids']:>6} {r['total_bid']:>12,.0f} {r['rewards']:>12,.0f} {r['profit']:>14,.0f} {r['roi']:>7.1f}%  {won}")

print()
print("=" * 90)
