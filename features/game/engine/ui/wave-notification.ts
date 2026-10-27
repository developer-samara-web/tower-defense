import type Phaser from 'phaser'

export function showWaveNotification(scene: Phaser.Scene, waveNumber: number) {
    const camera = scene.cameras.main

    const width = camera.width
    const panelW = 380
    const panelH = 130

    const panelX = (width - panelW) / 2
    const panelY = 100

    // Пиксельная панель
    const panel = scene.add.graphics().setDepth(2001)

    // Тёмный фон панели
    panel.fillStyle(0x1a1208, 1)
    panel.fillRect(panelX, panelY, panelW, panelH)

    // Золотая внешняя рамка
    panel.lineStyle(3, 0x8a5a2e, 1)
    panel.strokeRect(panelX, panelY, panelW, panelH)

    // Внутренняя рамка
    panel.lineStyle(1, 0x5c2d0e, 1)
    panel.strokeRect(
        panelX + 4,
        panelY + 4,
        panelW - 8,
        panelH - 8,
    )

    // Пиксельные акценты по углам
    panel.fillStyle(0xf5d76e, 1)

    panel.fillRect(panelX + 2, panelY + 2, 4, 4)
    panel.fillRect(panelX + panelW - 6, panelY + 2, 4, 4)
    panel.fillRect(panelX + 2, panelY + panelH - 6, 4, 4)
    panel.fillRect(
        panelX + panelW - 6,
        panelY + panelH - 6,
        4,
        4,
    )

    // Заголовок
    const title = scene.add
        .text(width / 2, panelY + 40, '► ВОЛНА ►', {
            fontFamily: 'monospace',
            fontSize: '28px',
            fontStyle: 'bold',
            color: '#f5d76e',
        })
        .setOrigin(0.5)
        .setShadow(2, 2, '#3a1d0a', 10, true, true)
        .setDepth(2002)

    // Номер волны
    const subtitle = scene.add
        .text(width / 2, panelY + 90, `Волна ${waveNumber}`, {
            fontFamily: 'monospace',
            fontSize: '22px',
            fontStyle: 'bold',
            color: '#e2c8a0',
        })
        .setOrigin(0.5)
        .setShadow(2, 2, '#3a1d0a', 8, true, true)
        .setDepth(2002)

    const notification = scene.add
        .container(0, 0, [panel, title, subtitle])
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
