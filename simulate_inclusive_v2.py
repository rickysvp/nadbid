import random

NUM_USERS = 100
ASSET_VALUE = 1_000_000
START_PRICE = 100
INCREMENT_PCT = 0.01
PLATFORM_FEE_BID = 0.01
PLATFORM_FEE_POOL = 0.05
PLATFORM_TARGET_PROFIT = 0.10

random.seed(42)

def run_simulation(seller_share=0.70, reward_share=0.25, model="tiered", 
                   early_pct=0.3, early_share=0.4, mid_pct=0.6, mid_share=0.35):
    """
    seller_share: 卖家占比
    reward_share: 奖励池占比
    model: "tiered" 阶梯分红
    early_pct: 前X%的出价者算早期
    early_share: 早期分奖励池的比例
    mid_pct: 前X%的出价者算中期
    mid_share: 中期分奖励池的比例
    """
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
        
        reward_pool = net_amount * reward_share
        
        if bid_count > 0 and reward_pool > 0 and model == "tiered":
            total_bids = len(bid_history)
            early_cutoff = int(total_bids * early_pct)
            mid_cutoff = int(total_bids * mid_pct)
            
            early_pool = reward_pool * early_share
            mid_pool = reward_pool * mid_share
            late_pool = reward_pool * (1 - early_share - mid_share)
            
            early_count = min(early_cutoff, total_bids)
            mid_count = min(mid_cutoff - early_cutoff, total_bids - early_cutoff)
            late_count = max(total_bids - mid_cutoff, 1)
            
            # 早期分 early_pool
            for i in range(early_cutoff):
                if i < total_bids:
                    users[bid_history[i]["bidder"]]["rewards"] += early_pool / max(early_count, 1)
            
            # 中期分 mid_pool
            for i in range(early_cutoff, mid_cutoff):
                if i < total_bids:
                    users[bid_history[i]["bidder"]]["rewards"] += mid_pool / max(mid_count, 1)
            
            # 后期分 late_pool
            for i in range(mid_cutoff, total_bids):
                users[bid_history[i]["bidder"]]["rewards"] += late_pool / late_count
        
        bid_history.append({"bidder": bidder})
        last_bidder = bidder
        current_price = bid_amount
        bid_count += 1
        
        # 平台赚够 10% 就停
        pool_fee = total_net_pool * PLATFORM_FEE_POOL
        seller_income = (total_net_pool - pool_fee) * seller_share
        platform_total_income = seller_income + total_bid_fee + pool_fee
        platform_profit = platform_total_income - ASSET_VALUE
        
        if platform_profit >= ASSET_VALUE * PLATFORM_TARGET_PROFIT:
            break
    
    users[last_bidder]["won"] = True
    
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
    
    winners = [r for r in results if r["profit"] > 0]
    losers = [r for r in results if r["profit"] <= 0]
    
    pool_fee = total_net_pool * PLATFORM_FEE_POOL
    net_after_pool_fee = total_net_pool - pool_fee
    seller_income = net_after_pool_fee * seller_share
    reward_pool_total = net_after_pool_fee * reward_share
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
        "results": results,
        "reward_pool_total": reward_pool_total,
    }

print("=" * 100)
print("  起拍价 100 MON — 优化分红模型，让更多人盈利")
print("=" * 100)

configs = [
    # (名字, 卖家占比, 奖励池占比, 早期%, 早期占奖励池, 中期%, 中期占奖励池)
    ("方案1: 奖励池25%, 阶梯(前30%拿40%)", 0.70, 0.25, 0.30, 0.40, 0.60, 0.35),
    ("方案2: 奖励池30%, 阶梯(前30%拿40%)", 0.65, 0.30, 0.30, 0.40, 0.60, 0.35),
    ("方案3: 奖励池35%, 阶梯(前30%拿40%)", 0.60, 0.35, 0.30, 0.40, 0.60, 0.35),
    ("方案4: 奖励池30%, 更平缓(前40%拿40%)", 0.65, 0.30, 0.40, 0.40, 0.70, 0.35),
    ("方案5: 奖励池35%, 更平缓(前40%拿40%)", 0.60, 0.35, 0.40, 0.40, 0.70, 0.35),
]

for name, seller, reward, early_p, early_s, mid_p, mid_s in configs:
    result = run_simulation(seller, reward, "tiered", early_p, early_s, mid_p, mid_s)
    
    print(f"\n  {name}")
    print(f"  {'─'*80}")
    print(f"  最终成交价: {result['final_price']:,.0f} MON | 总出价: {result['total_bids']} 次 | 总流水: {result['total_gross']:,.0f} MON")
    print(f"  平台净利润: {result['platform_profit']:,.0f} MON | 盈利率: {result['platform_margin']:.1f}%")
    print(f"  奖励池总额: {result['reward_pool_total']:,.0f} MON")
    print(f"  ✅ 盈利用户: {result['winners']} 人 ({result['winners']}%) | ❌ 亏损: {result['losers']} 人 ({result['losers']}%)")
    
    winner = [r for r in result["results"] if r["won"]][0]
    print(f"  赢家: 投入{winner['total_bid']:,.0f} | 盈利{winner['profit']:,.0f} | ROI {winner['roi']:.0f}%")
    
    print(f"  盈利分布:")
    print(f"    >50万: {len([r for r in result['results'] if r['profit'] > 500_000]):>2} 人")
    print(f"    1-10万: {len([r for r in result['results'] if 10_000 < r['profit'] <= 100_000]):>2} 人")
    print(f"    1千-1万: {len([r for r in result['results'] if 1_000 < r['profit'] <= 10_000]):>2} 人")
    print(f"    0-1千: {len([r for r in result['results'] if 0 < r['profit'] <= 1_000]):>2} 人")

print()
print("=" * 100)
