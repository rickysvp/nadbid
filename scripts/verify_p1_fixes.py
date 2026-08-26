"""P1 修复回归测试（v2：修复竞态与断言错误）。

覆盖：
- P1-1 倒计时走秒（Featured 大倒计时 + Ongoing 列表项）
- P1-4 KOLs 目录筛选真实过滤（All=4 / OG=2 / Top 100=3 / Verified=4）
- P1-5 移动端 drawer 钱包镜像（demo 钱包自动连接 → Disconnect → Connect 循环）
- P1-6 AuctionDetail 404 页返回 CTA
- 全程 console error / pageerror 监控
"""
import sys
import time

from playwright.sync_api import sync_playwright

BASE = "http://localhost:3002"
PASS: list[str] = []
FAIL: list[str] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    if cond:
        PASS.append(name)
        print(f"  PASS  {name}")
    else:
        FAIL.append(name)
        print(f"  FAIL  {name}  {detail}")


def parse_seconds(text: str) -> int:
    """'12h 3m 58s' → 总秒数。"""
    total = 0
    for tok in text.split():
        if tok[:-1].isdigit():
            total += int(tok[:-1]) * {"d": 86400, "h": 3600, "m": 60, "s": 1}[tok[-1]]
    return total


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    console_errors: list[str] = []
    page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: console_errors.append(str(e)))

    # ---------- P1-1 倒计时走秒 ----------
    print("[P1-1] countdown ticking")
    page.goto(f"{BASE}/")
    page.wait_for_load_state("networkidle")

    big = page.locator("span.font-mono.font-black.text-5xl")
    big.first.wait_for(state="visible", timeout=10000)
    t1 = big.first.text_content().strip()
    time.sleep(2.5)
    t2 = big.first.text_content().strip()
    check("featured countdown renders with seconds", "s" in t1, f"text={t1!r}")
    check("featured countdown ticks", t1 != t2, f"{t1!r} -> {t2!r}")
    check(
        "featured countdown decreases",
        parse_seconds(t2) < parse_seconds(t1),
        f"{t1!r} -> {t2!r}",
    )

    items = page.locator("span.font-mono.text-lg.font-black.text-error")
    items.first.wait_for(state="visible", timeout=10000)
    l1 = items.first.text_content().strip()
    time.sleep(2.5)
    l2 = items.first.text_content().strip()
    check("ongoing list countdown ticks", l1 != l2, f"{l1!r} -> {l2!r}")

    # ---------- P1-4 KOLs 筛选 ----------
    print("[P1-4] KOLs directory filter")
    page.goto(f"{BASE}/kols")
    page.wait_for_load_state("networkidle")
    page.wait_for_selector('div.grid a[href^="/kols/"]', timeout=10000)
    grid_cards = page.locator('div.grid a[href^="/kols/"]')
    expected = {"All": 4, "OG": 2, "Top 100": 3, "Verified": 4}
    for tag, want in expected.items():
        page.locator("button[type=button]", has_text=tag).first.click()
        page.wait_for_timeout(250)
        got = grid_cards.count()
        check(f"filter {tag!r} -> {want} cards", got == want, f"got {got}")

    og_btn = page.locator("button[aria-pressed=true]")
    check("aria-pressed reflects active filter", og_btn.first.text_content().strip() == "Verified")

    # ---------- P1-6 AuctionDetail 404 ----------
    print("[P1-6] auction 404 page")
    page.goto(f"{BASE}/auctions/does-not-exist-xyz")
    page.wait_for_selector("text=Auction not found", timeout=10000)
    check("404 headline shown", page.locator("text=Auction not found").count() == 1)
    back = page.locator("a", has_text="Back to Home")
    browse = page.locator("a", has_text="Browse KOLs")
    check("Back to Home CTA present", back.count() == 1)
    check("Browse KOLs CTA present", browse.count() == 1)
    back.first.click()
    page.wait_for_selector("span.font-mono.font-black.text-5xl", timeout=10000)
    check("Back to Home navigates to /", page.url.rstrip("/") == BASE, f"url={page.url}")

    # ---------- P1-5 移动端 drawer 钱包镜像 ----------
    # demo 钱包自动连接（0xYou0000 / 1,000,000 $MON），验证完整镜像状态机：
    # 已连接（余额 + Disconnect）→ Disconnect → Connect Wallet → 重新连接
    print("[P1-5] mobile nav drawer wallet")
    page.set_viewport_size({"width": 390, "height": 844})
    page.goto(f"{BASE}/")
    page.wait_for_load_state("networkidle")
    page.locator('button[aria-label="Toggle navigation menu"]').click()
    drawer = page.locator("nav div.md\\:hidden")
    drawer.first.wait_for(state="visible", timeout=5000)

    # 已连接态：余额 + Disconnect
    check(
        "drawer mirrors connected state (Disconnect btn)",
        drawer.first.locator("button", has_text="Disconnect").count() == 1,
    )
    bal = drawer.first.text_content() or ""
    check("drawer shows balance ($MON)", "$MON" in bal, f"text={bal[:80]!r}")
    check("drawer shows wallet address", "0xYou" in bal, f"text={bal[:80]!r}")

    # Disconnect → Connect Wallet 出现
    drawer.first.locator("button", has_text="Disconnect").first.click()
    page.wait_for_selector(
        "nav div.md\\:hidden button:has-text('Connect Wallet')", timeout=5000
    )
    check("drawer switches to Connect Wallet after disconnect", True)

    # Connect → 回到已连接态
    page.locator("nav div.md\\:hidden button", has_text="Connect Wallet").first.click()
    try:
        page.wait_for_selector("nav div.md\\:hidden button:has-text('Disconnect')", timeout=8000)
        check("drawer reconnects (Disconnect shown again)", True)
    except Exception:
        check("drawer reconnects (Disconnect shown again)", False, "Disconnect not shown")
    page.wait_for_timeout(300)
    page.screenshot(path="scripts/_p1_mobile_drawer.png")

    # 关闭再打开，状态保留
    page.locator('button[aria-label="Toggle navigation menu"]').click()
    page.wait_for_timeout(200)
    page.locator('button[aria-label="Toggle navigation menu"]').click()
    page.wait_for_timeout(300)
    check(
        "drawer re-open keeps connected state",
        page.locator("nav div.md\\:hidden button", has_text="Disconnect").count() == 1,
    )

    # ---------- console 错误 ----------
    noise = [e for e in console_errors if "favicon" not in e.lower()]
    check("no console/page errors", len(noise) == 0, "; ".join(noise[:3]))

    browser.close()

print()
print(f"RESULT: {len(PASS)} passed, {len(FAIL)} failed")
if FAIL:
    print("Failed:", *[f"  - {f}" for f in FAIL], sep="\n")
sys.exit(1 if FAIL else 0)
