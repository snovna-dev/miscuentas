-- Presupuesto mensual por categoría (aplica a todos los meses hasta que se cambie).
CREATE TABLE IF NOT EXISTS budgets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    expense_category_id INT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    created_at VARCHAR(32) NOT NULL,
    updated_at VARCHAR(32) NOT NULL,
    UNIQUE KEY uq_budgets_user_category (user_id, expense_category_id),
    CONSTRAINT fk_budgets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_budgets_category FOREIGN KEY (expense_category_id) REFERENCES expense_categories(id) ON DELETE CASCADE
);
