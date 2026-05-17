import json
import math
import re
import os
from collections import Counter

# Target: Transforms raw medical rag_data.json into a pre-computed TF-IDF chunk map
# for the EarlyEyes mobile app to use during offline retrieval.

def tokenize(text):
    if not text:
        return []
    # Tokenize words longer than 3 chars and allow hyphens for medical terms (e.g. eye-redness)
    return re.findall(r'\b[a-z]{3,}\b', text.lower())

def build_tfidf(chunks):
    N = len(chunks)
    df = Counter()
    
    for chunk in chunks:
        # Aggregate all searchable fields for this disease entry
        searchable_text = ' '.join([
            chunk.get('disease', ''),
            chunk.get('description', ''),
            ' '.join(chunk.get('symptoms', [])),
            ' '.join(chunk.get('visual_indicators', [])),
            ' '.join(chunk.get('immediate_actions', [])),
            ' '.join(chunk.get('future_warnings', [])),
            chunk.get('category', ''),
        ])
        
        tokens = set(tokenize(searchable_text))
        for t in tokens:
            df[t] += 1

    # Compute IDF - handling cases where N=0 or df is empty
    idf = {t: math.log(N / (df[t] or 1)) for t in df}
    return idf

def transform_rag(input_filename='rag_data_transformed.json', output_filename='chunk_map.json'):
    # Determine base directory
    base_dir = os.path.dirname(os.path.abspath(__file__))
    input_path = os.path.join(base_dir, input_filename)
    output_path = os.path.join(base_dir, output_filename)

    if not os.path.exists(input_path):
        print(f"❌ Error: {input_path} not found.")
        return

    with open(input_path, 'r', encoding='utf-8') as f:
        raw_data = json.load(f)

    # Standardize input format (list vs dict)
    if isinstance(raw_data, dict):
        chunks = list(raw_data.values())
    else:
        chunks = raw_data

    print(f"🔄 Processing {len(chunks)} entries...")
    idf_map = build_tfidf(chunks)

    transformed_output = []
    for i, chunk in enumerate(chunks):
        # Build clean source labels for the UI
        sources = chunk.get('sources', [])
        source_labels = [s.get('label', '') for s in sources if isinstance(s, dict)]
        source_urls = [s.get('url', '') for s in sources if isinstance(s, dict)]
        source_label = ', '.join(filter(None, source_labels)) or 'Clinical reference'

        # Content string for the RAG display in result screen
        content_parts = []
        if chunk.get('description'):
            content_parts.append(chunk['description'])
        if chunk.get('symptoms'):
            content_parts.append('Symptoms: ' + ', '.join(chunk['symptoms']))
        if chunk.get('visual_indicators'):
            content_parts.append('Visual Signs: ' + ', '.join(chunk['visual_indicators']))

        full_content = '\n'.join(content_parts)

        # Precompute TF-IDF values to make offline retrieval "instant"
        chunk_tokens = tokenize(full_content)
        tf = Counter(chunk_tokens)
        total_tokens = sum(tf.values()) or 1
        
        tfidf_scores = {
            t: (tf[t] / total_tokens) * idf_map.get(t, 0)
            for t in tf
        }
        
        # Select top 30 key terms for indexing
        top_terms = sorted(tfidf_scores, key=tfidf_scores.get, reverse=True)[:30]

        transformed_output.append({
            'id': chunk.get('id', f'chunk_{i}'),
            'disease': chunk.get('disease', 'Unknown'),
            'category': chunk.get('category', ''),
            'icd11_code': chunk.get('icd11_code', ''),
            'description': chunk.get('description', ''),
            'symptoms': chunk.get('symptoms', []),
            'visual_indicators': chunk.get('visual_indicators', []),
            'future_warnings': chunk.get('future_warnings', []),
            'immediate_actions': chunk.get('immediate_actions', []),
            'nutritional_recommendations': chunk.get('nutritional_recommendations', []),
            'age_group': chunk.get('age_group', ''),
            'who_muac_threshold': chunk.get('who_muac_threshold', ''),
            'content': full_content,
            'top_terms': top_terms,
            'metadata': {
                'sourceLabel': source_label,
                'sourceUrls': source_urls,
                'sources': sources
            }
        })

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(transformed_output, f, ensure_ascii=False, indent=2)

    print(f"✅ Successfully transformed {len(transformed_output)} medical entries to → {output_path}")

if __name__ == '__main__':
    transform_rag()