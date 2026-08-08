import { RouterProvider, createBrowserRouter, Navigate } from "react-router";
import DesignSystemPage from "./pages/DesignSystemPage";
import AppShell from "./components/layout/AppShell";
import ProtectedRoute from "./components/auth/ProtectedRoute";

// ── Auth pages ───────────────────────────────────────────────────
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import EmailVerificationPage from "./pages/auth/EmailVerificationPage";
import OnboardingPage from "./pages/auth/OnboardingPage";

// ── App pages (placeholder) ──────────────────────────────────────
import DashboardPage from "./pages/app/DashboardPage";
import MyFilesPage from "./pages/app/MyFilesPage";
import SharedPage from "./pages/app/SharedPage";
import TrashPage from "./pages/app/TrashPage";
import StoragePage from "./pages/app/StoragePage";
import NotFoundPage from "./pages/NotFoundPage";

const router = createBrowserRouter([
  /* ── Root redirect ─────────────────────────────────────────── */
  {
    path: "/",
    element: <Navigate to="/app/dashboard" replace />,
  },

  /* ── Auth routes (public) ──────────────────────────────────── */
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  { path: "/verify-email", element: <EmailVerificationPage /> },
  { path: "/onboarding", element: <OnboardingPage /> },

  /* ── Design System (always accessible) ─────────────────────── */
  { path: "/design-system", element: <DesignSystemPage /> },

  /* ── Public Share links (always accessible) ────────────────── */
  {
    path: "/share/:token",
    lazy: async () => {
      const { default: PublicSharePage } = await import("./pages/PublicSharePage");
      return { Component: PublicSharePage };
    },
  },

  /* ── App routes (protected) ────────────────────────────────── */
  {
    path: "/app",
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "files/:folderId?", element: <MyFilesPage /> },
      { path: "shared", element: <SharedPage /> },
      { path: "trash", element: <TrashPage /> },
      { path: "storage", element: <StoragePage /> },
      /* Settings & Help are stub routes — render in the shell with an empty-state page */
      {
        path: "settings",
        lazy: async () => {
          const { default: SettingsPage } = await import("./pages/app/SettingsPage");
          return { Component: SettingsPage };
        },
      },
      {
        path: "help",
        lazy: async () => {
          const { default: HelpPage } = await import("./pages/app/HelpPage");
          return { Component: HelpPage };
        },
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },

  /* ── Catch-all 404 (top level) ──────────────────────────────── */
  { path: "*", element: <NotFoundPage /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
