-- Agregar la columna start_date a la tabla f1_grand_prixes
ALTER TABLE `f1_grand_prixes` 
ADD COLUMN `start_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP 
AFTER `date`; 