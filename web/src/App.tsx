import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import { FundiLayout } from './components/layout/FundiLayout';
import RequireAuth from './components/RequireAuth';
import { AuthProvider } from './context/AuthContext';

import LandingPage from './pages/public/LandingPage';
import HowItWorksPage from './pages/public/HowItWorksPage';
import ForClientsPage from './pages/public/ForClientsPage';
import ForFundisPage from './pages/public/ForFundisPage';
import AboutPage from './pages/public/AboutPage';
import LoginPage from './pages/public/LoginPage';
import SignupPage from './pages/public/SignupPage';

import ClientDashboard from './pages/client/Dashboard';
import RequestJobPage from './pages/client/RequestJobPage';
import MyRequestsPage from './pages/client/MyRequestsPage';
import RequestProcessingPage from './pages/client/RequestProcessingPage';
import AvailableFundisPage from './pages/client/AvailableFundisPage';
import FundiProfilePage from './pages/client/FundiProfilePage';
import BookingPage from './pages/client/BookingPage';
import BookingConfirmedPage from './pages/client/BookingConfirmedPage';
import JobTrackingPage from './pages/client/JobTrackingPage';
import MessagesPage from './pages/client/MessagesPage';
import ReviewsPage from './pages/client/ReviewsPage';
import ProfilePage from './pages/client/ProfilePage';
import SettingsPage from './pages/client/SettingsPage';

import FundiDashboardPage from './pages/fundi/FundiDashboard';
import FundiJobsPage from './pages/fundi/FundiJobsPage';
import FundiJobDetailPage from './pages/fundi/FundiJobDetailPage';
import FundiEarningsPage from './pages/fundi/FundiEarningsPage';
import FundiProfileSettingsPage from './pages/fundi/FundiProfileSettingsPage';

import { AdminStoreProvider } from './pages/admin/context/AdminStore';
import AdminLayout from './pages/admin/AdminLayout';
import DashboardOverview from './pages/admin/DashboardOverview';
import JobRequestsPage from './pages/admin/JobRequestsPage';
import JobRequestDetailPage from './pages/admin/JobRequestDetailPage';
import AssignSurveyorPage from './pages/admin/AssignSurveyorPage';
import EstimatesPage from './pages/admin/EstimatesPage';
import EstimateDetailPage from './pages/admin/EstimateDetailPage';
import FundisPage from './pages/admin/FundisPage';
import SurveyorsPage from './pages/admin/SurveyorsPage';
import BookingsPage from './pages/admin/BookingsPage';
import AdminFundiProfilePage from './pages/admin/FundiProfilePage';
import UsersPage from './pages/admin/UsersPage';
import ReportsPage from './pages/admin/ReportsPage';
import AdminSettingsPage from './pages/admin/SettingsPage';

import SurveyorLayout from './pages/surveyor/SurveyorLayout';
import AssignedRequestsPage from './pages/surveyor/AssignedRequestsPage';

function App() {
  return (
    <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/for-clients" element={<ForClientsPage />} />
        <Route path="/for-fundis" element={<ForFundisPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route path="/client" element={<RequireAuth role="customer"><AppLayout /></RequireAuth>}>
          <Route index element={<ClientDashboard />} />
          <Route path="request" element={<RequestJobPage />} />
          <Route path="requests" element={<MyRequestsPage />} />
          <Route path="request-processing" element={<RequestProcessingPage />} />
          <Route path="fundis" element={<AvailableFundisPage />} />
          <Route path="fundi/:id" element={<FundiProfilePage />} />
          <Route path="booking" element={<BookingPage />} />
          <Route path="booking-confirmed" element={<BookingConfirmedPage />} />
          <Route path="tracking" element={<JobTrackingPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="reviews" element={<ReviewsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="/fundi" element={
          <RequireAuth role="fundi">
            <FundiLayout>
              <FundiDashboardPage />
            </FundiLayout>
          </RequireAuth>
        } />
        <Route path="/fundi/jobs" element={
          <RequireAuth role="fundi">
            <FundiLayout>
              <FundiJobsPage />
            </FundiLayout>
          </RequireAuth>
        } />
        <Route path="/fundi/job/:id" element={
          <RequireAuth role="fundi">
            <FundiLayout>
              <FundiJobDetailPage />
            </FundiLayout>
          </RequireAuth>
        } />
        <Route path="/fundi/earnings" element={
          <RequireAuth role="fundi">
            <FundiLayout>
              <FundiEarningsPage />
            </FundiLayout>
          </RequireAuth>
        } />
        <Route path="/fundi/profile" element={
          <RequireAuth role="fundi">
            <FundiLayout>
              <FundiProfileSettingsPage />
            </FundiLayout>
          </RequireAuth>
        } />
        <Route path="/fundi/settings" element={
          <RequireAuth role="fundi">
            <FundiLayout>
              <SettingsPage />
            </FundiLayout>
          </RequireAuth>
        } />

        <Route path="/admin" element={
          <RequireAuth role="admin">
            <AdminStoreProvider>
              <AdminLayout />
            </AdminStoreProvider>
          </RequireAuth>
        }>
          <Route index element={<DashboardOverview />} />
          <Route path="requests" element={<JobRequestsPage />} />
          <Route path="requests/:id" element={<JobRequestDetailPage />} />
          <Route path="requests/:id/assign" element={<AssignSurveyorPage />} />
          <Route path="estimates" element={<EstimatesPage />} />
          <Route path="estimates/:id" element={<EstimateDetailPage />} />
          <Route path="fundis" element={<FundisPage />} />
          <Route path="fundis/:id" element={<AdminFundiProfilePage />} />
          <Route path="surveyors" element={<SurveyorsPage />} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>

        <Route path="/surveyor" element={
          <RequireAuth role="surveyor">
            <SurveyorLayout />
          </RequireAuth>
        }>
          <Route index element={<AssignedRequestsPage />} />
          <Route path="estimate/:id" element={<EstimateDetailPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
