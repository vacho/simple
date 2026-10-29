// The app icon, drawn once: a wallet-like card with a coin. The maskable variant fills the whole
// square and keeps the symbol inside the 80% safe zone that launchers may crop to.
const symbol = `
	<rect x="120" y="170" width="272" height="188" rx="28" fill="#ffffff"/>
	<rect x="120" y="210" width="272" height="34" fill="#c9daf5"/>
	<circle cx="322" cy="300" r="30" fill="#1f5fbf"/>
	<circle cx="322" cy="300" r="14" fill="#ffffff"/>`;

export function iconSvg({ maskable = false } = {}): string {
	const background = maskable
		? '<rect width="512" height="512" fill="#1f5fbf"/>'
		: '<rect width="512" height="512" rx="112" fill="#1f5fbf"/>';
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${background}${symbol}</svg>\n`;
}
