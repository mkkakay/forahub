// SDG-themed gradient fallbacks for event banners and org cards.
// These render INSTEAD of a missing image — they're meant to look intentional.

export const SDG_COLORS: Record<number, string> = {
  1: "#E5243B", 2: "#DDA63A", 3: "#4C9F38", 4: "#C5192D", 5: "#FF3A21",
  6: "#26BDE2", 7: "#FCC30B", 8: "#A21942", 9: "#FD6925", 10: "#DD1367",
  11: "#FD9D24", 12: "#BF8B2E", 13: "#3F7E44", 14: "#0A97D9", 15: "#56C02B",
  16: "#00689D", 17: "#19486A",
};

const SDG_GRADIENTS: Record<number, string> = {
  1:  "linear-gradient(135deg, #E5243B 0%, #FF6B35 100%)",   // No Poverty — red → orange
  2:  "linear-gradient(135deg, #DDA63A 0%, #F4D03F 100%)",   // Zero Hunger — mustard → gold
  3:  "linear-gradient(135deg, #4C9F38 0%, #8BC34A 100%)",   // Health — emerald → lime
  4:  "linear-gradient(135deg, #C5192D 0%, #E74C3C 100%)",   // Education — crimson → coral
  5:  "linear-gradient(135deg, #FF3A21 0%, #FF8A65 100%)",   // Gender — vermillion → peach
  6:  "linear-gradient(135deg, #26BDE2 0%, #64C8FF 100%)",   // Water — cyan → sky
  7:  "linear-gradient(135deg, #FCC30B 0%, #FFD54F 100%)",   // Energy — sunflower → wheat
  8:  "linear-gradient(135deg, #A21942 0%, #C2185B 100%)",   // Decent Work — burgundy → pink
  9:  "linear-gradient(135deg, #FD6925 0%, #FF8A50 100%)",   // Industry — orange → tangerine
  10: "linear-gradient(135deg, #DD1367 0%, #E91E63 100%)",   // Inequalities — magenta → rose
  11: "linear-gradient(135deg, #FD9D24 0%, #FFB74D 100%)",   // Cities — amber → apricot
  12: "linear-gradient(135deg, #BF8B2E 0%, #D4A24C 100%)",   // Consumption — bronze → khaki
  13: "linear-gradient(135deg, #3F7E44 0%, #66BB6A 100%)",   // Climate — forest → moss
  14: "linear-gradient(135deg, #0A97D9 0%, #29B6F6 100%)",   // Life Below Water — ocean → azure
  15: "linear-gradient(135deg, #56C02B 0%, #9CCC65 100%)",   // Life on Land — leaf → spring
  16: "linear-gradient(135deg, #00689D 0%, #1E88E5 100%)",   // Peace — navy → cobalt
  17: "linear-gradient(135deg, #19486A 0%, #3F6D9A 100%)",   // Partnerships — midnight → steel
};

const DEFAULT_GRADIENT = "linear-gradient(135deg, #0f2a4a 0%, #4ea8de 100%)";

/**
 * Get a CSS gradient string for the SDG (1-17). Falls back to ForaHub brand
 * navy → blue when no SDG is provided.
 */
export function getSdgFallbackGradient(sdgNumber?: number | null): string {
  if (sdgNumber && SDG_GRADIENTS[sdgNumber]) return SDG_GRADIENTS[sdgNumber];
  return DEFAULT_GRADIENT;
}

export function getSdgColor(sdgNumber?: number | null): string | null {
  if (!sdgNumber) return null;
  return SDG_COLORS[sdgNumber] ?? null;
}
