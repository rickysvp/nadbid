# busy.land Design System — 强约束设计规范

> **来源站点**: https://www.busy.land/
> **风格定位**: Neo-Brutalism × Comic Cartoon × Vintage Newspaper
> **适用范围**: 全站所有页面、组件、交互元素
> **约束等级**: 强制（MUST）— 任何偏离均视为设计缺陷

---

## 1. 设计哲学（Design Philosophy）

### 1.1 核心气质
- **漫画粗野感**: 所有可交互元素必须带有粗黑边框 + 硬偏移阴影，营造手绘贴纸/漫画印刷质感
- **复古报纸排版**: 标题使用超粗黑体全大写，数据使用等宽字体，模拟财经报纸的信息密度
- **高对比糖果色**: 奶油白底 + 柠檬黄主色 + 珊瑚红强调，五大洲用高饱和区分色
- **拒绝柔和**: 不使用渐变阴影、模糊光晕、半透明叠加（除指定装饰元素外）

### 1.2 绝对禁止（MUST NOT）
- ❌ 禁止使用柔和渐变背景
- ❌ 禁止使用 `box-shadow` 带模糊半径（如 `0 2px 8px rgba(0,0,0,0.1)`）
- ❌ 禁止使用细边框（< 2px）作为主组件边框
- ❌ 禁止使用圆角 > 16px 或完全直角
- ❌ 禁止在正文中使用斜体
- ❌ 禁止使用灰色系按钮作为主 CTA
- ❌ 禁止卡片无边框设计

---

## 2. 颜色系统（Color System）

### 2.1 基础色板

| Token | Hex | 用途 | 约束 |
|---|---|---|---|
| `--bg` | `#F7F6F2` | 页面背景（奶油米白） | 全站默认背景，禁止纯白 |
| `--bg-deep` | `#ECE9E2` | 深色背景区域/分区 | 用于区块分隔 |
| `--app-panel` | `#FFFEFD` | 卡片/面板背景 | 接近白但偏暖 |
| `--app-surface` | `#FFFEFD` | 悬浮元素表面 | 同 panel |
| `--app-text` | `#111111` | 主文字 | 近纯黑，禁止纯黑 #000 |
| `--app-text-muted` | `#696761` | 次要文字/说明 | 暖灰色 |
| `--border` | `rgba(17,17,17,0.24)` | 次级边框/分割线 | 半透明黑 |
| `--border-strong` | `#111111` | 主组件边框 | 所有卡片/按钮必须使用 |
| `--border-subtle` | `rgba(17,17,17,0.11)` | 极细分割 | 仅用于内部细线 |
| `--border-divider` | `#8B8983` | 区块分隔线 | 中灰色 |

### 2.2 品牌主色（柠檬黄系）

| Token | Hex | 用途 |
|---|---|---|
| `--brand-50` | `#FBDDDC` | 最浅黄（悬停背景） |
| `--brand-100` | `#F2F6A5` | 浅黄（标签背景） |
| `--brand-300` | `#DDEA54` | **主黄**（按钮、高亮、CTA） |
| `--brand-500` | `#CADB35` | 深黄（按下状态） |
| `--brand-700` | `#9DAC1F` | 最深黄（文字 on 浅黄） |
| `--brand-glow` | `rgba(221,234,84,0.22)` | 黄色光晕（仅装饰） |

> **约束**: 主 CTA 按钮背景必须为 `#DDEA54`，禁止使用其他颜色作为主操作按钮。

### 2.3 强调色（珊瑚红系）

| Token | Hex | 用途 |
|---|---|---|
| `--accent` | `#F1715B` | 强调色（下划线、标签、进度指示） |
| `--accent-ring` | `rgba(241,113,91,0.28)` | 聚焦环 |
| `--app-accent-soft` | `rgba(241,113,91,0.12)` | 浅红背景 |

### 2.4 功能色

| Token | Hex | 用途 |
|---|---|---|
| `--danger` | `#C94545` | 错误/负收益（红色 ROI） |
| `--danger-foreground` | `#FFFAF0` | 危险色上的文字 |
| `--warning` | `#D18A28` | 警告 |
| `--success` | `#2D8A4E` | 正收益（绿色 ROI） |

> **约束**: ROI 正数用 `#2D8A4E`，负数用 `#C94545`，禁止使用其他红绿变体。

### 2.5 五大洲专属色（Continent Palette）

| 大洲 | Hex | 色名 | 应用场景 |
|---|---|---|---|
| **Americas** | `#4CAF50` | 美洲绿 | 地图区块、列表圆点、标签 |
| **Europe** | `#5B9BD5` | 欧洲蓝 | 地图区块、列表圆点、标签 |
| **Africa** | `#F4B942` | 非洲黄橙 | 地图区块、列表圆点、标签 |
| **Asia** | `#E8734A` | 亚洲橙红 | 地图区块、列表圆点、标签 |
| **Oceania** | `#9C6BD5` | 大洋洲紫 | 地图区块、列表圆点、标签 |

> **约束**: 五大洲颜色在全站必须一致，禁止在不同页面使用不同色值。地图填充色与列表指示点颜色必须对应。

### 2.6 面板背景色（Card Variants）

| 变体 | Hex | 用途 |
|---|---|---|
| 默认面板 | `#FFFEFD` | 通用卡片、表格行 |
| 黄色面板 | `#DDEA54` 或 `#F2F6A5` | Buybacks 卡片、高亮信息区 |
| 粉色面板 | `#F5C6CB`（近似） | Vested JAMES 卡片 |
| 蓝色面板 | `#A8D0E6`（近似） | 时间轴/进度条背景 |

---

## 3. 字体系统（Typography）

### 3.1 字体族

| Token | Font Stack | 用途 |
|---|---|---|
| `--font-display` | `"Archivo Black", "Noto Sans JP", "Arial Black", sans-serif` | **大标题/Hero**（漫画海报感） |
| `--font-poster` | `"Barlow Condensed", "Noto Sans JP", "Arial Narrow", sans-serif` | 压缩标题、标签、数据标题 |
| `--font-sans` | `"DM Sans", "Noto Sans JP", system-ui, -apple-system, "Segoe UI", sans-serif` | **正文**、按钮文字、通用 |
| `--font-mono` | `"IBM Plex Mono", "Noto Sans JP", ui-monospace, "SF Mono", Menlo, monospace` | **数字/价格/数据/技术标签** |

> **约束**: 
> - 所有价格、代币数量、百分比、倒计时必须使用 `--font-mono`
> - Hero 大标题必须使用 `--font-display` 且全大写
> - 正文禁止使用 `--font-display` 或 `--font-mono`

### 3.2 字号阶梯

| Token | Size | 用途 |
|---|---|---|
| `--fs-12` | `0.75rem` (12px) | 辅助说明、脚注 |
| `--fs-13` | `0.8125rem` (13px) | 表格表头、标签 |
| `--fs-14` | `0.875rem` (14px) | 次要正文 |
| `--fs-16` | `1rem` (16px) | **基础正文字号** |
| `--fs-18` | `1.125rem` (18px) | 强调正文 |
| `--fs-20` | `1.25rem` (20px) | 小标题 |
| `--fs-24` | `1.5rem` (24px) | 区块标题 |
| `--fs-32` | `2rem` (32px) | 大标题 |
| `--fs-48` | `3rem` (48px) | Hero 主标题 |
| `--fs-64` | `4rem` (64px) | 超大 Hero 标题 |

### 3.3 字重规范

| 字重 | 值 | 用途 |
|---|---|---|
| Regular | 400 | 正文默认 |
| Medium | 500 | 强调正文 |
| SemiBold | 600 | 按钮、小标题 |
| Bold | 700 | 标题、数据 |
| Black | 900 | Hero 标题（Archivo Black 原生） |

> **约束**: 正文禁止使用 > 600 字重；标题禁止使用 < 700 字重。

### 3.4 文本变换

- **Hero 标题**: `text-transform: uppercase` + `letter-spacing: -0.02em`
- **数据标签/表头**: `text-transform: uppercase` + `letter-spacing: 0.05em`
- **按钮文字**: 正常大小写，禁止全大写（除特殊标签按钮）
- **正文**: 正常大小写

---

## 4. 间距与布局（Spacing & Layout）

### 4.1 间距阶梯（4px 基准）

| Token | Value | 用途 |
|---|---|---|
| `--space-1` | `4px` | 极紧凑（图标与文字间距） |
| `--space-2` | `8px` | 紧凑（内部元素间距） |
| `--space-3` | `12px` | 标准内边距小 |
| `--space-4` | `16px` | **标准内边距** |
| `--space-5` | `20px` | 卡片内边距 |
| `--space-6` | `24px` | 区块间距 |
| `--space-8` | `32px` | 大区块间距 |
| `--space-10` | `40px` | 页面区段间距 |
| `--space-12` | `48px` | 大页面区段 |
| `--space-16` | `64px` | Hero 底部间距 |

### 4.2 容器宽度

| Token | Value | 用途 |
|---|---|---|
| `--container-xl` | `1280px` | 标准内容容器 |
| `--container-2xl` | `1440px` | 宽屏容器（地图、数据面板） |

> **约束**: 内容最大宽度不超过 1440px，居中对齐，左右内边距 `24px`（移动端 `16px`）。

### 4.3 圆角规范

| 元素 | 圆角值 |
|---|---|
| 主按钮 | `7px` – `10px` |
| 次按钮/标签 | `8px` |
| 卡片/面板 | `12px` |
| 大容器（地图区） | `16px` – `20px` |
| 输入框 | `8px` |
| 价格胶囊 | `999px`（全圆角） |

> **约束**: 全站圆角范围 7px–20px，禁止 0px 直角或 > 20px 超圆。

---

## 5. 阴影系统（Shadow System）— 核心识别元素

### 5.1 硬偏移阴影（Hard Offset Shadow）

这是 busy.land 最核心的视觉识别符号。**所有阴影必须为硬边、无模糊、纯色偏移。**

| 层级 | 值 | 用途 |
|---|---|---|
| `--shadow-sm` | `3px 3px 0px 0px #111111` | 小卡片、表格行 |
| `--shadow-md` | `4px 4px 0px 0px #111111` | 标准按钮、中等卡片 |
| `--shadow-lg` | `5px 5px 0px 0px #111111` | 主 CTA 按钮、大卡片 |
| `--shadow-xl` | `6px 6px 0px 0px #111111` | 悬浮面板、模态框 |

### 5.2 阴影使用规则

- **按钮**: 默认 `--shadow-lg`，`:active` 状态变为 `1px 1px 0px 0px #111111`（按下效果）
- **卡片**: 默认 `--shadow-sm` 或 `--shadow-md`
- **悬浮元素**: `--shadow-xl`
- **禁止**: 任何带 `blur-radius` 的阴影（如 `0 4px 12px rgba(0,0,0,0.15)`）
- **阴影颜色**: 必须为 `#111111`，禁止使用彩色阴影或灰色阴影

### 5.3 双层边框效果

部分元素使用"边框 + 内边距 + 背景色条"模拟双层贴纸效果：
- 外层: `2px solid #111111`
- 内层底部: 彩色条（如黄色/红色）作为装饰底边
- 用于: 黑色按钮（底部黄色条）、特殊标签

---

## 6. 组件规范（Components）

### 6.1 按钮（Buttons）

#### 主按钮（Primary CTA）
```css
background: #DDEA54;
color: #111111;
border: 2px solid #111111;
border-radius: 7px;
box-shadow: 5px 5px 0px 0px #111111;
font-family: var(--font-sans);
font-weight: 600;
padding: 11.2px 16px;
transition: all 0.15s ease-out;
```
- `:hover`: 阴影变为 `4px 4px 0px 0px #111111`，轻微上移
- `:active`: 阴影变为 `1px 1px 0px 0px #111111`，下移贴合

#### 黑色按钮（Dark Button）
```css
background: #111111;
color: #FFFEFD;
border: 2px solid #111111;
border-radius: 8px;
box-shadow: 0px 4px 0px 0px #DDEA54; /* 底部黄色装饰条 */
font-weight: 600;
padding: 14px 24px;
```
- 用于: Stake、Buy Vested JAMES 等重要操作
- 底部必须有黄色装饰条（`box-shadow` 模拟）

#### 次按钮（Secondary）
```css
background: #FFFEFD;
color: #111111;
border: 2px solid #111111;
border-radius: 10px;
box-shadow: 3px 3px 0px 0px #111111;
```

#### 文字按钮（Ghost）
```css
background: transparent;
color: #111111;
border: none;
box-shadow: none;
text-decoration: underline;
```
- 仅用于底部链接、辅助操作

### 6.2 卡片（Cards）

#### 默认卡片
```css
background: #FFFEFD;
border: 2px solid #111111;
border-radius: 12px;
box-shadow: 3px 3px 0px 0px #111111;
padding: 24px;
```

#### 黄色信息卡片
```css
background: #DDEA54;
border: 2px solid #111111;
border-radius: 12px;
box-shadow: 4px 4px 0px 0px #111111;
padding: 24px;
```
- 用于: Buybacks 池、高亮数据区

#### 粉色信息卡片
```css
background: #F5C6CB; /* 近似 */
border: 2px solid #111111;
border-radius: 12px;
box-shadow: 4px 4px 0px 0px #111111;
```
- 用于: Vested JAMES 卡片

#### 大容器卡片（地图区）
```css
background: linear-gradient(135deg, #F0ECF8 0%, #E8F0F8 100%); /* 淡紫蓝渐变 */
border: 2px solid #111111;
border-radius: 20px;
box-shadow: 4px 4px 0px 0px #111111;
```
- 背景带淡灰色网格纹理（`background-image: grid`）

### 6.3 价格胶囊（Price Pill）

```css
background: #FFFEFD;
border: 2px solid #111111;
border-radius: 999px;
padding: 6px 16px;
display: inline-flex;
align-items: center;
gap: 8px;
font-family: var(--font-mono);
font-weight: 700;
```
- 左侧: 代币图标（圆形）
- 中间: 代币符号（`$BUSY`）
- 右侧: 价格数字（等宽字体）
- 多个胶囊可并排组合

### 6.4 进度条（Progress Bar）

```css
background: rgba(17,17,17,0.1);
border: 2px solid #111111;
border-radius: 999px;
height: 24px;
overflow: hidden;

/* 填充 */
.bar-fill {
  background: #111111;
  height: 100%;
  border-radius: 999px;
  transition: width 0.4s ease-out;
}
```
- 填充色必须为纯黑 `#111111`
- 禁止使用彩色渐变填充

### 6.5 时间轴/纪元条（Epoch Bar）

```css
background: #A8D0E6; /* 淡蓝 */
border: 2px solid #111111;
border-radius: 8px;
padding: 8px 16px;
font-family: var(--font-mono);
text-transform: uppercase;
```
- 左侧: 纪元标识（`S1 | EPOCH 1`）
- 右侧: 倒计时（`3D 23H 38M 26S`），珊瑚红色

### 6.6 表格（Data Table）

- 表头: `--font-mono` + 全大写 + `--fs-13` + `--app-text-muted`
- 表行: 独立卡片样式，每行有 `2px solid #111111` 边框 + `3px 3px 0px #111111` 阴影
- 行间距: `12px`
- 大陆指示点: `12px × 12px` 方块，对应大洲颜色
- ROI: 绿色（正）/ 红色（负），`--font-mono` + `font-weight: 700`
- 操作按钮: 行内主按钮（柠檬黄）

### 6.7 标签/徽章（Badges）

#### 高亮标签（如 $BUSY）
```css
background: #DDEA54;
border: 2px solid #111111;
border-radius: 4px;
padding: 2px 8px;
font-family: var(--font-display);
box-shadow: 3px 3px 0px 0px #F1715B; /* 红色偏移阴影 */
```
- 用于 Hero 标题中的关键词高亮

#### 信息图标（!）
```css
width: 20px;
height: 20px;
border: 2px solid #111111;
border-radius: 50%;
display: inline-flex;
align-items: center;
justify-content: center;
font-size: 12px;
font-weight: 700;
```

### 6.8 导航栏（Header）

```
┌─────────────────────────────────────────────────────────────┐
│ [Logo]  busy.land          [$BUSY 0.1334] [$JAMES 0.0764]  [Connect Wallet] [☰] │
│         WORLD MARKET JOURNAL                                      │
└─────────────────────────────────────────────────────────────┘
```

- **高度**: `72px`
- **背景**: `--bg`（透明/同页面背景）
- **Logo**: 圆形图标 + `busy.land` 文字（`--font-display`）+ 副标题 `WORLD MARKET JOURNAL`（`--font-mono` 全大写小字）
- **价格胶囊组**: 居中，两个胶囊并排
- **Connect Wallet**: 主按钮样式，右侧
- **菜单按钮**: 圆形/圆角方形，`2px solid #111111`，汉堡图标

### 6.9 下拉菜单（Dropdown Menu）

```css
background: #FFFEFD;
border: 2px solid #111111;
border-radius: 16px;
box-shadow: 5px 5px 0px 0px #111111;
padding: 8px;
min-width: 240px;
```
- 菜单项: `padding: 12px 16px`，`border-radius: 8px`
- 选中项: 背景 `#DDEA54`
- 悬停项: 背景 `rgba(17,17,17,0.04)`

### 6.10 页脚（Footer）

- 高度: `64px`
- 布局: 左右两端对齐
- 左侧: `busy.land · Monad`（`--font-mono`）
- 右侧: `Disclaimer · Docs · X / Twitter`（文字链接）
- 顶部: 细分割线 `--border-subtle`

---

## 7. 装饰元素（Decorative Elements）

### 7.1 网格背景

```css
background-image: 
  linear-gradient(rgba(17,17,17,0.03) 1px, transparent 1px),
  linear-gradient(90deg, rgba(17,17,17,0.03) 1px, transparent 1px);
background-size: 32px 32px;
```
- 应用于: 大容器卡片内部（地图区）、特定区块背景
- 透明度极低，仅作为纹理暗示

### 7.2 手绘圆形装饰

- 页面角落放置大型半透明圆形（淡黄色、淡蓝色、淡粉色）
- 直径: `200px` – `400px`
- 透明度: `0.3` – `0.5`
- 位置: 绝对定位，部分溢出视口
- 用途: 打破规整感，增加漫画活泼感

### 7.3 虚线弧线

- `border: 2px dashed rgba(17,17,17,0.2)`
- 用于: 地图上的航线装饰、连接指示
- 半径: 根据布局调整

### 7.4 世界地图

- **风格**: 卡通扁平化，粗黑轮廓
- **填充**: 五大洲对应专属色
- **纹理**: 部分区域带斜线/点阵纹理（comic book halftone）
- **标签**: 白色圆角标签，显示大洲名 + 挖矿速率
- **交互**: 大洲可点击，悬停时轻微放大 + 阴影加深

---

## 8. 动效与交互（Motion & Interaction）

### 8.1 过渡时间

| Token | Value | 用途 |
|---|---|---|
| `--duration-instant` | `80ms` | 即时反馈（开关） |
| `--duration-fast` | `150ms` | 按钮悬停、按下 |
| `--duration-base` | `220ms` | 标准过渡（卡片、面板） |
| `--duration-slow` | `400ms` | 进度条、大型展开 |

### 8.2 缓动函数

| Token | Value | 用途 |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | **默认**（元素进入、按钮） |
| `--ease-in` | `cubic-bezier(0.7, 0, 0.84, 0)` | 元素退出 |
| `--ease-inout` | `cubic-bezier(0.65, 0, 0.35, 1)` | 循环动画 |

### 8.3 交互状态

#### 按钮
- `:hover`: 阴影偏移减少 1px，元素上移 1px
- `:active`: 阴影偏移减少至 1px，元素下移 2px（贴合阴影）
- `:focus-visible`: 外描边 `3px solid var(--accent-ring)`

#### 卡片
- `:hover`: 阴影偏移增加 1px，轻微上移
- 可点击卡片: `cursor: pointer`

#### 链接
- `:hover`: 文字颜色变为 `--accent`，下划线加粗

### 8.4 禁止的动效

- ❌ 禁止弹性过度动画（`bounce`、`spring` 超出自然范围）
- ❌ 禁止 3D 翻转/旋转
- ❌ 禁止视差滚动（parallax）
- ❌ 禁止粒子背景动画
- ❌ 禁止长时间加载动画（> 1s）

---

## 9. 响应式断点（Breakpoints）

| 断点 | 宽度 | 布局调整 |
|---|---|---|
| `sm` | `< 640px` | 单列，价格胶囊换行，汉堡菜单 |
| `md` | `640px – 1024px` | 双列，表格简化 |
| `lg` | `1024px – 1280px` | 标准桌面布局 |
| `xl` | `> 1280px` | 宽屏布局，容器最大 1440px |

### 9.1 移动端特殊规则

- 顶部导航: 价格胶囊隐藏或压缩为单个
- Hero 标题: 字号缩小至 `--fs-32`
- 世界地图: 简化为列表形式或缩小地图
- 卡片: 内边距减少至 `16px`
- 按钮: 全宽 `width: 100%`

---

## 10. 图标与图像（Icons & Imagery）

### 10.1 图标风格

- **风格**: 线性图标，`2px` 描边，圆角端点
- **颜色**: `#111111`（与边框一致）
- **尺寸**: `16px`、`20px`、`24px`
- **禁止**: 填充图标、彩色图标、3D 图标

### 10.2 代币图标

- 圆形，`24px` – `32px` 直径
- `$BUSY`: 黄色背景 + 黑色 "B" 字
- `$JAMES`: 渐变/彩色头像风格
- `$MON`: Monad 标志

### 10.3 插画风格

- 卡通/漫画风格，粗黑轮廓
- 平涂色块 + 半调点阵纹理
- 禁止: 写实照片、3D 渲染、渐变插画

---

## 11. 可访问性（Accessibility）

### 11.1 对比度要求

- 正文文字 on 背景: ≥ 4.5:1（`#111111` on `#F7F6F2` = 16.8:1 ✅）
- 大标题 on 背景: ≥ 3:1
- 按钮文字 on 柠檬黄: `#111111` on `#DDEA54` = 11.2:1 ✅
- 次要文字: ≥ 4.5:1

### 11.2 焦点状态

- 所有可交互元素必须有可见 `:focus-visible` 状态
- 焦点环: `3px solid var(--accent-ring)`，外距 `2px`

### 11.3 减少动效

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 12. 实现检查清单（Implementation Checklist）

开发完成后，逐项核对：

- [ ] 页面背景为 `#F7F6F2`，非纯白
- [ ] 所有主按钮为柠檬黄 `#DDEA54` + 粗黑边 + 硬阴影
- [ ] 所有卡片有 `2px solid #111111` 边框
- [ ] 所有阴影为硬偏移无模糊，颜色 `#111111`
- [ ] Hero 标题使用 Archivo Black 且全大写
- [ ] 所有数字/价格使用 IBM Plex Mono
- [ ] 五大洲颜色与规范一致
- [ ] 正 ROI 绿色、负 ROI 红色
- [ ] 圆角在 7px–20px 范围内
- [ ] 无柔和渐变阴影、无模糊光晕
- [ ] 焦点状态可见
- [ ] 移动端布局适配正确
- [ ] 装饰网格背景透明度正确（极低）
- [ ] 价格胶囊为全圆角 + 粗黑边

---

## 附录 A: CSS 变量完整定义

```css
:root {
  /* Backgrounds */
  --bg: #F7F6F2;
  --bg-deep: #ECE9E2;
  --app-panel: #FFFEFD;
  --app-surface: #FFFEFD;
  --app-canvas: #F7F6F2;

  /* Text */
  --app-text: #111111;
  --app-text-muted: #696761;

  /* Borders */
  --border: rgba(17,17,17,0.24);
  --border-strong: #111111;
  --border-subtle: rgba(17,17,17,0.11);
  --border-divider: #8B8983;

  /* Brand - Lime */
  --brand-50: #FBDDDC;
  --brand-100: #F2F6A5;
  --brand-300: #DDEA54;
  --brand-500: #CADB35;
  --brand-700: #9DAC1F;
  --brand-900: #111111;
  --brand-glow: rgba(221,234,84,0.22);

  /* Accent - Coral */
  --accent: #F1715B;
  --accent-ring: rgba(241,113,91,0.28);
  --app-accent-soft: rgba(241,113,91,0.12);

  /* Functional */
  --danger: #C94545;
  --danger-foreground: #FFFAF0;
  --warning: #D18A28;
  --success: #2D8A4E;

  /* Continent Colors */
  --continent-americas: #4CAF50;
  --continent-europe: #5B9BD5;
  --continent-africa: #F4B942;
  --continent-asia: #E8734A;
  --continent-oceania: #9C6BD5;

  /* Typography */
  --font-display: "Archivo Black", "Noto Sans JP", "Arial Black", sans-serif;
  --font-poster: "Barlow Condensed", "Noto Sans JP", "Arial Narrow", sans-serif;
  --font-sans: "DM Sans", "Noto Sans JP", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: "IBM Plex Mono", "Noto Sans JP", ui-monospace, "SF Mono", Menlo, monospace;

  /* Font Sizes */
  --fs-12: 0.75rem;
  --fs-13: 0.8125rem;
  --fs-14: 0.875rem;
  --fs-16: 1rem;
  --fs-18: 1.125rem;
  --fs-20: 1.25rem;
  --fs-24: 1.5rem;
  --fs-32: 2rem;
  --fs-48: 3rem;
  --fs-64: 4rem;

  /* Shadows (Hard Offset - NO BLUR) */
  --shadow-sm: 3px 3px 0px 0px #111111;
  --shadow-md: 4px 4px 0px 0px #111111;
  --shadow-lg: 5px 5px 0px 0px #111111;
  --shadow-xl: 6px 6px 0px 0px #111111;

  /* Motion */
  --duration-instant: 80ms;
  --duration-fast: 150ms;
  --duration-base: 220ms;
  --duration-slow: 400ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.7, 0, 0.84, 0);
  --ease-inout: cubic-bezier(0.65, 0, 0.35, 1);

  /* Layout */
  --container-xl: 1280px;
  --container-2xl: 1440px;
}
```

---

## 附录 B: 字体加载配置

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Barlow+Condensed:wght@600;700&family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600;700&display=swap" rel="stylesheet">
```

---

**文档版本**: v1.0
**最后更新**: 2026-08-26
**分析来源**: https://www.busy.land/invest
**约束等级**: 强制（MUST / MUST NOT）
