/** The 9 drugs currently seeded in Neo4j (ml-services/scripts/seed_graph.py's
 * DRUGS list) — used as quick-pick suggestions, never a constraint: users
 * can type any drug name and the real NER model (/extract) handles it the
 * same as free text. Static on purpose; needs a manual update if the seed
 * graph ever changes. */
export const SEED_DRUGS = [
  "amoxicillin",
  "aspirin",
  "ciprofloxacin",
  "fluconazole",
  "ibuprofen",
  "metformin",
  "omeprazole",
  "sulfamethoxazole-trimethoprim",
  "warfarin",
];

/** Common symptom words offered as quick-pick suggestions in the report
 * wizard — plain UI convenience, not a claim about a symptom database. */
export const COMMON_SYMPTOMS = [
  "nausea",
  "dizziness",
  "headache",
  "rash",
  "fatigue",
  "vomiting",
  "joint pain",
  "swelling",
  "drowsiness",
];
