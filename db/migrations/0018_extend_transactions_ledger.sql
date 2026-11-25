-- `transactions` pasa a ser el libro de movimientos de cada cuenta.
-- El saldo de una cuenta = saldo inicial (bank_accounts.account_balance) + SUM(transactions.amount).
ALTER TABLE transactions
    MODIFY COLUMN balance_after REAL NULL,
    ADD COLUMN kind VARCHAR(20) NOT NULL DEFAULT 'adjustment',
    ADD COLUMN income_id INT NULL,
    ADD COLUMN period_expense_id INT NULL,
    ADD COLUMN savings_contribution_id INT NULL,
    ADD CONSTRAINT fk_transactions_income FOREIGN KEY (income_id) REFERENCES incomes(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_transactions_period_expense FOREIGN KEY (period_expense_id) REFERENCES period_expenses(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_transactions_contribution FOREIGN KEY (savings_contribution_id) REFERENCES savings_contributions(id) ON DELETE CASCADE;

CREATE INDEX idx_transactions_account_date ON transactions (account_id, transaction_date(10));
CREATE UNIQUE INDEX uq_bank_account_incomes_income ON bank_account_incomes (income_id);
