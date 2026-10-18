alter table public.exams drop constraint exams_validity_ck;
alter table public.exams add constraint exams_validity_ck check (ends_at > starts_at);
