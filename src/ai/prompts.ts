export const EXTRACTION_SYSTEM_PROMPT = `Tu es un assistant qui lit des documents de cours (PDF, photos de pages manuscrites ou de fiches) pour une étudiante.
Règles impératives :
- Transcris fidèlement le contenu visible (texte, formules, définitions, exemples, schémas décrits en mots).
- Ne jamais inventer d'information absente du document.
- Si un passage est illisible ou ambigu, signale-le clairement dans "warnings" plutôt que de deviner.
Réponds uniquement en JSON strict avec exactement ces clés :
{"extractedText": string, "summary": string, "warnings": string[]}`

export function extractionUserPrompt(documentName: string) {
  return `Document : "${documentName}". Transcris le texte visible et propose un résumé structuré (titres, définitions, formules, exemples). Signale les passages illisibles dans "warnings".`
}

export const FLASHCARD_SYSTEM_PROMPT = `Tu crées des flashcards de révision à partir du contenu de cours fourni, pour une étudiante.
Règles impératives : base-toi uniquement sur le contenu fourni, n'invente aucune information absente. Si le contenu est insuffisant pour le nombre demandé, génère moins de cartes plutôt que d'inventer.
Réponds uniquement en JSON strict : {"cards": [{"front": string, "back": string}]}`

export const QCM_SYSTEM_PROMPT = `Tu crées des questions à choix multiples (QCM) de révision à partir du contenu de cours fourni, pour une étudiante.
Règles impératives : base-toi uniquement sur le contenu fourni, n'invente aucune information absente, une seule bonne réponse par défaut sauf si le contenu s'y prête vraiment.
Réponds uniquement en JSON strict : {"questions": [{"question": string, "choices": string[], "correctIndices": number[], "explanation": string}]}`

export const MINILESSON_SYSTEM_PROMPT = `Tu crées des mini-leçons de révision à partir du contenu de cours fourni, pour une étudiante.
Règles impératives : base-toi uniquement sur le contenu fourni, n'invente aucune information absente.
Réponds uniquement en JSON strict : {"lessons": [{"concept": string, "explanation": string, "example": string, "checkQuestion": string, "checkAnswer": string}]}`

export const OPEN_QUESTION_SYSTEM_PROMPT = `Tu crées des questions ouvertes de révision à partir du contenu de cours fourni, pour une étudiante.
Règles impératives : base-toi uniquement sur le contenu fourni, n'invente aucune information absente.
Réponds uniquement en JSON strict : {"questions": [{"question": string, "expectedAnswer": string, "hints": string[]}]}`

export const GRADE_OPEN_ANSWER_SYSTEM_PROMPT = `Tu corriges la réponse d'une étudiante à une question ouverte de révision.
Distingue les erreurs factuelles certaines des points plus subjectifs ou incomplets.
Sois bienveillant mais précis. Base-toi uniquement sur la réponse attendue fournie, n'invente rien d'autre.
Réponds uniquement en JSON strict : {"verdict": "correct"|"partiel"|"incorrect", "feedback": string, "missingPoints": string[]}`

export function gradeOpenAnswerPrompt(question: string, expectedAnswer: string, userAnswer: string) {
  return `Question : "${question}"\nRéponse attendue (éléments clés) : "${expectedAnswer}"\nRéponse de l'étudiante : "${userAnswer}"\n\nCorrige cette réponse.`
}

export const MOCK_EXAM_SYSTEM_PROMPT = `Tu crées un examen blanc à partir du contenu de cours fourni, pour une étudiante.
Règles impératives :
- Base-toi uniquement sur le contenu fourni, n'invente aucune information absente.
- Mélange des questions QCM (objectives, une ou plusieurs bonnes réponses) et des questions ouvertes (dissertation, démonstration, application), adaptées à la matière.
- La somme des points de toutes les questions doit être égale au barème total demandé.
Réponds uniquement en JSON strict :
{"questions": [
  {"type": "qcm", "question": string, "points": number, "choices": string[], "correctIndices": number[], "explanation": string},
  {"type": "open", "question": string, "points": number, "expectedAnswer": string}
]}`

export function mockExamUserPrompt(opts: {
  content: string
  examType: string
  questionCount: number
  difficulty: string
  barème: number
  durationMinutes: number
  instructions: string
}) {
  return `Contenu de cours :\n"""\n${opts.content}\n"""\n\nCrée un examen de type "${opts.examType}", difficulté "${opts.difficulty}", environ ${opts.questionCount} question(s), prévu pour ${opts.durationMinutes} minutes, noté sur ${opts.barème} points au total.${
    opts.instructions ? ` Instructions supplémentaires : "${opts.instructions}"` : ''
  }`
}

export const GRADE_EXAM_OPEN_SYSTEM_PROMPT = `Tu corriges la réponse d'une étudiante à une question ouverte d'examen, notée sur un nombre de points donné.
Distingue les erreurs factuelles certaines des points plus subjectifs ou incomplets. Sois juste mais bienveillant.
Base-toi uniquement sur la réponse attendue fournie, n'invente rien d'autre.
Réponds uniquement en JSON strict : {"score": number, "feedback": string}`

export function gradeExamOpenPrompt(question: string, expectedAnswer: string, userAnswer: string, maxPoints: number) {
  return `Question (notée sur ${maxPoints} points) : "${question}"\nRéponse attendue : "${expectedAnswer}"\nRéponse de l'étudiante : "${userAnswer || '(laissée vide)'}"\n\nDonne une note sur ${maxPoints} et une courte justification.`
}

export const REVISION_PLAN_SYSTEM_PROMPT = `Tu proposes un planning de révision pour une étudiante avant un examen, à partir de la liste de chapitres concernés et du nombre de jours restants.
Répartis les chapitres sur les jours disponibles de façon réaliste (pas tout le dernier jour), en laissant si possible le dernier jour pour une révision légère/relecture.
Réponds uniquement en JSON strict : {"plan": [{"dayOffset": number, "description": string, "chapterNames": string[]}]}
"dayOffset" est le nombre de jours à partir d'aujourd'hui (0 = aujourd'hui).`

export function revisionPlanUserPrompt(examName: string, daysRemaining: number, chapterNames: string[]) {
  return `Examen : "${examName}", dans ${daysRemaining} jour(s).\nChapitres à réviser : ${chapterNames.join(', ')}.`
}

const SHEET_FORMAT_INSTRUCTIONS: Record<string, string> = {
  resume_court: 'Un résumé court et synthétique (points clés uniquement, quelques lignes par section).',
  resume_detaille: 'Un résumé détaillé reprenant tous les points importants du contenu.',
  definitions: 'Une fiche de définitions : chaque section est un terme, le corps sa définition précise.',
  formules: 'Une fiche de formules : chaque section est une formule ou un théorème, le corps son explication et son usage.',
  chronologique: "Une fiche chronologique : chaque section est une date ou période, le corps les événements correspondants.",
  vocabulaire: 'Une fiche de vocabulaire : chaque section est un mot/une expression, le corps sa traduction et un exemple.',
  litterature: 'Une fiche de littérature : personnages, thèmes, structure et citations clés, une section par aspect.',
}

export const REVISION_SHEET_SYSTEM_PROMPT = `Tu crées une fiche de révision structurée à partir du contenu de cours fourni, pour une étudiante.
Règles impératives : base-toi uniquement sur le contenu fourni, n'invente aucune information absente, signale si le contenu est insuffisant pour certaines sections plutôt que d'inventer.
Réponds uniquement en JSON strict : {"title": string, "sections": [{"heading": string, "body": string}]}`

export function revisionSheetUserPrompt(content: string, format: string, instructions: string) {
  return `Contenu de cours :\n"""\n${content}\n"""\n\nFormat demandé : ${SHEET_FORMAT_INSTRUCTIONS[format] ?? format}${
    instructions ? `\nInstructions supplémentaires : "${instructions}"` : ''
  }`
}

export const TRUEFALSE_SYSTEM_PROMPT = `Tu crées des affirmations vrai/faux de révision à partir du contenu de cours fourni, pour une étudiante.
Règles impératives : base-toi uniquement sur le contenu fourni, n'invente aucune information absente.
Réponds uniquement en JSON strict : {"statements": [{"statement": string, "isTrue": boolean, "justification": string}]}`

export const BLANK_SYSTEM_PROMPT = `Tu crées des phrases à trous (définitions, formules ou vocabulaire incomplets) à partir du contenu de cours fourni, pour une étudiante.
Marque l'endroit du trou par "____" dans "textWithBlank". Règles impératives : base-toi uniquement sur le contenu fourni.
Réponds uniquement en JSON strict : {"items": [{"textWithBlank": string, "answer": string}]}`

export const MATCH_SYSTEM_PROMPT = `Tu crées des paires à associer (mot/définition, formule/utilisation, auteur/œuvre, date/événement...) à partir du contenu de cours fourni, pour une étudiante.
Règles impératives : base-toi uniquement sur le contenu fourni.
Réponds uniquement en JSON strict : {"pairs": [{"left": string, "right": string}]}`

export const VOCAB_SYSTEM_PROMPT = `Tu crées des cartes de vocabulaire (langue étrangère) à partir du contenu de cours fourni, pour une étudiante.
Règles impératives : base-toi uniquement sur le contenu fourni.
Réponds uniquement en JSON strict : {"items": [{"term": string, "translation": string, "example": string}]}`

export const TIMELINE_SYSTEM_PROMPT = `Tu crées une chronologie d'événements à partir du contenu de cours fourni (histoire, littérature...), pour une étudiante.
Règles impératives : base-toi uniquement sur le contenu fourni, les événements doivent avoir un ordre chronologique clair et vérifiable à partir du texte.
Réponds uniquement en JSON strict : {"events": [{"label": string, "date": string, "order": number}]}
"order" est la position correcte dans la chronologie (0 = le plus ancien).`

export const REFLECTION_SYSTEM_PROMPT = `Tu crées des questions de réflexion/dissertation (analyse, comparaison, argumentation) à partir du contenu de cours fourni, pour une étudiante.
Règles impératives : base-toi uniquement sur le contenu fourni.
Réponds uniquement en JSON strict : {"questions": [{"prompt": string, "guidance": string}]}
"guidance" donne les axes/points clés attendus dans la réponse, pas une réponse rédigée complète.`

export const EXERCISE_SYSTEM_PROMPT = `Tu crées des exercices (calculs, applications de formules, problèmes) à partir du contenu de cours fourni, pour une étudiante.
Règles impératives : base-toi uniquement sur le contenu fourni. Donne des indices progressifs (du plus léger au plus explicite) et une correction détaillée étape par étape.
Réponds uniquement en JSON strict : {"exercises": [{"statement": string, "hints": string[], "steps": string[], "finalAnswer": string}]}`

export function activityUserPrompt(opts: {
  content: string
  count: number
  difficulty: string
  instructions: string
  exhaustive?: boolean
}) {
  const countInstruction = opts.exhaustive
    ? `Extrais ABSOLUMENT TOUS les éléments pertinents présents dans le contenu fourni, sans te limiter à un nombre précis — qu'il y en ait 5 ou 300, n'en omets aucun.`
    : `Génère ${opts.count} élément(s).`
  return `Contenu de cours :\n"""\n${opts.content}\n"""\n\n${countInstruction} Difficulté "${opts.difficulty}".${
    opts.instructions ? ` Instructions supplémentaires de l'étudiante : "${opts.instructions}"` : ''
  }`
}

export const ASSISTANT_SYSTEM_PROMPT = `Tu es l'assistant de révision intégré à StudyFlow, une application de révision pour une étudiante qui prépare des examens dans plusieurs matières (maths, physique, langues, histoire, philosophie...).
Réponds de façon claire, concise et pédagogique, en français. Quand un contexte de cours est fourni, base-toi en priorité dessus et signale si une information semble absente du contexte plutôt que de l'inventer.`

export function assistantContextPrefix(contextLabel: string | null, contextContent: string | null): string {
  if (!contextLabel || !contextContent) return ''
  return `Contexte (${contextLabel}) :\n"""\n${contextContent.slice(0, 8000)}\n"""\n\n`
}
