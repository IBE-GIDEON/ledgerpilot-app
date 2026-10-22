-- New profiles start blank instead of pretending everyone is a Californian freelancer.
-- Onboarding asks for the role; home state is filled in from Profile. Existing rows are untouched.
alter table public.profiles alter column home_state set default '';
alter table public.profiles alter column role set default '';
