export const SDG_QUERY_MAP: Record<number, string[]> = {
  1: ["community development", "poverty alleviation", "social welfare meeting"],
  2: ["food security agriculture", "nutrition program", "sustainable farming"],
  3: ["global health conference", "medical professionals meeting", "public health summit"],
  4: ["education classroom", "students learning", "school children"],
  5: ["women empowerment leadership", "gender equality summit", "female professionals"],
  6: ["water sanitation", "clean water infrastructure", "water access"],
  7: ["renewable energy", "solar power installation", "clean energy summit"],
  8: ["economic development", "business professionals meeting", "growth conference"],
  9: ["infrastructure innovation", "technology professionals", "modern construction"],
  10: ["social justice equality", "diverse community", "inclusion summit"],
  11: ["sustainable cities", "urban planning", "modern city skyline"],
  12: ["sustainability recycling", "circular economy", "environmental"],
  13: ["climate change summit", "environment conference", "global warming action"],
  14: ["marine ocean conservation", "ocean biodiversity", "sea protection"],
  15: ["forest biodiversity", "wildlife conservation", "nature protection"],
  16: ["peace justice governance", "democracy summit", "rule of law"],
  17: ["international cooperation", "diplomatic summit", "global partnership"],
};

export function getSdgQueries(sdg: number | null | undefined): string[] {
  if (!sdg || !SDG_QUERY_MAP[sdg]) {
    return ["global development conference", "international professional meeting"];
  }
  return SDG_QUERY_MAP[sdg];
}
