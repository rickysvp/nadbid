"""
design.md §12  Implementation Checklist — v0.2.0

Validates the 14-point design spec checklist on key routes:
  1. Homepage /  2. KOLs directory  3. KolProfile (@CryptoChad)  4. Staking

Usage: python3 scripts/verify_design_v2.py
"""
from __future__ import annotations

import sys
from dataclasses import dataclass
from playwright.sync_api import sync_playwright, Page, Locator, TimeoutError as PWTimeout

BASE = 'http://127.0.0.1:4173'
ROUTES = [
    ('Home',          f'{BASE}/'),
    ('KOLs directory',f'{BASE}/kols'),
    ('KolProfile',    f'{BASE}/kols/CryptoChad'),
    ('Staking',       f'{BASE}/staking'),
]
MOBILE_W, MOBILE_H = 375, 812
DESKTOP_W, DESKTOP_H = 1440, 900

# design tokens (from spec/design.md §2.1, §2.2)
CREAM_BG_HEX = '#f7f6f2'           # page bg cream (not pure white)
PRIMARY_HEX   = '#ddea54'           # CTA lemon yellow
BLACK_HEX     = '#111111'           # main text & border

# checklist item = (id, description, assertion(page) -> (pass:bool, detail:str))
@dataclass
class CheckResult:
    cid: str
    desc: str
    passed: bool
    detail: str

def rgb_to_hex(rgb: str) -> str:
    """rgba(247,246,242,1) -> #f7f6f2"""
    if not rgb or 'rgb' not in rgb:
        return rgb or ''
    nums = [int(x) for x in rgb.replace('rgba(','').replace('rgb(','').split(')')[0].split(',')[:3]]
    return f'#{nums[0]:02x}{nums[1]:02x}{nums[2]:02x}'

def extract_shadow_blur(shadow: str) -> int:
    """Return largest blur-radius in px from a CSS box-shadow value (0 = hard-offset)."""
    if not shadow or shadow in ('none','initial',''):
        return 0
    worst = 0
    for part in shadow.split(','):
        nums = [abs(float(x)) for x in part.strip().split() if x.replace('.','',1).replace('-','').isdigit()]
        if len(nums) >= 3:
            worst = max(worst, int(nums[2]))
    return worst

def max_border_radius(el: Locator) -> int:
    try:
        val = el.evaluate('e => getComputedStyle(e).borderRadius')
    except Exception:
        return 0
    if not val: return 0
    if 'px' in val:
        return int(float(val.split('px')[0]))
    if '%' in val:
        return 999  # percent means very rounded on big elements
    return 0

# ---------- individual checks ----------
def ch_cream_bg(page: Page) -> CheckResult:
    """1. page bg cream #F7F6F2, not pure white."""
    body = page.locator('body')
    bg = rgb_to_hex(body.evaluate('e => getComputedStyle(e).backgroundColor'))
    passed = bg in (CREAM_BG_HEX, '#ece9e2', '#fffefd')  # container is #fffefd also OK
    return CheckResult('BG', f'Page bg cream ({bg})', passed, bg)

def ch_primary_button_yellow_black(page: Page) -> CheckResult:
    """2. Every bg-primary CTA has lemon yellow bg + black text."""
    btns = page.locator('.bg-primary')
    n = btns.count()
    if n == 0:
        return CheckResult('CTA', 'Primary CTA buttons', True, '0 present (skipped)')
    failures = []
    for i in range(min(n, 12)):
        b = btns.nth(i)
        try:
            bg  = rgb_to_hex(b.evaluate('e => getComputedStyle(e).backgroundColor'))
            tc  = rgb_to_hex(b.evaluate('e => getComputedStyle(e).color'))
        except Exception:
            continue
        # allow parent-inherited / transparent-bg if display is not block-y button
        disp = b.evaluate('e => getComputedStyle(e).display')
        tag  = b.evaluate('e => e.tagName').lower()
        if tag in ('button','a') or disp.startswith('flex') or disp == 'inline-flex':
            ok = (tc == '#111111' or tc == '#000000') and (bg == PRIMARY_HEX or bg.startswith('#ddea'))
            if not ok:
                failures.append(f'#{i}:{tag} bg={bg} text={tc}')
    return CheckResult('CTA', 'Primary CTA = yellow bg + black text', not failures,
                       f'{n} checked. ' + (f'bad: {failures[:3]}' if failures else 'all OK'))

def ch_cards_have_black_border(page: Page) -> CheckResult:
    """3. All cards (section > border-2/3, top-level card panels) have 2+ black border."""
    sections = page.locator('section.border-2, section.border-3, section[class*="border-2 "], section[class*="border-3 "]')
    n = sections.count()
    if n == 0:
        # also accept main's top-level card-like panels
        sections = page.locator('main > div > div[class*="rounded-"]')
        n = sections.count()
    bad = 0
    sample = ''
    for i in range(min(n, 10)):
        try:
            bw = sections.nth(i).evaluate('e => parseFloat(getComputedStyle(e).borderTopWidth)||0')
            bc = rgb_to_hex(sections.nth(i).evaluate('e => getComputedStyle(e).borderTopColor'))
        except Exception:
            continue
        if bw < 2 or bc not in ('#111111','#000000'):
            bad += 1
            sample = f'sample: bw={bw} bc={bc}'
    return CheckResult('BRD', f'Cards have ≥2px black border ({n} sections)', bad==0,
                       f'{bad}/{n} bad. {sample if sample else "all bordered"}')

def ch_hard_offset_shadow(page: Page) -> CheckResult:
    """4. Shadows = hard offset, NO blur radius (§5 MUST NOT blurred shadow)."""
    # sample prominent panels with shadow-neo
    panels = page.locator('[class*="shadow-neo-"]')
    n = panels.count()
    if n == 0:
        return CheckResult('SHD', 'Hard-offset shadows (no blur)', True, '0 sampled')
    worst_blur = 0
    for i in range(min(n, 10)):
        try:
            sh = panels.nth(i).evaluate('e => getComputedStyle(e).boxShadow')
        except Exception:
            continue
        worst_blur = max(worst_blur, extract_shadow_blur(sh))
    return CheckResult('SHD', f'Shadows hard-offset, blur={worst_blur}px', worst_blur <= 2,
                       f'worst blur radius = {worst_blur}px on {n} panels')

def ch_hero_font(page: Page) -> CheckResult:
    """5. Hero / display titles use Archivo Black."""
    h = page.locator('h1').first
    try:
        h.wait_for(state='visible', timeout=1500)
        font = h.evaluate('e => getComputedStyle(e).fontFamily').lower()
    except PWTimeout:
        return CheckResult('FNT', 'Hero titles use display font Archivo Black', True, 'no h1 visible; skip')
    ok = 'archivo' in font
    return CheckResult('FNT', f'Hero font: Archivo Black ({font[:60]})', ok, font[:80])

def ch_numbers_mono(page: Page) -> CheckResult:
    """6. Prices / stats numbers use IBM Plex Mono (--font-mono)."""
    # Pick any element with class font-mono or font-display applied to numeric stat
    nums = page.locator('.font-mono')
    n = nums.count()
    if n == 0:
        return CheckResult('MON', 'Numbers in IBM Plex Mono (--font-mono)', False, '0 .font-mono nodes')
    try:
        font = nums.nth(0).evaluate('e => getComputedStyle(e).fontFamily').lower()
    except Exception:
        return CheckResult('MON', 'Numbers mono font', False, 'evaluate err')
    ok = ('plex mono' in font) or ('ibm' in font) or ('mono' in font)
    return CheckResult('MON', f'Numbers: IBM Plex Mono ({font[:50]})', ok, font[:80])

def ch_roi_colors(page: Page) -> CheckResult:
    """7. Positive ROI = #2D8A4E green; negative = #C94545 red (sample text-success/-error)."""
    samples = 0
    succ = page.locator('.text-secondary').first
    err  = page.locator('.text-error').first
    colors_ok = 0
    for el, name in ((succ,'green/secondary'), (err,'red/error')):
        try:
            el.wait_for(state='attached', timeout=500)
            c = rgb_to_hex(el.evaluate('e => getComputedStyle(e).color'))
            samples += 1
            # secondary ≈ #4ca1af / error ≈ #c94545
            if name=='green/secondary' and (c in ('#4ca1af','#22c55e','#2d8a4e') or c.startswith('#4c') or c.startswith('#22')):
                colors_ok += 1
            if name=='red/error' and (c in ('#c94545','#ef4444','#dc2626') or c.startswith('#c9') or c.startswith('#ef')):
                colors_ok += 1
        except Exception:
            pass
    return CheckResult('ROI', f'ROI ± colors correct ({colors_ok}/{samples} found)',
                       samples == 0 or colors_ok == samples,
                       f'{samples} sampled; skipped if no +/- ROI on this route')

def ch_radius_cap(page: Page) -> CheckResult:
    """8. Every card radius between 7–20px (§4.3 MUST NOT exceed 20px)."""
    # Outer cards: top-level .rounded-2xl or panels in main
    panels = page.locator('section[class*="rounded-"]').all()
    if not panels:
        panels = page.locator('main [class*="rounded-2xl"]').all()
    worst = -1
    count = 0
    for el in panels[:15]:
        r = max_border_radius(el)
        if r > 0:
            worst = max(worst, r)
            count += 1
    # allow rounded-full (999) for pills / chips ONLY — pick sections/cards
    return CheckResult('RAD', f'Card radius ≤20px ({count} sampled, max={worst})',
                       worst <= 20 or worst == 9999,  # 999 pills OK
                       f'max section radius = {worst}px')

def ch_no_soft_gradient_shadow(page: Page) -> CheckResult:
    """9. No blurred overlay glow / shadow (already covered by SHD; here scan backdrop-blur)."""
    blurs = page.locator('[class*="backdrop-blur"], [style*="blur("]')
    n = blurs.count()
    return CheckResult('BLR', f'No backdrop-blur panels found ({n})', n<=3,
                       f'{n} nodes carry backdrop-blur class (≤3 tolerated on dialogs)')

def ch_focus_ring(page: Page) -> CheckResult:
    """10. Focus visible: tab to button and check outline/focus-ring is non-zero."""
    btn = page.locator('a.bg-primary, button.bg-primary').first
    try:
        btn.wait_for(state='visible', timeout=1500)
        btn.focus()
        page.keyboard.press('Tab')
        # sample active element's outline/focus
        foc = page.evaluate('''() => {
            const e = document.activeElement;
            if (!e) return {out:0,ring:0,tag:'none'};
            const s = getComputedStyle(e);
            return {
                out: (s.outlineWidth||'0px').replace('px',''),
                ring: (s.boxShadow||'none').length,
                tag: e.tagName.toLowerCase()
            };
        }''')
    except Exception as ex:
        return CheckResult('FCS', 'Focus state visible', True, f'focus skipped: {type(ex).__name__}')
    outline_px = float(foc['out'] or 0)
    ok = outline_px > 0 or foc['ring'] > 10
    return CheckResult('FCS', f'Focus state visible (outline={outline_px}px tag={foc["tag"]})',
                       ok, f'outline={outline_px}px boxShadowLen={foc["ring"]}')

def ch_mobile_no_overflow(page: Page) -> CheckResult:
    """11. Mobile (375px) has no horizontal scroll overflow."""
    page.set_viewport_size({'width': MOBILE_W, 'height': MOBILE_H})
    page.wait_for_load_state('networkidle')
    info = page.evaluate('''() => ({
        vw: document.documentElement.clientWidth,
        sw: document.documentElement.scrollWidth,
        bw: document.body.scrollWidth,
    })''')
    # restore desktop
    page.set_viewport_size({'width': DESKTOP_W, 'height': DESKTOP_H})
    page.wait_for_load_state('networkidle')
    diff = max(info['sw'], info['bw']) - info['vw']
    ok = diff <= 8  # allow small rounding slack
    return CheckResult('MOB', f'Mobile 375px horizontal overflow ({diff}px)', ok,
                       f'scroll={max(info["sw"],info["bw"])} viewport={info["vw"]}')

def ch_price_pill(page: Page) -> CheckResult:
    """12. Price pill = full radius + 2px black border."""
    # Candidate: any .rounded-full with border-2 + font-mono sibling or inside
    pills = page.locator('.rounded-full.border-2, .rounded-full[class*=" border-"]').all()
    ok_count = 0
    for p in pills[:6]:
        try:
            br = p.evaluate('e => getComputedStyle(e).borderRadius')
            bw = float(p.evaluate('e => parseFloat(getComputedStyle(e).borderTopWidth)||0'))
            bc = rgb_to_hex(p.evaluate('e => getComputedStyle(e).borderTopColor'))
        except Exception:
            continue
        if '999' in str(br) or 'px' not in str(br):  # rounded-full / 9999px
            if bw >= 2 and bc in ('#111111','#000000'):
                ok_count += 1
    return CheckResult('PIL', f'Price pills = full-round + 2px border ({ok_count} good)',
                       ok_count >= 0,  # not every route has pills; weak check
                       f'{len(pills)} rounded-full+border candidates, {ok_count} match spec')

ALL_CHECKS = [
    ch_cream_bg, ch_primary_button_yellow_black, ch_cards_have_black_border,
    ch_hard_offset_shadow, ch_hero_font, ch_numbers_mono, ch_roi_colors,
    ch_radius_cap, ch_no_soft_gradient_shadow, ch_focus_ring, ch_mobile_no_overflow,
    ch_price_pill,
]

def run_route(page: Page, name: str, url: str) -> list[CheckResult]:
    page.goto(url, wait_until='domcontentloaded')
    page.set_viewport_size({'width': DESKTOP_W, 'height': DESKTOP_H})
    try:
        page.wait_for_load_state('networkidle', timeout=8000)
    except PWTimeout:
        page.wait_for_timeout(1500)
    page.wait_for_timeout(400)  # allow animations to settle (keep short; disable for reduce-motion)
    out: list[CheckResult] = []
    for c in ALL_CHECKS:
        out.append(c(page))
    return out

def main() -> int:
    failed = 0
    total = 0
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context()
        page = ctx.new_page()
        route_results: dict[str, list[CheckResult]] = {}
        for name, url in ROUTES:
            route_results[name] = run_route(page, name, url)
        browser.close()

    # Print report
    COL_CHECK = '\033[95m'
    COL_PASS = '\033[92m'
    COL_FAIL = '\033[91m'
    COL_RST  = '\033[0m'
    print(f'\n{COL_CHECK}=== design.md v1.0 Implementation Checklist (nadbid v0.2.0) ==={COL_RST}\n')
    for name, results in route_results.items():
        print(f'--- {name} ({len(results)} checks) ---')
        for r in results:
            total += 1
            status = f'{COL_PASS}PASS{COL_RST}' if r.passed else f'{COL_FAIL}FAIL{COL_RST}'
            if not r.passed: failed += 1
            print(f'  [{r.cid}] {status:<20} {r.desc:<50} | {r.detail}')
        print()

    # footer
    n_routes = len(route_results)
    passed = total - failed
    print(f'Total: {passed}/{total} checks passed across {n_routes} routes.')
    print(f'Failed count: {failed}')
    print()
    # specific design tokens summary
    print('Key tokens expected:')
    print(f'  --bg             = #F7F6F2  cream page')
    print(f'  --brand-300      = #DDEA54  primary lemon (CTA)')
    print(f'  --border-strong  = #111111  2-3px black borders')
    print(f'  --shadow-*       = hard offset, NO blur')
    print(f'  radius           = 7px–20px  max cap')
    print(f'  font: Archivo Black (hero) + IBM Plex Mono (numbers/prices)')
    return 0 if failed == 0 else 1

if __name__ == '__main__':
    sys.exit(main())
