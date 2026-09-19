import random
from collections import defaultdict

# 配置
NUM_USERS = 100
ASSET_VALUE = 1_000_000  # 资产价值 100万 MON
START_PRICE = 10  # 起拍价 10 MON
INCREMENT_BPS = 100  # 每次加价 1%
PLATFORM_FEE_BID = 100  # 每笔出价 1% 手续费
PLATFORM_FEE_POOL = 500  # 资金池 5% 手续费
SELLER_SHARE = 8500  # 卖家 85%
REWARD_SHARE = 1500  # 奖励池 15%
RPU_CAP = 100  # 分红倍数上限 100x

random.seed(42)

# 初始化用户
users = {}
for i in range(NUM_USERS):
    users[f"User_{i+1:03d}"] = {
        "bids": [],  # 所有出价记录
        "total_bid": 0,  # 总出价金额
        "rewards": 0,  # 累计分红
        "won": False,  # 是否赢得资产
    }

# 模拟出价过程
current_price = START_PRICE
total_pool = 0
total_platform_fee = 0
bid_history = []

# 随机生成出价序列：100人，每人随机参与 1-10 次
all_bidders = []
for i in range(NUM_USERS):
    n_bids = random.randint(1, 10)
    all_bidders.extend([f"User_{i+1:03d}"] * n_bids)

random.shuffle(all_bidders)

# 模拟出价直到价格接近资产价值
bid_count = 0
max_bids = 5000  # 最多出价次数
last_bidder = None

while bid_count < max_bids and current_price < ASSET_VALUE * 1.5:
    bidder = random.choice(all_bidders)
    
    # 出价价格 = 当前价格 * (1 + 1%)
    bid_amount = int(current_price * (10000 + INCREMENT_BPS) / 10000)
    
    # 平台出价手续费 1%
    platform_fee = int(bid_amount * PLATFORM_FEE_BID / 10000)
    actual_bid = bid_amount - platform_fee
    
    # 奖励池 15%
    reward_pool = int(actual_bid * REWARD_SHARE / 10000)
    
    # 记录出价
    users[bidder]["bids"].append({
        "price": bid_amount,
        "block": bid_count,
    })
    users[bidder]["total_bid"] += bid_amount
    total_platform_fee += platform_fee
    total_pool += actual_bid
    
    # 前序分红：给之前所有出价者按比例分奖励池
    if bid_count > 0:
        # 简化：按 RPU 模型，每个之前的出价者都获得一份
        # 这里简化为：给所有之前的出价者平均分配奖励池
        previous_bidders = set()
        for prev_bid in bid_history:
            previous_bidders.add(prev_bid["bidder"])
        
        if previous_bidders:
            reward_per_user = reward_pool / len(previous_bidders)
            for prev_bidder in previous_bidders:
                users[prev_bidder]["rewards"] += reward_per_user
    
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
# 资金池 5% 平台手续费
final_platform_fee_pool = int(total_pool * PLATFORM_FEE_POOL / 10000)
total_platform_fee += final_platform_fee_pool
net_pool = total_pool - final_platform_fee_pool

# 卖家收益 = 净池 85%
seller_revenue = int(net_pool * SELLER_SHARE / 10000)

# 计算每个用户的盈亏
results = []
for username, data in users.items():
    total_cost = data["total_bid"]
    total_return = data["rewards"]
    
    if data["won"]:
        # 赢得资产，价值 100万 MON
        total_return += ASSET_VALUE
        # 但成本是总出价金额（最后出价）
        # 等等，赢得资产的人只需要付最后一笔出价，之前的出价都"消失"了？
        # 不对，规则是：每次出价都进入池子，不可退款
        # 最后出价者赢得资产，但他之前的出价也都花出去了
        # 所以他的成本 = 所有出价总和
        # 收益 = 资产价值 + 分红
    
    profit = total_return - total_cost
    
    results.append({
        "user": username,
        "bids": len(data["bids"]),
        "total_bid": total_cost,
        "rewards": data["rewards"],
        "won": data["won"],
        "profit": profit,
    })

# 排序
results.sort(key=lambda x: x["profit"], reverse=True)

# 输出统计
print("=" * 80)
print(f"拍卖模拟结果")
print("=" * 80)
print(f"总出价次数: {bid_count}")
print(f"最终成交价: {current_price:,} MON")
print(f"总资金池: {total_pool:,} MON")
print(f"平台总手续费: {total_platform_fee:,} MON")
print(f"卖家收益: {seller_revenue:,} MON")
print(f"资产价值: {ASSET_VALUE:,} MON")
print(f"最后赢家: {last_bidder}")
print()

# 盈亏统计
winners = [r for r in results if r["profit"] > 0]
losers = [r for r in results if r["profit"] <= 0]

print(f"盈利用户: {len(winners)} 人")
print(f"亏损用户: {len(losers)} 人")
print(f"盈利率: {len(winners)/NUM_USERS*100:.1f}%")
print()

# 盈亏分布
print("盈亏分布:")
print(f"  盈利 > 100万 MON: {len([r for r in results if r['profit'] > 1_000_000])} 人")
print(f"  盈利 10万-100万: {len([r for r in results if 100_000 < r['profit'] <= 1_000_000])} 人")
print(f"  盈利 1万-10万: {len([r for r in results if 10_000 < r['profit'] <= 100_000])} 人")
print(f"  盈利 0-1万: {len([r for r in results if 0 < r['profit'] <= 10_000])} 人")
print(f"  亏损 0-1万: {len([r for r in results if -10_000 <= r['profit'] < 0])} 人")
print(f"  亏损 1万-10万: {len([r for r in results if -100_000 <= r['profit'] < -10_000])} 人")
print(f"  亏损 > 10万: {len([r for r in results if r['profit'] < -100_000])} 人")
print()

# Top 10 盈利
print("Top 10 盈利用户:")
print(f"{'用户':<12} {'出价次数':<8} {'总出价':<12} {'分红':<12} {'盈亏':<15} {'赢得'}")
print("-" * 80)
for r in results[:10]:
    print(f"{r['user']:<12} {r['bids']:<8} {r['total_bid']:<12,.0f} {r['rewards']:<12,.0f} {r['profit']:<15,.0f} {'✓' if r['won'] else ''}")

print()

# Bottom 10 亏损
print("Bottom 10 亏损用户:")
print(f"{'用户':<12} {'出价次数':<8} {'总出价':<12} {'分红':<12} {'盈亏':<15} {'赢得'}")
print("-" * 80)
for r in results[-10:]:
    print(f"{r['user']:<12} {r['bids']:<8} {r['total_bid']:<12,.0f} {r['rewards']:<12,.0f} {r['profit']:<15,.0f} {'✓' if r['won'] else ''}")

print()
print("=" * 80)
