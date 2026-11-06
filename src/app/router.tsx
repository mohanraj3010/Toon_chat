import { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider, Outlet, Link } from 'react-router-dom';
import { AppShell } from './shell/AppShell';
import { ToastContainer } from '@/shared/ui/Toast';
import { useSettings, useApplyAppearance } from '@/features/settings/api/queries';
import { AuthProvider } from '@/features/auth/context/AuthContext';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { PublicRoute } from '@/features/auth/components/PublicRoute';
import { EmptyState, Button } from '@/design-system/primitives';
import { IllustrationError, IllustrationEmptyInbox } from '@/assets/illustrations/EmptyStates';

const ErrorBoundary = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-bg-base, #fcfaf8)', padding: 24 }}>
    <EmptyState
      illustration={<IllustrationError style={{ transform: 'scale(0.85)' }} />}
      title="Oops! Cartoon Hiccup 🎨"
      description="Something went a little sideways in Maple Park. Let's get you back on track!"
      action={
        <Link to="/" style={{ textDecoration: 'none' }}>
          <Button variant="primary">Back to Safety 🏠</Button>
        </Link>
      }
    />
  </div>
);

const NotFound = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-bg-base, #fcfaf8)', padding: 24 }}>
    <EmptyState
      illustration={<IllustrationEmptyInbox style={{ transform: 'scale(0.85)' }} />}
      title="404 — Lost in Maple Park? 🗺️"
      description="We couldn't find that path or page. Maybe a squirrel ran off with it!"
      action={
        <Link to="/" style={{ textDecoration: 'none' }}>
          <Button variant="primary">Take Me Home 🚀</Button>
        </Link>
      }
    />
  </div>
);

const GlobalAppearanceSync = () => {
  const { data: settings } = useSettings();
  useApplyAppearance(settings?.appearance);
  return null;
};

const ShellLayout = () => (
  <ProtectedRoute>
    <AppShell />
  </ProtectedRoute>
);

const RootLayout = () => (
  <AuthProvider>
    <GlobalAppearanceSync />
    <Suspense fallback={<div style={{ padding: '20px' }}>Loading ToonChat...</div>}>
      <Outlet />
      <ToastContainer />
    </Suspense>
  </AuthProvider>
);

const LoginPage = lazy(() => import('../features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('../features/auth/pages/RegisterPage'));
const DesignPage = lazy(() => import('../features/dev/pages/DesignPage'));
const HomePage = lazy(() => import('../features/chats/pages/HomePage'));
const ChatConversation = lazy(() => import('../features/chats/pages/ChatConversation'));
const FriendsList = lazy(() => import('../features/friends/pages/FriendsList').then(m => ({ default: m.FriendsList })));
const DiscoverList = lazy(() => import('../features/friends/pages/DiscoverList').then(m => ({ default: m.DiscoverList })));
const ProfilePage = lazy(() => import('../features/profile/pages/ProfilePage'));
const SettingsPage = lazy(() => import('../features/settings/pages/SettingsPage'));
const AvatarCreatorPage = lazy(() => import('../features/avatar/pages/AvatarCreatorPage'));
const StoriesPage = lazy(() => import('../features/stories/pages/StoriesPage'));
const NotificationsPage = lazy(() => import('../features/notifications/pages/NotificationsPage'));
const GroupsDiscoveryPage = lazy(() => import('../features/groups/pages/GroupsDiscoveryPage'));
const WorldPage = lazy(() => import('../features/world/pages/WorldPage'));

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        path: 'login',
        element: (
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        ),
      },
      {
        path: 'register',
        element: (
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        ),
      },
      {
        element: <ShellLayout />,
        children: [
          { 
            path: '/', 
            element: <HomePage />,
            children: [
              { path: 'chat/:id', element: <ChatConversation /> },
            ]
          },
          { path: 'friends', element: <FriendsList /> },
          { path: 'discover', element: <DiscoverList /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'profile/:username', element: <ProfilePage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: 'avatar', element: <AvatarCreatorPage /> },
          { path: 'stories', element: <StoriesPage /> },
          { path: 'notifications', element: <NotificationsPage /> },
          { path: 'groups', element: <GroupsDiscoveryPage /> },
          { path: 'world', element: <WorldPage /> },
          { path: 'design', element: <DesignPage /> },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}


