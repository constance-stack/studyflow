import {
  Sigma,
  Atom,
  FlaskConical,
  Dna,
  Landmark,
  BookOpen,
  Languages,
  Globe,
  Calculator,
  Brain,
  Palette,
  Music,
  Scale,
  Leaf,
  Rocket,
  Code,
  PenTool,
  Theater,
  Compass,
  Hourglass,
  Folder,
  type LucideProps,
} from 'lucide-react'

export const ICONS: Record<string, React.ComponentType<LucideProps>> = {
  Sigma,
  Atom,
  FlaskConical,
  Dna,
  Landmark,
  BookOpen,
  Languages,
  Globe,
  Calculator,
  Brain,
  Palette,
  Music,
  Scale,
  Leaf,
  Rocket,
  Code,
  PenTool,
  Theater,
  Compass,
  Hourglass,
}

export function SubjectIcon({ name, ...props }: { name: string } & LucideProps) {
  const Comp = ICONS[name] ?? Folder
  return <Comp {...props} />
}
