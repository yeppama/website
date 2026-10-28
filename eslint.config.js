import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import react from 'eslint-plugin-react'

/**
 * Perché esiste: il codice conteneva sette `eslint-disable-next-line
 * react-hooks/exhaustive-deps` senza che nessun linter girasse. Erano deroghe a
 * un controllo inesistente: nessuno verificava che le dipendenze lasciate fuori
 * fossero davvero sicure. Qui le regole sugli hook diventano vere, e `npm run
 * lint` gira in CI prima della build.
 *
 * Le regole restano poche e scelte: correttezza degli hook (errore),
 * dipendenze (avviso, perché in questo progetto alcune omissioni sono volute e
 * documentate) e accessibilità delle UI overlay.
 */
export default [
  { ignores: ['dist/**', 'node_modules/**'] },

  js.configs.recommended,

  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      // __BUILD_COMMIT__ (iniettata da vite.config.js) è dichiarata dove si usa,
      // con /* global */ in BenchPanel.jsx.
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y, react },
    rules: {
      // Senza questa, no-unused-vars non vede che un componente importato è
      // usato nel JSX e segnala come inutile ogni import di componente.
      'react/jsx-uses-vars': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      ...jsxA11y.flatConfigs.recommended.rules,
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    },
  },

  {
    // Script Node. Le suite e2e valutano codice dentro la pagina, quindi usano
    // anche i globali del browser.
    files: ['scripts/**/*.{js,mjs}', 'vite.config.js', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
]
