// Logical CSS properties only (D10), so layouts mirror in right-to-left languages.
const physical = ['left', 'right'];

/** @type {import('stylelint').Config} */
export default {
	overrides: [{ files: ['**/*.svelte'], customSyntax: 'postcss-html' }],
	rules: {
		'property-disallowed-list': [
			[
				...physical,
				/^(margin|padding|border|inset|scroll-margin|scroll-padding)-(left|right)/,
				/^border-(top|bottom)-(left|right)-radius$/
			],
			{ message: 'Use a logical property instead (D10).' }
		],
		'declaration-property-value-disallowed-list': [
			{
				'text-align': physical,
				float: physical,
				clear: physical,
				resize: ['horizontal', 'vertical']
			},
			{ message: 'Use start or end instead (D10).' }
		]
	}
};
