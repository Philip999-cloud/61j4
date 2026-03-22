import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react';
import { generateSupportEmail } from '../utils/deviceSupportHelper';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

interface DynamicFAQViewProps {
  items: FAQItem[];
  supportEmail?: string;
  className?: string;
}

export const DynamicFAQView: React.FC<DynamicFAQViewProps> = ({
  items,
  supportEmail = 'support@example.com',
  className = ''
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(
      item => 
        item.question.toLowerCase().includes(query) || 
        item.answer.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleContactSupport = () => {
    generateSupportEmail(supportEmail);
  };

  return (
    <div className={`max-w-2xl mx-auto ${className}`}>
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search for answers..."
          className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-colors"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="space-y-3 mb-8">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <div 
              key={item.id} 
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-sm"
            >
              <button
                onClick={() => toggleExpand(item.id)}
                className="w-full flex justify-between items-center p-4 text-left focus:outline-none"
              >
                <span className="font-medium text-gray-900">{item.question}</span>
                {expandedId === item.id ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </button>
              
              <div 
                className={`transition-all duration-300 ease-in-out overflow-hidden ${
                  expandedId === item.id ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="p-4 pt-0 text-gray-600 text-sm leading-relaxed border-t border-gray-50 bg-gray-50/50">
                  {item.answer}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            No results found for "{searchQuery}"
          </div>
        )}
      </div>

      <div className="text-center pt-6 border-t border-gray-100">
        <p className="text-gray-500 mb-4">Can't find what you're looking for?</p>
        <button
          onClick={handleContactSupport}
          className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-indigo-700 bg-indigo-100 hover:bg-indigo-200 transition-colors"
        >
          <MessageCircle className="mr-2 h-5 w-5" />
          Contact Support
        </button>
      </div>
    </div>
  );
};
