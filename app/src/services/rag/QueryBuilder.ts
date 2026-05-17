export interface UnifiedQuery {
  visual_terms: string[];
  voice_terms: string[];
  text_terms: string[];
  all_terms: string[];
}

const INDICATOR_TO_TERMS: Record<string, string[]> = {
  "Visible muscle wasting in upper arms": ["wasting", "muscle", "thin", "emaciation", "arms", "subcutaneous", "fat"],
  "Skin abnormality detected: Actinic Keratosis": ["skin", "keratosis", "lesion", "rash", "scaly", "rough"],
  "Skin abnormality detected: Basal Cell Carcinoma": ["skin", "lesion", "growth", "sore"],
  "Skin abnormality detected: Benign Keratosis": ["skin", "lesion", "keratosis"],
  "Skin abnormality detected: Dermatofibroma": ["skin", "nodule", "bump"],
  "Skin abnormality detected: Melanoma": ["skin", "lesion", "dark", "mole"],
  "Skin abnormality detected: Melanocytic Nevi": ["skin", "mole", "pigmentation", "spots"],
  "Skin abnormality detected: Vascular Lesion": ["vascular", "lesion", "bleeding", "petechiae", "spots", "scurvy"],
  "Rib area may be visible": ["ribs", "prominent", "bones", "wasting", "emaciation", "visible"],
  "Facial features suggest nutritional stress": ["sunken", "cheeks", "face", "wasting", "nutritional"],
  "Eyes appear sunken": ["sunken", "eyes", "dehydration", "wasting"],
  "Limb size difference noticed — possible swelling": ["edema", "swelling", "pitting", "kwashiorkor", "asymmetry"],
  "Unusual skin texture detected": ["skin", "texture", "dermatosis", "lesions", "peeling"],
  "Hair abnormality detected": ["hair", "brittle", "sparse", "reddish", "flag", "kwashiorkor"],
  "Skin color abnormality detected": ["pale", "pallor", "anemia", "jaundice", "discoloration"],
  "Possible swelling detected": ["edema", "swelling", "kwashiorkor", "pitting", "enlarged"],
  "Visible body wasting signs": ["wasting", "emaciation", "thin", "marasmus", "weight", "loss"],
};

const STOPWORDS: Set<string> = new Set([
  "the", "a", "an", "is", "my", "child", "has", "have", "and", "or",
  "in", "on", "at", "to", "for", "of", "with", "his", "her", "it",
  "was", "are", "be", "been", "that", "this", "they", "not", "but",
  "from", "by", "i", "we", "he", "she", "their", "our", "your",
]);

function extractIndicatorTerms(indicators: string[]): string[] {
  const terms: string[] = [];
  for (const indicator of indicators) {
    const mapped = INDICATOR_TO_TERMS[indicator];
    if (mapped) {
      terms.push(...mapped);
    } else {
      // Fallback: split by spaces, lowercase, filter words > 3 chars
      const fallback = indicator
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3);
      terms.push(...fallback);
    }
  }
  return terms;
}

function processTextInput(input: string): string[] {
  if (!input || input.trim().length === 0) {
    return [];
  }
  return input
    .toLowerCase()
    .split(/[\s.,!?;:]+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

export function buildQuery(
  imageIndicators: string[],
  voiceTranscript: string,
  textInput: string
): UnifiedQuery {
  const visual_terms = extractIndicatorTerms(imageIndicators);
  const voice_terms = processTextInput(voiceTranscript);
  const text_terms = processTextInput(textInput);

  const allSet = new Set<string>([...visual_terms, ...voice_terms, ...text_terms]);
  const all_terms = Array.from(allSet);

  return {
    visual_terms,
    voice_terms,
    text_terms,
    all_terms,
  };
}
