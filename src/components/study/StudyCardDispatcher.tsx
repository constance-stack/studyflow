import { FlashcardPlayer } from './FlashcardPlayer'
import { QCMPlayer } from './QCMPlayer'
import { MiniLessonPlayer } from './MiniLessonPlayer'
import { OpenQuestionPlayer } from './OpenQuestionPlayer'
import { TrueFalsePlayer } from './TrueFalsePlayer'
import { BlankPlayer } from './BlankPlayer'
import { MatchPlayer } from './MatchPlayer'
import { VocabPlayer } from './VocabPlayer'
import { TimelinePlayer } from './TimelinePlayer'
import { ReflectionPlayer } from './ReflectionPlayer'
import { ExercisePlayer } from './ExercisePlayer'
import type { StudyItem } from '../../srs/deck'
import type {
  FlashcardItem,
  MiniLessonItem,
  OpenQuestionItem,
  QCMItem,
  TrueFalseItem,
  BlankItem,
  MatchPair,
  VocabItem,
  TimelineEvent,
  ReflectionItem,
  ExerciseItem,
} from '../../ai/generate'
import type { MasteryLevel } from '../../db/types'

export function StudyCardDispatcher({ item, onRate }: { item: StudyItem; onRate: (rating: MasteryLevel) => void }) {
  switch (item.type) {
    case 'flashcard':
      return <FlashcardPlayer card={item.payload as FlashcardItem} onRate={onRate} />
    case 'qcm':
      return <QCMPlayer question={item.payload as QCMItem} onRate={onRate} />
    case 'minilesson':
      return <MiniLessonPlayer lesson={item.payload as MiniLessonItem} onRate={onRate} />
    case 'open':
      return <OpenQuestionPlayer question={item.payload as OpenQuestionItem} onRate={onRate} />
    case 'truefalse':
      return <TrueFalsePlayer item={item.payload as TrueFalseItem} onRate={onRate} />
    case 'blank':
      return <BlankPlayer item={item.payload as BlankItem} onRate={onRate} />
    case 'match':
      return <MatchPlayer pairs={(item.payload as { pairs: MatchPair[] }).pairs} onRate={onRate} />
    case 'vocab':
      return <VocabPlayer item={item.payload as VocabItem} onRate={onRate} />
    case 'timeline':
      return <TimelinePlayer events={(item.payload as { events: TimelineEvent[] }).events} onRate={onRate} />
    case 'reflection':
      return <ReflectionPlayer item={item.payload as ReflectionItem} onRate={onRate} />
    case 'miniexercise':
    case 'exercise':
      return <ExercisePlayer item={item.payload as ExerciseItem} onRate={onRate} />
    default:
      return <p className="text-sm text-[var(--color-text-muted)]">Type d'activité non pris en charge.</p>
  }
}
