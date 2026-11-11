// Einstellungen für TipTap, passend zum Renderer auf dem Server (api/src/lib/bloecke.js):
// Überschriften 2 bis 4, kein Unterstreichen, Links nur http(s), mailto, eigene Pfade und Anker.
import StarterKit from '@tiptap/starter-kit'
import CodeBlock from '@tiptap/extension-code-block'

export const LINK_OK = /^(https?:\/\/|mailto:|\/(?!\/)|#)/i

export const erweiterungen = () => [
  StarterKit.configure({
    heading: { levels: [2, 3, 4] },
    underline: false,
    codeBlock: false,
    link: {
      openOnClick: false,
      autolink: true,
      defaultProtocol: 'https',
      isAllowedUri: url => LINK_OK.test(url),
      HTMLAttributes: { rel: 'noopener noreferrer', target: null },
    },
  }),
  // Ohne Eingaberegel: ``` + Enter öffnet einen Monaco-Code-Block (TextEditor.vue)
  CodeBlock.extend({ addInputRules: () => [] }),
]
