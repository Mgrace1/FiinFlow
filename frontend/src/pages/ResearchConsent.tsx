import React from 'react';
import { Link } from 'react-router-dom';

const ResearchConsent: React.FC = () => {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-5 border-b border-gray-200 pb-3">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500">African Leadership University</p>
          <h1 className="mt-1.5 text-3xl font-bold">Research Consent Information</h1>
        </header>

        <div className="space-y-5 text-sm leading-6 text-gray-700">
          <section>
            <h2 className="mb-1.5 text-xl font-semibold text-gray-900">About This Study</h2>
            <p>
              FiinFlow is a capstone project developed at <strong>African Leadership University (ALU)</strong>.
              This pilot study evaluates whether FiinFlow can help small and medium enterprises (SMEs) in
              Rwanda manage their finances more efficiently. Your participation helps us understand real-world
              usability and improve the system.
            </p>
          </section>

          <section>
            <h2 className="mb-1.5 text-xl font-semibold text-gray-900">What Data We Collect</h2>
            <ul className="list-disc space-y-1.5 pl-6">
              <li><strong>Company information:</strong> Business name, email, phone, and address (provided during registration).</li>
              <li><strong>Financial records:</strong> Invoices, expenses, and client details you enter into the system.</li>
              <li><strong>Usage patterns:</strong> Which features you use and how often, to evaluate system usability.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-1.5 text-xl font-semibold text-gray-900">How We Protect Your Data</h2>
            <ul className="list-disc space-y-1.5 pl-6">
              <li>All passwords are hashed using bcrypt and never stored in plain text.</li>
              <li>Your company's data is isolated from other companies through token-based authentication.</li>
              <li>Role-based access control ensures only authorized team members see sensitive data.</li>
              <li>Data will be stored securely and deleted after the pilot study concludes.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-1.5 text-xl font-semibold text-gray-900">Your Rights as a Participant</h2>
            <ul className="list-disc space-y-1.5 pl-6">
              <li>Participation is <strong>completely voluntary</strong>. You are not obligated to use FiinFlow.</li>
              <li>You may <strong>withdraw at any time</strong> without penalty or negative consequences.</li>
              <li>You may request that your data be <strong>deleted at any point</strong> during or after the study.</li>
              <li>You have the right to ask questions about the study at any time.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-1.5 text-xl font-semibold text-gray-900">How to Withdraw</h2>
            <p>
              To withdraw from the study, simply stop using FiinFlow and contact the researcher. All your data
              will be permanently deleted from the system within 7 days of your withdrawal request. There is
              no penalty for withdrawing.
            </p>
          </section>

          <section>
            <h2 className="mb-1.5 text-xl font-semibold text-gray-900">Contact the Researcher</h2>
            <p>If you have any questions about this study, please contact:</p>
            <p className="mt-2 font-medium text-gray-900">Grace Munezero</p>
            <p>g.munezero1@alustudent.com</p>
            <p className="text-gray-600">African Leadership University, Kigali, Rwanda</p>
          </section>
        </div>

        <div className="mt-6 border-t border-gray-200 pt-4">
          <Link
            to="/setup/company"
            className="inline-flex rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Back to Company Setup
          </Link>
        </div>
      </main>
    </div>
  );
};

export default ResearchConsent;
