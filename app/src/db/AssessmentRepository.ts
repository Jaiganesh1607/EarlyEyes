import type { Assessment } from '../types/assessment';
import { getDB } from '../services/db/DatabaseManager';

function parseIndicators(value?: string) {
  if (!value) {
    return [] as string[];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapRow(row: any): Assessment {
  return {
    id: row.id,
    timestamp: Number(row.timestamp),
    risk_level: row.risk_level,
    indicators: parseIndicators(row.indicators_json),
    plain_language: row.plain_language ?? undefined,
    tell_doctor: row.tell_doctor ?? undefined,
    facility_id: row.facility_id ?? undefined,
    language: row.language ?? undefined,
    input_type: row.input_type ?? undefined,
    confidence: row.confidence ?? undefined,
  };
}

async function executeSql(sql: string, params: any[] = []) {
  const db = await getDB();
  const [result] = await db.executeSql(sql, params);
  return result;
}

export async function getAssessments(): Promise<Assessment[]> {
  const result = await executeSql(
    'SELECT id, timestamp, risk_level, indicators_json, plain_language, tell_doctor, facility_id, language, input_type, confidence FROM assessments ORDER BY timestamp DESC',
  );
  const items: Assessment[] = [];
  for (let i = 0; i < result.rows.length; i += 1) {
    items.push(mapRow(result.rows.item(i)));
  }
  return items;
}

export async function getAssessmentById(id: string): Promise<Assessment | null> {
  const result = await executeSql(
    'SELECT id, timestamp, risk_level, indicators_json, plain_language, tell_doctor, facility_id, language, input_type, confidence FROM assessments WHERE id = ? LIMIT 1',
    [id],
  );
  if (result.rows.length === 0) {
    return null;
  }
  return mapRow(result.rows.item(0));
}
