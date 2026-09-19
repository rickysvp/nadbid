import random

# 基础配置
NUM_USERS = 100
ASSET_VALUE = 1_000_000
START_PRICE = 100
INCREMENT_PCT = 0.01
PLATFORM_FEE_BID = 0.01
PLATFORM_FEE_POOL = 0.05
SELLER_SHARE = 0.70  # 卖家从85%降到70%，让奖励池更大
REWARD_SHARE = 0.25  # 奖励池从15%提到25%
PLATFORM_TARGET_PROFIT = 0.10  # 平台目标盈利10%

random.seed(42)

def run_simulation(reward_model="rpu", reward_decay=1.0, early_bonus_count=0, early_bonus_multiplier=2.0):
    """
    reward_model:
      - "rpu": 按出价次数权重分（RPU模型）
      - "time_decay": 按时间衰减分，越早出价权重越高
      - "tiered": 阶梯分红，前10%拿50%，中间30%拿30%，后60%拿20%
    reward_decay: time_decay模型的衰减系数
    early_bonus_count: 前N个出价者额外加成倍数
    early_bonus_multiplier: 加成倍数
    """
    users = {}
    for i in range(NUM_USERS):
        users[f"User_{i+1:03d}"] = {
            "total_bid": 0.0,
            "rewards": 0.0,
            "bid_count": 0,
            "first_bid_order": None,
            "won": False,
        }
    
    current_price = float(START_PRICE)
    total_gross_bids = 0.0
    total_bid_fee = 0.0
    total_net_pool = 0.0
    bid_order = 0  # 记录第几个出价
    
    all_bidders = []
    for i in range(NUM_USERS):
        n_bids = random.randint(5, 30)
        all_bidders.extend([f"User_{i+1:03d}"] * n_bids)
    random.shuffle(all_bidders)
    
    bid_count = 0
    max_bids = 3000
    last_bidder = None
    bid_history = []  # 记录每个出价的信息
    
    while bid_count < max_bids:
        bidder = random.choice(all_bidders)
        bid_amount = current_price * (1 + INCREMENT_PCT)
        
        bid_fee = bid_amount * PLATFORM_FEE_BID
        net_amount = bid_amount - bid_fee
        
        users[bidder]["total_bid"] += bid_amount
        users[bidder]["bid_count"] += 1
        if users[bidder]["first_bid_order"] is None:
            users[bidder]["first_bid_order"] = bid_order
        
        total_gross_bids += bid_amount
        total_bid_fee += bid_fee
        total_net_pool += net_amount
        
        # 每笔新出价拿出奖励池分给之前的出价者
        reward_pool = net_amount * REWARD_SHARE
        
        if bid_count > 0 and reward_pool > 0:
            if reward_model == "rpu":
                # 按出价次数权重分
                total_weight = len(bid_history)
                for prev in bid_history:
                    share = 1 / total_weight
                    users[prev["bidder"]]["rewards"] += reward_pool * share
            
            elif reward_model == "time_decay":
                # 按时间衰减，越早出价权重越高
                weights = []
                for i, prev in enumerate(bid_history):
                    # 越新的出价权重越高？不对，应该越早越高
                    # bid_history[0] 是最早的，bid_history[-1] 是最近的
                    # 我们要给最早的更高权重，所以 i 越小，权重越大
                    age = len(bid_history) - i  # 距离现在的时间步
                    weight = reward_decay ** age  # 衰减
                    weights.append(weight)
                total_weight = sum(weights)
                for i, prev in enumerate(bid_history):
                    share = weights[i] / total_weight
                    users[prev["bidder"]]["rewards"] += reward_pool * share
            
            elif reward_model == "tiered":
                # 阶梯分红：前10%拿50%，中间30%拿30%，后60%拿20%
                total_bids = len(bid_history)
                early_cutoff = int(total_bids * 0.1)
                mid_cutoff = int(total_bids * 0.4)
                
                # 按出价顺序分层
                early_pool = reward_pool * 0.5
                mid_pool = reward_pool * 0.3
                late_pool = reward_pool * 0.2
                
                early_count = min(early_cutoff, total_bids)
                mid_count = min(mid_cutoff - early_cutoff, total_bids - early_cutoff)
                late_count = total_bids - mid_cutoff
                
                # 前 early_cutoff 个出价者分 early_pool
                for i in range(early_cutoff):
                    if i < total_bids:
                        share = 1 / max(early_count, 1)
                        users[bid_history[i]["bidder"]]["rewards"] += early_pool * share
                
                # 中间 mid_cutoff 个分 mid_pool
                for i in range(early_cutoff, mid_cutoff):
                    if i < total_bids:
                        share = 1 / max(mid_count, 1)
                        users[bid_history[i]["bidder"]]["rewards"] += mid_pool * share
                
                # 后面的分 late_pool
                for i in range(mid_cutoff, total_bids):
                    share = 1 / max(late_count, 1)
                    users[bid_history[i]["bidder"]]["rewards"] += late_pool * share
        
        bid_history.append({"bidder": bidder, "price": bid_amount, "order": bid_order})
        last_bidder = bidder
        current_price = bid_amount
        bid_count += 1
        bid_order += 1
        
        # 平台赚够 10% 就停
        pool_fee = total_net_pool * PLATFORM_FEE_POOL
        seller_income = (total_net_pool - pool_fee) * SELLER_SHARE
        platform_total_income = seller_income + total_bid_fee + pool_fee
        platform_profit = platform_total_income - ASSET_VALUE
        
        if platform_profit >= ASSET_VALUE * PLATFORM_TARGET_PROFIT:
            break
    
    users[last_bidder]["won"] = True
    
    # 计算每个用户的盈亏
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
        })
    
    results.sort(key=lambda x: x["profit"], reverse=True)
    
    # 统计
    winners = [r for r in results if r["profit"] > 0]
    losers = [r for r in results if r["profit"] <= 0]
    
    pool_fee = total_net_pool * PLATFORM_FEE_POOL
    net_after_pool_fee = total_net_pool - pool_fee
    seller_income = net_after_pool_fee * SELLER_SHARE
    reward_pool_total = net_after_pool_fee * REWARD_SHARE
    platform_total_income = seller_income + total_bid_fee + pool_fee
    platform_profit = platform_total_income - ASSET_VALUE
    
    return {
        "total_bids": bid_count,
        "final_price": current_price,
        "total_gross": total_gross_bids,
        "platform_profit": platform_profit,
        "platform_margin": platform_profit / ASSET_VALUE * 100,
        "winners": len(winners),
        "losers": len(losers),
        "winner_count": len([r for r in results if r["won"]]),
        "results": results,
        "reward_pool_total": reward_pool_total,
    }

# 测试不同方案
print("=" * 100)
print("  起拍价 100 MON — 不同分红模型对比")
print("=" * 100)

configs = [
    ("方案A: RPU模型（基准）", "rpu", 1.0, 0, 1.0),
    ("方案B: 时间衰减模型（越早越多）", "time_decay", 0.95, 0, 1.0),
    ("方案C: 阶梯分红（前10%拿50%）", "tiered", 1.0, 0, 1.0),
]

for name, model, decay, early_n, early_mult in configs:
    result = run_simulation(model, decay, early_n, early_mult)
    
    print(f"\n  {name}")
    print(f"  {'─'*80}")
    print(f"  最终成交价: {result['final_price']:,.0f} MON | 总出价: {result['total_bids']} 次 | 总流水: {result['total_gross']:,.0f} MON")
    print(f"  平台净利润: {result['platform_profit']:,.0f} MON | 盈利率: {result['platform_margin']:.1f}%")
    print(f"  奖励池总额: {result['reward_pool_total']:,.0f} MON")
    print(f"  盈利用户: {result['winners']} 人 ({result['winners']}%) | 亏损: {result['losers']} 人 ({result['losers']}%)")
    
    # 赢家信息
    winner = [r for r in result["results"] if r["won"]][0]
    print(f"  赢家: {winner['user']} | 投入: {winner['total_bid']:,.0f} | 盈利: {winner['profit']:,.0f} | ROI: {winner['roi']:.0f}%")
    
    # 盈利分布
    print(f"  盈利分布:")
    print(f"    >50万: {len([r for r in result['results'] if r['profit'] > 500_000]):>2} 人")
    print(f"    10-50万: {len([r for r in result['results'] if 100_000 < r['profit'] <= 500_000]):>2} 人")
    print(f"    1-10万: {len([r for r in result['results'] if 10_000 < r['profit'] <= 100_000]):>2} 人")
    print(f"    1千-1万: {len([r for r in result['results'] if 1_000 < r['profit'] <= 10_000]):>2} 人")
    print(f"    0-1千: {len([r for r in result['results'] if 0 < r['profit'] <= 1_000]):>2} 人")
    
    # 前5个盈利
    print(f"  Top 5 盈利:")
    for r in result["results"][:5]:
        won = "★WIN" if r["won"] else ""
        print(f"    {r['user']}: {r['profit']:>+10,.0f} MON ({r['roi']:>+7.1f}%) {won}")

print()
print("=" * 100)
