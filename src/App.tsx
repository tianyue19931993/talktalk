import { Routes, Route, Navigate } from 'react-router-dom'
import MobileLayout from './components/mobile/MobileLayout'
import AdminLayout from './components/admin/AdminLayout'
import HomePage from './pages/mobile/HomePage'
import DemoPage from './pages/mobile/DemoPage'
import MyPage from './pages/mobile/MyPage'
import LoginPage from './pages/mobile/LoginPage'
import SubscribePage from './pages/mobile/SubscribePage'
import OrdersPage from './pages/mobile/OrdersPage'
import MyQuestionsPage from './pages/mobile/MyQuestionsPage'
import MyQuestionDetailPage from './pages/mobile/MyQuestionDetailPage'
import MyDemoPage from './pages/mobile/MyDemoPage'
// import ExperimentPage from './pages/ExperimentPage'
import LessonManagePage from './pages/admin/LessonManagePage'
import LessonEditPage from './pages/admin/LessonEditPage'
import TypeManagePage from './pages/admin/TypeManagePage'
import TagManagePage from './pages/admin/TagManagePage'
import UserManagePage from './pages/admin/UserManagePage'
import PlanManagePage from './pages/admin/PlanManagePage'
import SubscriptionManagePage from './pages/admin/SubscriptionManagePage'
import OrderManagePage from './pages/admin/OrderManagePage'
import UserQuestionManagePage from './pages/admin/UserQuestionManagePage'
import ConfigsManagePage from './pages/admin/ConfigsManagePage'
import ComponentPreviewPage from './pages/admin/ComponentPreviewPage'
import MathComponentPreviewPage from './pages/admin/MathComponentPreviewPage'

export default function App() {
  return (
    <Routes>
      {/* Mobile routes */}
      <Route element={<MobileLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/lessons" element={<Navigate to="/my/questions" replace />} />
        <Route path="/lesson/:id" element={<Navigate to="/my/questions" replace />} />
        <Route path="/my/questions" element={<MyQuestionsPage />} />
        <Route path="/my" element={<MyPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/subscribe" element={<SubscribePage />} />
        <Route path="/orders" element={<OrdersPage />} />
      </Route>

      {/* Mobile full-screen pages (no bottom nav) */}
      <Route path="/my/question/:id" element={<MyQuestionDetailPage />} />
      <Route path="/my/demo/:demoId" element={<MyDemoPage />} />

      {/* 组件实验 — 暂不使用 */}
      {/* <Route path="/experiment/:demoId" element={<ExperimentPage />} /> */}

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
        <Route path="users" element={<UserManagePage />} />
        <Route path="plans" element={<PlanManagePage />} />
        <Route path="subscriptions" element={<SubscriptionManagePage />} />
        <Route path="orders" element={<OrderManagePage />} />
        <Route path="user-questions" element={<UserQuestionManagePage />} />
        <Route path="configs" element={<ConfigsManagePage />} />
        <Route path="component-preview" element={<ComponentPreviewPage />} />
        <Route path="math-components" element={<MathComponentPreviewPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
