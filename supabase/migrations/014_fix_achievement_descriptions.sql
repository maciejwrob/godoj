-- Fix Polish descriptions that contain English text
UPDATE public.achievements SET description_pl = 'Ocena płynności >= 3.0' WHERE id = 'fluency_3';
UPDATE public.achievements SET description_pl = 'Ocena płynności >= 4.0' WHERE id = 'fluency_4';
UPDATE public.achievements SET description_pl = 'Ocena płynności = 5.0' WHERE id = 'fluency_5';
UPDATE public.achievements SET description_pl = '3 lekcje z rzędu z oceną płynności >= 4.0' WHERE id = 'fluency_4_streak_3';
