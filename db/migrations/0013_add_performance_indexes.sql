-- Índices para las consultas más frecuentes del tablero.
CREATE INDEX idx_periods_type_year_month ON periods (period_type, year, month);
CREATE INDEX idx_period_expenses_period_state ON period_expenses (period_id, expense_state_id);
CREATE INDEX idx_period_expenses_expense_period ON period_expenses (expense_id, period_id);
CREATE INDEX idx_incomes_user_date ON incomes (user_id, income_date(10));
CREATE INDEX idx_expenses_user_deleted ON expenses (user_id, deleted_at(32));
CREATE INDEX idx_sessions_expires_at ON sessions (expires_at(32));
