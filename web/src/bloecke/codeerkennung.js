// Erkennt beim Einfügen, ob ein Text Code ist, und rät die Sprache. Liefert null für normalen Text.
// Lieber einmal zu wenig erkennen als Fließtext zu Code machen: Der Editor fragt ohnehin nach.

const ZAUN = /^```([\w+#-]*)\s*\n([\s\S]*?)\n?```\s*$/

const ALIAS = { js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', py: 'python', sh: 'shell', bash: 'shell',
  zsh: 'shell', ps1: 'powershell', yml: 'yaml', md: 'markdown', cs: 'csharp', 'c#': 'csharp', rs: 'rust', golang: 'go',
  docker: 'dockerfile', htm: 'html', text: 'plaintext', txt: 'plaintext' }

// Merkmale einer Codezeile
const CODEZEILE = [
  /[;{}]\s*$/,                                             // endet mit ; { }
  /^\s*[}\])]/,                                            // beginnt mit schließender Klammer
  /^\s*(const|let|var|function|import|export|return|if|for|while|class|def|from|public|private|protected|static|async|await|elif|else|try|catch|except|package|using|namespace|fn|func|impl|struct|interface|type|echo|sudo|apt|npm|cd|ls|FROM|RUN|COPY|ENV|EXPOSE|SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/,
  /=>|===|!==|&&|\|\||::|->|:=|\+=/,
  /^\s*<\/?[a-zA-Z][\w-]*(\s[^>]*)?\/?>\s*$/,               // Zeile ist ein HTML/XML-Tag
  /^\s*"[^"]+"\s*:\s*/,                                    // JSON-Schlüssel
  /^\s*[\w-]+\s*:\s*[^;]+;\s*$/,                           // CSS-Eigenschaft
  /^\s*(#!|\$ |# ?[a-z_]+\s*=)/,                           // Shebang, Shell-Prompt
  /^(\t| {2,})\S/,                                         // eingerückt
  /^\s*(\/\/|\/\*|\*\/|--\s|#\s*include)/,                 // Kommentar
  /^\s*[\w.-]+\s*\(.*\)\s*;?\s*$/,                         // Funktionsaufruf als ganze Zeile
]

// Merkmale von Fließtext
const PROSA = [/[.!?]["“”)]?\s*$/, /^\s*[-*•]\s+\S+(\s+\S+){3,}/, /\b(der|die|das|und|ist|nicht|the|and|is|of)\b/i]

export function rateSprache(text) {
  const t = text.trim()
  if (/^<\?php/.test(t)) return 'php'
  if (/^(\{[\s\S]*\}|\[[\s\S]*\])$/.test(t)) { try { JSON.parse(t); return 'json' } catch { /* weiter */ } }
  if (/^#!.*\b(bash|sh|zsh)\b/.test(t) || /^\s*(\$ |sudo |apt(-get)? |systemctl |chmod |chown |cd |ls |echo |export \w+=)/m.test(t)) return 'shell'
  if (/^\s*FROM\s+\S+/m.test(t) && /^\s*(RUN|COPY|CMD|ENTRYPOINT)\b/m.test(t)) return 'dockerfile'
  if (/^\s*<(!doctype|html|div|span|p|a|ul|section|head|body|script|style)\b/i.test(t)) return 'html'
  if (/^\s*<\?xml|^\s*<[\w:-]+(\s[\w:-]+="[^"]*")*\s*>/.test(t) && /<\/[\w:-]+>\s*$/.test(t)) return 'xml'
  if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|WITH)\b[\s\S]*\b(FROM|INTO|SET|TABLE|INDEX|VIEW|WHERE)\b/i.test(t)) return 'sql'
  if (/^\s*(def |class \w+(\(.*\))?:|import \w+$|from \w+ import |if __name__)/m.test(t) && !/[;{]\s*$/m.test(t)) return 'python'
  if (/^\s*\$\w+\s*=|\b(Get|Set|New|Remove|Write)-[A-Z]\w+/m.test(t)) return 'powershell'
  if (/^[\w.#:\s>,[\]="-]+\{\s*$/m.test(t) && /^\s*[\w-]+\s*:\s*[^;]+;\s*$/m.test(t)) return /\$\w+|@mixin|&:/.test(t) ? 'scss' : 'css'
  if (/^\s*(fn |let mut |impl |use [\w:]+;|pub fn )/m.test(t)) return 'rust'
  if (/^\s*(package \w+$|func \w+\(|import \(|:= )/m.test(t)) return 'go'
  if (/^\s*(using System|namespace \w+|public (class|static|void|async))/m.test(t)) return /using System|namespace/.test(t) ? 'csharp' : 'java'
  if (/:\s*(string|number|boolean|void|any)\b|\binterface \w+\s*\{|\btype \w+\s*=|<\w+>\(/.test(t)) return 'typescript'
  if (/\b(const|let|var|function|=>|require\(|import .* from|export (default|const|function))\b/.test(t)) return 'javascript'
  if (/^\s*\[[\w. -]+\]\s*$/m.test(t) && /^\s*[\w.-]+\s*=\s*.+$/m.test(t)) return 'ini'
  if (/^\s*[\w-]+:\s*(\S.*)?$/m.test(t) && /^\s{2,}[\w-]+:|^\s*- /m.test(t) && !/[;{}]/.test(t)) return 'yaml'
  return 'plaintext'
}

export function erkenneCode(text) {
  if (!text || text.length > 100000) return null
  const zaun = text.trim().match(ZAUN)
  if (zaun) {
    const angabe = zaun[1].toLowerCase()
    return { quelle: zaun[2], sprache: ALIAS[angabe] || angabe || rateSprache(zaun[2]), sicher: true }
  }
  const zeilen = text.replace(/\r\n/g, '\n').split('\n').filter(z => z.trim())
  if (zeilen.length < 2) return null
  let code = 0, prosa = 0
  for (const z of zeilen) {
    if (CODEZEILE.some(r => r.test(z))) code++
    if (PROSA.filter(r => r.test(z)).length >= 2) prosa++
  }
  if (code / zeilen.length < 0.6 || prosa / zeilen.length > 0.3) return null
  return { quelle: text.replace(/\r\n/g, '\n').replace(/\n+$/, ''), sprache: rateSprache(text), sicher: false }
}
