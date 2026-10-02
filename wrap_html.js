const fs = require('fs');
let html = fs.readFileSync('User_Manual.html', 'utf8');
const style = `
<style>
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; padding: 40px; }
  h1 { color: #1565C0; border-bottom: 2px solid #1565C0; padding-bottom: 10px; }
  h2 { color: #1e88e5; margin-top: 30px; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
  th { background-color: #f5f5f5; }
  .note { background: #e3f2fd; padding: 15px; border-left: 5px solid #1976d2; margin: 20px 0; }
  .warning { background: #fff3e0; padding: 15px; border-left: 5px solid #f57c00; margin: 20px 0; }
</style>
`;
fs.writeFileSync('User_Manual_styled.html', `<!DOCTYPE html><html><head><meta charset="utf-8">${style}</head><body>${html}</body></html>`);
