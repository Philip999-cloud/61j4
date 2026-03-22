import React, { useState } from 'react';
import { getDiagnosticInfo } from '../utils/deviceInfo';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportDeskModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const faqs = [
    { q: 'How do I upgrade?', a: 'Go to settings and click Upgrade.' },
    { q: 'Is my data safe?', a: 'Yes, we use bank-grade encryption.' },
  ];

  const filteredFaqs = faqs.filter(f => f.q.toLowerCase().includes(query.toLowerCase()));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const info = getDiagnosticInfo();
    console.log('Sending support request:', { message, info });
    alert('Support request sent!');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200">
      {/* ✅ 版面修復：加上 max-h-[90vh]，確保高度絕對不會超過螢幕的 90%
        ✅ 顏色修復：換上 bg-[var(--bg-card)] 與 border-[var(--border-color)] 
      */}
      <div className="bg-[var(--bg-card)] rounded-2xl max-w-2xl w-full max-h-[90vh] h-[600px] flex flex-col shadow-2xl overflow-hidden border border-[var(--border-color)] transition-colors duration-300">
        
        {/* Header 區塊：加上 shrink-0 防止被擠壓 */}
        <div className="p-4 sm:p-6 border-b border-[var(--border-color)] flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Support Desk</h2>
          
          {/* ✅ 叉叉按鈕優化：加大觸控範圍，加上圓角背景 */}
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-main)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-color)] transition-colors text-2xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        
        {/* 內容區塊：overflow-y-auto 讓內容過長時可以在內部滾動 */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mb-8">
            <h3 className="font-bold mb-4 text-[var(--text-primary)]">Frequently Asked Questions</h3>
            <input 
              type="text" 
              placeholder="Search help..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full p-3 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] outline-none mb-4 text-[var(--text-primary)] placeholder-[var(--text-secondary)] transition-colors focus:border-blue-500"
            />
            <div className="space-y-2">
              {filteredFaqs.map((faq, i) => (
                <div key={i} className="p-3 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] transition-colors">
                  <div className="font-bold text-sm text-[var(--text-primary)]">{faq.q}</div>
                  <div className="text-xs text-[var(--text-secondary)] mt-1">{faq.a}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-bold mb-4 text-[var(--text-primary)]">Contact Us</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <textarea 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue..."
                className="w-full h-32 p-3 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] outline-none text-[var(--text-primary)] placeholder-[var(--text-secondary)] resize-none transition-colors focus:border-blue-500"
                required
              />
              <button type="submit" className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/20">
                Send Request
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};