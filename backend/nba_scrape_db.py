"""
NBA Award Odds Scraper - Database Edition

This script scrapes DraftKings for NBA award odds and saves them to the database.
Also exports a CSV backup for monitoring.

Usage:
    python nba_scrape_db.py [--season-slug SLUG]

Requirements:
    - playwright
    - Django environment

Install:
    pip install playwright
    playwright install chromium

Note: This is for LOCAL USE ONLY. Run this script locally and the data will
      be saved to your database. The scraper updates:
      1. Odds model (historical tracking)
      2. SuperlativeQuestion leader/runner-up fields
      3. CSV backup in backend/odds_data/
"""

import os
import sys
import random
import time
import csv
from datetime import datetime
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nba_predictions.settings')
import django
django.setup()

from predictions.models import Award, Player, Season, Odds, SuperlativeQuestion

# Award configurations
AWARD_CONFIGS = [
    {
        'slug': 'rookie-of-the-year',
        'name': 'Rookie of the Year',
        'url_fragment': 'rookie-of-the-year',
        'award_name_db': 'Rookie of the Year'
    },
    {
        'slug': 'most-improved-player',
        'name': 'Most Improved Player',
        'url_fragment': 'most-improved-player',
        'award_name_db': 'Most Improved Player'
    },
    {
        'slug': 'regular-season-mvp',
        'name': 'Regular Season MVP',
        'url_fragment': 'regular-season-mvp',
        'award_name_db': 'Most Valuable Player'
    },
    {
        'slug': '6th-man-of-the-year',
        'name': '6th Man of the Year',
        'url_fragment': '6th-man-of-the-year',
        'award_name_db': 'Sixth Man of the Year'
    },
    {
        'slug': 'defensive-player-of-the-year',
        'name': 'Defensive Player of the Year',
        'url_fragment': 'defensive-player-of-the-year',
        'award_name_db': 'Defensive Player of the Year'
    },
    {
        'slug': 'clutch-player-award',
        'name': 'Clutch Player of the Year',
        'url_fragment': 'clutch-player-award',
        'award_name_db': 'Clutch Player of the Year'
    }
]


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

    context.set_extra_http_headers({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    })

    return browser, context


def scrape_award_odds(page, award_config):
    """
    Scrape odds for a specific award from DraftKings.
    """
    url = f"https://sportsbook.draftkings.com/leagues/basketball/nba?category=awards&subcategory={award_config['url_fragment']}"

    print(f"  Scraping {award_config['name']} from {url}")

    try:
        page.goto(url, wait_until='domcontentloaded', timeout=30000)
        time.sleep(random.uniform(3, 5))

        player_odds = []

        try:
            page.wait_for_selector('div.sportsbook-outcome-cell__label', timeout=10000)

            # Extract player names
            player_elements = page.query_selector_all('div.sportsbook-outcome-cell__label')
            player_names = [elem.text_content().strip() for elem in player_elements]

            # Extract odds
            odds_elements = page.query_selector_all('span.sportsbook-odds')
            odds_values = [elem.text_content().strip() for elem in odds_elements]

            # Combine with rank
            player_odds = [
                {'player': player, 'odds': odd, 'rank': idx + 1}
                for idx, (player, odd) in enumerate(zip(player_names, odds_values))
                if player and odd
            ]

            print(f"    Found {len(player_odds)} players")

        except PlaywrightTimeout:
            print(f"    Timeout waiting for odds elements")

        return player_odds

    except Exception as e:
        print(f"    Error: {e}")
        return []


def save_to_database(all_award_data, season):
    """
    Save scraped odds to database.

    Args:
        all_award_data: List of dicts with award odds data
        season: Season object
    """
    total_saved = 0
    total_updated_questions = 0

    for award_data in all_award_data:
        award_name = award_data['award_name_db']
        nominees = award_data['nominees']

        # Get or create award
        try:
            award, created = Award.objects.get_or_create(name=award_name)
            if created:
                print(f"  Created new award: {award_name}")
        except Exception as e:
            print(f"  Error getting award '{award_name}': {e}")
            continue

        # Save odds for each player
        for nominee in nominees:
            player_name = nominee['player']
            odds_value = nominee['odds']
            rank = nominee['rank']

            # Get or create player
            try:
                player, created = Player.objects.get_or_create(name=player_name)
                if created:
                    print(f"    Created new player: {player_name}")
            except Exception as e:
                print(f"    Error getting player '{player_name}': {e}")
                continue

            # Create Odds entry
            try:
                odds_obj = Odds.objects.create(
                    player=player,
                    award=award,
                    season=season,
                    odds_value=odds_value,
                    rank=rank,
                    source='DraftKings'
                )
                total_saved += 1
            except Exception as e:
                print(f"    Error saving odds for {player_name}: {e}")

        # Update SuperlativeQuestion for this award if it exists
        try:
            superlative_q = SuperlativeQuestion.objects.filter(
                award=award,
                season=season
            ).first()

            if superlative_q:
                superlative_q.update_from_latest_odds()
                total_updated_questions += 1
                print(f"  Updated question: {superlative_q.text}")
                print(f"    Leader: {superlative_q.current_leader} ({superlative_q.current_leader_odds})")
                if superlative_q.current_runner_up:
                    print(f"    Runner-up: {superlative_q.current_runner_up} ({superlative_q.current_runner_up_odds})")
        except Exception as e:
            print(f"  Error updating SuperlativeQuestion: {e}")

    return total_saved, total_updated_questions


def save_to_csv(all_award_data, season):
    """
    Save odds data to CSV for monitoring.
    """
    # Create odds_data directory if it doesn't exist
    csv_dir = Path(__file__).parent / 'odds_data'
    csv_dir.mkdir(exist_ok=True)

    # Create filename with timestamp
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    csv_path = csv_dir / f'nba_odds_{season.slug}_{timestamp}.csv'

    with open(csv_path, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(['Award', 'Player', 'Odds', 'Rank', 'Scraped At'])

        for award_data in all_award_data:
            for nominee in award_data['nominees']:
                writer.writerow([
                    award_data['display_name'],
                    nominee['player'],
                    nominee['odds'],
                    nominee['rank'],
                    datetime.now().isoformat()
                ])

    print(f"\n  CSV backup saved: {csv_path}")
    return csv_path


def main(season_slug='current'):
    """
    Main scraping function.
    """
    print("=" * 60)
    print("NBA Award Odds Scraper - Database Edition")
    print("=" * 60)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    # Get season
    if season_slug == 'current':
        season = Season.objects.order_by('-start_date').first()
        if not season:
            print("ERROR: No season found in database")
            return
    else:
        try:
            season = Season.objects.get(slug=season_slug)
        except Season.DoesNotExist:
            print(f"ERROR: Season '{season_slug}' not found")
            return

    print(f"Season: {season.year} ({season.slug})\n")

    all_award_data = []

    with sync_playwright() as playwright:
        browser, context = setup_browser(playwright)
        page = context.new_page()

        try:
            for i, award_config in enumerate(AWARD_CONFIGS):
                print(f"[{i + 1}/{len(AWARD_CONFIGS)}] {award_config['name']}")

                player_odds = scrape_award_odds(page, award_config)

                if player_odds:
                    all_award_data.append({
                        'award_name_db': award_config['award_name_db'],
                        'display_name': award_config['name'],
                        'nominees': player_odds
                    })
                else:
                    print(f"    ✗ No data found")

                # Delay between requests
                if i < len(AWARD_CONFIGS) - 1:
                    delay = random.uniform(2, 4)
                    time.sleep(delay)

        finally:
            context.close()
            browser.close()

    print("\n" + "=" * 60)
    print("Scraping Summary:")
    print(f"  Awards processed: {len(AWARD_CONFIGS)}")
    print(f"  Successful: {len(all_award_data)}")
    print("=" * 60)

    if all_award_data:
        print("\nSaving to database...")
        total_odds, total_questions = save_to_database(all_award_data, season)
        print(f"  Saved {total_odds} odds entries")
        print(f"  Updated {total_questions} questions")

        print("\nSaving CSV backup...")
        csv_path = save_to_csv(all_award_data, season)
    else:
        print("\nNo data to save.")

    print(f"\nCompleted at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='Scrape NBA award odds to database')
    parser.add_argument(
        '--season-slug',
        default='current',
        help='Season slug (default: current)'
    )

    args = parser.parse_args()
    main(args.season_slug)
