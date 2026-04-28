import type { DatabaseSync } from "node:sqlite";

export function insertTodo(db: DatabaseSync, text: string) {
  return db.prepare("INSERT INTO todos (text) VALUES (?)").run(text);
}

export function getAllTodos(db: DatabaseSync) {
  return db.prepare("SELECT * FROM todos").all() as { id: number; text: string }[];
}
