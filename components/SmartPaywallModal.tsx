import React from 'react';
import { X, Check } from 'lucide-react';

interface SmartPaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscribe: (plan: 'monthly' | 'yearly') => void;
}

export const SmartPaywallModal: React.FC<SmartPaywallModalProps> = ({
  isOpen,
  onClose,
  onSubscribe
}) => {
  const [selectedPlan, setSelectedPlan] = React.useState<'monthly' | 'yearly'>('yearly');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={24} />
        </button>

        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">🚀</span>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Unlock Full Potential</h2>
          <p className="text-gray-500 mb-8">Get unlimited access to all premium features.</p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            {/* Monthly Plan */}
            <div 
              onClick={() => setSelectedPlan('monthly')}
              className={`cursor-pointer rounded-xl p-4 border-2 transition-all ${
                selectedPlan === 'monthly' 
                  ? 'border-indigo-600 bg-indigo-50' 
                  : 'border-gray-200 hover:border-indigo-200'
              }`}
            >
              <div className="text-sm font-medium text-gray-500 mb-1">Monthly</div>
              <div className="text-xl font-bold text-gray-900">$9.99</div>
              <div className="text-xs text-gray-400 mt-1">/month</div>
            </div>

            {/* Yearly Plan - Anchor */}
            <div 
              onClick={() => setSelectedPlan('yearly')}
              className={`relative cursor-pointer rounded-xl p-4 border-2 transition-all ${
                selectedPlan === 'yearly' 
                  ? 'border-indigo-600 bg-indigo-50 shadow-md' 
                  : 'border-gray-200 hover:border-indigo-200'
              }`}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                Save 33%
              </div>
              <div className="text-sm font-medium text-gray-500 mb-1">Yearly</div>
              <div className="text-xl font-bold text-gray-900">$79.99</div>
              <div className="text-xs text-gray-400 mt-1">/year</div>
            </div>
          </div>

          <div className="space-y-3 mb-8">
            {['Unlimited Projects', 'Advanced Analytics', 'Priority Support'].map((feature, i) => (
              <div key={i} className="flex items-center text-sm text-gray-600">
                <Check size={16} className="text-green-500 mr-2" />
                {feature}
              </div>
            ))}
          </div>

          <button
            onClick={() => onSubscribe(selectedPlan)}
            className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
          >
            Start 7-Day Free Trial
          </button>
          
          <p className="text-xs text-gray-400 mt-4">
            Cancel anytime. No questions asked.
          </p>
        </div>
      </div>
    </div>
  );
};
