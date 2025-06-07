// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from "eslint-config-prettier/flat";

export default tseslint.config(
	{
		ignores: [
			'frontend/dist/',
			'frontend/src/vendor/',
			'backend/dist/',
			'venv/',
			'node_modules/',
			'dist/',
			'build/',
			'coverage/',
			'docs/',
			'.github/',
			'db_backups/',
			'docker_secrets/',
		],
	},

	eslint.configs.recommended,
	tseslint.configs.recommended,
	eslintConfigPrettier
);