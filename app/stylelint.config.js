// Logical CSS properties and token-only colors keep every component themeable.
const physical = ['left', 'right'];
const colorRules = {
	'color-no-hex': true,
	'color-named': 'never',
	'function-disallowed-list': [
		'rgb',
		'rgba',
		'hsl',
		'hsla',
		'hwb',
		'lab',
		'lch',
		'oklab',
		'oklch',
		'color'
	]
};

/** @type {import('stylelint').Config} */
export default {
	overrides: [
		{ files: ['**/*.svelte'], customSyntax: 'postcss-html' },
		{
			files: ['**/tokens.css'],
			rules: Object.fromEntries(Object.keys(colorRules).map((rule) => [rule, null]))
		}
	],
	rules: {
		...colorRules,
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
