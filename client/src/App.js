import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useTranslation } from 'react-i18next';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Components
import Navbar from './components/Layout/Navbar';
import Footer from './components/Layout/Footer';
import Loading from './components/Common/Loading';

// Pages
import Home from './pages/Home';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import VerifyEmail from './pages/Auth/VerifyEmail';
import ResetPassword from './pages/Auth/ResetPassword';
import AdvertiserDashboard from './pages/Dashboards/AdvertiserDashboard';
import SubscriberDashboard from './pages/Dashboards/SubscriberDashboard';
import AdminDashboard from './pages/Dashboards/AdminDashboard';
import AdDetails from './pages/Ads/AdDetails';
import CreateAd from './pages/Ads/CreateAd';
import Messages from './pages/Messages/Messages';
import Blog from './pages/Blog/Blog';
import Profile from './pages/Profile/Profile';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <Loading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  return children;
};

// Public Route (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <Loading />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

function App() {
  const { i18n } = useTranslation();

  // Set document direction based on language
  React.useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return (
    <Router>
      <div className="App">
        <Navbar />
        <main style={{ minHeight: 'calc(100vh - 200px)' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            
            {/* Auth Routes */}
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/verify-email/:token" element={<VerifyEmail />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            
            {/* Dashboard Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <DashboardRouter />
                </ProtectedRoute>
              } 
            />
            
            {/* Ad Routes */}
            <Route path="/ads/:id" element={<AdDetails />} />
            <Route 
              path="/ads/create" 
              element={
                <ProtectedRoute allowedRoles={['advertiser']}>
                  <CreateAd />
                </ProtectedRoute>
              } 
            />
            
            {/* Messages */}
            <Route 
              path="/messages" 
              element={
                <ProtectedRoute>
                  <Messages />
                </ProtectedRoute>
              } 
            />
            
            {/* Blog */}
            <Route path="/blog" element={<Blog />} />
            
            {/* Profile */}
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </main>
        <Footer />
        <ToastContainer
          position="top-center"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={i18n.language === 'ar'}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </div>
    </Router>
  );
}

// Dashboard Router - redirects based on user role
const DashboardRouter = () => {
  const { user } = useAuth();

  if (user?.role === 'advertiser') {
    return <AdvertiserDashboard />;
  } else if (user?.role === 'subscriber') {
    return <SubscriberDashboard />;
  } else if (user?.role === 'system_manager' || user?.role === 'marketing_manager') {
    return <AdminDashboard />;
  }

  return <Navigate to="/" />;
};

export default App;


