import { db } from "./database";

export function debugSelectAll() {
  console.log("HABITS:");
  console.log(db.getAllSync("SELECT * FROM habits"));

  console.log("LOGS:");
  console.log(db.getAllSync("SELECT * FROM habit_logs"));
}
