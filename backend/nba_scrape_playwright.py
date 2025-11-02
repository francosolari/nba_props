"""
NBA Award Odds Scraper using Playwright

This script scrapes DraftKings for NBA award odds (MVP, ROTY, etc.) and saves
them to Google Sheets. Uses Playwright for better JavaScript rendering and
bot detection avoidance compared to Selenium.

Usage:
    python nba_scrape_playwright.py

Requirements:
    - playwright
    - google-api-python-client
    - google-auth

Install:
    pip install playwright google-api-python-client google-auth
    playwright install chromium

Note: This is for LOCAL USE ONLY. Online servers may have NBA API or scraping
      domains blocked. Run this script locally and manually update data.
"""

import os
import random
import time
from datetime import datetime
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

# Award configurations
AWARD_CONFIGS = [
    {
        'slug': 'rookie-of-the-year',
        'name': 'Rookie of the Year',
        'url_fragment': 'rookie-of-the-year'
    },
    {
        'slug': 'most-improved-player',
        'name': 'Most Improved Player',
        'url_fragment': 'most-improved-player'
    },
    {
        'slug': 'regular-season-mvp',
        'name': 'Regular Season MVP',
        'url_fragment': 'regular-season-mvp'
    },
    {
        'slug': '6th-man-of-the-year',
        'name': '6th Man of the Year',
        'url_fragment': '6th-man-of-the-year'
    },
    {
        'slug': 'defensive-player-of-the-year',
        'name': 'Defensive Player of the Year',
        'url_fragment': 'defensive-player-of-the-year'
    },
    {
        'slug': 'clutch-player-award',
        'name': 'Clutch Player of the Year',
        'url_fragment': 'clutch-player-award'
    }
]

# Google Sheets configuration
SPREADSHEET_ID = '1hQogeEpeolTb5jrK__Qdat34snmtKyaQZTtHderj558'
SHEET_RANGE = 'awards_odds_raw!A:C'
CREDENTIALS_PATH = 'api_key/emerald-ivy-368015-6b456a8b0473.json'


def setup_browser(playwright):
    """
    Launch browser with stealth settings to avoid detection.
    """
    browser = playwright.chromium.launch(
        headless=True,
        args=[
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-dev-shm-usage',
        ]
    )

    context = browser.new_context(
        viewport={'width': 1920, 'height': 1080},
        user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        locale='en-US',
        timezone_id='America/New_York',
    )

    # Add extra headers to appear more human
    context.set_extra_http_headers({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
    })

    return browser, context


def scrape_award_odds(page, award_config):
    """
    Scrape odds for a specific award from DraftKings.

    Args:
        page: Playwright page object
        award_config: Dictionary with award configuration

    Returns:
        List of dictionaries with player and odds data
    """
    url = f"https://sportsbook.draftkings.com/leagues/basketball/nba?category=awards&subcategory={award_config['url_fragment']}"

    print(f"Scraping {award_config['name']} from {url}")

    try:
        # Navigate to the page
        page.goto(url, wait_until='domcontentloaded', timeout=30000)

        # Wait for content to load
        time.sleep(random.uniform(3, 5))

        # Try multiple selectors as DraftKings may change their structure
        player_odds = []

        try:
            # Wait for the odds containers
            page.wait_for_selector('div.sportsbook-outcome-cell__label', timeout=10000)

            # Extract player names
            player_elements = page.query_selector_all('div.sportsbook-outcome-cell__label')
            player_names = [elem.text_content().strip() for elem in player_elements]

            # Extract odds
            odds_elements = page.query_selector_all('span.sportsbook-odds')
            odds_values = [elem.text_content().strip() for elem in odds_elements]

            # Combine player names with odds
            player_odds = [
                {'player': player, 'odd': odd}
                for player, odd in zip(player_names, odds_values)
                if player and odd
            ]

            print(f"Found {len(player_odds)} players for {award_config['name']}")

        except PlaywrightTimeout:
            print(f"Timeout waiting for odds elements on {award_config['name']}")
            # Try alternative selectors
            try:
                # Look for any text that looks like odds (e.g., +500, -200)
                all_text = page.locator('text=/[+-]\\d+/').all_text_contents()
                print(f"Found {len(all_text)} potential odds values (alternative method)")
            except Exception as e:
                print(f"Alternative scraping method also failed: {e}")

        return player_odds

    except Exception as e:
        print(f"Error scraping {award_config['name']}: {e}")
        return []


def save_to_google_sheets(all_award_data):
    """
    Save scraped data to Google Sheets.

    Args:
        all_award_data: List of dictionaries with award data
    """
    try:
        # Initialize Google Sheets API
        scopes = ["https://www.googleapis.com/auth/spreadsheets"]
        credentials = Credentials.from_service_account_file(CREDENTIALS_PATH, scopes=scopes)
        service = build('sheets', 'v4', credentials=credentials)
        sheet = service.spreadsheets()

        # Prepare data for sheets
        formatted_data = [["Award Category", "Nominee", "Odds", "Scraped Date"]]

        scrape_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        for award in all_award_data:
            for nominee in award['nominees']:
                formatted_data.append([
                    award['award_name'],
                    nominee['player'],
                    nominee['odd'],
                    scrape_date
                ])

        print(f"\nFormatted {len(formatted_data) - 1} rows for Google Sheets")

        # Clear existing data
        print("Clearing existing data in Google Sheets...")
        clear_action = sheet.values().clear(
            spreadsheetId=SPREADSHEET_ID,
            range=SHEET_RANGE
        ).execute()

        # Write new data
        print("Writing new data to Google Sheets...")
        body = {'values': formatted_data}
        result = sheet.values().append(
            spreadsheetId=SPREADSHEET_ID,
            range="awards_odds_raw!A1",
            body=body,
            valueInputOption="RAW"
        ).execute()

        print(f"✓ Successfully updated {result.get('updates').get('updatedCells')} cells in Google Sheets")

    except FileNotFoundError:
        print(f"ERROR: Credentials file not found at {CREDENTIALS_PATH}")
        print("Make sure you have the Google API credentials file in place.")
    except Exception as e:
        print(f"Error saving to Google Sheets: {e}")


def main():
    """
    Main scraping function.
    """
    print("=" * 60)
    print("NBA Award Odds Scraper - Playwright Edition")
    print("=" * 60)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    all_award_data = []

    with sync_playwright() as playwright:
        browser, context = setup_browser(playwright)
        page = context.new_page()

        try:
            for i, award_config in enumerate(AWARD_CONFIGS):
                print(f"\n[{i + 1}/{len(AWARD_CONFIGS)}] Processing {award_config['name']}...")

                # Scrape the award
                player_odds = scrape_award_odds(page, award_config)

                if player_odds:
                    all_award_data.append({
                        'award_name': award_config['name'],
                        'nominees': player_odds
                    })
                    print(f"  ✓ Successfully scraped {len(player_odds)} entries")
                else:
                    print(f"  ✗ No data found for {award_config['name']}")

                # Random delay between requests to be polite
                if i < len(AWARD_CONFIGS) - 1:
                    delay = random.uniform(2, 4)
                    print(f"  Waiting {delay:.1f}s before next request...")
                    time.sleep(delay)

        finally:
            context.close()
            browser.close()

    print("\n" + "=" * 60)
    print(f"Scraping Summary:")
    print(f"  Total awards processed: {len(AWARD_CONFIGS)}")
    print(f"  Successful: {len(all_award_data)}")
    print(f"  Failed: {len(AWARD_CONFIGS) - len(all_award_data)}")
    print("=" * 60)

    if all_award_data:
        print("\nSaving data to Google Sheets...")
        save_to_google_sheets(all_award_data)
    else:
        print("\nNo data to save. Scraping may have failed.")

    print(f"\nCompleted at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)


if __name__ == "__main__":
    main()
