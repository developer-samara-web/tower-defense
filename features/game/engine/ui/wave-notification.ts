import type Phaser from 'phaser'

export function showWaveNotification(scene: Phaser.Scene, waveNumber: number) {
	const { width, height } = scene.cameras.main

	// Pixel Art D&D dark overlay
	const overlay = scene.add
		.rectangle(width / 2, height / 2, width, height, 0x0a0e12, 0.85)
		.setScrollFactor(0)
		.setDepth(2000)

	// Pixel border panel
	const panelW = 380
	const panelH = 130
	const panel = scene.add
		.graphics()
		.setDepth(2001)

	const g = panel as Phaser.GameObjects.Graphics
	g.clear()

	// Dark background
	g.fillStyle(0x1a1208, 1)
	g.fillRoundedRect(width / 2 - panelW / 2, height / 2 - panelH / 2, panelW, panelH, 0)

	// Pixel border: amber/gold
	g.lineStyle(3, 0x8a5a2e, 1)
	g.strokeRoundedRect(width / 2 - panelW / 2, height / 2 - panelH / 2, panelW, panelH, 0)

	// Inner darker border
	g.lineStyle(1, 0x5c2d0e, 1)
	g.strokeRoundedRect(width / 2 - panelW / 2 + 4, height / 2 - panelH / 2 + 4, panelW - 8, panelH - 8, 0)

	// Pixel corner accents
	g.fillStyle(0xf5d76e, 1)
	const cx = width / 2
	const cy = height / 2
	// Top-left pixel
	g.fillRect(cx - panelW / 2 + 2, cy - panelH / 2 + 2, 4, 4)
	// Top-right pixel
	g.fillRect(cx + panelW / 2 - 6, cy - panelH / 2 + 2, 4, 4)
	// Bottom-left pixel
	g.fillRect(cx - panelW / 2 + 2, cy + panelH / 2 - 6, 4, 4)
	// Bottom-right pixel
	g.fillRect(cx + panelW / 2 - 6, cy + panelH / 2 - 6, 4, 4)

	// Title: "Новая волна" in pixel art style font (monospace uppercase)
	const title = scene.add
		.text(width / 2, height / 2 - 20, '► ВОЛНА ►', {
			fontFamily: 'monospace',
			fontSize: '28px',
			fontStyle: 'bold',
			color: '#f5d76e',
		})
		.setOrigin(0.5)
		.setShadow(2, 2, '#3a1d0a', 10, true, true)

	// Wave number
	const subtitle = scene.add
		.text(width / 2, height / 2 + 30, `Волна ${waveNumber}`, {
			fontFamily: 'monospace',
			fontSize: '22px',
			fontStyle: 'bold',
			color: '#e2c8a0',
		})
		.setOrigin(0.5)
		.setShadow(2, 2, '#3a1d0a', 8, true, true)

	const notification = scene.add
		.container(0, 0, [overlay, panel, title, subtitle])
		.setScrollFactor(0)
		.setDepth(2000)
		.setAlpha(0)

	scene.tweens.add({
		targets: notification,
		alpha: 1,
		duration: 200,
		onComplete: () => {
			scene.tweens.add({
				targets: notification,
				alpha: 0,
				delay: 1200,
				duration: 250,
				onComplete: () => notification.destroy(),
			})
		},
	})
}
