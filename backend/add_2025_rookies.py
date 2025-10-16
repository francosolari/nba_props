import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nba_predictions.settings')
import django
django.setup()

from predictions.models import Player


# 2025 NBA Draft - All 59 picks from https://www.nba.com/news/2025-nba-draft-order
ROOKIES_2025 = [
    # First Round (1-30)
    "Cooper Flagg",
    "Dylan Harper",
    "VJ Edgecombe",
    "Kon Knueppel",
    "Ace Bailey",
    "Tre Johnson",
    "Jeremiah Fears",
    "Egor Demin",
    "Collin Murray-Boyles",
    "Khaman Maluach",
    "Cedric Coward",
    "Noa Essengue",
    "Derik Queen",
    "Carter Bryant",
    "Thomas Sorber",
    "Yang Hansen",
    "Joan Beringer",
    "Walter Clayton Jr.",
    "Nolan Traoré",
    "Kasparas Jakučionis",
    "Will Riley",
    "Drake Powell",
    "Asa Newell",
    "Nique Clifford",
    "Jase Richardson",
    "Ben Saraf",
    "Danny Wolf",
    "Hugo González",
    "Liam McNeeley",
    "Yanic Konan Niederhauser",
    # Second Round (31-59)
    "Rasheer Fleming",
    "Noah Penda",
    "Sion James",
    "Ryan Kalkbrenner",
    "Johni Broome",
    "Adou Thiero",
    "Chaz Lanier",
    "Kam Jones",
    "Alijah Martin",
    "Micah Peavy",
    "Koby Brea",
    "Maxime Raynaud",
    "Jamir Watkins",
    "Brooks Barnhizer",
    "Rocco Zikarsky",
    "Amari Williams",
    "Bogoljub Marković",
    "Javon Small",
    "Tyrese Proctor",
    "Kobe Sanders",
    "Mohamed Diawara",
    "Alex Toohey",
    "John Tonje",
    "Taelon Peter",
    "Lachlan Olbrich",
    "Will Richard",
    "Max Shulga",
    "Saliou Niang",
    "Jahmai Mashack",
]


def add_rookies_to_database(rookies):
    """
    Adds rookie players to the database.
    """
    added_count = 0
    updated_count = 0

    print(f"\n{'=' * 60}")
    print(f"Adding {len(rookies)} rookies to database...")
    print(f"{'=' * 60}\n")

    for idx, name in enumerate(rookies, 1):
        try:
            player, created = Player.objects.get_or_create(
                name=name
            )

            if created:
                added_count += 1
                print(f"{idx:2d}. ✓ Added rookie: {name}")
            else:
                updated_count += 1
                print(f"{idx:2d}. - Already exists: {name}")

        except Exception as e:
            print(f"{idx:2d}. ✗ Error adding {name}: {e}")

    return added_count, updated_count


def main():
    print("=" * 60)
    print("2025 NBA Draft Rookies - Database Update Script")
    print("=" * 60)
    print(f"Source: https://www.nba.com/news/2025-nba-draft-order")
    print(f"Total rookies to add: {len(ROOKIES_2025)}")
    print(f"{'=' * 60}")

    # Add to database
    added, updated = add_rookies_to_database(ROOKIES_2025)

    print(f"\n{'=' * 60}")
    print(f"Summary:")
    print(f"  New rookies added: {added}")
    print(f"  Already existed: {updated}")
    print(f"  Total processed: {len(ROOKIES_2025)}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
