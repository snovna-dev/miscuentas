-- Ingresos que se registran solos cada mes (salario, arriendo recibido…).
CREATE TABLE IF NOT EXISTS recurring_incomes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    bank_account_id INT NULL,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    start_date VARCHAR(10) NOT NULL,
    created_at VARCHAR(32) NOT NULL,
    updated_at VARCHAR(32) NOT NULL,
    deleted_at VARCHAR(32) NULL,
    CONSTRAINT fk_recurring_incomes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_recurring_incomes_account FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL
);

ALTER TABLE incomes
    ADD COLUMN recurring_income_id INT NULL,
    ADD CONSTRAINT fk_incomes_recurring FOREIGN KEY (recurring_income_id) REFERENCES recurring_incomes(id) ON DELETE SET NULL;

CREATE INDEX idx_incomes_recurring ON incomes (recurring_income_id);
