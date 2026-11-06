import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

import { Character } from '@/assets/characters/Character';

interface PublicRouteProps {
  children?: React.ReactNode;
}

export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
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
            backgroundColor: 'var(--color-pastel-pink, #fce7f3)',
            border: '2.5px solid var(--color-ink, #2b2b2b)',
            boxShadow: 'var(--shadow-sticker, 0 4px 0 #2b2b2b)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <Character base={2} expression="happy" size={85} />
        </div>
        <h3
          style={{
            fontFamily: 'var(--font-heading, Fredoka)',
            color: 'var(--color-text, #1e293b)',
            fontSize: 'var(--text-xl, 20px)',
            margin: 0,
          }}
        >
          Checking your cartoon pass... 🎟️
        </h3>
      </div>
    );
  }

  if (isAuthenticated) {
    // Redirect to the originally intended route or homepage
    const rawDest = (location.state as { from?: { pathname: string } })?.from?.pathname;
    const destination = rawDest && rawDest !== '/login' && rawDest !== '/register' ? rawDest : '/';
    return <Navigate to={destination} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
