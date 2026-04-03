import React from 'react';
import { useLanguageTerms } from '../contexts/LanguageTermsContext';

interface TermsOfServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguageTerms();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">
            {t('terms_title')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
            aria-label={t('terms_close_button')}
          >
            ×
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6 text-gray-700">
            {/* Section 1 */}
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-800">
                {t('terms_section_1').split('\n')[0]}
              </h3>
              <p className="whitespace-pre-line">
                {t('terms_section_1').split('\n').slice(1).join('\n')}
              </p>
            </div>

            {/* Section 2 */}
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-800">
                {t('terms_section_2').split('\n')[0]}
              </h3>
              <p className="whitespace-pre-line">
                {t('terms_section_2').split('\n').slice(1).join('\n')}
              </p>
            </div>

            {/* Section 3 */}
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-800">
                {t('terms_section_3').split('\n')[0]}
              </h3>
              <p className="whitespace-pre-line">
                {t('terms_section_3').split('\n').slice(1).join('\n')}
              </p>
            </div>

            {/* Section 4 */}
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-800">
                {t('terms_section_4').split('\n')[0]}
              </h3>
              <p className="whitespace-pre-line">
                {t('terms_section_4').split('\n').slice(1).join('\n')}
              </p>
            </div>

            {/* Section 5 */}
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-800">
                {t('terms_section_5').split('\n')[0]}
              </h3>
              <p className="whitespace-pre-line">
                {t('terms_section_5').split('\n').slice(1).join('\n')}
              </p>
            </div>

            {/* Section 6 */}
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-800">
                {t('terms_section_6').split('\n')[0]}
              </h3>
              <p className="whitespace-pre-line">
                {t('terms_section_6').split('\n').slice(1).join('\n')}
              </p>
            </div>
          </div>
        </div>

        {/* Footer with Close Button */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              {t('terms_close_button')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServiceModal;