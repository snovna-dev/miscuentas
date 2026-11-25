import * as React from "react";
import { api } from "@/lib/client/api";
import type { Category } from "@/types";

// Caché en memoria por tipo: las categorías cambian poco y antes cada formulario las pedía de nuevo.
const cache = new Map<string, Category[]>();
const inflight = new Map<string, Promise<Category[]>>();

function load(key: string) {
    if (!inflight.has(key)) {
        const url = key === "all" ? "/api/categories" : `/api/categories?type=${key}`;
        inflight.set(
            key,
            api<{ categories: Category[] }>(url)
                .then((data) => {
                    cache.set(key, data.categories ?? []);
                    return data.categories ?? [];
                })
                .finally(() => inflight.delete(key))
        );
    }
    return inflight.get(key)!;
}

export function invalidateCategories() {
    cache.clear();
}

export function useCategories(type?: number) {
    const key = type ? String(type) : "all";
    const [categories, setCategories] = React.useState<Category[]>(() => cache.get(key) ?? []);
    const [loading, setLoading] = React.useState(!cache.has(key));
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        let active = true;
        if (cache.has(key)) {
            setCategories(cache.get(key)!);
            setLoading(false);
            return;
        }
        setLoading(true);
        load(key)
            .then((data) => active && setCategories(data))
            .catch((err: Error) => active && setError(err.message))
            .finally(() => active && setLoading(false));
        return () => {
            active = false;
        };
    }, [key]);

    return { categories, loading, error };
}
