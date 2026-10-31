import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import { FundiLayout } from './components/layout/FundiLayout';
import RequireAuth from './components/RequireAuth';
import SplashScreen from './components/SplashScreen';
import { AuthProvider } from './context/AuthContext';

// The login screen loads eagerly (first paint); everything else is split so
// the initial bundle stays small on slow connections.
import LoginPage from './pages/public/LoginPage';

const ClientDashboard = lazy(() => import('./pages/client/Dashboard'));
const RequestJobPage = lazy(() => import('./pages/client/RequestJobPage'));
const MyRequestsPage = lazy(() => import('./pages/client/MyRequestsPage'));
const RequestProcessingPage = lazy(() => import('./pages/client/RequestProcessingPage'));
const AvailableFundisPage = lazy(() => import('./pages/client/AvailableFundisPage'));
const FundiProfilePage = lazy(() => import('./pages/client/FundiProfilePage'));
const BookingPage = lazy(() => import('./pages/client/BookingPage'));
const BookingConfirmedPage = lazy(() => import('./pages/client/BookingConfirmedPage'));
const JobTrackingPage = lazy(() => import('./pages/client/JobTrackingPage'));
const MessagesPage = lazy(() => import('./pages/client/MessagesPage'));
const ReviewsPage = lazy(() => import('./pages/client/ReviewsPage'));
const ProfilePage = lazy(() => import('./pages/client/ProfilePage'));
const SettingsPage = lazy(() => import('./pages/client/SettingsPage'));

const FundiDashboardPage = lazy(() => import('./pages/fundi/FundiDashboard'));
const FundiJobsPage = lazy(() => import('./pages/fundi/FundiJobsPage'));
const FundiJobDetailPage = lazy(() => import('./pages/fundi/FundiJobDetailPage'));
const FundiEarningsPage = lazy(() => import('./pages/fundi/FundiEarningsPage'));
const FundiProfileSettingsPage = lazy(() => import('./pages/fundi/FundiProfileSettingsPage'));

import { AdminStoreProvider } from './pages/admin/context/AdminStore';
import AdminLayout from './pages/admin/AdminLayout';
const DashboardOverview = lazy(() => import('./pages/admin/DashboardOverview'));
const JobRequestsPage = lazy(() => import('./pages/admin/JobRequestsPage'));
const JobRequestDetailPage = lazy(() => import('./pages/admin/JobRequestDetailPage'));
const FundisPage = lazy(() => import('./pages/admin/FundisPage'));
const BookingsPage = lazy(() => import('./pages/admin/BookingsPage'));
const AdminFundiProfilePage = lazy(() => import('./pages/admin/FundiProfilePage'));
const UsersPage = lazy(() => import('./pages/admin/UsersPage'));
const VerificationsPage = lazy(() => import('./pages/admin/VerificationsPage'));
const ReportsPage = lazy(() => import('./pages/admin/ReportsPage'));
const AuditTrailPage = lazy(() => import('./pages/admin/AuditTrailPage'));
const AdminSettingsPage = lazy(() => import('./pages/admin/SettingsPage'));
const AdminProfilePage = lazy(() => import('./pages/admin/ProfilePage'));

function RouteFallback() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-line border-t-primary animate-spin" />
    </div>
  );
}

function App() {
  return (
    <>
    <SplashScreen />
    <AuthProvider>
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />

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
          <Route path="verifications" element={<VerificationsPage />} />
          <Route path="fundis" element={<FundisPage />} />
          <Route path="fundis/:id" element={<AdminFundiProfilePage />} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="audit" element={<AuditTrailPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="profile" element={<AdminProfilePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
    </AuthProvider>
    </>
  );
}

export default App;
