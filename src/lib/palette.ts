// Pastel, discreet palette (section 17: "couleurs pastel discrètes").
export const SUBJECT_COLORS = [
  '#818cf8', // indigo
  '#60a5fa', // blue
  '#38bdf8', // sky
  '#2dd4bf', // teal
  '#4ade80', // green
  '#a3e635', // lime
  '#facc15', // yellow
  '#fb923c', // orange
  '#f87171', // red
  '#f472b6', // pink
  '#c084fc', // purple
  '#a8a29e', // stone
] as const

// Subject icon names, mapped to lucide-react components (see IconPicker).
export const SUBJECT_ICONS = [
  'Sigma',
  'Atom',
  'FlaskConical',
  'Dna',
  'Landmark',
  'BookOpen',
  'Languages',
  'Globe',
  'Calculator',
  'Brain',
  'Palette',
  'Music',
  'Scale',
  'Leaf',
  'Rocket',
  'Code',
  'PenTool',
  'Theater',
  'Compass',
  'Hourglass',
] as const

export type SubjectIconName = (typeof SUBJECT_ICONS)[number]
