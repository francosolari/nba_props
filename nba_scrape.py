import random

from selenium import webdriver
from selenium.webdriver.common.by import By
import time
import undetected_chromedriver as uc
import sys
from random_user_agent.user_agent import UserAgent
from random_user_agent.params import SoftwareName, OperatingSystem
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

chrome_options = webdriver.ChromeOptions()

software_names = [SoftwareName.CHROME.value]
operating_systems = [OperatingSystem.WINDOWS.value, OperatingSystem.LINUX.value]

user_agent_rotator = UserAgent(software_names=software_names, operating_systems=operating_systems, limit=100)

user_agent = user_agent_rotator.get_random_user_agent()
print(user_agent)
chrome_options.add_argument("--headless")
# chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--window-size=1420,1080")
# chrome_options.add_argument("--disable-gpu")
chrome_options.add_argument(f'user-agent={user_agent}')

# Enable JavaScript
chrome_options.add_argument("--enable-javascript")
# chrome_options.add_argument(f"user-agent={user_agent}")

# Initialize Chrome WebDriver
driver = uc.Chrome(headless=True,
                   options=chrome_options
                   )
# driver.get('https://www.bovada.lv/sports/basketball/nba-awards/futures-odd')
award_string = ['rookie-of-the-year',
                'most-improved-player',
                'regular-season-mvp',
                '6th-man-of-the-year',
                'defensive-player-of-the-year',
                'clutch-player-award']

award_dict = {
    'rookie-of-the-year': 'Rookie of the Year',
    'most-improved-player': 'Most Improved Player',
    'regular-season-mvp': 'Regular Season MVP',
    '6th-man-of-the-year': '6th Man of the Year',
    'defensive-player-of-the-year': 'Defensive Player of the Year',
    'clutch-player-award': 'Clutch Player of the Year'
}

all_award_data = []

for award in award_string:
    print(f"Scraping DraftKings for the {award_dict[award]} award")
    driver.get(f"https://sportsbook.draftkings.com/leagues/basketball/nba?category=awards&subcategory={award}")
    print(f"https://sportsbook.draftkings.com/leagues/basketball/nba?category=awards&subcategory={award}")
    time.sleep(random.randint(0, 3))
    # Identify all score containers which hold each award category and its details.
    award_containers = driver.find_elements(By.CSS_SELECTOR, "div.sportsbook-event-accordion__children-wrapper")
    # print(award_containers)
    # award_containers = driver.find_elements(By.CSS_SELECTOR, "div.sportsbook-outcome-cell")

    player_odds = []
    for container in award_containers:
        # Within the container, extract the nominees.
        player_elements = container.find_elements(By.CLASS_NAME, "sportsbook-outcome-cell__label")
        player_names = [element.text for element in player_elements]
        print(f"player_names: {player_names}")
        # Within the container, extract the odds.
        odds_elements = container.find_elements(By.CLASS_NAME, "sportsbook-outcome-cell__elements")
        odds_names = [element.text for element in odds_elements]

        # Group the players and odds for this award category.
        player_odds = [{'player': player, 'odd': odd} for player, odd in zip(player_names, odds_names)]
        print(player_odds)
        # Store this award's data.

    award_name = award_dict[award]
    all_award_data.append({
        'award_name': award_name,
        'nominees': player_odds
    })
print(f"award data all: {all_award_data}")
# all_award_data = []
# sys.exit(0)
# # Process each award container.
# for container in award_containers:
#     print(container)
#     award_name = container.find_element(By.CSS_SELECTOR, "h3.market-name").text
#     # print(award_name)
#     # Within the container, extract the nominees.
#     player_elements = container.find_elements(By.CSS_SELECTOR, '.outcomes')
#     player_names = [element.text for element in player_elements]
#
#     # Within the container, extract the odds.
#     odds_elements = container.find_elements(By.CSS_SELECTOR, '.bet-price')
#     odds_names = [element.text for element in odds_elements]
#
#     # Group the players and odds for this award category.
#     player_odds = [{'player': player, 'odd': odd} for player, odd in zip(player_names, odds_names)]
#     # print(player_odds)
#     # Store this award's data.
#     all_award_data.append({
#         'award_name': award_name,
#         'nominees':player_odds
#     })
# print(f"award data all: {all_award_data}")
# sys.exit(0)
#         # Add delay to ensure JavaScript content loads (adjust as needed)
# time.sleep(3)
# # Scrape data (replace with actual element identifiers)
# awards_elements = driver.find_elements(By.CSS_SELECTOR,"h3.market-name")
# print(awards_elements)
# print(awards_elements[0])
# print(awards_elements[0].text)
# awards_names = [element.text for element in awards_elements]
# print(awards_names)
# time.sleep(3)
# player_elements = driver.find_elements(By.CSS_SELECTOR, '.outcomes')
# player_names = [element.text for element in player_elements]
# print(player_names)
# # time.sleep(6)
# odds_elements = driver.find_elements(By.CSS_SELECTOR, '.bet-price')
# odds_names = [element.text for element in odds_elements]
# print(odds_names)
# # time.sleep(4)
# player_odds = []
#
# # driver.quit()
# # Extract the text from the elements and store in the list
# for player, odd in zip(player_elements, odds_elements):
#     player_odds.append({
#         'player': player.text,
#         'odd': odd.text
#     })
# # print(player_odds)
# for item in player_odds:
#     print(item)

# Close the browser

# Prepare the data for Google Sheets
formatted_data = [["Award Category", "Nominee", "Odds"]]

# Header

# Loop through each award category
for award in all_award_data:
    for nominee in award['nominees']:
        formatted_data.append([award['award_name'], nominee['player'], nominee['odd']])

print(f"formatted_data {formatted_data}")
#
# Initialize the Sheets API client
scopes = ["https://www.googleapis.com/auth/spreadsheets"]
credentials = Credentials.from_service_account_file('api_key/emerald-ivy-368015-6b456a8b0473.json', scopes=scopes)
service = build('sheets', 'v4', credentials=credentials)

# The ID of your Google Sheet; can be taken from the URL
SPREADSHEET_ID = '1hQogeEpeolTb5jrK__Qdat34snmtKyaQZTtHderj558'

sheet = service.spreadsheets()
# Clearing Sheet
clear_action = sheet.values().clear(
    spreadsheetId=SPREADSHEET_ID,
    range="awards_odds_raw!A:C"
).execute()
# Write values to Google Sheets
    body = {'values': formatted_data}
    result = sheet.values().append(
        spreadsheetId=SPREADSHEET_ID, range="awards_odds_raw!A1",
        body=body, valueInputOption="RAW").execute()

print(f"{result.get('updates').get('updatedCells')} cells updated.")
