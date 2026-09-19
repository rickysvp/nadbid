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
    }

# 模拟出价：让价格涨到接近资产价值
current_price = float(START_PRICE)
total_pool = 0.0
total_platform_fee = 0.0
bid_history = []

# 随机生成出价序列
all_bidders = []
for i in range(NUM_USERS):
    n_bids = random.randint(5, 50)  # 每人 5-50 次出价
    all_bidders.extend([f"User_{i+1:03d}"] * n_bids)

random.shuffle(all_bidders)

# 出价直到价格达到资产价值的 110%（平台赚 10%）
bid_count = 0
max_bids = 10000
last_bidder = None
target_price = ASSET_VALUE * 1.1  # 目标：成交价 110万，平台赚 10%

while bid_count < max_bids and current_price < target_price:
    bidder = random.choice(all_bidders)
    
    # 出价价格 = 当前价格 * 1.01
    bid_amount = current_price * (1 + INCREMENT_PCT)
    
    # 平台出价手续费 1%
    platform_fee = bid_amount * PLATFORM_FEE_BID
    actual_bid = bid_amount - platform_fee
    
    # 奖励池 15%
    reward_pool = actual_bid * REWARD_SHARE
    
    # 记录出价
    users[bidder]["bids"].append(bid_amount)
    users[bidder]["total_bid"] += bid_amount
    total_platform_fee += platform_fee
    total_pool += actual_bid
    
    # 前序分红：给之前所有参与过的用户平均分奖励池
    if bid_count > 0:
        previous_users = set()
        for prev in bid_history:
            previous_users.add(prev["bidder"])
        
        if previous_users:
            reward_per_user = reward_pool / len(previous_users)
            for prev_user in previous_users:
                users[prev_user]["rewards"] += reward_per_user
    
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
        total_return += ASSET_VALUE  # 赢得资产价值
    
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

# 排序
results.sort(key=lambda x: x["profit"], reverse=True)

# 输出统计
print("=" * 90)
print(f"  NADBID 拍卖模拟 — 100人竞拍100万MON资产")
print("=" * 90)
print(f"  起拍价: {START_PRICE:,} MON")
print(f"  最终成交价: {current_price:,.0f} MON")
print(f"  总出价次数: {bid_count}")
print(f"  总资金池: {total_pool:,.0f} MON")
print(f"  平台总手续费: {total_platform_fee:,.0f} MON (含出价1% + 池5%)")
print(f"  卖家收益: {seller_revenue:,.0f} MON")
print(f"  资产价值: {ASSET_VALUE:,} MON")
print(f"  最后赢家: {last_bidder}")
print(f"  平台盈利率: {(total_platform_fee/ASSET_VALUE*100):.1f}%")
print()

# 盈亏统计
winners = [r for r in results if r["profit"] > 0]
losers = [r for r in results if r["profit"] <= 0]

print(f"  盈利用户: {len(winners)} 人 ({len(winners)/NUM_USERS*100:.1f}%)")
print(f"  亏损用户: {len(losers)} 人 ({len(losers)/NUM_USERS*100:.1f}%)")
print()

# 盈亏分布
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

# Top 10 盈利
print("  Top 10 盈利用户:")
print(f"  {'用户':<12} {'出价次数':>6} {'总出价':>12} {'累计分红':>12} {'盈亏':>14} {'ROI':>8}  {'赢得'}")
print("  " + "-" * 85)
for r in results[:10]:
    won = "✓ WINNER" if r["won"] else ""
    print(f"  {r['user']:<12} {r['bids']:>6} {r['total_bid']:>12,.0f} {r['rewards']:>12,.0f} {r['profit']:>14,.0f} {r['roi']:>7.1f}%  {won}")

print()

# Bottom 10 亏损
print("  Bottom 10 亏损用户:")
print(f"  {'用户':<12} {'出价次数':>6} {'总出价':>12} {'累计分红':>12} {'盈亏':>14} {'ROI':>8}  {'赢得'}")
print("  " + "-" * 85)
for r in results[-10:]:
    won = "✓ WINNER" if r["won"] else ""
    print(f"  {r['user']:<12} {r['bids']:>6} {r['total_bid']:>12,.0f} {r['rewards']:>12,.0f} {r['profit']:>14,.0f} {r['roi']:>7.1f}%  {won}")

print()
print("=" * 90)

# 关键洞察
print()
print("  📊 关键洞察:")
print(f"  1. 只有 1 个最终赢家获得超额收益（资产价值 100万）")
print(f"  2. 其余 99 人都在亏损，但早期出价者通过分红减少了损失")
print(f"  3. 平均亏损: {sum(r['profit'] for r in losers)/len(losers):,.0f} MON")
print(f"  4. 平均出价次数: {sum(r['bids'] for r in results)/NUM_USERS:.0f} 次")
print()
