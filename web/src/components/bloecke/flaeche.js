// Hintergründe der Blöcke. „sand“ und „akzent“ kommen aus dem Theme (Fläche und Akzentfarbe).
export const FLAECHE = {
  standard: '',
  hell: 'bg-gray-50 dark:bg-gray-800/50',
  sand: 'bg-flaeche text-flaeche-text',
  akzent: 'bg-akzent text-akzent-text',
  dunkel: 'bg-gray-900 text-gray-100',
}
export const istDunkel = h => h === 'akzent' || h === 'dunkel'
