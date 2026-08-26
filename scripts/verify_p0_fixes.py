"""P0 修复端到端验证 v3：最后 2 项断言修正。"""
from pathlib import Path
import re
import sys
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:3003'
SS = Path('/tmp/nadbid-e2e')
SS.mkdir(exist_ok=True)

results: list[tuple[str, bool, str]] = []


def record(name: str, ok: bool, detail: str = '') -> None:
    status = 'PASS' if ok else 'FAIL'
    print(f'[{status}] {name}' + (f' — {detail}' if detail else ''))
    results.append((name, ok, detail))


def advance(page, ms: int) -> None:
    page.evaluate(f'window.__nadbidDev.advance({ms})')


# ---------- Staking card helpers ----------
def staking_card_scope(page, handle: str):
    link = page.locator(f'a[href="/kols/{handle}"]').first
    return link.locator('xpath=ancestor::div[contains(@class,"rounded-3xl")][1]')


def get_grid_cell(card, idx: int):
    cells = card.locator(':scope > div.grid > div').all()
    if idx >= len(cells):
        return None
    return cells[idx].locator('div:first-child').inner_text().strip()


MULTIPLIER_TOKEN_RE = re.compile(r'\b\d+(?:\.\d+)?x\b', re.IGNORECASE)


def main() -> int:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1440, 'height': 900})
        console_errors = []
        page.on('console', lambda msg: console_errors.append(msg) if msg.type == 'error' else None)
        page.on('pageerror', lambda exc: console_errors.append(('PAGEERROR', str(exc))))

        # -------- P0⑤⑥ Home + featured + detail + unknown-id --------
        print('\n=== P0⑤⑥ 首页数据源 & 拍卖详情按 id 渲染 ===')
        page.goto(f'{BASE}/', wait_until='networkidle')
        auction_links_on_home = [
            (a.get_attribute('href') or '') for a in page.locator('a').all()
            if (a.get_attribute('href') or '').startswith('/auctions/')
        ]
        record('F-home-auction-link-exists', len(auction_links_on_home) > 0,
               f'found={auction_links_on_home}')

        if auction_links_on_home:
            detail_route = auction_links_on_home[0]
            page.goto(f'{BASE}{detail_route}', wait_until='networkidle')
            try:
                has_supply = page.locator(
                    'text=/^Supply|Total Supply|NFTs minted|holders|Staked/i'
                ).count() > 0
                any_know_handle = page.locator(
                    'text=@CryptoChad, text=@NFTQueen, text=@DogeFather, text=@CryptoKing'
                ).count() > 0
                record('F-auction-detail-rendered', has_supply or any_know_handle,
                       f'route={detail_route}')
            except Exception as e:  # noqa: BLE001
                record('F-auction-detail-rendered', False, str(e))

        page.goto(f'{BASE}/auctions/does-not-exist-xyz', wait_until='networkidle')
        try:
            html = page.content()
            has_error = ('Something went wrong' in html or 'Auction not found' in html
                         or 'Not Found' in html or 'Error' in html)
            missing_live_stats = 'Bid Board' not in html or 'Total Bids' not in html
            record('F-auction-unknown-id-failsafe', has_error or missing_live_stats)
        except Exception as e:  # noqa: BLE001
            record('F-auction-unknown-id-failsafe', False, str(e))

        # -------- P0③ 等分分红文案（严格排除 bio 里的 "24h viral" 等非倍率 token） --------
        print('\n=== P0③ 等分分红文案一致性 ===')
        page.goto(f'{BASE}/kols/CryptoChad', wait_until='networkidle')
        try:
            content = page.content()
            has_equal = any(s in content for s in ('Equal per-NFT', '等分', 'per-NFT share'))
            # 只把 "Nx" 样式的"倍率 token" 视为违规（不含 24h/2x 中 2 后面跟非 x 字符），同时排除 bio 的 "24h"
            bad_tokens = [
                t for t in MULTIPLIER_TOKEN_RE.findall(content)
                if t.lower() not in {'1x'}
            ]
            # 另外排除 "multiplier" 英文字面（只在规则/文案里出现时违规）
            has_mult_word = 'multiplier' in content.lower()
            record('F-dividend-copy-equal-weight',
                   has_equal and not bad_tokens and not has_mult_word,
                   f'equal={has_equal} multiplier-tokens={bad_tokens!r} has-word-multiplier={has_mult_word}')
        except Exception as e:  # noqa: BLE001
            record('F-dividend-copy-equal-weight', False, str(e))

        # -------- P0④ Bonding curve 联动：读取图表右上角的 Price pill & Est. total cost 必涨 --------
        print('\n=== P0④ Bonding curve 联动 ===')
        try:
            # price pill (黑底白字)
            price_pill = page.locator('div.rounded-full.bg-black.text-white').first
            price_before = price_pill.inner_text()
            # Est. total cost (Mint 面板)
            mint_est_total = page.locator(
                'div:has(span:text-is("Est. total")) > div.font-display'
            ).first
            est_before = mint_est_total.inner_text()

            mint_btn = page.locator('button:has-text("Mint")').first
            mint_btn.click()
            page.wait_for_timeout(300)
            mint_btn.click()
            page.wait_for_timeout(800)

            price_after = price_pill.inner_text()
            est_after = mint_est_total.inner_text()
            # 断言至少有一个涨了（按预期都应该涨）
            ok = price_before != price_after and est_before != est_after
            record('F-curve-mint-causes-change', ok,
                   f'price {price_before!r} -> {price_after!r}; est-total {est_before!r} -> {est_after!r}')
        except Exception as e:  # noqa: BLE001
            record('F-curve-mint-causes-change', False, str(e))

        # -------- P0⑥ 数据源一致（Profile 含已知 1850/407） --------
        print('\n=== P0⑥ Profile 数字与已知 seed 匹配 ===')
        try:
            profile_html = page.content()
            profile_has_supply = '1,850' in profile_html or '1850' in profile_html
            profile_has_staked = '407' in profile_html
            record('F-profile-supply-staked-known', profile_has_supply and profile_has_staked)
        except Exception as e:  # noqa: BLE001
            record('F-profile-supply-staked-known', False, str(e))

        # -------- P0①② Staking 页生命周期 --------
        print('\n=== P0①② 质押状态机生命周期 ===')
        page.goto(f'{BASE}/staking', wait_until='networkidle')

        card = staking_card_scope(page, 'CryptoChad')

        try:
            c_total = get_grid_cell(card, 0)
            c_free = get_grid_cell(card, 1)
            c_active = get_grid_cell(card, 2)
            c_trans = get_grid_cell(card, 3)
            record('F-staking-Chad-buckets-initial',
                   c_total == '12' and c_free == '12' and c_active == '0' and c_trans == '0',
                   f'total={c_total} free={c_free} active={c_active} trans={c_trans}')
        except Exception as e:  # noqa: BLE001
            record('F-staking-Chad-buckets-initial', False, str(e))

        try:
            stake_select = card.locator(':scope select').first
            stake_select.select_option('7')
            stake_input = card.locator(':scope input[type="number"]').first
            stake_input.fill('3')
            stake_btn = card.locator(':scope button:has-text("Stake")').first
            stake_btn.click()
            page.wait_for_timeout(400)
            c_active_2 = get_grid_cell(card, 2)
            c_trans_2 = get_grid_cell(card, 3)
            record('F-staking-pending-bucket', c_trans_2 == '3' and c_active_2 == '0')
        except Exception as e:  # noqa: BLE001
            record('F-staking-pending-bucket', False, str(e))

        try:
            advance(page, 25 * 3600 * 1000)
            page.wait_for_timeout(200)
            card = staking_card_scope(page, 'CryptoChad')
            c_active_3 = get_grid_cell(card, 2)
            c_trans_3 = get_grid_cell(card, 3)
            record('F-staking-activation-after-25h', c_active_3 == '3' and c_trans_3 == '0')
            unstake_btn = card.locator(':scope button:has-text("Unstake")').first
            record('F-lock-period-blocks-unstake', unstake_btn.is_disabled(),
                   f'disabled={unstake_btn.is_disabled()} label={unstake_btn.inner_text()!r}')
        except Exception as e:  # noqa: BLE001
            record('F-lock-period-blocks-unstake', False, str(e))

        try:
            advance(page, (7 * 24 + 1) * 3600 * 1000)
            page.wait_for_timeout(200)
            card = staking_card_scope(page, 'CryptoChad')
            unstake_btn = card.locator(':scope button:has-text("Unstake")').first
            record('F-unstake-enabled-after-lock-expiry', not unstake_btn.is_disabled())
            unstake_input = card.locator(':scope input[type="number"]').nth(1)
            unstake_input.fill('3')
            unstake_btn.click()
            page.wait_for_timeout(350)
            c_active_4 = get_grid_cell(card, 2)
            c_trans_4 = get_grid_cell(card, 3)
            record('F-unstaking-to-cooldown', c_trans_4 == '3' and c_active_4 == '0')
        except Exception as e:  # noqa: BLE001
            record('F-unstaking-to-cooldown', False, str(e))

        try:
            advance(page, 25 * 3600 * 1000)
            page.wait_for_timeout(200)
            card = staking_card_scope(page, 'CryptoChad')
            c_free_5 = get_grid_cell(card, 1)
            c_active_5 = get_grid_cell(card, 2)
            c_trans_5 = get_grid_cell(card, 3)
            record('F-cooldown-released-to-free',
                   c_free_5 == '12' and c_active_5 == '0' and c_trans_5 == '0',
                   f'free={c_free_5} active={c_active_5} trans={c_trans_5}')
        except Exception as e:  # noqa: BLE001
            record('F-cooldown-released-to-free', False, str(e))

        # -------- Legacy no-lock --------
        print('\n=== P0② Legacy staked 仓位可立即解押 ===')
        try:
            doge_card = staking_card_scope(page, 'DogeFather')
            doge_unstake = doge_card.locator(':scope button:has-text("Unstake")').first
            d_active = get_grid_cell(doge_card, 2)
            record('F-legacy-no-lock-unstake-immediate',
                   (not doge_unstake.is_disabled()) and d_active == '2',
                   f'enabled={not doge_unstake.is_disabled()} active={d_active!r}')
        except Exception as e:  # noqa: BLE001
            record('F-legacy-no-lock-unstake-immediate', False, str(e))

        # -------- Console errors --------
        record('F-no-browser-console-errors', len(console_errors) == 0,
               f'errors={len(console_errors)}')
        if console_errors:
            for e in console_errors[:6]:
                txt = e if isinstance(e, tuple) else (e.type, e.text)
                print('    CONSOLE:', txt)

        browser.close()

    print('\n' + '=' * 60)
    passed = sum(1 for _, ok, _ in results if ok)
    total = len(results)
    print(f'Summary: {passed}/{total} checks passed')
    for name, ok, detail in results:
        print(f'  {"✓" if ok else "✗"} {name}' + (f'  — {detail}' if detail else ''))
    return 0 if passed == total else 1


if __name__ == '__main__':
    sys.exit(main())
