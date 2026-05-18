import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import './index.css'

import Login         from './pages/Login'
import App           from './App'
import CourseLibrary from './pages/CourseLibrary'
import CourseEditor  from './pages/CourseEditor'
import UserManagement      from './pages/admin/UserManagement'
import ReportingDashboard  from './pages/admin/ReportingDashboard'
import LearnerPortal       from './pages/learner/LearnerPortal'
import CoursePlayer        from './pages/learner/CoursePlayer'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/courses" replace />} />

          {/* Protected shell — renders Sidebar + TopBar */}
          <Route element={<ProtectedRoute><App /></ProtectedRoute>}>

            {/* Author + Admin */}
            <Route path="/courses" element={
              <ProtectedRoute roles={['ADMIN','AUTHOR']}>
                <CourseLibrary />
              </ProtectedRoute>
            }/>
            <Route path="/courses/:id/*" element={
              <ProtectedRoute roles={['ADMIN','AUTHOR']}>
                <CourseEditor />
              </ProtectedRoute>
            }/>

            {/* Admin only */}
            <Route path="/admin/users" element={
              <ProtectedRoute roles={['ADMIN']}>
                <UserManagement />
              </ProtectedRoute>
            }/>
            <Route path="/admin/reports" element={
              <ProtectedRoute roles={['ADMIN']}>
                <ReportingDashboard />
              </ProtectedRoute>
            }/>

            {/* Learner */}
            <Route path="/learn" element={
              <ProtectedRoute roles={['LEARNER','ADMIN']}>
                <LearnerPortal />
              </ProtectedRoute>
            }/>
            <Route path="/learn/course/:id" element={
              <ProtectedRoute roles={['LEARNER','ADMIN']}>
                <CoursePlayer />
              </ProtectedRoute>
            }/>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>
)
