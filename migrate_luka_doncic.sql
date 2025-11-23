-- Migration Script: Consolidate Luka Doncic Player Records
-- Date: 2025-10-21
--
-- SUMMARY:
-- - Player ID 123: "Luka Doncic" (old, incorrect spelling)
-- - Player ID 617: "Luka Dončić" (correct spelling with special character)
--
-- AFFECTED DATA:
-- - 33 user answers in predictions_answer table reference player ID 123
-- - 0 questions have player ID 123 as correct_answer
-- - 0 references in other tables (odds, playerstat, propquestion, superlative_winners)
--
-- ACTION: Migrate all references from ID 123 → ID 617, then delete player ID 123

BEGIN;

-- Step 1: Update all answers from player ID 123 to 617
UPDATE predictions_answer
SET answer = '617'
WHERE answer = '123';

-- Step 2: Verify the update
-- Expected: 33 rows should now reference '617', 0 should reference '123'
DO $$
DECLARE
    old_count INTEGER;
    new_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO old_count FROM predictions_answer WHERE answer = '123';
    SELECT COUNT(*) INTO new_count FROM predictions_answer WHERE answer = '617';

    RAISE NOTICE 'After migration - Old ID 123 count: %, New ID 617 count: %', old_count, new_count;

    IF old_count > 0 THEN
        RAISE EXCEPTION 'Migration failed: Still found % references to old player ID 123', old_count;
    END IF;

    IF new_count != 34 THEN  -- Should be 33 from ID 123 + 1 existing = 34 total
        RAISE WARNING 'Expected 34 total references to ID 617, but found %', new_count;
    END IF;
END $$;

-- Step 3: Delete the old player record
DELETE FROM predictions_player WHERE id = 123;

-- Step 4: Final verification
DO $$
DECLARE
    player_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO player_count FROM predictions_player WHERE id IN (123, 617);

    IF player_count != 1 THEN
        RAISE EXCEPTION 'Expected 1 player record after cleanup, found %', player_count;
    END IF;

    RAISE NOTICE 'Migration completed successfully! Player "Luka Dončić" (ID 617) is now the only record.';
END $$;

-- If everything looks good, commit the transaction
COMMIT;

-- If there are any issues, you can run: ROLLBACK;
