import React from 'react';

interface LegalConsentCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

export const LegalConsentCheckbox: React.FC<LegalConsentCheckboxProps> = ({
  checked,
  onChange,
  className = ''
}) => {
  return (
    <div className={`flex items-start ${className}`}>
      <div className="flex items-center h-5">
        <input
          id="legal-consent"
          aria-describedby="legal-consent-description"
          name="legal-consent"
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
        />
      </div>
      <div className="ml-3 text-sm">
        <label htmlFor="legal-consent" className="font-medium text-gray-700 cursor-pointer">
          I agree to the Terms and Privacy Policy
        </label>
        <p id="legal-consent-description" className="text-gray-500 mt-1">
          By checking this box, you agree to our{' '}
          <a href="#" className="text-indigo-600 hover:text-indigo-500 underline">Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="text-indigo-600 hover:text-indigo-500 underline">Privacy Policy</a>
          , including our use of cookies and data processing as described in the GDPR compliance statement.
        </p>
      </div>
    </div>
  );
};
