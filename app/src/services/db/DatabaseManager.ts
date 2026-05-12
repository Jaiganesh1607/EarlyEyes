import { open } from '@op-engineering/op-sqlite';

const DB_NAME = 'earlyeyes.db';
let dbPromise: Promise<any> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = Promise.resolve().then(async () => {
      const db = open({ name: DB_NAME }) as any;

      if (typeof db.executeSql !== 'function' && typeof db.execute === 'function') {
        db.executeSql = (sql: string, params: unknown[] = []) => db.execute(sql, params);
      }

      await db.executeSql(
        `CREATE TABLE IF NOT EXISTS assessments (
          id TEXT PRIMARY KEY,
          timestamp INTEGER NOT NULL,
          risk_level TEXT NOT NULL,
          indicators_json TEXT NOT NULL,
          plain_language TEXT NOT NULL,
          tell_doctor TEXT NOT NULL,
          facility_id TEXT,
          language TEXT NOT NULL,
          input_type TEXT NOT NULL,
          confidence INTEGER
        );`,
      );

      return db;
    });
  }

  return dbPromise;
}
