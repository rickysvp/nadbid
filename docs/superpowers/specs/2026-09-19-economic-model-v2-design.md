# NADBID 经济模型 V2 — 设计文档

**日期：** 2026-09-19  
**版本：** v0.2  
**状态：** 已批准

---

## 一、背景与目标

现有合约 v0.1 使用 85% 卖家 / 15% 奖励池的模型，经过模拟发现早期出价者激励不足，盈利用户比例仅 9%。

本次重构目标：
- 提高奖励池比例，让更多早期出价者盈利
- 引入阶梯分红，向早期出价者倾斜
- 调整手续费结构，平台利润稳定在 10%
- 分红上限从 100x 降到 30x，防止早期用户拿太多

---

## 二、核心参数变更

| 参数 | 旧值 (v0.1) | 新值 (v0.2) | 说明 |
|---|---|---|---|
| 出价手续费 BID_FEE_BPS | 100 (1%) | 300 (3%) | 每次出价额外收 |
| 池子手续费 SETTLE_FEE_BPS | 500 (5%) | 700 (7%) | 净池分配时扣 |
| 卖家占比 SELLER_SHARE_BPS | 8500 (85%) | 6000 (60%) | 净池 → 卖家 |
| 奖励池 REWARD_SHARE_BPS | 1500 (15%) | 3300 (33%) | 净池 → 奖励池 |
| 分红上限 MAX_REWARD_MULTIPLIER | 100x | 30x | 单个出价分红不超本金 30 倍 |

### 校验
- 卖家 + 奖励 = 60% + 33% = 93%
- 池子手续费 = 7%
- 合计 = 100% ✓
- 出价手续费 3% 是额外收入

---

## 三、分红模型变更

### 旧模型：rpu 指数（均权）
所有被保留的出价者，按出价比重分享奖励池。

**问题：** 早期出价者和晚期出价者拿一样的比例，早期用户没有额外激励。

### 新模型：阶梯分红（按批次顺序）

按被保留出价的批次顺序分三档：

| 档位 | 批次位置 | 奖励池分配比例 | 说明 |
|---|---|---|---|
| Early | 前 30% 批次 | 40% | 早期出价者拿大头 |
| Mid | 中间 30% 批次 | 35% | 中期出价者 |
| Late | 后 40% 批次 | 25% | 晚期出价者 |

**实现方式：**
1. 每个批次被保留时，记录它是第几个被保留的（retainedIndex）
2. 结算时，根据 retainedIndex / totalRetained 计算属于哪一档
3. 每档的奖励池份额 = 该档所有批次的价格之和 × 该档权重 / 该档总价格

**链上计算简化：**
```
totalPool = sum(所有被保留批次的价格)
rewardPoolTotal = totalPool × 33% × (1 - 7%)  // 扣池手续费

earlyPool = rewardPoolTotal × 40%
midPool = rewardPoolTotal × 35%
latePool = rewardPoolTotal × 25%

earlyTotalPrice = 前30%批次价格之和
midTotalPrice = 中间30%批次价格之和
lateTotalPrice = 后40%批次价格之和

每个批次分红 = batchPrice × (对应档的池子 / 对应档总价格)
```

---

## 四、合约结构变更

### 修改的常量
```solidity
uint256 public constant BID_FEE_BPS = 300;          // 3%
uint256 public constant SETTLE_FEE_BPS = 700;       // 7%
uint256 public constant SELLER_SHARE_BPS = 6000;    // 60%
uint256 public constant REWARD_SHARE_BPS = 3300;     // 33%
uint256 public constant MAX_REWARD_MULTIPLIER = 30;  // 30x
```

### 修改的结构体
```solidity
struct BidBatch {
    uint256 price;
    uint256 blockNumber;
    uint256 candidateCount;
    address selectedBidder;
    uint256 retainedIndex;      // 新增：第几个被保留的（从1开始）
    bool resolved;
}
```

### 新增的存储变量
```solidity
uint256 public retainedCount;     // 该拍卖已被保留的批次总数
uint256 public earlyTotalPrice;   // 前30%批次价格之和
uint256 public midTotalPrice;    // 中间30%批次价格之和
uint256 public lateTotalPrice;   // 后40%批次价格之和
```

### 修改的函数
1. `_resolveBatch()` — 新增 retainedIndex 记录
2. `finalize()` — 重写分红计算逻辑
3. `claimReward()` — 使用新的分红计算

### 保留不变的核心机制
- 同区块同价随机保留一笔
- 单区块单价格等级
- 120 秒倒计时
- 流拍全额退款
- 禁止发起人出价
- 资产托管

---

## 五、模拟验证结果

**参数：** 起拍价 100 MON，1% 增幅，100 人参与，100 万 MON 资产

**结果：**
- 最终成交价：17,146 MON
- 总出价次数：517 次
- 平台净利润：100,375 MON（10.0%）
- 盈利用户：18 人（18%）
- 分红触达 30x 上限：0 人

---

## 六、实施清单

### 合约
- [ ] 修改常量值
- [ ] BidBatch 结构体增加 retainedIndex
- [ ] Auction 结构体增加 retainedCount / earlyTotalPrice / midTotalPrice / lateTotalPrice
- [ ] 重写 _resolveBatch()
- [ ] 重写 finalize() 分红计算
- [ ] 重写 claimReward()
- [ ] 更新单元测试
- [ ] 重新部署到 Monad 测试网

### 前端
- [ ] 更新合约 ABI
- [ ] 更新显示文案（手续费率、分配比例）
- [ ] 更新创建拍卖页面的说明
- [ ] 更新拍卖详情页的资金池分配显示

---

## 七、风险与注意事项

1. **阶梯分红的 gas 成本：** 需要在结算时遍历所有批次计算各档总价格，可能 gas 较高。但单场最多 500 个批次，在 Monad 上应该没问题。
2. **整除误差：** 整数除法可能导致尾差，和之前一样用余额倒推平台收入来闭合。
3. **边界情况：** 只有 1 个批次时，100% 算 Early 档。
4. **保留价：** 未达标流拍逻辑不变。
