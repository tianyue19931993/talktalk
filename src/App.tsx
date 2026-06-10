import { Routes, Route, Navigate } from 'react-router-dom'
import MobileLayout from './components/mobile/MobileLayout'
import AdminLayout from './components/admin/AdminLayout'
import HomePage from './pages/mobile/HomePage'
import LessonListPage from './pages/mobile/LessonListPage'
import LessonDetailPage from './pages/mobile/LessonDetailPage'
import DemoPage from './pages/mobile/DemoPage'
import MyPage from './pages/mobile/MyPage'
import LessonManagePage from './pages/admin/LessonManagePage'
import LessonEditPage from './pages/admin/LessonEditPage'
import TypeManagePage from './pages/admin/TypeManagePage'
import TagManagePage from './pages/admin/TagManagePage'

export default function App() {
  return (
    <Routes>
      {/* Mobile routes */}
      <Route element={<MobileLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/lessons" element={<LessonListPage />} />
        <Route path="/lesson/:id" element={<LessonDetailPage />} />
        <Route path="/my" element={<MyPage />} />
      </Route>

      {/* Demo - full screen, no layout */}
      <Route path="/demo/:lessonId/:demoId" element={<DemoPage />} />

      {/* Admin routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/lessons" replace />} />
        <Route path="lessons" element={<LessonManagePage />} />
        <Route path="lesson/edit/:id" element={<LessonEditPage />} />
        <Route path="lesson/new" element={<LessonEditPage />} />
        <Route path="types" element={<TypeManagePage />} />
        <Route path="tags" element={<TagManagePage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
