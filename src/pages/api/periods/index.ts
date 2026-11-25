import {
    createPeriod,
    deletePeriod,
    getAllPeriods,
    getMonthsByYear,
    getOrCreateMonthPeriod,
    getPeriodByMonth,
    getPeriodByYear,
    getPeriodsYearly,
    updatePeriod,
    type NewPeriod,
} from "@/lib/db/queries/periods";
import { getDb } from "@/lib/db";
import { apiRoute, requireAdmin } from "@/lib/http";
import { asObject, oneOf, optId, optString, reqId, reqInt, reqString } from "@/lib/validation";
import { PeriodType } from "@/emuns/PeriodType";

export const config = { api: { bodyParser: { sizeLimit: "32kb" } } };

const TYPES = [PeriodType.YEARLY, PeriodType.MONTHLY, PeriodType.WEEKLY, PeriodType.DAILY] as const;

/** Antes el valor del período se copiaba a año/mes/día a la vez (ej. año = 11). */
function parsePeriod(value: unknown): NewPeriod {
    const period = asObject(value, "el período");
    const periodType = oneOf(period.period_type, TYPES, "tipo de período");
    const base = {
        name: reqString(period.name_period ?? period.name, "nombre", { max: 80 }),
        description: optString(period.description, "descripción", { max: 255 }),
        period_type: periodType,
        year: null as number | null,
        month: null as number | null,
        week: null as number | null,
        day: null as number | null,
        parent_id: optId(period.parent_id, "período padre"),
    };

    switch (periodType) {
        case PeriodType.YEARLY:
            base.year = reqInt(period.period_value, "año", 2000, 2100);
            base.parent_id = null;
            break;
        case PeriodType.MONTHLY:
            base.year = reqInt(period.year, "año", 2000, 2100);
            base.month = reqInt(period.period_value, "mes", 1, 12);
            break;
        case PeriodType.WEEKLY:
            base.year = reqInt(period.year, "año", 2000, 2100);
            base.week = reqInt(period.period_value, "semana", 1, 53);
            break;
        case PeriodType.DAILY:
            base.year = reqInt(period.year, "año", 2000, 2100);
            base.month = reqInt(period.month, "mes", 1, 12);
            base.day = reqInt(period.period_value, "día", 1, 31);
            break;
    }
    return base;
}

export default apiRoute({
    GET: async (req) => {
        const { year, period_type, month, yearly, ensure } = req.query;

        if (period_type === "monthsByYear") return { monthsByYear: await getMonthsByYear(reqInt(year, "año", 2000, 2100)) };
        if (yearly) return { periodsyearly: await getPeriodsYearly() };

        if (month) {
            const y = reqInt(year, "año", 2000, 2100);
            const m = reqInt(month, "mes", 1, 12);
            // `ensure=true` crea el mes si no existe (los meses se crean solos al registrar gastos).
            const periodBymonth = ensure === "true" ? await getOrCreateMonthPeriod(getDb(), { year: y, month: m }) : await getPeriodByMonth(m, y);
            return { periodBymonth };
        }
        if (year) return { periodsByYear: await getPeriodByYear(reqInt(year, "año", 2000, 2100)) };

        return { periods: await getAllPeriods() };
    },
    POST: async (req, _res, user) => {
        requireAdmin(user);
        const data = parsePeriod(asObject(req.body).period);
        if (data.period_type === PeriodType.MONTHLY && !data.parent_id) {
            data.parent_id = (await getPeriodByYear(data.year!))?.id ?? null;
        }
        const { id } = await createPeriod(data);
        return { success: true, id };
    },
    PUT: async (req, _res, user) => {
        requireAdmin(user);
        const body = asObject(req.body);
        const id = reqId(body.id);
        await updatePeriod(id, parsePeriod(body.period));
        return { success: true, id };
    },
    DELETE: async (req, _res, user) => {
        requireAdmin(user);
        const id = reqId(asObject(req.body).id);
        await deletePeriod(id);
        return { success: true, id };
    },
});
