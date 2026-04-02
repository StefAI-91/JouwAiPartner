-- Prevent duplicate meetings with the same title on the same day.
-- Fireflies creates separate transcripts per team member with slightly different
-- timestamps, so we compare on date only (not full timestamp).
CREATE UNIQUE INDEX meetings_title_date_unique
    ON meetings (lower(title), (date::date))
    WHERE date IS NOT NULL;
