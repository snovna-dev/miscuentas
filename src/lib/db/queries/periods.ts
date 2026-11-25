import { allAsync, getAsync, getDb, nowISO, runAsync, type Queryable } from "../index";
import { HttpError } from "@/lib/http";
import { MONTH_NAMES, monthLabel, type YearMonth } from "@/lib/dates";
import { PeriodType } from "@/emuns/PeriodType";
import type { Period } from "@/types";

export type NewPeriod = {
    name: string;
    description: string;
    period_type: number;
    year: number | null;
    month: number | null;
    week: number | null;
    day: number | null;
    parent_id: number | null;
};

const PERIOD_COLUMNS = `id, name, description, period_type, year, month, week, day, parent_id, created_at, updated_at`;

export async function findYearPeriod(db: Queryable, year: number) {
    return getAsync<Period>(
        db,
        `SELECT ${PERIOD_COLUMNS} FROM periods WHERE period_type = ? AND year = ? ORDER BY id LIMIT 1`,
        [PeriodType.YEARLY, year]
    );
}

export async function findMonthPeriod(db: Queryable, year: number, month: number) {
    return getAsync<Period>(
        db,
        `SELECT ${PERIOD_COLUMNS} FROM periods WHERE period_type = ? AND year = ? AND month = ? ORDER BY id LIMIT 1`,
        [PeriodType.MONTHLY, year, month]
    );
}

/**
 * Devuelve el período mensual (y su año padre) creándolos si no existen.
 * Así un gasto con fecha futura (p. ej. enero del próximo año) siempre tiene
 * un mes donde registrarse, sin depender de que el administrador lo cree antes.
 */
export async function getOrCreateMonthPeriod(db: Queryable, { year, month }: YearMonth) {
    const existing = await findMonthPeriod(db, year, month);
    if (existing) return existing;

    let yearPeriod = await findYearPeriod(db, year);
    if (!yearPeriod) {
        const created = await runAsync(
            db,
            `INSERT INTO periods (name, description, period_type, year, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
            [String(year), `Año ${year}`, PeriodType.YEARLY, year, nowISO(), nowISO()]
        );
        yearPeriod = { id: created.lastID } as Period;
    }

    const created = await runAsync(
        db,
        `INSERT INTO periods (name, description, period_type, year, month, parent_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [MONTH_NAMES[month - 1], monthLabel({ year, month }), PeriodType.MONTHLY, year, month, yearPeriod.id, nowISO(), nowISO()]
    );

    return (await getAsync<Period>(db, `SELECT ${PERIOD_COLUMNS} FROM periods WHERE id = ?`, [created.lastID]))!;
}

/* ----------------------------- Administración ----------------------------- */

export async function createPeriod(data: NewPeriod) {
    const result = await runAsync(
        getDb(),
        `INSERT INTO periods (name, description, period_type, parent_id, year, month, week, day, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.name, data.description, data.period_type, data.parent_id, data.year, data.month, data.week, data.day, nowISO(), nowISO()]
    );
    return { id: result.lastID };
}

export async function getAllPeriods() {
    return allAsync<Period>(
        getDb(),
        `SELECT ${PERIOD_COLUMNS} FROM periods ORDER BY year DESC, period_type ASC, month ASC, week ASC, day ASC`
    );
}

export async function getPeriodByYear(year: number) {
    return (await findYearPeriod(getDb(), year)) ?? null;
}

export async function getPeriodByMonth(month: number, year: number) {
    return (await findMonthPeriod(getDb(), year, month)) ?? null;
}

export async function getPeriodsYearly() {
    return allAsync<Period>(getDb(), `SELECT ${PERIOD_COLUMNS} FROM periods WHERE period_type = ? ORDER BY year`, [
        PeriodType.YEARLY,
    ]);
}

export async function getMonthsByYear(year: number) {
    return allAsync<Period>(
        getDb(),
        `SELECT ${PERIOD_COLUMNS} FROM periods WHERE year = ? AND period_type = ? ORDER BY month`,
        [year, PeriodType.MONTHLY]
    );
}

export async function updatePeriod(id: number, data: Omit<NewPeriod, "parent_id"> & { parent_id?: number | null }) {
    const result = await runAsync(
        getDb(),
        `UPDATE periods SET name = ?, description = ?, period_type = ?, year = ?, month = ?, week = ?, day = ?,
                parent_id = COALESCE(?, parent_id), updated_at = ?
         WHERE id = ?`,
        [data.name, data.description, data.period_type, data.year, data.month, data.week, data.day, data.parent_id ?? null, nowISO(), id]
    );
    if (result.changes === 0) throw new HttpError(404, "No se encontró el período a actualizar.");
    return { id };
}

/** Borrar un período eliminaba en cascada los gastos de todos los usuarios: ahora se bloquea si tiene datos. */
export async function deletePeriod(id: number) {
    const usage = await getAsync<{ total: number }>(
        getDb(),
        `SELECT COUNT(*) AS total FROM period_expenses pe
         WHERE pe.period_id = ? OR pe.period_id IN (SELECT id FROM periods WHERE parent_id = ?)`,
        [id, id]
    );
    if (Number(usage?.total ?? 0) > 0) {
        throw new HttpError(409, "El período tiene gastos registrados y no se puede eliminar.");
    }

    const result = await runAsync(getDb(), `DELETE FROM periods WHERE id = ?`, [id]);
    if (result.changes === 0) throw new HttpError(404, "No se encontró el período a eliminar.");
    return { id };
}
