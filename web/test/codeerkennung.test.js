import { test } from 'node:test'
import assert from 'node:assert/strict'
import { erkenneCode } from '../src/bloecke/codeerkennung.js'

const sprache = t => erkenneCode(t)?.sprache ?? null

test('Fließtext bleibt Text', () => {
  for (const t of [
    'Moin Peter,\ndas ist ein ganz normaler Absatz. Er hat zwei Zeilen.',
    'Unsere Vorteile:\n- Dienstrad für alle Mitarbeiter im ganzen Team\n- Weiterbildung und Entwicklung bei uns im Haus',
    'Ein Satz mit {Klammer} und x = 1 im Text, der trotzdem Prosa ist.\nUnd noch ein zweiter Satz, der auch nicht Code ist.',
    'nur eine Zeile const x = 1;',
  ]) assert.equal(erkenneCode(t), null, t)
})

test('Code-Zaun mit Sprache', () => {
  const r = erkenneCode('```ts\nconst x: number = 1\n```')
  assert.deepEqual(r, { quelle: 'const x: number = 1', sprache: 'typescript', sicher: true })
  assert.equal(erkenneCode('```\nSELECT * FROM posts WHERE id = 1\n```').sprache, 'sql')
})

test('Sprachen werden erkannt', () => {
  const faelle = {
    javascript: "import fs from 'node:fs'\nconst x = fs.readFileSync('a')\nexport default x",
    typescript: 'interface Block {\n  id: string\n  typ: string\n}',
    json: '{\n  "id": "b1",\n  "typ": "hero"\n}',
    python: 'def hallo(name):\n    print(f"Moin {name}")\n\nhallo("Peter")',
    shell: 'sudo apt install nginx\nsudo systemctl reload nginx',
    sql: 'SELECT id, title\nFROM posts\nWHERE status = \'published\';',
    html: '<div class="karte">\n  <p>Hallo</p>\n</div>',
    css: '.karte {\n  color: red;\n  padding: 1rem;\n}',
    dockerfile: 'FROM node:22-alpine\nWORKDIR /app\nCOPY . .\nRUN npm ci',
    php: '<?php\necho "Hallo";\n$x = 1;',
    yaml: 'server:\n  port: 3001\n  host: 127.0.0.1\nlog:\n  - info',
  }
  for (const [erwartet, t] of Object.entries(faelle)) assert.equal(sprache(t), erwartet, t)
})
