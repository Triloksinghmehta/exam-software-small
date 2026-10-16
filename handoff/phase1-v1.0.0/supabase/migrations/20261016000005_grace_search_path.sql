-- Advisor fix: pin search_path on _grace()
alter function public._grace() set search_path = '';
