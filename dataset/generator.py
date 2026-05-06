import pandas as pd
import json
import random

# ── SYSTEM PROMPT ──────────────────────────────────────────────────────────────
SYSTEM = """You are EarlyEyes, an offline child health early warning assistant.
A caregiver describes what they can see about their child — visible signs, 
appearance, behavior, and optionally basic measurements like weight and height.

Your job is to identify warning signs of malnutrition or illness and tell 
the caregiver clearly what to do next.

Respond ONLY in this exact JSON format with no extra text:
{
  "alert_level": "one of: See a doctor today / See a health worker soon / Watch and monitor / Looking okay",
  "alert_reason": "plain language explanation of why this alert level was given",
  "what_you_noticed": ["visible sign 1", "visible sign 2"],
  "what_to_do_now": "specific action for the caregiver",
  "tell_your_doctor": "what the caregiver should say to the health worker in plain language",
  "while_you_wait": "what to do at home before reaching care",
  "disclaimer": "This app cannot diagnose your child. Only a doctor or health worker can do that. This is only to help you decide whether to seek help."
}"""


# ── WHO CLASSIFICATION (internal — never shown to caregiver) ───────────────────
def classify(muac, whz, oedema):
    """
    Uses real clinical measurements as ground truth labels only.
    These values NEVER appear in the caregiver input prompt.
    """
    if oedema == 1:
        return "critical",  "SAM_kwashiorkor"
    if muac < 115:
        return "urgent",    "SAM_marasmus"
    if muac < 125:
        return "monitor",   "MAM"
    if whz < -3:
        return "urgent",    "SAM_whz"
    if whz < -2:
        return "monitor",   "MAM_whz"
    return "normal",        "normal"


# ── VERSION 1: VISUAL ONLY ─────────────────────────────────────────────────────
# What a mother sees with her eyes — no measurements at all
def visual_only(row):
    age    = int(row['age'])
    sex    = int(row['sex'])
    muac   = float(row['muac'])
    whz    = float(row.get('whz', 0))
    haz    = float(row.get('haz', 0))
    oedema = int(row.get('oedema', 2))

    sex_word = "daughter" if sex == 2 else "son"
    age_str  = f"{age} months" if age < 24 else f"{age // 12} years"

    lines = [f"My {sex_word} is {age_str} old."]

    # ── KWASHIORKOR (oedema) ───────────────────────────────
    if oedema == 1:
        lines += [
            "Both feet and legs are swollen.",
            "When I press the swelling with my finger it leaves a dent that stays.",
            "The face also looks puffy and swollen.",
            "The hair has become thin, dry, and has turned reddish or yellowish.",
            "The skin has dark patches and is peeling or cracking in some places.",
            "The child is very quiet, has no energy, and does not want to move.",
            "They have almost no appetite.",
        ]

    # ── SAM MARASMUS ──────────────────────────────────────
    elif muac < 115:
        lines += [
            "The arms look like thin sticks — I can almost wrap my fingers all the way around.",
            "The ribs are clearly visible through the skin when the child breathes.",
            "The shoulder blades stick out sharply from the back.",
            "The bottom and thighs have no flesh — the skin just hangs loose and wrinkled.",
            "The cheeks look sunken and hollow.",
            "The belly looks swollen even though the rest of the body is very thin.",
            "The child has very little energy and does not want to play or move.",
            "Appetite has been very poor for several weeks.",
        ]

    # ── MAM ───────────────────────────────────────────────
    elif muac < 125:
        lines += [
            "The arms look noticeably thinner than other children the same age.",
            "The ribs are slightly visible.",
            "The bottom looks flatter and less rounded than before.",
            "The child seems to have lost weight over the past few weeks.",
            "Appetite has reduced recently — they do not finish their food.",
        ]

    # ── SEVERE WASTING BY WEIGHT/HEIGHT ───────────────────
    elif whz < -3:
        lines += [
            "The child looks very thin for how tall they are.",
            "The ribs are visible.",
            "The skin on the thighs looks a bit loose.",
            "They seem to have lost weight noticeably in recent weeks.",
        ]

    # ── MODERATE WASTING BY WEIGHT/HEIGHT ─────────────────
    elif whz < -2:
        lines += [
            "The child looks thinner than expected for how tall they are.",
            "They seem thinner than other children of the same height.",
            "Appetite seems reduced compared to before.",
        ]

    # ── STUNTING ONLY ─────────────────────────────────────
    elif haz < -2:
        lines += [
            "The child looks much shorter than other children the same age.",
            "They have always been on the smaller side.",
            "Their weight looks okay but their height seems behind.",
        ]

    # ── NORMAL ────────────────────────────────────────────
    else:
        lines += [
            "The arms look normal and rounded.",
            "The ribs are not visible.",
            "The bottom and thighs look well padded.",
            "The child is active, playful, and eating well.",
            "They look healthy compared to other children their age.",
        ]

    lines.append("Should I be worried about my child's nutrition?")
    return " ".join(lines)


# ── VERSION 2: VISUAL + WEIGHT + HEIGHT ───────────────────────────────────────
# Mother has a basic scale and measuring tape — still NO MUAC
def visual_with_measurements(row):
    age    = int(row['age'])
    sex    = int(row['sex'])
    muac   = float(row['muac'])
    weight = float(row['weight'])
    height = float(row['height'])
    whz    = float(row.get('whz', 0))
    haz    = float(row.get('haz', 0))
    oedema = int(row.get('oedema', 2))

    sex_word = "daughter" if sex == 2 else "son"
    age_str  = f"{age} months" if age < 24 else f"{age // 12} years"

    lines = [
        f"My {sex_word} is {age_str} old.",
        f"I weighed them — they are {weight:.1f} kg.",
        f"Their height is {height:.1f} cm.",
    ]

    # ── KWASHIORKOR ───────────────────────────────────────
    if oedema == 1:
        lines += [
            "Both feet and legs are swollen and leave a dent when pressed.",
            "The face looks puffy.",
            "Hair has turned reddish and skin is peeling.",
            "The child has very little energy.",
        ]

    # ── SAM MARASMUS ──────────────────────────────────────
    elif muac < 115:
        lines += [
            "Despite checking the weight, the arms still look like sticks.",
            "Ribs and shoulder blades are clearly visible.",
            "The bottom and thighs have almost no flesh.",
            "The child is very weak and has almost no appetite.",
        ]

    # ── MAM ───────────────────────────────────────────────
    elif muac < 125:
        lines += [
            "The arms look thinner than other children the same age.",
            "Ribs are slightly visible.",
            "Appetite has reduced recently.",
        ]

    # ── SEVERE WASTING BY WEIGHT/HEIGHT ───────────────────
    elif whz < -3:
        lines += [
            "For their height the weight seems low.",
            "They look very thin and the ribs are visible.",
            "They seem to have lost weight recently.",
        ]

    # ── MODERATE WASTING BY WEIGHT/HEIGHT ─────────────────
    elif whz < -2:
        lines += [
            "For their height the weight seems a bit low.",
            "They look thinner than expected.",
        ]

    # ── STUNTING ──────────────────────────────────────────
    elif haz < -2:
        lines += [
            "The height seems low for their age.",
            "They are shorter than other children the same age.",
            "Weight looks okay but height seems behind.",
        ]

    # ── NORMAL ────────────────────────────────────────────
    else:
        lines += [
            "The weight and height both look proportional.",
            "The child is active and eating well.",
            "No visible signs of concern.",
        ]

    if oedema != 1:
        lines.append("No swelling in the feet or legs.")

    lines.append("Are these measurements normal for their age?")
    return " ".join(lines)


# ── BUILD OUTPUT JSON ──────────────────────────────────────────────────────────
def build_output(alert_code, classification, oedema,
                 muac, whz, haz, weight, height, age, sex):

    sex_word = "your daughter" if sex == 2 else "your son"
    age_str  = f"{age} months" if age < 24 else f"{age // 12} years"

    # ── ALERT LEVEL ───────────────────────────────────────
    alert_map = {
        "critical": "🔴 See a doctor today",
        "urgent":   "🔴 See a doctor today",
        "monitor":  "🟠 See a health worker soon",
        "watch":    "🟡 Watch and monitor",
        "normal":   "🟢 Looking okay",
    }
    alert_level = alert_map.get(alert_code, "🟠 See a health worker soon")

    # ── ALERT REASON ──────────────────────────────────────
    if oedema == 1:
        alert_reason = (
            f"{sex_word.capitalize()} has swelling in both feet and legs "
            "that leaves a dent when pressed. "
            "This is called oedema and it is a serious sign that the body "
            "is not getting the right nutrients. "
            "This needs a doctor's attention today."
        )
    elif muac < 115:
        alert_reason = (
            f"{sex_word.capitalize()}'s arms are extremely thin "
            "and the body shows multiple signs of severe malnutrition. "
            "The body has been using its own muscles for energy "
            "because it is not getting enough food. "
            "This needs medical attention today."
        )
    elif muac < 125:
        alert_reason = (
            f"{sex_word.capitalize()}'s arms look thinner than normal "
            "for their age. "
            "This may be an early sign that they are not getting "
            "enough nutrition. "
            "A health worker should check this within the next few days."
        )
    elif whz < -3:
        alert_reason = (
            f"{sex_word.capitalize()} appears very thin for their height. "
            "Their weight is significantly below what is expected "
            "for a child this tall and this age. "
            "This needs attention today."
        )
    elif whz < -2:
        alert_reason = (
            f"{sex_word.capitalize()} appears thinner than expected "
            "for their height and age. "
            "A health worker should check their growth soon."
        )
    elif haz < -2:
        alert_reason = (
            f"{sex_word.capitalize()} appears shorter than expected "
            "for their age. "
            "This can be a sign of long-term nutritional gaps. "
            "A health worker should monitor their growth."
        )
    else:
        alert_reason = (
            f"{sex_word.capitalize()} does not show visible warning signs. "
            "Continue regular growth monitoring and a balanced diet."
        )

    # ── WHAT YOU NOTICED ──────────────────────────────────
    noticed = []
    if oedema == 1:
        noticed.append("Swelling in both feet and legs — dent stays when pressed")
        noticed.append("Face looks puffy and swollen")
        noticed.append("Hair thin, dry, reddish or yellowish color")
        noticed.append("Skin peeling or with dark patches")
        noticed.append("Child very quiet with no energy")
    if muac < 115:
        noticed.append("Arms extremely thin — like sticks")
        noticed.append("Ribs and shoulder blades clearly visible")
        noticed.append("Bottom and thighs have almost no flesh — loose hanging skin")
        noticed.append("Cheeks sunken and hollow")
        noticed.append("Belly swollen despite thin body")
        noticed.append("Very weak, no energy, almost no appetite")
    elif muac < 125:
        noticed.append("Arms thinner than other children the same age")
        noticed.append("Ribs slightly visible")
        noticed.append("Bottom looks flatter than normal")
        noticed.append("Reduced appetite in recent weeks")
    if whz < -3 and muac >= 115:
        noticed.append("Very thin for their height — ribs visible")
        noticed.append("Skin on thighs looks slightly loose")
    elif whz < -2 and muac >= 125:
        noticed.append("Thinner than expected for their height")
    if haz < -2 and muac >= 125 and whz >= -2:
        noticed.append("Shorter than other children the same age")
    if not noticed:
        noticed.append("No visible warning signs — growth appears within normal range")

    # ── WHAT TO DO NOW ────────────────────────────────────
    if alert_code in ["critical", "urgent"]:
        what_to_do = (
            "Go to the nearest health clinic or hospital today. "
            "If the clinic is far, start traveling now or first thing tomorrow morning. "
            "Do not wait more than 24 hours. "
            "If your child stops eating or drinking entirely, go immediately — "
            "do not wait until tomorrow."
        )
    elif alert_code == "monitor":
        what_to_do = (
            "Visit a health worker or clinic within the next 2 to 3 days. "
            "If your child gets worse before then — stops eating, "
            "becomes very weak, or swelling appears in the feet — go sooner."
        )
    elif alert_code == "watch":
        what_to_do = (
            "Watch your child's growth over the next 2 weeks. "
            "Make sure they eat a variety of foods every day — "
            "proteins like eggs, beans, or lentils, plus vegetables and grains. "
            "Mention this to a health worker at your next visit."
        )
    else:
        what_to_do = (
            "Continue regular health checkups. "
            "Make sure your child eats a balanced diet "
            "and gets vaccinations on schedule."
        )

    # ── TELL YOUR DOCTOR ──────────────────────────────────
    tell_doctor = (
        f"My child is {age_str} old, "
        f"weighs {weight:.1f} kg and is {height:.1f} cm tall. "
    )
    if oedema == 1:
        tell_doctor += (
            "Both feet and legs are swollen and leave a dent when I press them. "
        )
    if muac < 115:
        tell_doctor += (
            "The arms are very thin and I can see the ribs and shoulder blades. "
            "The bottom has no flesh. "
        )
    elif muac < 125:
        tell_doctor += "The arms look thinner than other children the same age. "
    if whz < -2:
        tell_doctor += "They look thin for their height. "
    if haz < -2:
        tell_doctor += "They are shorter than other children their age. "
    tell_doctor += "I am worried about their growth and nutrition."

    # ── WHILE YOU WAIT ────────────────────────────────────
    if alert_code in ["critical", "urgent"]:
        while_wait = (
            "Keep trying to feed your child small amounts frequently. "
            "Breast milk is the best option if still breastfeeding. "
            "Make sure they drink enough clean water or oral rehydration fluid. "
            "Do NOT give sugary drinks, sodas, or tea."
        )
    elif alert_code == "monitor":
        while_wait = (
            "Feed your child more frequently — small meals 5 to 6 times a day. "
            "Include protein-rich foods like eggs, beans, or lentils if available. "
            "Make sure they drink enough clean water."
        )
    else:
        while_wait = (
            "Continue a balanced diet with variety every day. "
            "Include fruits, vegetables, protein, and grains. "
            "Make sure your child drinks enough clean water."
        )

    return {
        "alert_level":      alert_level,
        "alert_reason":     alert_reason,
        "what_you_noticed": noticed,
        "what_to_do_now":   what_to_do,
        "tell_your_doctor": tell_doctor,
        "while_you_wait":   while_wait,
        "disclaimer": (
            "This app cannot diagnose your child. "
            "Only a doctor or health worker can do that. "
            "This is only to help you decide whether to seek help."
        )
    }


# ── MAIN: LOAD DATA AND GENERATE JSONL ────────────────────────────────────────
def build_dataset():
    dfs = []
    for fname in ["anthro1.csv", "anthro2.csv", "anthro3.csv"]:
        try:
            df = pd.read_csv(fname)
            df.columns = [c.lower().strip() for c in df.columns]
            if 'wt' in df.columns:
                df.rename(columns={'wt': 'weight', 'ht': 'height'}, inplace=True)
            for col, default in [
                ('muac', 140), ('whz', 0), ('haz', 0), ('oedema', 2)
            ]:
                if col not in df.columns:
                    df[col] = default
            dfs.append(df)
            print(f"Loaded {fname}: {len(df)} rows")
        except FileNotFoundError:
            print(f"Not found: {fname}")

    df_all = pd.concat(dfs, ignore_index=True)
    print(f"Total rows: {len(df_all)}")

    examples = []

    for _, row in df_all.iterrows():
        try:
            muac   = float(row.get('muac', 140))
            whz    = float(row.get('whz', 0))
            haz    = float(row.get('haz', 0))
            oedema = int(row.get('oedema', 2))
            weight = float(row['weight'])
            height = float(row['height'])
            age    = int(row['age'])
            sex    = int(row['sex'])

            alert_code, classification = classify(muac, whz, oedema)

            output = build_output(
                alert_code, classification, oedema,
                muac, whz, haz, weight, height, age, sex
            )
            output_str = json.dumps(output)

            # Version 1 — visual only
            examples.append({
                "messages": [
                    {"role": "system",    "content": SYSTEM},
                    {"role": "user",      "content": visual_only(row)},
                    {"role": "assistant", "content": output_str}
                ]
            })

            # Version 2 — visual + weight + height
            examples.append({
                "messages": [
                    {"role": "system",    "content": SYSTEM},
                    {"role": "user",      "content": visual_with_measurements(row)},
                    {"role": "assistant", "content": output_str}
                ]
            })

        except Exception as e:
            continue

    print(f"Anthropometric examples (2x per row): {len(examples)}")

    # ── DISEASE SYMPTOMS — ALL 4 DATASETS ─────────────────
    URGENCY = {
        # Urgent — need doctor today
        "malaria": "urgent", "dengue": "urgent", "dengue fever": "urgent",
        "typhoid": "urgent", "pneumonia": "urgent", "meningitis": "urgent",
        "cholera": "urgent", "measles": "urgent", "hepatitis a": "urgent",
        "hepatitis b": "urgent", "jaundice": "urgent", "tuberculosis": "urgent",
        "sepsis": "urgent", "encephalitis": "urgent", "severe dehydration": "urgent",
        "pertussis": "urgent", "whooping cough": "urgent", "tetanus": "urgent",
        "diphtheria": "urgent", "acute respiratory infection": "urgent",
        "febrile seizure": "urgent", "syncope": "urgent", "cardiac arrest": "urgent",
        "anaphylaxis": "urgent", "poisoning": "urgent",

        # Monitor — see health worker soon
        "anemia": "monitor", "diarrhea": "monitor", "asthma": "monitor",
        "urinary tract infection": "monitor", "chicken pox": "monitor",
        "fungal infection": "monitor", "drug reaction": "monitor",
        "gastroenteritis": "monitor", "ear infection": "monitor",
        "otitis media": "monitor", "conjunctivitis": "monitor",
        "impetigo": "monitor", "scabies": "monitor", "ringworm": "monitor",
        "intestinal worms": "monitor", "worm infection": "monitor",
        "giardia": "monitor", "parasitic infection": "monitor",
        "mild dehydration": "monitor", "fever": "monitor",

        # Normal — watch at home
        "common cold": "normal", "allergy": "normal",
        "teething": "normal", "colic": "normal",
    }

    alert_map = {
        "urgent":  "🔴 See a doctor today",
        "monitor": "🟠 See a health worker soon",
        "normal":  "🟢 Looking okay",
    }

    disease_count = 0

    def make_disease_example(user_text, disease_name):
        disease_lower = disease_name.lower().strip()
        alert_code = "monitor"
        for key in URGENCY:
            if key in disease_lower:
                alert_code = URGENCY[key]
                break

        output = {
            "alert_level": alert_map.get(alert_code, "🟠 See a health worker soon"),
            "alert_reason": (
                f"The symptoms described may be related to {disease_name}. "
                + (
                    "This needs urgent medical attention today."
                    if alert_code == "urgent" else
                    "This should be checked by a health worker soon."
                    if alert_code == "monitor" else
                    "This appears mild but monitor your child closely."
                )
            ),
            "what_you_noticed": [
                f"Symptoms consistent with possible {disease_name}"
            ],
            "what_to_do_now": (
                "See a doctor TODAY — do not wait."
                if alert_code == "urgent" else
                "Visit a health worker within 2 to 3 days."
                if alert_code == "monitor" else
                "Monitor your child at home. Next routine checkup is fine."
            ),
            "tell_your_doctor": (
                f"My child has these symptoms: {str(user_text)[:300]}. "
                f"I am concerned it could be {disease_name}."
            ),
            "while_you_wait": (
                "Keep your child hydrated with clean water or oral rehydration fluid. "
                "Make sure they rest. "
                "Do not give adult medicines to children without a doctor's advice."
            ),
            "disclaimer": (
                "This app cannot diagnose your child. "
                "Only a doctor or health worker can do that. "
                "This is only to help you decide whether to seek help."
            )
        }
        return {
            "messages": [
                {"role": "system",    "content": SYSTEM},
                {"role": "user",      "content": str(user_text)},
                {"role": "assistant", "content": json.dumps(output)}
            ]
        }

    try:
        # Dataset 1 — gretelai (already working)
        from datasets import load_dataset
        ds1 = load_dataset("gretelai/symptom_to_diagnosis")
        for split in ["train", "test"]:
            for row in ds1[split]:
                examples.append(make_disease_example(
                    row["input_text"], row["output_text"]
                ))
                disease_count += 1
        print(f"gretelai: added {disease_count} examples")
    except Exception as e:
        print(f"gretelai error: {e}")

    try:
        # Dataset 2 — duxprajapati (7,040 natural language symptom texts)
        c = 0
        ds2 = load_dataset("duxprajapati/symptom-disease-dataset")
        for split in ["train", "test"]:
            for row in ds2[split]:
                examples.append(make_disease_example(
                    row["text"], f"condition #{row['label']}"
                ))
                c += 1
        print(f"duxprajapati: added {c} examples")
        disease_count += c
    except Exception as e:
        print(f"duxprajapati error: {e}")

    try:
        # Dataset 3 — QuyenAnhDE (400 diseases with symptom lists)
        c = 0
        ds3 = load_dataset("QuyenAnhDE/Diseases_Symptoms")
        for row in ds3["train"]:
            user_text = (
                f"My child has these symptoms: {row['Symptoms']}. "
                f"What should I do?"
            )
            examples.append(make_disease_example(user_text, row["Name"]))
            c += 1
        print(f"QuyenAnhDE: added {c} examples")
        disease_count += c
    except Exception as e:
        print(f"QuyenAnhDE error: {e}")

    try:
        # Dataset 4 — FreedomIntelligence Disease Database (9,620 diseases)
        c = 0
        ds4 = load_dataset("FreedomIntelligence/Disease_Database", "en")
        for row in ds4["train"]:
            if row.get("common_symptom"):
                user_text = (
                    f"My child has these symptoms: {row['common_symptom']}. "
                    f"What should I do?"
                )
                examples.append(make_disease_example(
                    user_text, row["disease"]
                ))
                c += 1
        print(f"FreedomIntelligence: added {c} examples")
        disease_count += c
    except Exception as e:
        print(f"FreedomIntelligence error: {e}")

    print(f"Total disease examples added: {disease_count}")
    # ── SHUFFLE AND SAVE ──────────────────────────────────
    random.shuffle(examples)
    split_idx = int(len(examples) * 0.9)
    train = examples[:split_idx]
    test  = examples[split_idx:]

    with open("earlyeyes_train.jsonl", "w") as f:
        for ex in train:
            f.write(json.dumps(ex) + "\n")

    with open("earlyeyes_test.jsonl", "w") as f:
        for ex in test:
            f.write(json.dumps(ex) + "\n")

    print(f"\nDone.")
    print(f"Train : {len(train)} examples → earlyeyes_train.jsonl")
    print(f"Test  : {len(test)}  examples → earlyeyes_test.jsonl")


if __name__ == "__main__":
    build_dataset()