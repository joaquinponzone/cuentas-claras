import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './components/protected-route'
import { AppLayout } from './components/layout/app-layout'
import LoginPage from './pages/login'
import RegisterPage from './pages/register'
import DashboardPage from './pages/dashboard'
import ExpensesPage from './pages/expenses'
import IncomesPage from './pages/incomes'
import CategoriesPage from './pages/categories'
import RecurringPage from './pages/recurring'
import ImportPage from './pages/import'
import GroupsPage from './pages/groups'
import GroupDetailPage from './pages/group-detail'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/incomes" element={<IncomesPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/recurring" element={<RecurringPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/groups/:id" element={<GroupDetailPage />} />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  )
}

export default App
