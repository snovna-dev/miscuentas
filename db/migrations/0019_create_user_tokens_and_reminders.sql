-- Tokens de un solo uso (recuperar contraseña, verificar correo, reto de 2FA).
CREATE TABLE IF NOT EXISTS user_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    purpose VARCHAR(30) NOT NULL,
    token_hash CHAR(64) NOT NULL,
    payload VARCHAR(255) NULL,
    expires_at VARCHAR(32) NOT NULL,
    used_at VARCHAR(32) NULL,
    created_at VARCHAR(32) NOT NULL,
    UNIQUE KEY uq_user_tokens_hash (token_hash),
    KEY idx_user_tokens_user_purpose (user_id, purpose),
    CONSTRAINT fk_user_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Preferencias de recordatorios.
ALTER TABLE users
    ADD COLUMN notify_email TINYINT NOT NULL DEFAULT 1,
    ADD COLUMN reminder_days INT NOT NULL DEFAULT 2;

-- Evita enviar dos veces el mismo recordatorio.
CREATE TABLE IF NOT EXISTS reminder_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    period_expense_id INT NOT NULL,
    kind VARCHAR(20) NOT NULL,
    sent_at VARCHAR(32) NOT NULL,
    UNIQUE KEY uq_reminder_log (period_expense_id, kind),
    CONSTRAINT fk_reminder_log_pe FOREIGN KEY (period_expense_id) REFERENCES period_expenses(id) ON DELETE CASCADE
);
