-- Default syllabus per level from the client sheet: question rules plus the time limit (minutes).
-- Levels 0-8 = the nine blocks of the sheet, in order. Existing exams keep their own copy of the rules.
alter table public.levels add column if not exists duration_minutes smallint not null default 8 check (duration_minutes between 1 and 300);

update public.levels set duration_minutes = 10, description = '60 + 60 direct sums, single digits, no formulas',
  default_rules = '[{"operation": "add_sub", "digits": [1, 1], "rows": 3, "quantity": 60, "formula": "direct"}, {"operation": "add_sub", "digits": [1, 1], "rows": 3, "quantity": 60, "formula": "direct"}]'::jsonb
  where level = 0;
update public.levels set duration_minutes = 12, description = '125 single-digit sums with formulas',
  default_rules = '[{"operation": "add_sub", "digits": [1, 1], "rows": 3, "quantity": 75, "formula": "friends"}, {"operation": "add_sub", "digits": [1, 1], "rows": 3, "quantity": 50, "formula": "friends"}]'::jsonb
  where level = 1;
update public.levels set duration_minutes = 12, description = 'Single digits and single+double digits with formulas',
  default_rules = '[{"operation": "add_sub", "digits": [1, 1], "rows": 3, "quantity": 50, "formula": "friends"}, {"operation": "add_sub", "digits": [2, 1], "rows": 4, "quantity": 50, "formula": "friends"}]'::jsonb
  where level = 2;
update public.levels set duration_minutes = 13, description = 'Formulas up to 5 rows, double digits',
  default_rules = '[{"operation": "add_sub", "digits": [1, 1], "rows": 3, "quantity": 25, "formula": "friends"}, {"operation": "add_sub", "digits": [1, 1], "rows": 5, "quantity": 25, "formula": "friends"}, {"operation": "add_sub", "digits": [2, 1], "rows": 4, "quantity": 25, "formula": "friends"}, {"operation": "add_sub", "digits": [2, 1], "rows": 5, "quantity": 25, "formula": "friends"}, {"operation": "add_sub", "digits": [2, 2], "rows": 2, "quantity": 50, "formula": "friends"}]'::jsonb
  where level = 3;
update public.levels set duration_minutes = 14, description = 'Formulas, 2 x 1 multiplication',
  default_rules = '[{"operation": "add_sub", "digits": [1, 1], "rows": 4, "quantity": 50, "formula": "friends"}, {"operation": "add_sub", "digits": [2, 1], "rows": 5, "quantity": 25, "formula": "friends"}, {"operation": "add_sub", "digits": [2, 2], "rows": 4, "quantity": 25, "formula": "friends"}, {"operation": "multiplication", "digits": [2, 1], "rows": 2, "quantity": 25}]'::jsonb
  where level = 4;
update public.levels set duration_minutes = 15, description = 'Formulas, multiplication up to 3 x 1, division',
  default_rules = '[{"operation": "add_sub", "digits": [2, 2], "rows": 4, "quantity": 25, "formula": "friends"}, {"operation": "add_sub", "digits": [2, 2], "rows": 5, "quantity": 25, "formula": "friends"}, {"operation": "add_sub", "digits": [2, 1], "rows": 6, "quantity": 25, "formula": "friends"}, {"operation": "add_sub", "digits": [2, 2], "rows": 6, "quantity": 25, "formula": "friends"}, {"operation": "multiplication", "digits": [2, 1], "rows": 2, "quantity": 25}, {"operation": "multiplication", "digits": [3, 1], "rows": 2, "quantity": 25}, {"operation": "division", "digits": [2, 1], "rows": 2, "quantity": 25}, {"operation": "division", "digits": [3, 1], "rows": 2, "quantity": 25}]'::jsonb
  where level = 5;
update public.levels set duration_minutes = 15, description = 'Formulas, multiplication up to 4 x 1, division',
  default_rules = '[{"operation": "add_sub", "digits": [1, 1], "rows": 6, "quantity": 25, "formula": "friends"}, {"operation": "add_sub", "digits": [2, 1], "rows": 6, "quantity": 25, "formula": "friends"}, {"operation": "add_sub", "digits": [1, 1], "rows": 7, "quantity": 25, "formula": "friends"}, {"operation": "add_sub", "digits": [2, 2], "rows": 6, "quantity": 25, "formula": "friends"}, {"operation": "multiplication", "digits": [3, 1], "rows": 2, "quantity": 25}, {"operation": "multiplication", "digits": [4, 1], "rows": 2, "quantity": 25}, {"operation": "division", "digits": [3, 1], "rows": 2, "quantity": 25}, {"operation": "division", "digits": [4, 1], "rows": 2, "quantity": 25}]'::jsonb
  where level = 6;
update public.levels set duration_minutes = 15, description = 'Multiplication 4 x 1 and 2 x 2, division, formulas',
  default_rules = '[{"operation": "multiplication", "digits": [4, 1], "rows": 2, "quantity": 25}, {"operation": "multiplication", "digits": [2, 2], "rows": 2, "quantity": 25}, {"operation": "division", "digits": [4, 1], "rows": 2, "quantity": 25}, {"operation": "division", "digits": [2, 2], "rows": 2, "quantity": 25}, {"operation": "add_sub", "digits": [2, 1], "rows": 5, "quantity": 50, "formula": "friends"}]'::jsonb
  where level = 7;
update public.levels set duration_minutes = 15, description = 'Long formulas, 3 x 2 and 2 x 2 multiplication, 4 / 2 division',
  default_rules = '[{"operation": "add_sub", "digits": [2, 2], "rows": 7, "quantity": 20, "formula": "friends"}, {"operation": "add_sub", "digits": [2, 1], "rows": 8, "quantity": 20, "formula": "friends"}, {"operation": "multiplication", "digits": [3, 2], "rows": 2, "quantity": 30}, {"operation": "division", "digits": [4, 2], "rows": 2, "quantity": 30}, {"operation": "multiplication", "digits": [2, 2], "rows": 2, "quantity": 25}, {"operation": "add_sub", "digits": [1, 1], "rows": 9, "quantity": 25, "formula": "friends"}]'::jsonb
  where level = 8;
