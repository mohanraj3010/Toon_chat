import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

import { loginSchema } from '../types';
import { Character } from '@/assets/characters/Character';
import { Button } from '@/design-system/primitives/Button';
import { Mail, KeyRound, Eye, EyeOff, AlertCircle } from 'lucide-react';
import styles from './Auth.module.css';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rawFrom = (location.state as { from?: { pathname: string } })?.from?.pathname;
  const destination = rawFrom && rawFrom !== '/login' && rawFrom !== '/register' ? rawFrom : '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      await login({ email, password });
      navigate(destination, { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid credentials. Please try again.';
      setErrors({ form: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles.authContainer}>
      <div className={styles.authCard}>
        {/* Cartoon Mascot Hero */}
        <div className={styles.mascotHero}>
          <div className={styles.mascotBubble}>
            <Character
              base={1}
              expression={isPasswordFocused ? 'sleepy' : 'happy'}
              size={80}
            />
          </div>
          <h1 className={styles.authTitle}>Welcome Back! 👋</h1>
          <p className={styles.authSubtitle}>
            Your cartoon pals and stickers are waiting in Maple Park.
          </p>
        </div>

        {errors.form && (
          <div className={styles.formAlert} role="alert">
            <AlertCircle size={18} />
            <span>{errors.form}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          {/* Email Field */}
          <div className={styles.fieldGroup}>
            <label htmlFor="login-email" className={styles.fieldLabel}>
              <Mail size={15} /> Cartoon Email
            </label>
            <div className={styles.inputWrapper}>
              <Mail size={18} className={styles.inputIcon} />
              <input
                id="login-email"
                type="email"
                className={`${styles.chunkyInput} ${errors.email ? styles.inputError : ''}`}
                placeholder="toon@maplepark.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                }}
                disabled={isSubmitting}
                autoComplete="email"
              />
            </div>
            {errors.email && (
              <span className={styles.fieldError}>
                <AlertCircle size={12} /> {errors.email}
              </span>
            )}
          </div>

          {/* Password Field */}
          <div className={styles.fieldGroup}>
            <label htmlFor="login-password" className={styles.fieldLabel}>
              <KeyRound size={15} /> Secret Password
            </label>
            <div className={styles.inputWrapper}>
              <KeyRound size={18} className={styles.inputIcon} />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className={`${styles.chunkyInput} ${errors.password ? styles.inputError : ''}`}
                placeholder="Your safe cartoon pass"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                }}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
                disabled={isSubmitting}
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <span className={styles.fieldError}>
                <AlertCircle size={12} /> {errors.password}
              </span>
            )}
          </div>

          {/* Submit Button */}
          <div style={{ marginTop: 8 }}>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isSubmitting}
              style={{ width: '100%' }}
            >
              {isSubmitting ? 'Entering Maple Park... ✨' : 'Sign In to ToonChat 🚀'}
            </Button>
          </div>
        </form>

        {/* Footer switch to Register */}
        <div className={styles.footerSwitch}>
          New to Maple Park?
          <Link to="/register" state={{ from: location.state?.from }} className={styles.switchLink}>
            Create your cartoon citizen! 🎨
          </Link>
        </div>
      </div>
    </main>
  );
};

export default LoginPage;
