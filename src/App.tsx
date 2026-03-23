import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import GoogleCallback from "@/pages/GoogleCallback";
import ParentDashboard from "@/pages/ParentDashboard";
import ChildDashboard from "@/pages/ChildDashboard";
import ConnectionSetup from "@/pages/ConnectionSetup";
import ParentSessions from "@/pages/ParentSessions";
import SessionMessages from "@/pages/SessionMessages";
import AudioHistory from "@/pages/AudioHistory";
import FamilyChat from "@/pages/FamilyChat";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedType }: { children: React.ReactNode; allowedType?: "PARENT" | "CHILD" }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedType && user.user_type !== allowedType) {
    console.log("User type mismatch:", user.user_type, allowedType);
    return <Navigate to={user.user_type === "PARENT" ? "/dashboard" : "/family"} replace />;
  }
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user) return <Navigate to={user.user_type === "PARENT" ? "/dashboard" : "/family"} replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
            <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
            <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
            <Route path="/auth/google/callback" element={<GoogleCallback />} />

            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<ProtectedRoute allowedType="PARENT"><ParentDashboard /></ProtectedRoute>} />
              <Route path="/family" element={<ProtectedRoute><ChildDashboard /></ProtectedRoute>} />
              <Route path="/family/chat/:memberId" element={<ProtectedRoute><FamilyChat /></ProtectedRoute>} />
              <Route path="/connect" element={<ProtectedRoute><ConnectionSetup /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/parent/:parentId/sessions" element={<ProtectedRoute allowedType="CHILD"><ParentSessions /></ProtectedRoute>} />
              <Route path="/parent/:parentId/sessions/:sessionId" element={<ProtectedRoute allowedType="CHILD"><SessionMessages /></ProtectedRoute>} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
