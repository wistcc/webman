(function () {
    let myCanvas;
    let game;
    let score = 0
    const pageElements = [];

    chrome.extension.sendRequest({ command: 'getLoadGame' });
    chrome.runtime.onMessage.addListener((request) => {
        switch (request.command) {
            case 'loadGame':
                startGame()
                break;
            case 'cleanUp':
                cleanUp()
                break;
        }
    });

    function cleanUp () {
        game.destroy(true);
        game = null;

        myCanvas.parentNode.removeChild(myCanvas);
        myCanvas = null;

        document.querySelector('html').setAttribute('style', '')
        document.body.setAttribute('style', '');
        pageElements.forEach(el => {
            el.setAttribute('style', '');
        });

        setScore()
    }

    function setScore () {
        chrome.extension.sendRequest({ command: 'setScore', score });
    }

    function startGame() {
        myCanvas = document.createElement("canvas");
        document.body.setAttribute('style', 'overflow: hidden;')
        document.querySelector('html').setAttribute('style', 'overflow: hidden;')
        document.body.appendChild(myCanvas);
        document.activeElement.blur()

        score = 0
        const viewPortWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
        const viewPortHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
        
        const isInViewport = elem => {
            const bounding = elem.getBoundingClientRect();
            return (
                bounding.top >= 0 &&
                bounding.left >= 0 &&
                bounding.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                bounding.right <= (window.innerWidth || document.documentElement.clientWidth)
            );
        };

        class Game extends Phaser.Scene {
            constructor() {
                super({ key: 'Game' });
            }

            preload() {
                this.load.image('bomb', chrome.extension.getURL('assets/bomb.png'));
                this.load.image('player', chrome.extension.getURL('/assets/player.png'))
                this.load.image('star', chrome.extension.getURL('/assets/star.png'));
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
                this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
                this.wKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
                this.aKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
                this.sKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
                this.dKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
            }
            update() {
                if (this.isGameOver) {
                    if (this.spacebarKey.isDown || this.escKey.isDown) {
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

                this.checkPlatformOverlapping()
            }
            addStar() {
                let newX
                let newY

                do {
                    newX = Phaser.Math.Between(30, viewPortWidth - 30);
                    newY = Phaser.Math.Between(30, viewPortHeight - 30);
                } while (!this.isFreePoint(newX, newY, 24, 22))

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
                const startButton = this.add.text(x, y, 'Press [ ESC ] or [ SPACE ] to restart game', style)
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

                setScore()
            }
            createPlatforms() {
                document.querySelectorAll('*').forEach(el => {
                    const { x, y, width, height } = el.getBoundingClientRect()

                    if (isInViewport(el) &&
                        width < (viewPortWidth * 0.8) &&
                        height < (viewPortHeight * 0.8) &&
                        width > 30 && height > 10 && width < 260 && height < 260 &&
                        this.isFreePoint(x, y, width, height) &&
                        !this.playerIsInside(x, y, width, height)) {
                        const style = getComputedStyle(el);

                        if (style.display !== 'none' &&
                            style.visibility === 'visible' &&
                            style.opacity >= 0.1 &&
                            style.clip === 'auto') {
                            el.style.cssText = 'border: 2px solid rgb(27, 118, 196) !important; background-color: rgb(27, 118, 196, 0.5) !important'
                            const platform = this.platforms.create(x, y, '', '', false).setOrigin(0, 0);
                            platform.displayWidth = width
                            platform.displayHeight = height
                            pageElements.push(el)
                        }
                    }
                })
            }
            checkPlatformOverlapping() {
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
            isFreePoint(x, y, width, height) {
                let isFree = true
                const x2 = x + width
                const y2 = y + height

                this.platforms.children.entries.forEach(platform => {
                    const offset = 50
                    const platformX1 = platform.x - offset
                    const platformX2 = platform.x + platform.displayWidth + offset
                    const platformY1 = platform.y - offset
                    const platformY2 = platform.y + platform.displayHeight + offset

                    // [x1,y1] is contained by the platform element
                    if (x >= platformX1 && y >= platformY1 && x <= platformX2 && y <= platformY2) {
                        isFree = false
                    }
                    // [x1, y2] is contained by the platform element
                    else if (x >= platformX1 && y2 >= platformY1 && x <= platformX2 && y2 <= platformY2) {
                        isFree = false
                    }
                    // [x2, y1] is contained by the platform element
                    else if (x2 >= platformX1 && y >= platformY1 && x2 <= platformX2 && y <= platformY2) {
                        isFree = false
                    }
                    // [x2, y2] is contained by the platform element
                    else if (x2 >= platformX1 && y2 >= platformY1 && x2 <= platformX2 && y2 <= platformY2) {
                        isFree = false
                    }
                    // [platformX1,platformY1] is contained by the point
                    if (platformX1 >= x && platformY1 >= y && platformX1 <= x2 && platformY1 <= y2) {
                        isFree = false
                    }
                    // [platformX1, platformY2] is contained by the point
                    else if (platformX1 >= x && platformY2 >= y && platformX1 <= x2 && platformY2 <= y2) {
                        isFree = false
                    }
                    // [platformX2, platformY1] is contained by the point
                    else if (platformX2 >= x && platformY1 >= y && platformX2 <= x2 && platformY1 <= y2) {
                        isFree = false
                    }
                    // [platformX2, platformY2] is contained by the point
                    else if (platformX2 >= x && platformY2 >= y && platformX2 <= x2 && platformY2 <= y2) {
                        isFree = false
                    }
                })
                return isFree
            }
        }

        game = new Phaser.Game({
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