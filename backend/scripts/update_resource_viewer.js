const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', 'frontend', 'src', 'components', 'child', 'LessonResourceViewer.jsx');
let code = fs.readFileSync(filePath, 'utf8');
const isCRLF = code.includes('\r\n');
code = code.replace(/\r\n/g, '\n');

const target = `        {!fileUrl && (
          <div className="bg-gray-100 border-2 border-gray-300 rounded-xl p-8 text-center">
            <div className="text-5xl mb-2">⚠️</div>
            <p className="text-gray-700 font-bold">Material file not available</p>
          </div>
        )}`;

const replacement = `        {(material.content || material.text_content) && (
          <div className="bg-white rounded-2xl p-6 border-2 border-indigo-100 shadow-sm leading-relaxed text-slate-800 whitespace-pre-wrap font-medium text-base">
            {material.content || material.text_content}
          </div>
        )}

        {Array.isArray(material.metadata?.cards) && material.metadata.cards.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 my-4">
            {material.metadata.cards.map((c, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border-2 border-amber-200 text-center shadow-md">
                {c.symbol && <div className="text-5xl font-black text-amber-600 mb-2">{c.symbol}</div>}
                {c.word && <div className="text-2xl font-bold text-slate-800">{c.word}</div>}
                {c.translation && <div className="text-sm font-semibold text-slate-500 mt-1">{c.translation}</div>}
              </div>
            ))}
          </div>
        )}

        {!fileUrl && !material.content && !material.text_content && !material.metadata?.cards && (
          <div className="bg-gray-100 border-2 border-gray-300 rounded-xl p-8 text-center">
            <div className="text-5xl mb-2">⚠️</div>
            <p className="text-gray-700 font-bold">Material file not available</p>
          </div>
        )}`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  if (isCRLF) {
    code = code.replace(/\n/g, '\r\n');
  }
  fs.writeFileSync(filePath, code, 'utf8');
  console.log('Successfully updated LessonResourceViewer.jsx');
} else {
  console.log('Target still not found. Debugging substring...');
}
