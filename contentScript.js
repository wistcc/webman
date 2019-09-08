(function () {
    let myCanvas;
    chrome.extension.sendRequest({ command: 'getLoadGame' });
    chrome.runtime.onMessage.addListener(() => {
        if (!myCanvas) {
            startGame()
        }
    });

    function startGame() {
        myCanvas = document.createElement("canvas");
        document.body.setAttribute('style', 'overflow: hidden;')
        document.body.appendChild(myCanvas);
        document.activeElement.blur()

        let score = 0
        const viewPortWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
        const viewPortHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

        class Game extends Phaser.Scene {
            constructor() {
                super({ key: 'Game' });
            }

            preload() {
                this.load.image('bomb', chrome.extension.getURL('assets/bomb.png'));
                this.load.image('player', chrome.extension.getURL('/assets/player.png'))
                this.load.image('star', chrome.extension.getURL('/assets/star.png'));
                this.load.image('font', chrome.extension.getURL('assets/font.png'));
            }
            create() {
                myCanvas.setAttribute('style', 'position: fixed; left: 0; top: 0; z-index: 99999999; background-color: rgba(0,0,0,0.2)')
                score = 0
                this.isGameOver = false
                // Parameters: x position, y position, name of the sprite
                this.player = this.physics.add.sprite(100, 100, 'player');
                //scale evenly
                this.player.scaleX = 0.2;
                this.player.scaleY = 0.2;
                this.player.setCollideWorldBounds(true);

                this.platforms = this.physics.add.staticGroup();
                this.createPlatforms()

                this.bombs = this.physics.add.group({})

                this.star = this.physics.add.sprite(0, 0, 'star');
                this.add.tween({
                    targets: [this.star],
                    ease: k => k < 0.5 ? 0 : 1,
                    duration: 100,
                    yoyo: true,
                    repeat: -1,
                    alpha: 0.5
                });
                this.addStar()

                // The style of the text 
                // A lot of options are available, these are the most important ones
                let style = { font: '40px Arial', fill: '#fff' };

                // Display the score in the top left corner
                // Parameters: x position, y position, text, style
                this.scoreText = this.add.text(20, 20, 'Score: ' + score, style);

                this.arrow = this.input.keyboard.createCursorKeys();
                this.physics.add.overlap(this.player, this.bombs, this.gameOver, null, this);

                this.spacebarKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
                this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
                this.wKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
                this.aKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
                this.sKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
                this.dKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
            }
            update() {
                if (this.isGameOver) {
                    if (this.spacebarKey.isDown || this.enterKey.isDown) {
                        this.scene.start('Game')
                    }
                    return
                }

                if (this.physics.overlap(this.player, this.star)) {
                    this.hit();
                }

                if (this.arrow.right.isDown || this.dKey.isDown) {
                    this.player.x += 15;
                } else if (this.arrow.left.isDown || this.aKey.isDown) {
                    this.player.x -= 15;
                }

                if (this.arrow.down.isDown || this.sKey.isDown) {
                    this.player.y += 15;
                } else if (this.arrow.up.isDown || this.wKey.isDown) {
                    this.player.y -= 15;
                }

                this.checkPlatformOverlaping()
            }
            addStar() {
                let newX
                let newY

                do {
                    newX = Phaser.Math.Between(30, viewPortWidth - 30);
                    newY = Phaser.Math.Between(30, viewPortHeight - 30);
                } while (!this.isFreePoint(newX, newY))

                this.star.x = newX
                this.star.y = newY
            }
            hit() {
                this.addStar()
                score += 10;

                this.scoreText.setText('Score: ' + score);

                this.tweens.add({
                    targets: this.player,
                    duration: 200,
                    scaleX: 0.3,
                    scaleY: 0.3,
                    yoyo: true,
                });

                var x = (this.player.x < 400) ? Phaser.Math.Between(400, 800) : Phaser.Math.Between(0, 400);
                var bomb = this.bombs.create(x, 16, 'bomb');
                bomb.setBounce(1);
                bomb.setCollideWorldBounds(true);
                bomb.setVelocity(200, 200);
            }
            gameOver() {
                myCanvas.setAttribute('style', 'position: fixed; left: 0; top: 0; z-index: 99999999; background-color: rgba(0,0,0,0.5)')
                this.isGameOver = true
                this.physics.pause();
                this.player.setTint(0xff0000);

                const x = this.cameras.main.width / 2;
                const y = this.cameras.main.height / 2;

                let style = { font: '40px Arial', fill: '#fff' };
                const startButton = this.add.text(x, y, 'Press [ ENTER ] or [ SPACE ] to restart game', style)
                    .setOrigin(0.5, 1);

                this.add.tween({
                    targets: [startButton],
                    ease: k => k < 0.5 ? 0 : 1,
                    duration: 250,
                    yoyo: true,
                    repeat: -1,
                    alpha: 0
                });

                this.add.zone(
                    startButton.x - (startButton.width * startButton.originX) - 16,
                    startButton.y - (startButton.height * startButton.originY) - 16,
                    startButton.width + 32,
                    startButton.height + 32
                )
                    .setOrigin(0, 0)
                    .setInteractive()
                    .once('pointerup', () => this.scene.start('Game'));

                chrome.extension.sendRequest({ command: 'setScore', score });
            }
            createPlatforms() {
                const elements = [
                    ...document.querySelectorAll('button'),
                    ...document.querySelectorAll('input'),
                    ...document.querySelectorAll('select'),
                    ...document.querySelectorAll('h1'),
                    ...document.querySelectorAll('h2'),
                    ...document.querySelectorAll('h3'),
                    ...document.querySelectorAll('h4'),
                    ...document.querySelectorAll('h5'),
                    ...document.querySelectorAll('h6'),
                    ...document.querySelectorAll('p'),
                    ...document.querySelectorAll('li'),
                    ...document.querySelectorAll('a'),
                ]
                elements.forEach(el => {
                    const { x, y, width, height } = el.getBoundingClientRect()

                    if (width < (viewPortWidth * 0.8) &&
                        height < (viewPortHeight * 0.8) &&
                        width > 30 && height > 30 &&
                        this.isFreePoint(x, y) &&
                        !this.playerIsInside(x, y, width, height)) {
                        const style = getComputedStyle(el);

                        if (style.display !== 'none' &&
                            style.visibility === 'visible' &&
                            style.opacity >= 0.1 &&
                            style.clip === 'auto') {
                            el.style.cssText = 'border: 2px solid rgb(27, 118, 196) !important'
                            const platform = this.platforms.create(x, y, '', '', false).setOrigin(0, 0);
                            platform.displayWidth = width
                            platform.displayHeight = height
                            platform.el = el
                        }
                    }
                })
            }
            checkPlatformOverlaping() {
                this.platforms.children.entries.forEach(platform => {
                    if (this.playerIsInside(platform.x, platform.y, platform.displayWidth, platform.displayHeight)) {
                        this.gameOver()
                        return
                    }
                })
            }
            playerIsInside(x, y, width, height) {
                const offsetTop = 20
                const offsetBottom = 20
                if ((this.player.x >= x && (this.player.y - offsetTop) >= y &&
                    this.player.x <= (x + width) && (this.player.y - offsetTop) <= (y + height)) ||
                    (this.player.x >= x && (this.player.y + offsetBottom) >= y &&
                        this.player.x <= (x + width) && (this.player.y + offsetBottom) <= (y + height))) {
                    return true
                }
                return false
            }
            isFreePoint(x, y) {
                let isFree = true
                this.platforms.children.entries.forEach(platform => {
                    const offset = 35
                    if (x >= (platform.x - offset) && y >= (platform.y - offset) &&
                        x <= (platform.x + platform.displayWidth + offset) && y <= (platform.y + platform.displayHeight + offset)) {
                        isFree = false
                    }
                })
                return isFree
            }
        }

        new Phaser.Game({
            width: viewPortWidth,
            height: viewPortHeight,
            type: Phaser.AUTO,
            canvas: myCanvas,
            physics: { default: 'arcade' },
            scene: [
                Game,
            ],
            transparent: true
        });
    }
})()