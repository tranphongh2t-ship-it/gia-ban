-- Fix STT for Melamine Plywood: assign unique sequential STT 1-12
-- Order by loai_cot, do_day (sorted by độ dày tăng dần)
UPDATE bang_gia_chuan_melamine_plywood SET stt = 1 WHERE id = 4;
UPDATE bang_gia_chuan_melamine_plywood SET stt = 2 WHERE id = 5;
UPDATE bang_gia_chuan_melamine_plywood SET stt = 3 WHERE id = 6;
UPDATE bang_gia_chuan_melamine_plywood SET stt = 4 WHERE id = 7;
UPDATE bang_gia_chuan_melamine_plywood SET stt = 5 WHERE id = 8;
UPDATE bang_gia_chuan_melamine_plywood SET stt = 6 WHERE id = 9;
UPDATE bang_gia_chuan_melamine_plywood SET stt = 7 WHERE id = 10;
UPDATE bang_gia_chuan_melamine_plywood SET stt = 8 WHERE id = 11;
UPDATE bang_gia_chuan_melamine_plywood SET stt = 9 WHERE id = 12;
UPDATE bang_gia_chuan_melamine_plywood SET stt = 10 WHERE id = 13;
UPDATE bang_gia_chuan_melamine_plywood SET stt = 11 WHERE id = 14;
UPDATE bang_gia_chuan_melamine_plywood SET stt = 12 WHERE id = 15;
