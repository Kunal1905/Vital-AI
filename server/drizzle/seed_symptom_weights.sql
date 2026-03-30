-- Seed baseline categories + symptoms with weights/red flags
-- Run in Neon SQL editor after migrations are applied.

INSERT INTO symptom_categories (name, slug)
VALUES
  ('Heart & Chest', 'heart-chest'),
  ('Breathing', 'breathing'),
  ('Head & Nerves', 'head-nerves'),
  ('Stomach & Gut', 'stomach-gut'),
  ('Muscle & Bones', 'muscle-bones'),
  ('General', 'general')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO symptoms (category_id, name, slug, base_weight, is_red_flag, severity_weight, is_active)
SELECT c.id, v.name, v.slug, v.base_weight, v.is_red_flag, v.severity_weight, true
FROM (
  VALUES
    ('heart-chest', 'Chest pain (crushing/pressure)', 'chest-pain-crushing', 10, true, 10),
    ('heart-chest', 'Pain radiating to arm/jaw/back', 'pain-radiating-arm-jaw-back', 9, true, 9),
    ('heart-chest', 'Palpitations', 'palpitations', 6, false, 6),
    ('breathing', 'Shortness of breath at rest', 'sob-at-rest', 9, true, 9),
    ('breathing', 'Throat swelling / allergic reaction', 'throat-swelling-allergic-reaction', 10, true, 10),
    ('head-nerves', 'Thunderclap headache (worst ever)', 'thunderclap-headache-worst-ever', 9, true, 9),
    ('stomach-gut', 'Severe abdominal pain', 'severe-abdominal-pain', 7, false, 7),
    ('muscle-bones', 'Muscle aches', 'muscle-aches', 2, false, 2),
    ('general', 'Fatigue / unusual weakness', 'fatigue-unusual-weakness', 3, false, 3)
) AS v(category_slug, name, slug, base_weight, is_red_flag, severity_weight)
JOIN symptom_categories c ON c.slug = v.category_slug
ON CONFLICT (slug) DO UPDATE
SET
  base_weight = EXCLUDED.base_weight,
  is_red_flag = EXCLUDED.is_red_flag,
  severity_weight = EXCLUDED.severity_weight,
  is_active = true;
