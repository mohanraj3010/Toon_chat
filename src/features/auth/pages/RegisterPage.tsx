import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

import { registerSchema, calculatePasswordStrength } from '../types';
import { Character } from '@/assets/characters/Character';
import { Button } from '@/design-system/primitives/Button';
import { User, AtSign, Mail, KeyRound, Eye, EyeOff, AlertCircle } from 'lucide-react';
import styles from './Auth.module.css';

const STARTER_BASES: Array<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8> = [1, 2, 3, 4, 5, 6, 7, 8];

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [characterBase, setCharacterBase] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rawFrom = (location.state as { from?: { pathname: string } })?.from?.pathname;
  const destination = rawFrom && rawFrom !== '/login' && rawFrom !== '/register' ? rawFrom : '/';
  const strength = calculatePasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = registerSchema.safeParse({
      displayName,
      username,
      email,
      password,
      characterBase,
    });

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
      await register({
        displayName,
        username,
        email,
        password,
        characterBase,
      });
      navigate(destination, { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setErrors({ form: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles.authContainer}>
      <div className={styles.authCard}>
        {/* Mascot Hero */}
        <div className={styles.mascotHero}>
          <div className={styles.mascotBubble}>
            <Character
              base={characterBase}
              expression={isPasswordFocused ? 'sleepy' : 'wink'}
              size={80}
            />
          </div>
          <h1 className={styles.authTitle}>Join ToonChat! 🎉</h1>
          <p className={styles.authSubtitle}>
            Pick your starter look and become a citizen of Maple Park!
          </p>
        </div>

        {errors.form && (
          <div className={styles.formAlert} role="alert">
            <AlertCircle size={18} />
            <span>{errors.form}</span>
          </div>
        )}

        {/* Starter Toon Picker */}
        <div style={{ marginBottom: 16 }}>
          <label className={styles.fieldLabel} style={{ marginBottom: 8 }}>
            Choose Your Starter Toon 🎭
          </label>
          <div className={styles.starterGrid}>
            {STARTER_BASES.map((b) => (
              <button
                key={b}
                type="button"
                className={`${styles.starterToonBtn} ${
                  characterBase === b ? styles.starterToonSelected : ''
                }`}
                onClick={() => setCharacterBase(b)}
                aria-label={`Select character style ${b}`}
              >
                <Character base={b} expression="happy" size={44} />
              </button>
            ))}
          </div>
        </div>

        {/* Register Form */}
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          {/* Display Name */}
          <div className={styles.fieldGroup}>
            <label htmlFor="reg-displayName" className={styles.fieldLabel}>
              <User size={15} /> Cartoon Display Name
            </label>
            <div className={styles.inputWrapper}>
              <User size={18} className={styles.inputIcon} />
              <input
                id="reg-displayName"
                type="text"
                className={`${styles.chunkyInput} ${errors.displayName ? styles.inputError : ''}`}
                placeholder="e.g. Captain Waffles"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  if (errors.displayName) setErrors((prev) => ({ ...prev, displayName: '' }));
                }}
                disabled={isSubmitting}
                maxLength={50}
              />
            </div>
            {errors.displayName && (
              <span className={styles.fieldError}>
                <AlertCircle size={12} /> {errors.displayName}
              </span>
            )}
          </div>

          {/* Username */}
          <div className={styles.fieldGroup}>
            <label htmlFor="reg-username" className={styles.fieldLabel}>
              <AtSign size={15} /> Unique Toon Handle
            </label>
            <div className={styles.inputWrapper}>
              <AtSign size={18} className={styles.inputIcon} />
              <input
                id="reg-username"
                type="text"
                className={`${styles.chunkyInput} ${errors.username ? styles.inputError : ''}`}
                placeholder="waffles_99"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                  if (errors.username) setErrors((prev) => ({ ...prev, username: '' }));
                }}
                disabled={isSubmitting}
                maxLength={30}
              />
            </div>
            {errors.username && (
              <span className={styles.fieldError}>
                <AlertCircle size={12} /> {errors.username}
              </span>
            )}
          </div>

          {/* Email */}
          <div className={styles.fieldGroup}>
            <label htmlFor="reg-email" className={styles.fieldLabel}>
              <Mail size={15} /> Cartoon Email
            </label>
            <div className={styles.inputWrapper}>
              <Mail size={18} className={styles.inputIcon} />
              <input
                id="reg-email"
                type="email"
                className={`${styles.chunkyInput} ${errors.email ? styles.inputError : ''}`}
                placeholder="waffles@maplepark.com"
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

          {/* Password with Strength Meter */}
          <div className={styles.fieldGroup}>
            <label htmlFor="reg-password" className={styles.fieldLabel}>
              <KeyRound size={15} /> Secret Password
            </label>
            <div className={styles.inputWrapper}>
              <KeyRound size={18} className={styles.inputIcon} />
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                className={`${styles.chunkyInput} ${errors.password ? styles.inputError : ''}`}
                placeholder="Min 8 chars, letters & symbols"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                }}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
                disabled={isSubmitting}
                autoComplete="new-password"
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

            {/* Cartoon Password Strength Meter */}
            {password.length > 0 && (
              <div className={styles.strengthContainer}>
                <div className={styles.strengthBarTrack}>
                  <div
                    className={styles.strengthBarFill}
                    style={{
                      width: `${(strength.score / 4) * 100}%`,
                      backgroundColor: strength.color,
                    }}
                  />
                </div>
                <div className={styles.strengthMeta}>
                  <span className={styles.strengthLabel} style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                  <span className={styles.strengthHint}>{strength.hint}</span>
                </div>
              </div>
            )}

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
              {isSubmitting ? 'Creating your citizen... 🎈' : 'Create My Toon Account 🚀'}
            </Button>
          </div>
        </form>

        {/* Footer switch to Login */}
        <div className={styles.footerSwitch}>
          Already have a cartoon pass?
          <Link to="/login" state={{ from: location.state?.from }} className={styles.switchLink}>
            Sign in here! 🎟️
          </Link>
        </div>
      </div>
    </main>
  );
};

export default RegisterPage;
