import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

const ResearchConsent: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-5 border-b border-gray-200 pb-3">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500">{t('research_consent.org')}</p>
          <h1 className="mt-1.5 text-3xl font-bold">{t('research_consent.title')}</h1>
        </header>

        <div className="space-y-5 text-sm leading-6 text-gray-700">
          <section>
            <h2 className="mb-1.5 text-xl font-semibold text-gray-900">{t('research_consent.about_title')}</h2>
            <p>{t('research_consent.about_body')}</p>
          </section>

          <section>
            <h2 className="mb-1.5 text-xl font-semibold text-gray-900">{t('research_consent.data_title')}</h2>
            <ul className="list-disc space-y-1.5 pl-6">
              <li><strong>{t('research_consent.data_company_label')}</strong> {t('research_consent.data_company_body')}</li>
              <li><strong>{t('research_consent.data_financial_label')}</strong> {t('research_consent.data_financial_body')}</li>
              <li><strong>{t('research_consent.data_usage_label')}</strong> {t('research_consent.data_usage_body')}</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-1.5 text-xl font-semibold text-gray-900">{t('research_consent.protect_title')}</h2>
            <ul className="list-disc space-y-1.5 pl-6">
              <li>{t('research_consent.protect_item_1')}</li>
              <li>{t('research_consent.protect_item_2')}</li>
              <li>{t('research_consent.protect_item_3')}</li>
              <li>{t('research_consent.protect_item_4')}</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-1.5 text-xl font-semibold text-gray-900">{t('research_consent.rights_title')}</h2>
            <ul className="list-disc space-y-1.5 pl-6">
              <li>{t('research_consent.rights_item_1')}</li>
              <li>{t('research_consent.rights_item_2')}</li>
              <li>{t('research_consent.rights_item_3')}</li>
              <li>{t('research_consent.rights_item_4')}</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-1.5 text-xl font-semibold text-gray-900">{t('research_consent.withdraw_title')}</h2>
            <p>{t('research_consent.withdraw_body')}</p>
          </section>

          <section>
            <h2 className="mb-1.5 text-xl font-semibold text-gray-900">{t('research_consent.contact_title')}</h2>
            <p>{t('research_consent.contact_intro')}</p>
            <p className="mt-2 font-medium text-gray-900">{t('research_consent.contact_name')}</p>
            <p>g.munezero1@alustudent.com</p>
            <p className="text-gray-600">{t('research_consent.contact_org')}</p>
          </section>
        </div>

        <div className="mt-6 border-t border-gray-200 pt-4">
          <Link
            to="/setup/company"
            className="inline-flex rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            {t('research_consent.back_setup')}
          </Link>
        </div>
      </main>
    </div>
  );
};

export default ResearchConsent;
