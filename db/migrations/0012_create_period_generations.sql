-- Controla qué meses ya tuvieron sus gastos fijos generados por usuario.
-- Reemplaza la regla anterior ("solo generar si el mes está vacío"), que fallaba
-- cuando el usuario registraba un gasto con fecha futura antes de que llegara ese mes.
CREATE TABLE IF NOT EXISTS period_generations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    period_id INT NOT NULL,
    created_at VARCHAR(32) NOT NULL,
    UNIQUE KEY uq_period_generations_user_period (user_id, period_id),
    CONSTRAINT fk_period_generations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_period_generations_period FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE CASCADE
);
