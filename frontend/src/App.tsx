import { Routes, Route } from 'react-router-dom'
import AboutPage from './pages/AboutPage'
import LoginPage from './pages/LoginPage'
import FormPage from './pages/FormPage'
import EmotionCheckPage from './pages/EmotionCheckPage'
import InterviewPage from './pages/InterviewPage'
import ReportPage from './pages/ReportPage'
import DashboardPage from './pages/DashboardPage'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <Routes>
      <Route path="/" element={<AboutPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/form" element={<ProtectedRoute><FormPage /></ProtectedRoute>} />
      <Route path="/emotion-check" element={<ProtectedRoute><EmotionCheckPage /></ProtectedRoute>} />
      <Route path="/interview" element={<ProtectedRoute><InterviewPage /></ProtectedRoute>} />
      <Route path="/report" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
      <Route path="/report/:id" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
    </Routes>
  )
}

export default App