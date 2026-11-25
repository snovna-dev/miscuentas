import * as React from "react";
import { Pencil, Search, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/primitives";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export type Column<T> = {
    header: string;
    cell: (row: T) => React.ReactNode;
    className?: string;
    /** Texto usado por el buscador. */
    search?: (row: T) => string;
};

type Props<T> = {
    rows: T[];
    columns: Column<T>[];
    loading?: boolean;
    rowKey: (row: T) => React.Key;
    onEdit?: (row: T) => void;
    onDelete?: (row: T) => void;
    empty?: string;
    title?: string;
    toolbar?: React.ReactNode;
};

export function AdminTable<T>({ rows, columns, loading, rowKey, onEdit, onDelete, empty = "No hay registros.", title, toolbar }: Props<T>) {
    const [query, setQuery] = React.useState("");
    const searchable = columns.some((c) => c.search);
    const term = query.trim().toLowerCase();
    const filtered = term ? rows.filter((row) => columns.some((c) => c.search?.(row).toLowerCase().includes(term))) : rows;

    return (
        <Card className="overflow-hidden">
            {(title || searchable || toolbar) && (
                <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
                    {title && (
                        <p className="font-semibold">
                            {title} <span className="text-sm font-normal text-muted-foreground">({filtered.length})</span>
                        </p>
                    )}
                    <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
                        {toolbar}
                        {searchable && (
                            <div className="relative w-full sm:w-64">
                                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar…" className="h-9 pl-9" aria-label="Buscar en la tabla" />
                            </div>
                        )}
                    </div>
                </div>
            )}
            <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                            {columns.map((column) => (
                                <th key={column.header} scope="col" className={cn("whitespace-nowrap px-4 py-3 font-medium", column.className)}>
                                    {column.header}
                                </th>
                            ))}
                            {(onEdit || onDelete) && <th className="px-4 py-3 text-right font-medium">Acciones</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <tr key={i}>
                                    {columns.map((column) => (
                                        <td key={column.header} className="px-4 py-3.5">
                                            <Skeleton className="h-4" />
                                        </td>
                                    ))}
                                    {(onEdit || onDelete) && <td />}
                                </tr>
                            ))
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + 1} className="px-4 py-12 text-center text-muted-foreground">
                                    {term ? "No hay resultados para tu búsqueda." : empty}
                                </td>
                            </tr>
                        ) : (
                            filtered.map((row) => (
                                <tr key={rowKey(row)} className="transition-colors hover:bg-muted/40">
                                    {columns.map((column) => (
                                        <td key={column.header} className={cn("px-4 py-3 [&:not(:has(p,span.block))]:whitespace-nowrap", column.className)}>
                                            {column.cell(row)}
                                        </td>
                                    ))}
                                    {(onEdit || onDelete) && (
                                        <td className="px-4 py-2 text-right">
                                            <div className="inline-flex gap-1">
                                                {onEdit && (
                                                    <button type="button" onClick={() => onEdit(row)} className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Editar">
                                                        <Pencil className="size-4" />
                                                    </button>
                                                )}
                                                {onDelete && (
                                                    <button type="button" onClick={() => onDelete(row)} className="rounded-lg p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive" aria-label="Eliminar">
                                                        <Trash2 className="size-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}

/** Hook genérico para cargar una colección del API con recarga. */
export function useCollection<T>(loader: () => Promise<T[]>, onError: (message: string) => void) {
    const [rows, setRows] = React.useState<T[]>([]);
    const [loading, setLoading] = React.useState(true);
    const loaderRef = React.useRef(loader);
    const errorRef = React.useRef(onError);
    React.useLayoutEffect(() => {
        loaderRef.current = loader;
        errorRef.current = onError;
    });

    const reload = React.useCallback(async () => {
        try {
            setRows(await loaderRef.current());
        } catch (error) {
            errorRef.current((error as Error).message);
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        reload();
    }, [reload]);

    return { rows, loading, reload };
}
