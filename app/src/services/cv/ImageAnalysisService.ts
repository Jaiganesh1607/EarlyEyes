import { NativeModules } from 'react-native';

export interface SkinFinding {
  name: string;
  confidence: number;
}

export interface AnalysisResult {
  skin_findings: SkinFinding[];
  efficientnet_flags: string[];
  structural: {
    arm_wasting_score: number;
    rib_visibility_score: number;
    limb_symmetry_score: number;
    facial_wasting_score: number;
    sunken_eyes_score: number;
  };
  indicators: string[];
  risk_level: 'urgent' | 'monitor' | 'ok';
  confidence: number;
  analysis_failed?: boolean;
}

const { ImageAnalysis } = NativeModules as { ImageAnalysis?: { analyzeImage: (path: string) => Promise<string> } };

const safeDefault: AnalysisResult = {
  skin_findings: [],
  efficientnet_flags: [],
  structural: {
    arm_wasting_score: 0,
    rib_visibility_score: 0,
    limb_symmetry_score: 0,
    facial_wasting_score: 0,
    sunken_eyes_score: 0,
  },
  indicators: [],
  risk_level: 'ok',
  confidence: 0,
  analysis_failed: true,
};

export async function analyzeChildImage(imagePath: string): Promise<AnalysisResult> {
  if (!ImageAnalysis || !ImageAnalysis.analyzeImage) {
    return safeDefault;
  }

  try {
    const jsonString = await ImageAnalysis.analyzeImage(imagePath);
    if (typeof jsonString !== 'string') return safeDefault;
    const parsed = JSON.parse(jsonString) as unknown;

    if (!parsed || typeof parsed !== 'object') return safeDefault;

    const parsedObj = parsed as Record<string, unknown>;

    // Type safely map back from JSON
    const structRaw = (parsedObj.structural as Record<string, unknown>) || {};
    
    const skinArray = Array.isArray(parsedObj.skin_findings) ? parsedObj.skin_findings : [];
    const skin_findings: SkinFinding[] = skinArray.map(item => ({
      name: String(item.name || ''),
      confidence: Number(item.confidence) || 0
    }));

    const effArray = Array.isArray(parsedObj.efficientnet_flags) ? parsedObj.efficientnet_flags : [];
    const efficientnet_flags: string[] = effArray.map(String);

    const indArray = Array.isArray(parsedObj.indicators) ? parsedObj.indicators : [];
    const indicators: string[] = indArray.map(String);
    
    const rawRisk = String(parsedObj.risk_level);
    const risk_level: 'urgent' | 'monitor' | 'ok' = 
      rawRisk === 'urgent' ? 'urgent' :
      rawRisk === 'monitor' ? 'monitor' : 'ok';

    const result: AnalysisResult = {
      skin_findings,
      efficientnet_flags,
      structural: {
        arm_wasting_score: Number(structRaw.arm_wasting_score) || 0,
        rib_visibility_score: Number(structRaw.rib_visibility_score) || 0,
        limb_symmetry_score: Number(structRaw.limb_symmetry_score) || 0,
        facial_wasting_score: Number(structRaw.facial_wasting_score) || 0,
        sunken_eyes_score: Number(structRaw.sunken_eyes_score) || 0,
      },
      indicators: indicators,
      risk_level,
      confidence: Number(parsedObj.confidence) || 0,
      analysis_failed: Boolean(parsedObj.analysis_failed)
    };

    return result;
  } catch (e) {
    return safeDefault;
  }
}
