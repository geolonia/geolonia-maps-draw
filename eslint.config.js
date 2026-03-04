import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['dist/', 'dist-preview/', 'node_modules/', 'coverage/'],
  },
  ...tseslint.configs.recommended,
)
