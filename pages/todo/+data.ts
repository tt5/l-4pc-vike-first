// https://vike.dev/data

import * as sqliteQueries from "../../database/sqlite/queries/todos";
import type { PageContextServer } from "vike/types";

export type Data = Awaited<ReturnType<typeof data>>;

export async function data(_pageContext: PageContextServer) {
  const todoItemsInitial = sqliteQueries.getAllTodos(_pageContext.db);

  return { todoItemsInitial };
}
