-- Frecuencia (cada N meses) y número de cuotas de los gastos fijos.
-- frequency_months: 1 mensual, 2 bimestral, 3 trimestral, 6 semestral, 12 anual.
-- installments: total de pagos (NULL = indefinido, p. ej. arriendo).
ALTER TABLE expenses
    ADD COLUMN frequency_months INT NOT NULL DEFAULT 1,
    ADD COLUMN installments INT NULL;
