import React from 'react';

interface WinBackOfferModalProps {
  isOpen: boolean;
  onAcceptOffer: () => void;
  onConfirmCancel: () => void;
}

export const WinBackOfferModal: React.FC<WinBackOfferModalProps> = ({
  isOpen,
  onAcceptOffer,
  onConfirmCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white text-center">
          <div className="text-4xl mb-2">😢</div>
          <h3 className="text-xl font-bold">Wait! Don't go yet.</h3>
        </div>
        
        <div className="p-6">
          <p className="text-gray-600 text-center mb-6">
            We'd love to keep you around. Here is a special offer just for you:
          </p>

          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-6 text-center">
            <div className="text-orange-800 font-bold text-lg">50% OFF</div>
            <div className="text-orange-600 text-sm">For the next month</div>
          </div>

          <button
            onClick={onAcceptOffer}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors mb-3"
          >
            Claim 50% Off Offer
          </button>

          <button
            onClick={onConfirmCancel}
            className="w-full bg-transparent text-gray-400 py-3 rounded-xl font-medium hover:text-gray-600 hover:bg-gray-50 transition-colors text-sm"
          >
            I still want to cancel
          </button>
        </div>
      </div>
    </div>
  );
};
