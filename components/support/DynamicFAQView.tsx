import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

interface DynamicFAQViewProps {
  items: FAQItem[];
  onContactSupport?: () => void;
  className?: string;
}

/**
 * DynamicFAQView
 * A standalone FAQ component with search and accordion functionality.
 */
export const DynamicFAQView: React.FC<DynamicFAQViewProps> = ({
  items,
  onContactSupport,
  className = ''
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(
      item => 
        item.question.toLowerCase().includes(query) || 
        item.answer.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  const toggleItem = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <div className={`w-full max-w-2xl mx-auto ${className}`}>
      {/* Search Bar */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out sm:text-sm"
          placeholder="Search for help..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* FAQ List */}
      <div className="space-y-3 mb-8">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <div 
              key={item.id} 
              className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 overflow-hidden transition-shadow hover:shadow-sm"
            >
              <button
                className="w-full px-5 py-4 text-left flex justify-between items-center focus:outline-none"
                onClick={() => toggleItem(item.id)}
              >
                <span className="font-medium text-gray-900">{item.question}</span>
                {openId === item.id ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </button>
              
              <div 
                className={`transition-all duration-300 ease-in-out overflow-hidden ${
                  openId === item.id ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="px-5 pb-5 pt-0 text-gray-600 text-sm leading-relaxed border-t border-gray-50 bg-gray-50/50">
                  <div className="pt-3">
                    {item.answer}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            No results found for "{searchQuery}"
          </div>
        )}
      </div>

      {/* Contact Support Button */}
      <div className="text-center">
        <p className="text-sm text-gray-500 mb-3">Still need help?</p>
        <button
          onClick={onContactSupport}
          className="inline-flex items-center justify-center px-6 py-2.5 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
        >
          <MessageCircle className="mr-2 h-4 w-4 text-gray-500" />
          Contact Support
        </button>
      </div>
    </div>
  );
};
