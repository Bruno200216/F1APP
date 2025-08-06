-- Script para asignar Track Engineers a Pilotos
-- Basado en las asociaciones reales de F1 2025

USE f1fantasy;

-- Max Verstappen (R, Q, P) -> Gianpiero Lambiase (ID 1)
UPDATE pilots SET track_engineer_id = 1 WHERE driver_name = 'Max Verstappen';

-- Yuki Tsunoda (R, Q, P) -> Richard Wood (ID 2) 
UPDATE pilots SET track_engineer_id = 2 WHERE driver_name = 'Yuki Tsunoda';

-- George Russell (R, Q, P) -> Marcus Dudley (ID 7)
UPDATE pilots SET track_engineer_id = 7 WHERE driver_name = 'George Russell';

-- Kimi Antonelli (R, Q, P) -> Peter Bonnington (ID 8)
UPDATE pilots SET track_engineer_id = 8 WHERE driver_name = 'Kimi Antonelli';

-- Oscar Piastri (R, Q, P) -> Will Joseph (ID 5)
UPDATE pilots SET track_engineer_id = 5 WHERE driver_name = 'Oscar Piastri';

-- Lando Norris (R, Q, P) -> Tom Stallard (ID 6)
UPDATE pilots SET track_engineer_id = 6 WHERE driver_name = 'Lando Norris';

-- Charles Leclerc (R, Q, P) -> Bryan Bozzi (ID 4)
UPDATE pilots SET track_engineer_id = 4 WHERE driver_name = 'Charles Leclerc';

-- Lewis Hamilton (R, Q, P) -> Riccardo Adami (ID 3)
UPDATE pilots SET track_engineer_id = 3 WHERE driver_name = 'Lewis Hamilton';

-- Fernando Alonso (R, Q, P) -> Andrew Vizard (ID 9)
UPDATE pilots SET track_engineer_id = 9 WHERE driver_name = 'Fernando Alonso';

-- Lance Stroll (R, Q, P) -> Gary Gannon (ID 10)
UPDATE pilots SET track_engineer_id = 10 WHERE driver_name = 'Lance Stroll';

-- Pierre Gasly (R, Q, P) -> John Howard (ID 11)
UPDATE pilots SET track_engineer_id = 11 WHERE driver_name = 'Pierre Gasly';

-- Franco Colapinto (R, Q, P) -> Laura Mueller (ID 12)
UPDATE pilots SET track_engineer_id = 12 WHERE driver_name = 'Franco Colapinto';

-- Nico Hulkenberg (R, Q, P) -> Ronan Ohare (ID 13)
UPDATE pilots SET track_engineer_id = 13 WHERE driver_name = 'Nico Hulkenberg';

-- Gabriel Bortoleto (R, Q, P) -> Steven Petrik (ID 14)
UPDATE pilots SET track_engineer_id = 14 WHERE driver_name = 'Gabriel Bortoleto';

-- Esteban Ocon (R, Q, P) -> Jose M Lopez (ID 15)
UPDATE pilots SET track_engineer_id = 15 WHERE driver_name = 'Esteban Ocon';

-- Oliver Bearman (R, Q, P) -> Pierre Hamelin (ID 16)
UPDATE pilots SET track_engineer_id = 16 WHERE driver_name = 'Oliver Bearman';

-- Alexander Albon (R, Q, P) -> Ernesto Desiderio (ID 17)
UPDATE pilots SET track_engineer_id = 17 WHERE driver_name = 'Alexander Albon';

-- Carlos Sainz (R, Q, P) -> Gaetan Jego (ID 18)
UPDATE pilots SET track_engineer_id = 18 WHERE driver_name = 'Carlos Sainz';

-- Isack Hadjar (R, Q, P) -> James Urwin (ID 19)
UPDATE pilots SET track_engineer_id = 19 WHERE driver_name = 'Isack Hadjar';

-- Liam Lawson (R, Q, P) -> Usar ID 1 (reutilizar)
UPDATE pilots SET track_engineer_id = 1 WHERE driver_name = 'Liam Lawson';

-- Verificar los cambios
SELECT 
    p.id,
    p.driver_name,
    p.team,
    p.mode,
    p.track_engineer_id,
    te.name as track_engineer_name
FROM pilots p
LEFT JOIN track_engineers te ON p.track_engineer_id = te.id
ORDER BY p.driver_name, p.mode; 