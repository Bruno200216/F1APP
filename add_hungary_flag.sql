-- =====================================================
-- AÑADIR GRAN PREMIO DE HUNGRÍA 2025 (VERSIÓN ALTERNATIVA)
-- =====================================================

-- Insertar el Gran Premio de Hungría con bandera alternativa
INSERT INTO `f1_grand_prixes` (
    `gp_index`,
    `name`,
    `date`,
    `start_date`,
    `circuit`,
    `country`,
    `flag`
) VALUES (
    13, -- Siguiente gp_index disponible
    'Hungarian Grand Prix',
    '2025-08-02', -- Fecha del GP
    '2025-08-02 12:30:00', -- Fecha de inicio (formato datetime)
    'Hungaroring',
    'Hungary',
    'Belgium_flag.png' -- Usar bandera de Bélgica como placeholder temporal
);

-- Verificar que se insertó correctamente
SELECT 
    `gp_index`,
    `name`,
    `date`,
    `start_date`,
    `circuit`,
    `country`,
    `flag`
FROM `f1_grand_prixes` 
WHERE `name` = 'Hungarian Grand Prix';

-- Mostrar todos los GPs ordenados por índice
SELECT 
    `gp_index`,
    `name`,
    `date`,
    `start_date`,
    `country`
FROM `f1_grand_prixes` 
ORDER BY `gp_index`; 