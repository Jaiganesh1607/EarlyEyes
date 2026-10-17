export interface UnifiedQuery {
  visual_terms: string[];
  voice_terms: string[];
  text_terms: string[];
  all_terms: string[];
}

const INDICATOR_TO_TERMS: Record<string, string[]> = {
  "Visible muscle wasting in upper arms": ["wasting", "muscle", "thin", "emaciation", "arms", "subcutaneous", "fat", "marasmus", "tuberculosis"],
  "Rib area may be visible": ["ribs", "prominent", "bones", "wasting", "emaciation", "visible", "marasmus", "spine", "shoulder"],
  "Facial features suggest nutritional stress": ["sunken", "cheeks", "face", "wasting", "nutritional", "old", "man", "aged"],
  "Eyes appear sunken": ["sunken", "eyes", "dehydration", "rotavirus", "cholera", "gastroenteritis", "temples"],
  "Limb size difference noticed — possible swelling": ["edema", "swelling", "kwashiorkor", "pitting", "asymmetry", "nephrotic", "dactylitis", "feet", "legs"],
  "Unusual skin texture detected": ["skin", "texture", "dermatosis", "lesions", "peeling", "flaky", "paint", "scabies", "impetigo"],
  "Hair abnormality detected": ["hair", "brittle", "sparse", "reddish", "flag", "kwashiorkor", "tinea", "alopecia", "discoloration"],
  "Skin color abnormality detected": ["pale", "pallor", "jaundice", "yellow", "anemia", "thalassemia", "malaria", "discoloration"],
  "Possible swelling detected": ["edema", "swelling", "kwashiorkor", "pitting", "enlarged", "nephrotic", "feet", "legs", "abdomen"],
  "Visible body wasting signs": ["wasting", "emaciation", "thin", "marasmus", "weight", "loss", "baggy", "pants"],
  "Skin abnormality detected: Actinic Keratosis": ["keratosis", "rash", "scaly", "rough", "dermatosis"],
  "Skin abnormality detected: Basal Cell Carcinoma": ["carcinoma", "growth", "sore", "bacterial"],
  "Skin abnormality detected: Benign Keratosis": ["keratosis", "scaly"],
  "Skin abnormality detected: Dermatofibroma": ["dermatofibroma", "nodule", "bump"],
  "Skin abnormality detected: Melanoma": ["melanoma", "dark", "mole", "pigmentation"],
  "Skin abnormality detected: Melanocytic Nevi": ["nevi", "mole", "pigmentation", "spots", "dark"],
  "Skin abnormality detected: Vascular Lesion": ["vascular", "bleeding", "petechiae", "spots", "scurvy", "dengue", "meningitis"],
  "Upper arm muscle appears reduced": ["wasting", "muscle", "thin", "arms", "marasmus", "sam"],
  "skin_texture_abnormality": ["texture", "rash", "scabies", "impetigo", "dermatosis"],
  "hair_abnormality_detected": ["hair", "alopecia", "sparse", "kwashiorkor", "tinea", "flag"],
  "pallor_or_discoloration": ["pallor", "pale", "jaundice", "anemia", "thalassemia", "sickle"],
  "body_swelling_proxy": ["edema", "swelling", "kwashiorkor", "nephrotic", "enlarged"],
  "visible_wasting_proxy": ["wasting", "thin", "emaciation", "marasmus", "sam", "tuberculosis"]
};

const STOPWORDS = new Set([
  "the","a","an","is","my","child","has","have","and","or","in","on","at","to","for","of","with","his","her","it","was","are","be","been","that","this","they","not","but","from","by","i","we","he","she","their","our","your","also","very","some","can","may","just","more","than","then","when","what","how","who","which","there","here","so","if","do","did","get","got","its","own","too","now","no","yes","ok","only","after","before","since","about","over","under","during","while","again","both","each","few","most","other","same","such","any","all","both","each","every"
]);

function processTextInput(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .split(/[\s.,!?;:()\[\]]+/)
    .filter(word => word.length >= 3 && !STOPWORDS.has(word));
}

export function buildQuery(imageIndicators: string[], voiceTranscript: string, textInput: string): UnifiedQuery {
  const visual_terms: string[] = [];
  imageIndicators.forEach(indicator => {
    if (INDICATOR_TO_TERMS[indicator]) {
      visual_terms.push(...INDICATOR_TO_TERMS[indicator]);
    } else {
      const fallback = indicator.toLowerCase().split(/[\s.,!?;:()\[\]]+/).filter(w => w.length > 3);
      visual_terms.push(...fallback);
    }
  });

  const voice_terms = processTextInput(voiceTranscript);
  const text_terms = processTextInput(textInput);

  const dedupped = new Set([...visual_terms, ...voice_terms, ...text_terms]);
  const all_terms = Array.from(dedupped).map(t => t.toLowerCase());

  return {
    visual_terms: Array.from(new Set(visual_terms)),
    voice_terms,
    text_terms,
    all_terms
  };
}
