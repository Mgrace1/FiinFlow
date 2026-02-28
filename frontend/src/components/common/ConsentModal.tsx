import React from 'react';
import { FaTimes,} from 'react-icons/fa';

interface ConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ConsentModal: React.FC<ConsentModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
    
            <div>
              <h2 className="text-xl font-bold text-gray-900">Research Consent Information</h2>
              <p className="text-sm text-gray-500">African Leadership University</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FaTimes className="text-lg" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">About This Study</h3>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-gray-700 leading-relaxed">
                FiinFlow is a capstone project developed at <strong>African Leadership University (ALU)</strong>.
                This pilot study evaluates whether FiinFlow can help small and medium enterprises (SMEs) in
                Rwanda manage their finances more efficiently. Your participation helps us understand real-world
                usability and improve the system.
              </p>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              
              <h3 className="text-lg font-semibold text-gray-900">What Data We Collect</h3>
            </div>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                <span><strong>Company information:</strong> Business name, email, phone, and address (provided during registration).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                <span><strong>Financial records:</strong> Invoices, expenses, and client details you enter into the system.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                <span><strong>Usage patterns:</strong> Which features you use and how often, to evaluate system usability.</span>
              </li>
            </ul>
          </section>

          {/* How We Protect Your Data */}
          <section>
            <div className="flex items-center gap-2 mb-3">
         
              <h3 className="text-lg font-semibold text-gray-900">How We Protect Your Data</h3>
            </div>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                <span>All passwords are hashed using bcrypt and never stored in plain text.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                <span>Your company's data is isolated from other companies through token-based authentication.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                <span>Role-based access control ensures only authorized team members see sensitive data.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                <span>Data will be stored securely and deleted after the pilot study concludes.</span>
              </li>
            </ul>
          </section>

          {/* Your Rights */}
          <section>
            <div className="flex items-center gap-2 mb-3">
          
              <h3 className="text-lg font-semibold text-gray-900">Your Rights as a Participant</h3>
            </div>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                <span>Participation is <strong>completely voluntary</strong>. You are not obligated to use FiinFlow.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                <span>You may <strong>withdraw at any time</strong> without penalty or negative consequences.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                <span>You may request that your data be <strong>deleted at any point</strong> during or after the study.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                <span>You have the right to ask questions about the study at any time.</span>
              </li>
            </ul>
          </section>

          {/* Withdrawal Process */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-lg font-semibold text-gray-900">How to Withdraw</h3>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <p className="text-gray-700 leading-relaxed">
                To withdraw from the study, simply stop using FiinFlow and contact the researcher. All your data
                will be permanently deleted from the system within 7 days of your withdrawal request. There is
                no penalty for withdrawing.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section>
            <div className="flex items-center gap-2 mb-3">
        
              <h3 className="text-lg font-semibold text-gray-900">Contact the Researcher</h3>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700">
                If you have any questions about this study, please contact:
              </p>
              <p className="text-gray-900 font-medium mt-2">
                Grace Munezero
              </p>
              <p className="text-blue-600">
               g.munezero1@alustudent.com
              </p>
              <p className="text-gray-500 text-sm mt-1">
                African Leadership University, Kigali, Rwanda
              </p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 rounded-b-xl">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 text-white font-medium py-2.5 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsentModal;
