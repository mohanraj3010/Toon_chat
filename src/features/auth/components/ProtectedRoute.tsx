import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

import { Character } from '@/assets/characters/Character';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: 'var(--color-bg-base, #fcfaf8)',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: '50%',
            backgroundColor: 'var(--color-pastel-mint, #d1fae5)',
            border: '2.5px solid var(--color-ink, #2b2b2b)',
            boxShadow: 'var(--shadow-sticker, 0 4px 0 #2b2b2b)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            animation: 'bounce 1.5s infinite ease-in-out',
          }}
        >
          <Character base={1} expression="happy" size={85} />
        </div>
        <h3
          style={{
            fontFamily: 'var(--font-heading, Fredoka)',
            color: 'var(--color-text, #1e293b)',
            fontSize: 'var(--text-xl, 20px)',
            margin: 0,
          }}
        >
          Opening Maple Park gates... ✨
        </h3>
        <p
          style={{
            color: 'var(--color-text-muted, #64748b)',
            fontSize: 'var(--text-sm, 14px)',
            margin: 0,
          }}
        >
          Warming up your cartoon chats!
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Preserve current location for redirect-back-after-login (if not already login/register)
    const fromPath = location.pathname;
    const safeFrom = fromPath !== '/login' && fromPath !== '/register' ? location : undefined;
    return <Navigate to="/login" state={safeFrom ? { from: safeFrom } : undefined} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
