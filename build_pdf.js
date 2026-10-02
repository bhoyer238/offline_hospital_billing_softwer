const fs = require('fs');
const { execSync } = require('child_process');

try {
  // Use pandoc if available? No, let's just do md-to-pdf programmatically if we want.
  // Actually, I can just use powershell to start Edge. First I need HTML.
  // The user project has react-markdown or marked? It's a Vite React app.
  // Let's just create the HTML string directly.
  let md = fs.readFileSync('User_Manual.md', 'utf8');
  
  // Very basic md to html conversion for our specific file
  let html = md
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<b>$1</b>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/---/g, '<hr/>');

  const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>User Manual</title>
</head>
<body style="font-family: Arial, sans-serif; padding: 20px;">
  ${html}
</body>
</html>`;

  fs.writeFileSync('User_Manual.html', fullHtml);
  console.log('HTML created successfully.');

  // Now run Edge headless
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const cmd = `"${edgePath}" --headless --disable-gpu --print-to-pdf="E:\\Project\\Hospital Billing\\Hospital_Billing_User_Manual.pdf" "E:\\Project\\Hospital Billing\\User_Manual.html"`;
  execSync(cmd);
  console.log('PDF created successfully.');
} catch (e) {
  console.error(e);
}
