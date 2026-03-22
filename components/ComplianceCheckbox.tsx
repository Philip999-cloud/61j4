import React from 'react';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const ComplianceCheckbox: React.FC<Props> = ({ checked, onChange }) => (
  <div className="flex items-start gap-3">
    <input 
      type="checkbox" 
      checked={checked} 
      onChange={(e) => onChange(e.target.checked)}
      className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
    />
    <p className="text-xs text-zinc-500 dark:text-zinc-400">
      I agree to the <a href="#" className="underline">Terms of Service</a> and <a href="#" className="underline">Privacy Policy</a>. 
      I understand my data is processed in accordance with GDPR.
    </p>
  </div>
);
