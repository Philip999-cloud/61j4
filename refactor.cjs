const fs = require('fs');
let content = fs.readFileSync('./components/ResultsDisplay.tsx', 'utf8');

// 1. Replace dark:bg-[#202124] with dark:bg-[#1E2329]
content = content.replace(/dark:bg-\[#202124\]/g, 'dark:bg-[#1E2329]');

// 2. Add transition-colors duration-300 to className strings
content = content.replace(/className="([^"]+)"/g, (match, p1) => {
  let newClass = p1;
  if (!newClass.includes('transition-colors')) {
    if (newClass.includes('bg-') || newClass.includes('text-') || newClass.includes('border-')) {
      newClass += ' transition-colors duration-300';
    }
  } else if (!newClass.includes('duration-300')) {
    newClass = newClass.replace('transition-colors', 'transition-colors duration-300');
  }
  return `className="${newClass}"`;
});

// 3. Change text-zinc-* to text-gray-* for better contrast as requested
content = content.replace(/dark:text-zinc-100/g, 'dark:text-gray-200');
content = content.replace(/dark:text-zinc-300/g, 'dark:text-gray-300');
content = content.replace(/dark:text-zinc-400/g, 'dark:text-gray-400');
content = content.replace(/dark:text-zinc-500/g, 'dark:text-gray-500');

// 4. Emerald badges
content = content.replace(/bg-emerald-500\/20 text-emerald-600 dark:text-emerald-400 font-bold px-1 rounded-sm border-b-2 border-emerald-500\/50/g, 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold px-1 rounded-sm border-b-2 border-emerald-500/50 dark:border-emerald-400 dark:bg-emerald-900/30');

// 5. Titles text-blue-900 -> dark:text-blue-300
content = content.replace(/text-blue-900(?! dark:)/g, 'text-blue-900 dark:text-blue-300');

fs.writeFileSync('./components/ResultsDisplay.tsx', content);
console.log('Refactoring complete.');
