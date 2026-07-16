const fs = require('fs');
const path = require('path');

const dir = 'f:/Programing/GamingZone/apps/web/src/features/gameDetails/components';
const files = fs.readdirSync(dir).filter(f => f.startsWith('Game') && f.endsWith('.tsx') && f !== 'GameDetailsClient.tsx');

for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove import { useLangStore } ...
    content = content.replace(/import\s*\{\s*useLangStore\s*\}\s*from\s*['"].*useLangStore['"];?[\r\n]*/g, '');
    
    // Remove const { t, lang } = useLangStore();
    content = content.replace(/[ \t]*const\s*\{\s*t\s*,\s*lang\s*\}\s*=\s*useLangStore\(\s*\);?[\r\n]*/g, '');
    
    // Add t, lang to the component props
    // We look for function Component({ prop1, prop2 }: ComponentProps) {
    content = content.replace(/(function\s+\w+\s*\(\{\s*)([^}]+)(\s*\}\s*:\s*\w+Props\s*\)\s*\{)/g, (match, p1, p2, p3) => {
        // p2 contains the props. Add t, lang if not present
        let props = p2.trim();
        if (!props.includes('t,') && !props.includes('lang,')) {
            if (props.endsWith(',')) props += ' t, lang,';
            else props += ', t, lang';
        }
        return p1 + props + p3;
    });
    
    fs.writeFileSync(filePath, content);
}

// Now update GameDetailsClient.tsx to pass t={t} lang={lang}
const clientPath = path.join(dir, 'GameDetailsClient.tsx');
let clientContent = fs.readFileSync(clientPath, 'utf8');

// Change const { lang } = useLangStore() to const { lang, t } = useLangStore()
clientContent = clientContent.replace(/const\s*\{\s*lang\s*\}\s*=\s*useLangStore\(\)/, 'const { lang, t } = useLangStore()');

// Pass t={t} lang={lang} to the components
const componentsToUpdate = [
    'GameHero', 'GameStoresGrid', 'GameAbout', 'GameScreenshots', 
    'GamePcRequirements', 'GameLanguages', 'GameSeries', 'GameSimilar',
    'GameSpecifications', 'GamePlayTime', 'GameVideos'
];

for (const comp of componentsToUpdate) {
    const regex = new RegExp('<' + comp + '([^>]*?)(/?>)', 'g');
    clientContent = clientContent.replace(regex, (match, props, closing) => {
        // avoid adding twice
        if (props.includes('t={t}') && props.includes('lang={lang}')) return match;
        return '<' + comp + props + ' t={t} lang={lang} ' + closing;
    });
}

fs.writeFileSync(clientPath, clientContent);
console.log('Done modifying 11 components and GameDetailsClient.tsx');
