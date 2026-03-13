-- Seed pre-built template scrolls that users can follow immediately

INSERT INTO scrolls (title, description, scroll_type, source_type, config, is_public, is_template, cover_emoji)
VALUES
  (
    'Daf Yomi',
    'Follow the global daily page of Talmud study',
    'calendar',
    'gemara',
    '{"calendarType": "daf_yomi"}',
    true,
    true,
    '📖'
  ),
  (
    'Daily Mishnah',
    'Learn the daily Mishnah cycle',
    'calendar',
    'mishnayos',
    '{"calendarType": "daily_mishnah"}',
    true,
    true,
    '📜'
  ),
  (
    'Weekly Parsha',
    'Dive into this week''s Torah portion every week',
    'calendar',
    'chumash',
    '{"calendarType": "parsha"}',
    true,
    true,
    '🕎'
  ),
  (
    'Learn Masechet Berachos',
    'Work through Mishnah Berachos chapter by chapter - a perfect starting point',
    'structured',
    'mishnayos',
    '{"slug": "Mishnah_Berakhot", "sourceType": "mishnayos"}',
    true,
    true,
    '📚'
  ),
  (
    'Pirkei Avos',
    'Ethics of the Fathers - timeless wisdom for daily life',
    'structured',
    'mishnayos',
    '{"slug": "Pirkei_Avot", "sourceType": "mishnayos"}',
    true,
    true,
    '💡'
  )
ON CONFLICT DO NOTHING;

-- Generate scroll_items for the structured templates
-- Berachos: 9 chapters
INSERT INTO scroll_items (scroll_id, position, slug, ref, source_type, display_name)
SELECT s.id, g.pos, 'Mishnah_Berakhot', (g.pos + 1)::text, 'mishnayos', 'Berachos ' || (g.pos + 1)::text
FROM scrolls s, generate_series(0, 8) AS g(pos)
WHERE s.title = 'Learn Masechet Berachos' AND s.is_template = true
ON CONFLICT DO NOTHING;

-- Pirkei Avos: 6 chapters
INSERT INTO scroll_items (scroll_id, position, slug, ref, source_type, display_name)
SELECT s.id, g.pos, 'Pirkei_Avot', (g.pos + 1)::text, 'mishnayos', 'Pirkei Avos ' || (g.pos + 1)::text
FROM scrolls s, generate_series(0, 5) AS g(pos)
WHERE s.title = 'Pirkei Avos' AND s.is_template = true
ON CONFLICT DO NOTHING;
