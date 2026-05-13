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

function normalizeResult(result: any) {
  if (Array.isArray(result)) {
    return normalizeResult(result[0]);
  }

  if (result?.rows && Array.isArray(result.rows)) {
    const rowsArray = result.rows;
    return {
      ...result,
      rows: {
        length: rowsArray.length,
        item: (index: number) => rowsArray[index],
      },
    };
  }

  if (result?.rows?.raw && Array.isArray(result.rows.raw)) {
    const rowsArray = result.rows.raw;
    return {
      ...result,
      rows: {
        length: rowsArray.length,
        item: (index: number) => rowsArray[index],
      },
    };
  }

  return result;
}

async function executeSql(sql: string, params: any[] = []) {
  const db = await getDB();
  const result = await db.executeSql(sql, params);
  return normalizeResult(result);
}

export async function saveAssessment(assessment: Assessment): Promise<void> {
  const indicatorsJson = JSON.stringify(assessment.indicators ?? []);
  console.log('[DB] saveAssessment', {
    id: assessment.id,
    risk: assessment.risk_level,
    timestamp: assessment.timestamp,
  });
  await executeSql(
    'INSERT OR REPLACE INTO assessments (id, timestamp, risk_level, indicators_json, plain_language, tell_doctor, facility_id, language, input_type, confidence) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      assessment.id,
      assessment.timestamp,
      assessment.risk_level,
      indicatorsJson,
      assessment.plain_language ?? '',
      assessment.tell_doctor ?? '',
      assessment.facility_id ?? null,
      assessment.language ?? 'en',
      assessment.input_type ?? 'text',
      assessment.confidence ?? null,
    ],
  );
  console.log('[DB] saveAssessment complete', assessment.id);
}

export async function getAssessments(): Promise<Assessment[]> {
  console.log('[DB] getAssessments');
  const result = await executeSql(
    'SELECT id, timestamp, risk_level, indicators_json, plain_language, tell_doctor, facility_id, language, input_type, confidence FROM assessments ORDER BY timestamp DESC',
  );
  if (!result?.rows) {
    console.log('[DB] getAssessments: no rows');
    return [];
  }
  const items: Assessment[] = [];
  for (let i = 0; i < result.rows.length; i += 1) {
    items.push(mapRow(result.rows.item(i)));
  }
  console.log('[DB] getAssessments count', items.length);
  return items;
}

export async function getAssessmentById(id: string): Promise<Assessment | null> {
  console.log('[DB] getAssessmentById', id);
  const result = await executeSql(
    'SELECT id, timestamp, risk_level, indicators_json, plain_language, tell_doctor, facility_id, language, input_type, confidence FROM assessments WHERE id = ? LIMIT 1',
    [id],
  );
  if (!result?.rows || result.rows.length === 0) {
    console.log('[DB] getAssessmentById: not found', id);
    return null;
  }
  console.log('[DB] getAssessmentById: found', id);
  return mapRow(result.rows.item(0));
}
