export const SDG_QUERY_MAP: Record<number, string[]> = {
  1: ["community development", "poverty alleviation", "social welfare"],
  2: ["food security", "agriculture nutrition", "sustainable farming"],
  3: ["global health", "medical conference", "public health"],
  4: ["education classroom", "learning students", "school children"],
  5: ["women empowerment", "gender equality", "female leadership"],
  6: ["water sanitation", "clean water infrastructure", "water access"],
  7: ["renewable energy", "solar power", "clean energy"],
  8: ["economic development", "business growth", "professional work"],
  9: ["infrastructure innovation", "technology development", "construction"],
  10: ["social justice equality", "diverse community", "inclusion"],
  11: ["sustainable cities", "urban planning", "city skyline"],
  12: ["sustainability recycling", "circular economy", "environmental"],
  13: ["climate change", "environment nature", "global warming"],
  14: ["marine ocean", "ocean conservation", "sea biodiversity"],
  15: ["forest biodiversity", "wildlife conservation", "nature protection"],
  16: ["peace justice", "governance democracy", "rule of law"],
  17: ["international cooperation", "partnership diplomacy", "global collaboration"],
};

const FALLBACK_QUERIES = ["global development", "international conference"];

export function getSdgQueries(sdgNumber: number | null | undefined): string[] {
  if (sdgNumber == null) return FALLBACK_QUERIES;
  return SDG_QUERY_MAP[sdgNumber] ?? FALLBACK_QUERIES;
}
