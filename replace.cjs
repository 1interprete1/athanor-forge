const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'services', 'groqService.ts');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/dispatch\(\d+,\s*/g, 'addLog(');
content = content.replace(/const { startGroup, startSubGroup, endGroup, dispatch } = observability;/g, 'const { startGroup, startSubGroup, endGroup, addLog } = observability;');
content = content.replace(/const { startGroup, addLog, startSubGroup, endGroup, dispatch } = observability;/g, 'const { startGroup, addLog, startSubGroup, endGroup } = observability;');

fs.writeFileSync(filePath, content);
console.log('Done');
