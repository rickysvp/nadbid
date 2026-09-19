import random

# 配置
NUM_USERS = 100
ASSET_VALUE = 1_000_000  # 资产价值 100万 MON
START_PRICE = 10  # 起拍价 10 MON
INCREMENT_PCT = 0.01  # 每次加价 1%
PLATFORM_FEE_BID = 0.01  # 每笔出价 1% 手续费
PLATFORM_FEE_POOL = 0.05  # 资金池 5% 手续费
SELLER_SHARE = 0.85  # 卖家 85%
REWARD_SHARE = 0.15  # 奖励池 15%

random.seed(42)

# 初始化用户
users = {}
for i in range(NUM_USERS):
    users[f"User_{i+1:03d}"] = {
        "total_bid": 0.0,
        "rewards": 0.0,
        "bids": [],
        "won": False,
        "last_bid_amount": 0.0,
    }

# 模拟出价
current_price = float(START_PRICE)
total_pool = 0.0
total_platform_fee = 0.0
bid_history = []

# 随机生成出价序列：每人 1-20 次
all_bidders = []
for i in range(NUM_USERS):
    n_bids = random.randint(1, 20)
    all_bidders.extend([f"User_{i+1:03d}"] * n_bids)

random.shuffle(all_bidders)

# 出价直到价格达到 50万 MON（低于资产价值 100万，这样赢家才赚）
bid_count = 0
max_bids = 3000
last_bidder = None
final_price = 500_000  # 最终成交价 50万

while bid_count < max_bids and current_price < final_price:
    bidder = random.choice(all_bidders)
    
    bid_amount = current_price * (1 + INCREMENT_PCT)
    
    platform_fee = bid_amount * PLATFORM_FEE_BID
    actual_bid = bid_amount - platform_fee
    reward_pool = actual_bid * REWARD_SHARE
    
    users[bidder]["bids"].append(bid_amount)
    users[bidder]["total_bid"] += bid_amount
    users[bidder]["last_bid_amount"] = bid_amount
    total_platform_fee += platform_fee
    total_pool += actual_bid
    
    # 前序分红：按 RPU 模型（按出价次数）
    if bid_count > 0 and reward_pool > 0:
        rpu_map = {}
        total_rpu = 0
        for prev_bid in bid_history:
            b = prev_bid["bidder"]
            if b not in rpu_map:
                rpu_map[b] = 0
            rpu_map[b] += 1
            total_rpu += 1
        
        for b, rpu in rpu_map.items():
            share = rpu / total_rpu if total_rpu > 0 else 0
            users[b]["rewards"] += reward_pool * share
    
    bid_history.append({
        "bidder": bidder,
        "price": bid_amount,
    })
    
    last_bidder = bidder
    current_price = bid_amount
    bid_count += 1

# 最后出价者赢得资产
users[last_bidder]["won"] = True

# 结算
final_platform_fee_pool = total_pool * PLATFORM_FEE_POOL
total_platform_fee += final_platform_fee_pool
net_pool = total_pool - final_platform_fee_pool
seller_revenue = net_pool * SELLER_SHARE

# 计算每个用户的盈亏
results = []
for username, data in users.items():
    total_cost = data["total_bid"]
    total_return = data["rewards"]
    
    if data["won"]:
        # 赢家赢得资产价值 100万 MON
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

# 输出
print("=" * 90)
print(f"  NADBID 拍卖模拟 — 100人竞拍100万MON资产")
print("=" * 90)
print(f"  起拍价: {START_PRICE:,} MON")
print(f"  最终成交价: {current_price:,.0f} MON")
print(f"  总出价次数: {bid_count}")
print(f"  总资金池: {total_pool:,.0f} MON")
print(f"  平台总手续费: {total_platform_fee:,.0f} MON")
print(f"  卖家收益: {seller_revenue:,.0f} MON")
print(f"  资产价值: {ASSET_VALUE:,} MON")
print(f"  最后赢家: {last_bidder}")
print(f"  平台净赚: {total_platform_fee:,.0f} MON")
print(f"  平台盈利率: {(total_platform_fee/ASSET_VALUE*100):.1f}%")
print()

winners = [r for r in results if r["profit"] > 0]
losers = [r for r in results if r["profit"] <= 0]

print(f"  盈利用户: {len(winners)} 人 ({len(winners)/NUM_USERS*100:.1f}%)")
print(f"  亏损用户: {len(losers)} 人 ({len(losers)/NUM_USERS*100:.1f}%)")
print()

print("  盈亏分布:")
print(f"    盈利 > 50万 MON:  {len([r for r in results if r['profit'] > 500_000]):>3} 人")
print(f"    盈利 10万-50万:   {len([r for r in results if 100_000 < r['profit'] <= 500_000]):>3} 人")
print(f"    盈利 1万-10万:    {len([r for r in results if 10_000 < r['profit'] <= 100_000]):>3} 人")
print(f"    盈利 1千-1万:     {len([r for r in results if 1_000 < r['profit'] <= 10_000]):>3} 人")
print(f"    盈利 0-1千:       {len([r for r in results if 0 < r['profit'] <= 1_000]):>3} 人")
print(f"    亏损 0-1千:       {len([r for r in results if -1_000 <= r['profit'] < 0]):>3} 人")
print(f"    亏损 1千-1万:     {len([r for r in results if -10_000 <= r['profit'] < -1_000]):>3} 人")
print(f"    亏损 1万-10万:    {len([r for r in results if -100_000 <= r['profit'] < -10_000]):>3} 人")
print(f"    亏损 > 10万:      {len([r for r in results if r['profit'] < -100_000]):>3} 人")
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
print()
print("  📊 关键洞察:")
winner = results[0]
print(f"  1. 赢家: {winner['user']}")
print(f"  2. 赢家总投入: {winner['total_bid']:,.0f} MON")
print(f"  3. 赢家赢得资产: {ASSET_VALUE:,} MON")
print(f"  4. 赢家净赚: {winner['profit']:,.0f} MON")
print(f"  5. 平均亏损: {sum(r['profit'] for r in losers)/len(losers):,.0f} MON")
print(f"  6. 平均出价次数: {sum(r['bids'] for r in results)/NUM_USERS:.0f} 次")
print()
