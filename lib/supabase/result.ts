/** Common result shape for compatibility queries that select different columns. */
export type QueryResult = { data: unknown; error: { message: string } | null };
