(function () {
    let myCanvas;
    let game;
    let score = 0
    let pageElements = [];

    chrome.extension.sendRequest({ command: 'getLoadGame' });
    chrome.runtime.onMessage.addListener((request) => {
        switch (request.command) {
            case 'loadGame':
                startGame()
                break;
            case 'cleanUp':
                cleanUp(true)
                break;
        }
    });

    function cleanUp (hardCleanUp = false) {
        if (hardCleanUp) {
            game.destroy(true);
            game = null;

            myCanvas.parentNode.removeChild(myCanvas);
            myCanvas = null;
            
            document.querySelector('html').setAttribute('style', '')
            document.body.setAttribute('style', '');
        }

        pageElements.forEach(el => {
            el.setAttribute('style', '');
        });
        pageElements = []

        setScore()
    }

    function setScore () {
        chrome.extension.sendRequest({ command: 'setScore', score });
    }

    function startGame() {
        if (!myCanvas) {
            myCanvas = document.createElement("canvas");
            document.body.setAttribute('style', 'overflow: hidden;')
            document.querySelector('html').setAttribute('style', 'overflow: hidden;')
            document.body.appendChild(myCanvas);
        }
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
                this.playerHorizontalOffset = 10
                this.playerVerticalOffset = 15
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
                this.physics.add.overlap(this.player, this.bombs, this.gameOver, this.playerCollidesWithBomb, this);

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
                        cleanUp()
                        this.scene.start('Game')
                    }
                    return
                }

                if (this.physics.overlap(this.player, this.star)) {
                    this.getStar();
                }

                if (this.arrow.right.isDown || this.dKey.isDown) {
                    this.player.x += 10;
                } else if (this.arrow.left.isDown || this.aKey.isDown) {
                    this.player.x -= 10;
                }

                if (this.arrow.down.isDown || this.sKey.isDown) {
                    this.player.y += 10;
                } else if (this.arrow.up.isDown || this.wKey.isDown) {
                    this.player.y -= 10;
                }

                this.checkPlatformOverlapping()
            }
            addStar() {
                let newX
                let newY

                do {
                    newX = Phaser.Math.Between(30, viewPortWidth - 30);
                    newY = Phaser.Math.Between(30, viewPortHeight - 30);
                } while (!this.isFreePoint(newX, newY, 24, 22, true))

                this.star.x = newX
                this.star.y = newY
            }
            getStar() {
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
                
                const scale = Phaser.Math.Between(1, 3);
                bomb.scaleX = scale
                bomb.scaleY = scale

                bomb.setBounce(1);
                bomb.setCollideWorldBounds(true);
                bomb.setVelocity(Phaser.Math.Between(50, 400), Phaser.Math.Between(50, 400));
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
                        width < (viewPortWidth * 0.2) &&
                        height < (viewPortHeight * 0.2) &&
                        width > 30 && height > 10 &&
                        this.isFreePoint(x, y, width, height, false) &&
                        !this.playerCollidesWithPlatform(x, y, width, height)) {
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
                    if (this.playerCollidesWithPlatform(platform.x, platform.y, platform.displayWidth, platform.displayHeight)) {
                        this.gameOver()
                        return
                    }
                })
            }
            object1ContainsObject2(object1, object2,
                object1HorizontalOffset = 0, object1VerticalOffset = 0, object2HorizontalOffset = 0, object2VerticalOffset = 0,
                isObject1InitialPointCentered = true, isObject2InitialPointCentered = true) {
                const object1X = object1.x - (isObject1InitialPointCentered ? object1HorizontalOffset : 0)
                const object1X2 = object1.x + object1HorizontalOffset
                const object1Y = object1.y - (isObject1InitialPointCentered ? object1VerticalOffset : 0)
                const object1Y2 = object1.y + object1VerticalOffset

                const object2X = object2.x - (isObject2InitialPointCentered ? object2HorizontalOffset : 0)
                const object2X2 = object2.x + object2HorizontalOffset
                const object2Y = object2.y - (isObject2InitialPointCentered ? object2VerticalOffset : 0)
                const object2Y2 = object2.y + object2VerticalOffset
                
                // [object2X,object2Y] is contained by the platform element
                if (object2X >= object1X && object2Y >= object1Y && object2X <= object1X2 && object2Y <= object1Y2) {
                    return true
                }
                // [object2X, object2Y2] is contained by the platform element
                else if (object2X >= object1X && object2Y2 >= object1Y && object2X <= object1X2 && object2Y2 <= object1Y2) {
                    return true
                }
                // [object2X2, object2Y] is contained by the platform element
                else if (object2X2 >= object1X && object2Y >= object1Y && object2X2 <= object1X2 && object2Y <= object1Y2) {
                    return true
                }
                // [object2X2, object2Y2] is contained by the platform element
                else if (object2X2 >= object1X && object2Y2 >= object1Y && object2X2 <= object1X2 && object2Y2 <= object1Y2) {
                    return true
                }
                return false
            }
            playerCollidesWithBomb(player, bomb) {
                const bombOffset = 4 
                return this.object1ContainsObject2(player, bomb, this.playerHorizontalOffset, this.playerVerticalOffset, bombOffset * bomb.scaleX, bombOffset * bomb.scaleY)
            }            
            playerCollidesWithPlatform(x, y, width, height) {
                const platform = { x, y }
                return this.object1ContainsObject2(
                        platform,
                        this.player,
                        width,
                        height,
                        this.playerHorizontalOffset,
                        this.playerVerticalOffset,
                        false,
                        true)
                    || this.object1ContainsObject2(
                        this.player,
                        platform,
                        this.playerHorizontalOffset,
                        this.playerVerticalOffset,
                        width,
                        height,
                        true,
                        false)
            }
            isFreePoint(x, y, width, height, isInitialPointCentered) {
                let isFree = true
                const newElement = { x, y }
                const platformOffset = 50

                this.platforms.children.entries.forEach(platform => {
                    if (this.object1ContainsObject2(
                            newElement,
                            platform,
                            width,
                            height,
                            platform.displayWidth + platformOffset,
                            platform.displayHeight + platformOffset,
                            isInitialPointCentered,
                            true)
                        || this.object1ContainsObject2(
                            platform,
                            newElement,
                            platform.displayWidth + platformOffset,
                            platform.displayHeight + platformOffset,
                            width,
                            height,
                            true,
                            isInitialPointCentered)
                        ) {
                        isFree = false
                        return;
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