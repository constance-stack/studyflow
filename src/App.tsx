import { Routes, Route } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { Dashboard } from './pages/Dashboard'
import { Library } from './pages/Library'
import { SubjectExplorer } from './pages/SubjectExplorer'
import { ChapterView } from './pages/ChapterView'
import { DocumentViewer } from './pages/DocumentViewer'
import { Review } from './pages/Review'
import { StudySession } from './pages/StudySession'
import { ExamTaking } from './pages/ExamTaking'
import { ExamAttemptReview } from './pages/ExamAttemptReview'
import { FichePage } from './pages/FichePage'
import { NotionsBrowser } from './pages/NotionsBrowser'
import { FocusMode } from './pages/FocusMode'
import { Exams } from './pages/Exams'
import { CalendarPage } from './pages/CalendarPage'
import { Stats } from './pages/Stats'
import { Assistant } from './pages/Assistant'
import { More } from './pages/More'
import { Search } from './pages/Search'

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/library" element={<Library />} />
        <Route path="/library/:subjectId" element={<SubjectExplorer />} />
        <Route path="/library/:subjectId/folder/:folderId" element={<SubjectExplorer />} />
        <Route path="/review" element={<Review />} />
        <Route path="/exams" element={<Exams />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/more" element={<More />} />
      </Route>
      <Route path="/chapter/:chapterId" element={<ChapterView />} />
      <Route path="/document/:documentId" element={<DocumentViewer />} />
      <Route path="/search" element={<Search />} />
      <Route path="/review/session" element={<StudySession />} />
      <Route path="/exams/take" element={<ExamTaking />} />
      <Route path="/exams/review/:attemptId" element={<ExamAttemptReview />} />
      <Route path="/fiche/:sheetId" element={<FichePage />} />
      <Route path="/notions" element={<NotionsBrowser />} />
      <Route path="/focus" element={<FocusMode />} />
    </Routes>
  )
}

export default App
