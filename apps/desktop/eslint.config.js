/**
 * ESLint Configuration for SONU Desktop App
 * 
 * Enforces code quality, security best practices, and consistent style
 */

module.exports = [
  {
    files: ['src/**/*.js', 'tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly'
      }
    },
    rules: {
      // Possible Errors
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      'no-debugger': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-empty': ['error', { allowEmptyCatch: false }],
      'no-ex-assign': 'error',
      'no-extra-semi': 'error',
      'no-func-assign': 'error',
      'no-irregular-whitespace': 'error',
      'no-obj-calls': 'error',
      'no-prototype-builtins': 'error',
      'no-sparse-arrays': 'error',
      'no-unexpected-multiline': 'error',
      'no-unreachable': 'error',
      'no-unsafe-finally': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',

      // Best Practices
      'array-callback-return': 'error',
      'block-scoped-var': 'error',
      'curly': ['error', 'all'],
      'default-case': 'error',
      'default-case-last': 'error',
      'default-param-last': 'error',
      'dot-location': ['error', 'property'],
      'dot-notation': 'error',
      'eqeqeq': ['error', 'always'],
      'guard-for-in': 'error',
      'no-alert': 'error',
      'no-caller': 'error',
      'no-case-declarations': 'error',
      'no-constructor-return': 'error',
      'no-else-return': 'error',
      'no-empty-function': 'error',
      'no-empty-pattern': 'error',
      'no-eq-null': 'error',
      'no-eval': 'error',
      'no-extend-native': 'error',
      'no-extra-bind': 'error',
      'no-extra-label': 'error',
      'no-fallthrough': 'error',
      'no-floating-decimal': 'error',
      'no-global-assign': 'error',
      'no-implicit-coercion': 'error',
      'no-implicit-globals': 'error',
      'no-implied-eval': 'error',
      'no-invalid-this': 'error',
      'no-iterator': 'error',
      'no-labels': 'error',
      'no-lone-blocks': 'error',
      'no-loop-func': 'error',
      'no-multi-spaces': 'error',
      'no-multi-str': 'error',
      'no-new': 'error',
      'no-new-func': 'error',
      'no-new-wrappers': 'error',
      'no-octal': 'error',
      'no-octal-escape': 'error',
      'no-param-reassign': 'error',
      'no-proto': 'error',
      'no-redeclare': 'error',
      'no-return-assign': 'error',
      'no-return-await': 'error',
      'no-script-url': 'error',
      'no-self-assign': 'error',
      'no-self-compare': 'error',
      'no-sequences': 'error',
      'no-throw-literal': 'error',
      'no-unmodified-loop-condition': 'error',
      'no-unused-expressions': 'error',
      'no-unused-labels': 'error',
      'no-useless-call': 'error',
      'no-useless-catch': 'error',
      'no-useless-concat': 'error',
      'no-useless-escape': 'error',
      'no-useless-return': 'error',
      'no-void': 'error',
      'no-warning-comments': ['warn', { terms: ['todo', 'fixme', 'hack', 'xxx'], location: 'start' }],
      'no-with': 'error',
      'prefer-named-capture-group': 'warn',
      'prefer-promise-reject-errors': 'error',
      'prefer-regex-literals': 'error',
      'radix': 'error',
      'require-await': 'error',
      'require-unicode-regexp': 'warn',
      'wrap-iife': ['error', 'inside'],
      'yoda': 'error',

      // Variables
      'no-delete-var': 'error',
      'no-label-var': 'error',
      'no-restricted-globals': ['error', 'event', 'fdescribe', 'fit'],
      'no-shadow': 'error',
      'no-shadow-restricted-names': 'error',
      'no-undef': 'error',
      'no-undef-init': 'error',
      'no-undefined': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-use-before-define': ['error', { functions: false }],

      // Node.js and CommonJS
      'global-require': 'error',
      'handle-callback-err': 'error',
      'no-buffer-constructor': 'error',
      'no-mixed-requires': 'error',
      'no-new-require': 'error',
      'no-path-concat': 'error',
      'no-process-env': 'off',
      'no-process-exit': 'warn',
      'no-restricted-modules': 'off',
      'no-sync': ['warn', { allowAtRootLevel: true }]
    }
  },
  {
    // Main process specific rules
    files: ['src/**/*.js'],
    rules: {
      // Security focused rules for main process
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.name="eval"]',
          message: 'eval() is dangerous and should not be used'
        },
        {
          selector: 'CallExpression[callee.name="exec"]',
          message: 'Use safeSpawn() from errorHandler instead of exec()'
        },
        {
          selector: 'CallExpression[callee.name="execSync"]',
          message: 'Use safeSpawn() from errorHandler instead of execSync()'
        },
        {
          selector: 'NewExpression[callee.name="Function"]',
          message: 'Function constructor is dangerous and should not be used'
        }
      ]
    }
  },
  {
    // Test file specific rules
    files: ['tests/**/*.js'],
    rules: {
      'no-console': 'off',
      'no-process-exit': 'off',
      'no-sync': 'off'
    }
  },
  {
    // Ignore patterns
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'models/**',
      'assets/**',
      'data/**',
      'cache/**',
      'logs/**',
      '*.config.js'
    ]
  }
];
