"""Visual analysis script using Playwright."""
import asyncio
import json
import os
from pathlib import Path
from playwright.async_api import async_playwright


async def capture_screenshots(url: str, output_dir: str):
    """Capture screenshots at different viewports and gather page info."""

    output_path = Path(output_dir)
    screenshots_path = output_path / "screenshots"
    screenshots_path.mkdir(parents=True, exist_ok=True)

    results = {
        "url": url,
        "viewports": {},
        "page_info": {}
    }

    async with async_playwright() as p:
        browser = await p.chromium.launch()

        # Desktop viewport
        desktop_context = await browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )
        desktop_page = await desktop_context.new_page()

        print(f"Loading {url} (desktop)...")
        await desktop_page.goto(url, wait_until="networkidle", timeout=30000)
        await desktop_page.wait_for_timeout(2000)  # Wait for any animations

        # Capture desktop screenshot
        desktop_screenshot_path = screenshots_path / "desktop.png"
        await desktop_page.screenshot(path=str(desktop_screenshot_path), full_page=False)
        print(f"Desktop screenshot saved to {desktop_screenshot_path}")

        # Get page info from desktop view
        page_info = await desktop_page.evaluate("""
            () => {
                const getVisibleElements = () => {
                    const h1 = document.querySelector('h1');
                    const buttons = Array.from(document.querySelectorAll('button, a.btn, a[role="button"]'));
                    const images = Array.from(document.querySelectorAll('img'));

                    const isVisible = (el) => {
                        if (!el) return false;
                        const rect = el.getBoundingClientRect();
                        return rect.top < window.innerHeight && rect.bottom > 0 && rect.left < window.innerWidth && rect.right > 0;
                    };

                    return {
                        h1: h1 ? {
                            text: h1.innerText,
                            visible: isVisible(h1),
                            top: h1.getBoundingClientRect().top
                        } : null,
                        ctaButtons: buttons.slice(0, 5).map(btn => ({
                            text: btn.innerText || btn.textContent,
                            visible: isVisible(btn),
                            top: btn.getBoundingClientRect().top
                        })),
                        images: images.slice(0, 5).map(img => ({
                            alt: img.alt,
                            src: img.src.substring(0, 100),
                            visible: isVisible(img),
                            loaded: img.complete
                        }))
                    };
                };

                return {
                    title: document.title,
                    viewport: {
                        width: window.innerWidth,
                        height: window.innerHeight,
                        scrollHeight: document.documentElement.scrollHeight
                    },
                    aboveFold: getVisibleElements(),
                    meta: {
                        description: document.querySelector('meta[name="description"]')?.content || '',
                        ogImage: document.querySelector('meta[property="og:image"]')?.content || ''
                    }
                };
            }
        """)
        results["page_info"]["desktop"] = page_info

        await desktop_context.close()

        # Mobile viewport (iPhone 12/13)
        mobile_context = await browser.new_context(
            viewport={"width": 375, "height": 812},
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15",
            is_mobile=True,
            has_touch=True
        )
        mobile_page = await mobile_context.new_page()

        print(f"Loading {url} (mobile)...")
        await mobile_page.goto(url, wait_until="networkidle", timeout=30000)
        await mobile_page.wait_for_timeout(2000)

        # Capture mobile screenshot
        mobile_screenshot_path = screenshots_path / "mobile.png"
        await mobile_page.screenshot(path=str(mobile_screenshot_path), full_page=False)
        print(f"Mobile screenshot saved to {mobile_screenshot_path}")

        # Get mobile-specific info
        mobile_info = await mobile_page.evaluate("""
            () => {
                const nav = document.querySelector('nav');
                const hamburger = document.querySelector('[class*="hamburger"], [class*="menu-toggle"], button[aria-label*="menu" i]');

                return {
                    viewport: {
                        width: window.innerWidth,
                        height: window.innerHeight,
                        scrollWidth: document.documentElement.scrollWidth
                    },
                    navigation: {
                        hasHamburger: !!hamburger,
                        navVisible: nav ? nav.getBoundingClientRect().height > 0 : false
                    },
                    horizontalScroll: document.documentElement.scrollWidth > window.innerWidth,
                    fontSizeBase: getComputedStyle(document.body).fontSize
                };
            }
        """)
        results["page_info"]["mobile"] = mobile_info

        await mobile_context.close()
        await browser.close()

    # Save results
    results_path = output_path / "visual_analysis_data.json"
    with open(results_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"Analysis data saved to {results_path}")

    return results


if __name__ == "__main__":
    import sys

    url = sys.argv[1] if len(sys.argv) > 1 else "https://instafollowtracker.com"
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "C:/Users/tushr/instagram-follower-analyzer/visual_output"

    results = asyncio.run(capture_screenshots(url, output_dir))
    print("\n=== Analysis Complete ===")
    print(json.dumps(results, indent=2))
