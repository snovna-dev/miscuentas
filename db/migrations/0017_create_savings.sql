-- Metas de ahorro y sus aportes (un aporte negativo es un retiro).
CREATE TABLE IF NOT EXISTS savings_goals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(120) NOT NULL,
    target_amount DECIMAL(15,2) NOT NULL,
    target_date VARCHAR(10) NULL,
    color VARCHAR(20) NOT NULL DEFAULT 'emerald',
    created_at VARCHAR(32) NOT NULL,
    updated_at VARCHAR(32) NOT NULL,
    deleted_at VARCHAR(32) NULL,
    CONSTRAINT fk_savings_goals_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS savings_contributions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    goal_id INT NOT NULL,
    bank_account_id INT NULL,
    amount DECIMAL(15,2) NOT NULL,
    contribution_date VARCHAR(10) NOT NULL,
    note VARCHAR(255) NULL,
    created_at VARCHAR(32) NOT NULL,
    CONSTRAINT fk_savings_contrib_goal FOREIGN KEY (goal_id) REFERENCES savings_goals(id) ON DELETE CASCADE,
    CONSTRAINT fk_savings_contrib_account FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL
);

CREATE INDEX idx_savings_contrib_goal_date ON savings_contributions (goal_id, contribution_date);
