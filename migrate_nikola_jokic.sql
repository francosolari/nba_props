-- Migration Script: Consolidate Nikola Jokic Player Records
-- Date: 2025-10-21
--
-- SUMMARY:
-- - Player ID 239: "Nikola Jokic" (old spelling, has data)
-- - Player ID 647: "Nikola Jokić" (correct spelling with special character - KEEP THIS)
-- - Player ID 726: "Nikola Jokic" (duplicate, no data)
--
-- AFFECTED DATA:
-- - 10 user answers in predictions_answer table reference player ID 239
-- - 2 superlative_winners entries reference player ID 239
-- - 1 superlative_winners entry already references player ID 647 (keep as is)
-- - 0 references to player ID 726
--
-- ACTION: Migrate all references from ID 239 → ID 647, then delete IDs 239 and 726

BEGIN;

-- Step 1: Update all answers from player ID 239 to 647
UPDATE predictions_answer
SET answer = '647'
WHERE answer = '239';

-- Step 2: Update superlative_winners from player ID 239 to 647
UPDATE predictions_superlativequestion_winners
SET player_id = 647
WHERE player_id = 239;

-- Step 3: Verify the updates
DO $$
DECLARE
    old_answer_count INTEGER;
    new_answer_count INTEGER;
    old_winners_count INTEGER;
    new_winners_count INTEGER;
BEGIN
    -- Check answers
    SELECT COUNT(*) INTO old_answer_count FROM predictions_answer WHERE answer = '239';
    SELECT COUNT(*) INTO new_answer_count FROM predictions_answer WHERE answer = '647';

    -- Check superlative winners
    SELECT COUNT(*) INTO old_winners_count FROM predictions_superlativequestion_winners WHERE player_id = 239;
    SELECT COUNT(*) INTO new_winners_count FROM predictions_superlativequestion_winners WHERE player_id = 647;

    RAISE NOTICE 'After migration:';
    RAISE NOTICE '  Answers - Old ID 239: %, New ID 647: %', old_answer_count, new_answer_count;
    RAISE NOTICE '  Winners - Old ID 239: %, New ID 647: %', old_winners_count, new_winners_count;

    IF old_answer_count > 0 THEN
        RAISE EXCEPTION 'Migration failed: Still found % answer references to old player ID 239', old_answer_count;
    END IF;

    IF old_winners_count > 0 THEN
        RAISE EXCEPTION 'Migration failed: Still found % winner references to old player ID 239', old_winners_count;
    END IF;

    IF new_answer_count != 10 THEN
        RAISE WARNING 'Expected 10 total answer references to ID 647, but found %', new_answer_count;
    END IF;

    IF new_winners_count != 3 THEN  -- 2 from ID 239 + 1 existing = 3 total
        RAISE WARNING 'Expected 3 total winner references to ID 647, but found %', new_winners_count;
    END IF;
END $$;

-- Step 4: Delete the old player records
DELETE FROM predictions_player WHERE id IN (239, 726);

-- Step 5: Final verification
DO $$
DECLARE
    player_count INTEGER;
    remaining_player_name TEXT;
BEGIN
    SELECT COUNT(*) INTO player_count
    FROM predictions_player
    WHERE id IN (239, 647, 726);

    SELECT name INTO remaining_player_name
    FROM predictions_player
    WHERE id = 647;

    IF player_count != 1 THEN
        RAISE EXCEPTION 'Expected 1 player record after cleanup, found %', player_count;
    END IF;

    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Remaining player: ID 647 = "%"', remaining_player_name;
END $$;

-- If everything looks good, commit the transaction
COMMIT;

-- If there are any issues, you can run: ROLLBACK;
