-- Actualizar los Grand Prix de 2025 con las fechas de start_date (horario de España)
-- Las fechas están en formato: YYYY-MM-DD HH:MM:SS (horario de España)

UPDATE `f1_grand_prixes` SET `start_date` = '2025-07-25 12:30:00' WHERE `gp_index` = 1;
UPDATE `f1_grand_prixes` SET `start_date` = '2025-08-02 12:30:00' WHERE `gp_index` = 2;
UPDATE `f1_grand_prixes` SET `start_date` = '2025-08-30 11:30:00' WHERE `gp_index` = 3;
UPDATE `f1_grand_prixes` SET `start_date` = '2025-09-06 12:30:00' WHERE `gp_index` = 4;
UPDATE `f1_grand_prixes` SET `start_date` = '2025-09-20 10:30:00' WHERE `gp_index` = 5;
UPDATE `f1_grand_prixes` SET `start_date` = '2025-10-04 11:30:00' WHERE `gp_index` = 6;
UPDATE `f1_grand_prixes` SET `start_date` = '2025-10-17 19:30:00' WHERE `gp_index` = 7;
UPDATE `f1_grand_prixes` SET `start_date` = '2025-10-25 19:30:00' WHERE `gp_index` = 8;
UPDATE `f1_grand_prixes` SET `start_date` = '2025-11-07 15:30:00' WHERE `gp_index` = 9;
UPDATE `f1_grand_prixes` SET `start_date` = '2025-11-22 01:30:00' WHERE `gp_index` = 10;
UPDATE `f1_grand_prixes` SET `start_date` = '2025-11-28 14:30:00' WHERE `gp_index` = 11;
UPDATE `f1_grand_prixes` SET `start_date` = '2025-12-06 11:30:00' WHERE `gp_index` = 12; 