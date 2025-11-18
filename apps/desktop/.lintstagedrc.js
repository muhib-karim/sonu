module.exports = {
  '*.js': [
    'eslint --fix',
    'prettier --write'
  ],
  '*.{json,md}': [
    'prettier --write'
  ]
};

