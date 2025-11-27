// src/App.tsx

import { ClerkProvider, ClerkLoaded, ClerkLoading, useAuth } from '@clerk/clerk-react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import SignUpPage from './components/SignUpPage';
import UploadPage from './components/UploadPage';
import ProcessPage from './components/ProcessPage';
import ResultPage from './components/ResultPage';


const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Utility: Store intended route before redirecting to sign-in
function storeIntendedRoute(path: string) {
  sessionStorage.setItem('intendedPath', path);
}

// Utility: Retrieve and clear intended route after SSO
function popIntendedRoute(): string | null {
  const path = sessionStorage.getItem('intendedPath');
  if (path) sessionStorage.removeItem('intendedPath');
  return path;
}

// Wrapper for protected routes: stores intended path if not signed in
function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isSignedIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  if (!isSignedIn) {
    storeIntendedRoute(location.pathname + location.search);
    navigate('/signup');
    return null;
  }
  return children;
}

export default function App() {
  return (
    <>
      <ClerkLoading>
        <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh'}}>Loading authentication...</div>
      </ClerkLoading>
      <ClerkLoaded>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          {/* Clerk SSO callback routes with intended path restore */}
          <Route path="/signup/sso-callback" element={<SSORedirect />} />
          <Route path="/signin/sso-callback" element={<SSORedirect />} />
          <Route path="/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
          <Route path="/process" element={<ProtectedRoute><ProcessPage /></ProtectedRoute>} />
          <Route path="/result" element={<ProtectedRoute><ResultPage /></ProtectedRoute>} />
          {/* Catch-all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ClerkLoaded>
    </>
  );
}

// SSO callback handler: redirects to intended path or /upload
function SSORedirect() {
  const navigate = useNavigate();
  React.useEffect(() => {
    const path = popIntendedRoute();
    navigate(path || '/upload', { replace: true });
  }, [navigate]);
  return <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh'}}>Redirecting…</div>;
}
