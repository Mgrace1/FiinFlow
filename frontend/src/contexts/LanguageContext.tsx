import React, { createContext, useContext, useState } from 'react';

export type LangCode = 'en' | 'fr';

const translations: Record<LangCode, Record<string, string>> = {
  en: {
    // Sidebar
    'nav.dashboard': 'Dashboard',
    'nav.clients': 'Clients',
    'nav.invoices': 'Invoices',
    'nav.transactions': 'Transactions',
    'nav.expenses': 'Expenses',
    'nav.reports': 'Reports',
    'nav.team': 'Team',
    'nav.settings': 'Settings',
    // Topbar
    'topbar.welcome': 'Welcome back',
    'topbar.managing': 'Managing',
    'topbar.default_subtitle': 'Manage your finances efficiently',
    'topbar.search_placeholder': 'Search pages, features, or records...',
    'topbar.profile': 'Profile & Settings',
    'topbar.signout': 'Sign Out',
    'topbar.notifications': 'Notifications',
    'topbar.unread': 'unread',
    'topbar.no_notifications': 'No unread notifications',
    'topbar.caught_up': "You're all caught up",
    'topbar.loading_notifications': 'Loading notifications...',
  },
  fr: {
    // Sidebar
    'nav.dashboard': 'Tableau de bord',
    'nav.clients': 'Clients',
    'nav.invoices': 'Factures',
    'nav.transactions': 'Transactions',
    'nav.expenses': 'Dépenses',
    'nav.reports': 'Rapports',
    'nav.team': 'Équipe',
    'nav.settings': 'Paramètres',
    // Topbar
    'topbar.welcome': 'Bon retour',
    'topbar.managing': 'Gestion de',
    'topbar.default_subtitle': 'Gérez vos finances efficacement',
    'topbar.search_placeholder': 'Rechercher des pages, fonctionnalités ou enregistrements...',
    'topbar.profile': 'Profil & Paramètres',
    'topbar.signout': 'Se déconnecter',
    'topbar.notifications': 'Notifications',
    'topbar.unread': 'non lues',
    'topbar.no_notifications': 'Aucune notification non lue',
    'topbar.caught_up': 'Vous êtes à jour',
    'topbar.loading_notifications': 'Chargement des notifications...',
  },
};

interface LanguageContextType {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<LangCode>(() => {
    const stored = localStorage.getItem('finflow_lang') as LangCode;
    return stored === 'fr' ? 'fr' : 'en';
  });

  const setLang = (newLang: LangCode) => {
    setLangState(newLang);
    localStorage.setItem('finflow_lang', newLang);
  };

  const t = (key: string): string =>
    translations[lang][key] ?? translations['en'][key] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
