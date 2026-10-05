import type { MessageDictionary } from './vi';
export const en = {
  shell: { groups: 'Service groups', findServices: 'Find services', openAccount: 'Open account and language settings', discover: 'SERVICES IN HANOI', categories: 'Choose a service category', accountIntro: 'Manage your sign-in and language.', preferences: 'Display preferences' },
  common: { back: 'Back', backButton: '← Back', retry: 'Try again', account: 'Account', language: 'Language' },
  catalog: {
    viewServices: 'View services →',
    title: 'What service do you need?', subtitle: 'Explore services in Hanoi.',
    categorySubtitle: 'Explore service groups and skills.', loading: 'Loading services…',
    empty: 'No active services yet.', error: 'Unable to load services. Check your connection and try again.',
    skills: { one: '%{count} skill', other: '%{count} skills' },
    translationNotice: 'Industry, group and skill names are currently available in Vietnamese only.',
  },
  auth: {
    restoring: 'Restoring your session…', verified: 'Email verified', unverified: 'Email not verified',
    logout: 'Log out', createAccount: 'Create an account', login: 'Log in', register: 'Sign up',
    name: 'Display name', email: 'Email', password: 'Password',
    passwordHint: 'Use %{min}–%{max} characters. You can use a memorable passphrase.',
    switchToLogin: 'Already have an account? Log in', switchToRegister: 'No account yet? Sign up',
  },
  errors: {
    authentication: 'Unable to authenticate. Check your details or log in again.',
    rateLimited: 'Too many attempts. Please wait a minute and try again.',
    validation: 'Unable to use these details. Check them or try logging in.',
    session: 'Unable to connect or securely save your session. Please try again.',
    localeRead: 'Unable to read your saved language. You can select it again.',
    localeWrite: 'Unable to save your language. Please select it again to retry.',
  },
} satisfies MessageDictionary;
