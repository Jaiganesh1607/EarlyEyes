import json
import os
import time
from pydantic import BaseModel, Field
from typing import List

# --- Configuration for LLM ---
# Since we need to extract clinical information and structure it, 
# you should use an LLM (like OpenAI's GPT-4o or Google Gemini). 
# Here is an example using `google-genai` (or you can use OpenAI):
# pip install google-genai pydantic

try:
    from google import genai
    from google.genai import types
except ImportError:
    print("Please install google-genai: pip install google-genai")
    # You can adapt this to OpenAI using their client.beta.chat.completions.parse

# Mapping of categories based on your provided groups
CATEGORY_MAPPING = {
    "Severe Acute Malnutrition (Marasmus)": "acute_malnutrition",
    "Severe Acute Malnutrition (Kwashiorkor)": "acute_malnutrition",
    "Iron Deficiency Anemia": "micronutrient",
    "Vitamin D Deficiency / Rickets": "micronutrient",
    "Zinc Deficiency": "micronutrient",
    "Iodine Deficiency Disorder": "micronutrient",
    "Vitamin A Deficiency": "micronutrient",
    "Measles": "infections",
    "Mumps": "infections",
    "Rubella": "infections",
    "Whooping Cough (Pertussis)": "infections",
    "Diphtheria": "infections",
    "Tetanus": "infections",
    "Poliomyelitis": "infections",
    "Malaria": "infections",
    "Dengue Fever": "infections",
    "Typhoid Fever": "infections",
    "Tuberculosis (Pediatric)": "infections",
    "Septicemia / Neonatal Sepsis": "infections",
    "Roseola (HHV-6)": "infections",
    "Fifth Disease (Erythema Infectiosum)": "infections",
    "Scarlet Fever": "infections",
    "Pneumonia (Pediatric)": "infections",
    "Bronchiolitis (RSV)": "infections",
    "Croup (Laryngotracheobronchitis)": "infections",
    "Bronchial Asthma (Pediatric)": "others",
    "Acute Upper Respiratory Infection": "infections",
    "Acute Gastroenteritis / Rotavirus": "infections",
    "Cholera": "infections",
    "Helminthiasis (Intestinal Worms)": "gut",
    "Giardiasis": "gut",
    "Amoebiasis": "gut",
    "Chickenpox (Varicella)": "infections",
    "Hand Foot and Mouth Disease": "infections",
    "Scabies": "skin_hair",
    "Ringworm / Tinea Capitis": "skin_hair",
    "Impetigo": "skin_hair",
    "Acute Otitis Media (Ear Infection)": "infections",
    "Tonsillitis / Acute Pharyngitis": "infections",
    "Conjunctivitis (Pink Eye)": "eye_conditions",
    # Add remaining specific disease names to their respective categories
}

# Define the target structured format using Pydantic
class Source(BaseModel):
    label: str = Field(description="E.g., WHO, Wikipedia, MedlinePlus")
    url: str = Field(description="Link to the source or generic link if unknown")

class DiseaseSchema(BaseModel):
    id: str = Field(description="Unique ID, e.g., marasmus_001")
    disease: str = Field(description="Name of the disease")
    category: str = Field(description="Category of the disease")
    icd11_code: str = Field(description="ICD-11 code for the disease")
    description: str = Field(description="2-3 sentence clinical description in plain language")
    symptoms: List[str] = Field(description="List of clinical symptoms")
    visual_indicators: List[str] = Field(description="List of visible signs for diagnosis")
    future_warnings: List[str] = Field(description="Potential complications or risks")
    immediate_actions: List[str] = Field(description="Immediate clinical protocols (e.g., F-75 formula)")
    who_muac_threshold: str = Field(description="WHO MUAC threshold if applicable, otherwise 'N/A'")
    age_group: str = Field(description="Target age group")
    sources: List[Source] = Field(description="List of sources")

def transform_data(input_file: str, output_file: str, api_key: str):
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Initialize Gemini Client
    client = genai.Client(api_key=api_key)
    
    transformed_data = []

    for item in data:
        print(f"Processing: {item['disease']}...")
        disease_name = item.get("disease", "")
        content = item.get("content", "")
        category = CATEGORY_MAPPING.get(disease_name, "others")
        
        # Prepare sources from metadata
        sources_list = []
        meta_sources = item.get("metadata", {}).get("sources", {})
        if meta_sources.get("wikipedia"):
            sources_list.append({"label": "Wikipedia", "url": f"https://en.wikipedia.org/wiki/{disease_name.replace(' ', '_')}"})
        if meta_sources.get("medlineplus"):
            sources_list.append({"label": "MedlinePlus", "url": "https://medlineplus.gov/"})
            
        # The prompt will ask the LLM to extract data from the content,
        # but also use its own clinical knowledge (for ICD-11, MUAC, treatments).
        prompt = f"""
        You are a medical data extraction expert. I have unstructured data for the disease: {disease_name}.
        Category is: {category}.
        Base Sources provided: {json.dumps(sources_list)}

        Unstructured Data:
        {content}

        Task: Extract and format this disease into the requested JSON schema.
        IMPORTANT INSTRUCTIONS:
        1. If the text does not contain specific clinical protocols (like WHO MUAC thresholds, immediate referral actions, or ICD-11 codes), YOU MUST USE YOUR EXTERNAL MEDICAL KNOWLEDGE to fill them in accurately.
        2. Keep descriptions plain and 2-3 sentences.
        3. Make symptoms and visual indicators clinically accurate.
        """

        try:
            # Generate structured output using Gemini
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=DiseaseSchema,
                    temperature=0.1,
                ),
            )
            
            # The response is a JSON string matching the schema
            result_json = json.loads(response.text)
            
            # We enforce the id to be what was in the original, or adapted
            result_json['id'] = item.get('id', result_json.get('id'))
            
            transformed_data.append(result_json)
            # Sleep to avoid rate limiting
            time.sleep(2)
            
        except Exception as e:
            print(f"Failed to process {disease_name}: {e}")

    # Save output
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(transformed_data, f, indent=4)
        print(f"Successfully transformed {len(transformed_data)} items. Saved to {output_file}.")

if __name__ == "__main__":
    # Replace with your actual Gemini API Key
    YOUR_API_KEY = "AIzaSyCBnqEIUJ9kZRYcOxdHIxNCRYoroGwqKU8"
    INPUT_JSON = "rag_data.json"
    OUTPUT_JSON = "rag_data_transformed.json"
    
    if YOUR_API_KEY != "YOUR_GEMINI_API_KEY":
        transform_data(INPUT_JSON, OUTPUT_JSON, YOUR_API_KEY)
    else:
        print("Please insert your API Key in the script to run it.")
