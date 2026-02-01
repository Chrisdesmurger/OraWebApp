/**
 * Email Template Registry
 *
 * Maps email types to their React components and subject lines
 */

import type { ComponentType } from 'react';
import type { SupportedLanguage } from '@/lib/firestore/conversions';
import type { EmailType } from '@/types/email';

// Import available templates directly
// Only import templates that exist - others will be added as they're created
import { MagicLinkEmail } from '@/emails/auth/MagicLinkEmail';
import { PasswordResetEmail } from '@/emails/auth/PasswordResetEmail';
import { SecurityAlertEmail } from '@/emails/auth/SecurityAlertEmail';
import { WelcomeEmail } from '@/emails/welcome/WelcomeEmail';
import { OnboardingCompleteEmail } from '@/emails/welcome/OnboardingCompleteEmail';

// ============================================================================
// Template Component Registry
// ============================================================================

// Static registry of available email components
// Add new templates here as they are created
const templateRegistry: Partial<Record<EmailType, ComponentType<any>>> = {
  // Authentication - Phase 2 (Priority)
  magic_link: MagicLinkEmail,
  password_reset: PasswordResetEmail,
  security_alert: SecurityAlertEmail,
  // Welcome - Phase 3
  welcome: WelcomeEmail,
  onboarding_complete: OnboardingCompleteEmail,
  // Other templates will be added in future phases:
  // email_verification (Phase 2)
  // engagement templates (Phase 6)
  // marketing templates (Phase 6)
  // transactional templates (Phase 6)
};

/**
 * Get the email component for a given email type
 */
export function getEmailComponent(
  emailType: EmailType
): ComponentType<any> | null {
  const component = templateRegistry[emailType];
  if (!component) {
    console.error(
      `[Email] No template available for type: ${emailType}. Template may not be implemented yet.`
    );
    return null;
  }
  return component;
}

/**
 * Check if a template is available for an email type
 */
export function isTemplateAvailable(emailType: EmailType): boolean {
  return (
    emailType in templateRegistry && templateRegistry[emailType] !== undefined
  );
}

/**
 * Get list of available email types (that have templates)
 */
export function getAvailableEmailTypes(): EmailType[] {
  return Object.keys(templateRegistry).filter(
    (key) => templateRegistry[key as EmailType] !== undefined
  ) as EmailType[];
}

// ============================================================================
// Subject Lines Registry
// ============================================================================

type SubjectTemplate = Record<
  SupportedLanguage,
  string | ((vars: Record<string, unknown>) => string)
>;

const subjectRegistry: Record<EmailType, SubjectTemplate> = {
  // Authentication
  magic_link: {
    fr: 'Votre lien de connexion Ora',
    en: 'Your Ora login link',
    es: 'Tu enlace de inicio de sesion Ora',
  },
  email_verification: {
    fr: 'Vérifiez votre adresse email - Ora',
    en: 'Verify your email address - Ora',
    es: 'Verifica tu direccion de correo - Ora',
  },
  password_reset: {
    fr: 'Réinitialisez votre mot de passe Ora',
    en: 'Reset your Ora password',
    es: 'Restablece tu contrasena de Ora',
  },
  security_alert: {
    fr: 'Alerte de sécurité - Ora',
    en: 'Security alert - Ora',
    es: 'Alerta de seguridad - Ora',
  },

  // Welcome
  welcome: {
    fr: 'Bienvenue sur Ora ! Votre voyage bien-être commence',
    en: 'Welcome to Ora! Your wellness journey begins',
    es: 'Bienvenido a Ora! Tu viaje de bienestar comienza',
  },
  onboarding_complete: {
    fr: 'Votre parcours personnalisé est prêt - Ora',
    en: 'Your personalized journey is ready - Ora',
    es: 'Tu viaje personalizado esta listo - Ora',
  },

  // Engagement
  inactivity_7d: {
    fr: 'Vous nous manquez ! Reprenez votre pratique',
    en: 'We miss you! Resume your practice',
    es: 'Te echamos de menos! Retoma tu practica',
  },
  inactivity_30d: {
    fr: 'Il est temps de reprendre votre pratique bien-être',
    en: "It's time to resume your wellness practice",
    es: 'Es hora de retomar tu practica de bienestar',
  },
  streak_milestone: {
    fr: (vars) =>
      `Félicitations ! ${vars.streakDays || ''} jours de pratique consécutifs`,
    en: (vars) =>
      `Congratulations! ${vars.streakDays || ''} consecutive days of practice`,
    es: (vars) =>
      `Felicidades! ${vars.streakDays || ''} dias consecutivos de practica`,
  },
  first_completion: {
    fr: 'Bravo pour votre première leçon !',
    en: 'Great job on your first lesson!',
    es: 'Bien hecho con tu primera leccion!',
  },
  program_complete: {
    fr: (vars) => `Programme "${vars.programTitle || ''}" terminé !`,
    en: (vars) => `Program "${vars.programTitle || ''}" completed!`,
    es: (vars) => `Programa "${vars.programTitle || ''}" completado!`,
  },

  // Marketing
  new_content: {
    fr: (vars) => `Nouveau contenu disponible : ${vars.contentTitle || ''}`,
    en: (vars) => `New content available: ${vars.contentTitle || ''}`,
    es: (vars) => `Nuevo contenido disponible: ${vars.contentTitle || ''}`,
  },
  weekly_digest: {
    fr: 'Votre résumé hebdomadaire Ora',
    en: 'Your weekly Ora digest',
    es: 'Tu resumen semanal de Ora',
  },
  program_recommendation: {
    fr: 'Programmes recommandés pour vous',
    en: 'Recommended programs for you',
    es: 'Programas recomendados para ti',
  },

  // Transactional
  account_change: {
    fr: 'Modification de votre compte Ora',
    en: 'Changes to your Ora account',
    es: 'Cambios en tu cuenta de Ora',
  },
  subscription_confirmed: {
    fr: 'Confirmation de votre abonnement Ora',
    en: 'Your Ora subscription is confirmed',
    es: 'Tu suscripcion a Ora esta confirmada',
  },
  subscription_expiring: {
    fr: 'Votre abonnement Ora expire bientôt',
    en: 'Your Ora subscription is expiring soon',
    es: 'Tu suscripcion a Ora expira pronto',
  },
  payment_failed: {
    fr: 'Problème avec votre paiement - Ora',
    en: 'Payment issue - Ora',
    es: 'Problema con tu pago - Ora',
  },
};

/**
 * Get the subject line for an email
 */
export function getEmailSubject(
  emailType: EmailType,
  language: SupportedLanguage,
  variables: Record<string, unknown> = {}
): string {
  const subjects = subjectRegistry[emailType];
  if (!subjects) {
    return 'Ora Wellbeing';
  }

  const subject = subjects[language] || subjects.fr;

  if (typeof subject === 'function') {
    return subject(variables);
  }

  return subject;
}

// ============================================================================
// Preview Text Registry
// ============================================================================

const previewTextRegistry: Record<EmailType, SubjectTemplate> = {
  magic_link: {
    fr: 'Cliquez pour vous connecter - ce lien expire dans 1 heure',
    en: 'Click to sign in - this link expires in 1 hour',
    es: 'Haz clic para iniciar sesion - este enlace expira en 1 hora',
  },
  email_verification: {
    fr: 'Confirmez votre adresse email pour commencer',
    en: 'Confirm your email address to get started',
    es: 'Confirma tu direccion de correo para comenzar',
  },
  password_reset: {
    fr: 'Suivez le lien pour créer un nouveau mot de passe',
    en: 'Follow the link to create a new password',
    es: 'Sigue el enlace para crear una nueva contrasena',
  },
  security_alert: {
    fr: 'Une activité inhabituelle a été détectée sur votre compte',
    en: 'Unusual activity was detected on your account',
    es: 'Se detecto actividad inusual en tu cuenta',
  },
  welcome: {
    fr: 'Découvrez yoga, méditation et bien-être',
    en: 'Discover yoga, meditation and wellness',
    es: 'Descubre yoga, meditacion y bienestar',
  },
  onboarding_complete: {
    fr: 'Vos recommandations personnalisées vous attendent',
    en: 'Your personalized recommendations are waiting',
    es: 'Tus recomendaciones personalizadas te esperan',
  },
  inactivity_7d: {
    fr: 'Quelques minutes suffisent pour retrouver votre équilibre',
    en: 'A few minutes is all you need to find your balance',
    es: 'Unos minutos son suficientes para encontrar tu equilibrio',
  },
  inactivity_30d: {
    fr: 'Nous avons de nouveaux contenus à vous faire découvrir',
    en: 'We have new content for you to discover',
    es: 'Tenemos nuevo contenido para que descubras',
  },
  streak_milestone: {
    fr: 'Votre régularité paie ! Continuez ainsi',
    en: 'Your consistency is paying off! Keep it up',
    es: 'Tu constancia esta dando frutos! Sigue asi',
  },
  first_completion: {
    fr: 'Vous avez fait le premier pas - continuez votre parcours',
    en: 'You took the first step - continue your journey',
    es: 'Diste el primer paso - continua tu camino',
  },
  program_complete: {
    fr: 'Découvrez ce qui vous attend maintenant',
    en: 'Discover what awaits you now',
    es: 'Descubre lo que te espera ahora',
  },
  new_content: {
    fr: "Du nouveau contenu vient d'être ajouté",
    en: 'New content has just been added',
    es: 'Se acaba de agregar nuevo contenido',
  },
  weekly_digest: {
    fr: 'Vos activités de la semaine et contenus recommandés',
    en: 'Your weekly activities and recommended content',
    es: 'Tus actividades semanales y contenido recomendado',
  },
  program_recommendation: {
    fr: 'Basé sur vos préférences et objectifs',
    en: 'Based on your preferences and goals',
    es: 'Basado en tus preferencias y objetivos',
  },
  account_change: {
    fr: 'Des modifications ont été apportées à votre compte',
    en: 'Changes have been made to your account',
    es: 'Se han realizado cambios en tu cuenta',
  },
  subscription_confirmed: {
    fr: 'Merci pour votre confiance - accès illimité activé',
    en: 'Thank you for your trust - unlimited access activated',
    es: 'Gracias por tu confianza - acceso ilimitado activado',
  },
  subscription_expiring: {
    fr: 'Renouvelez maintenant pour continuer votre pratique',
    en: 'Renew now to continue your practice',
    es: 'Renueva ahora para continuar tu practica',
  },
  payment_failed: {
    fr: 'Mettez à jour vos informations de paiement',
    en: 'Update your payment information',
    es: 'Actualiza tu informacion de pago',
  },
};

/**
 * Get the preview text for an email
 */
export function getEmailPreviewText(
  emailType: EmailType,
  language: SupportedLanguage,
  variables: Record<string, unknown> = {}
): string {
  const previews = previewTextRegistry[emailType];
  if (!previews) {
    return '';
  }

  const preview = previews[language] || previews.fr;

  if (typeof preview === 'function') {
    return preview(variables);
  }

  return preview;
}
