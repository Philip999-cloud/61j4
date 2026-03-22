const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./components');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;
  
  // Replace bg-white with bg-white dark:bg-gray-800 if dark:bg- is not present
  const regex = /className=(["'`])(.*?)\1/g;
  
  content = content.replace(regex, (match, quote, classes) => {
    // Check if it has bg-white exactly
    const classList = classes.split(/\s+/);
    if (classList.includes('bg-white') && !classes.includes('dark:bg-')) {
      const newClasses = classList.map(cls => {
        if (cls === 'bg-white') return 'bg-white dark:bg-gray-800';
        if (cls === 'bg-slate-50') return 'bg-slate-50 dark:bg-gray-900';
        if (cls === 'text-slate-900') return 'text-slate-900 dark:text-gray-100';
        if (cls === 'text-slate-800') return 'text-slate-800 dark:text-gray-200';
        if (cls === 'text-slate-700') return 'text-slate-700 dark:text-gray-300';
        if (cls === 'text-slate-600') return 'text-slate-600 dark:text-gray-400';
        if (cls === 'text-slate-500') return 'text-slate-500 dark:text-gray-400';
        if (cls === 'border-slate-100' || cls === 'border-slate-200' || cls === 'border-gray-100' || cls === 'border-gray-200') {
          return `${cls} dark:border-gray-700`;
        }
        return cls;
      }).join(' ');
      
      if (newClasses !== classes) {
        modified = true;
        return `className=${quote}${newClasses}${quote}`;
      }
    }
    return match;
  });
  
  if (modified) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
