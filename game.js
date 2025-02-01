// 游戏主要变量
let canvas = document.getElementById('gameCanvas');
let ctx = canvas.getContext('2d');

// 河豚鱼对象
const puffer = {
    x: 50,
    y: canvas.height / 2,
    radius: 20,
    velocity: 0,
    gravity: 0.3,
    jumpForce: -6,
    isInflated: false,
    inflateScale: 1,
    maxInflateScale: 1.5,
    deflateSpeed: 0.05,
    inflateSpeed: 0.2
};

// 障碍物数组
let obstacles = [];
const OBSTACLE_WIDTH = 50;
const OBSTACLE_GAP = 150;
const OBSTACLE_SPEED = 2;

// 游戏状态
let gameOver = false;
let score = 0;

// 添加水泡数组
let bubbles = [];

// 在游戏主要变量后添加水草数组和配置
const seaweeds = [];
const SEAWEED_COUNT = 8;  // 水草数量
const SEAWEED_SEGMENTS = 5;  // 每根水草的段数

// 在游戏主要变量后添加游戏难度相关配置
const DIFFICULTY_SETTINGS = {
    easy: {
        gravity: 0.15,
        jumpForce: -4,
        obstacleSpeed: 1.2,
        obstacleGap: 200,
        obstacleInterval: 280,
        name: '简单'
    },
    normal: {
        gravity: 0.25,
        jumpForce: -5,
        obstacleSpeed: 1.6,
        obstacleGap: 170,
        obstacleInterval: 240,
        name: '普通'
    },
    hard: {
        gravity: 0.35,
        jumpForce: -6,
        obstacleSpeed: 2.0,
        obstacleGap: 150,
        obstacleInterval: 200,
        name: '困难'
    }
};

// 添加游戏状态变量
let gameState = 'menu'; // 'menu', 'playing', 'gameOver'
let currentDifficulty = null;

// 添加水草类
class Seaweed {
    constructor(x) {
        this.x = x;
        this.segments = [];
        const height = 80 + Math.random() * 40; // 随机高度
        const segmentHeight = height / SEAWEED_SEGMENTS;
        
        // 初始化每个段的位置
        for (let i = 0; i < SEAWEED_SEGMENTS; i++) {
            this.segments.push({
                x: x,
                y: canvas.height - i * segmentHeight,
                baseX: x,
                width: 15 + Math.random() * 5,
                offset: Math.random() * Math.PI * 2, // 随机初始相位
                speed: 0.02 + Math.random() * 0.01   // 随机摆动速度
            });
        }
    }

    update(time) {
        this.segments.forEach((segment, index) => {
            // 水草摆动效果
            const waveAmount = 15 * (index / SEAWEED_SEGMENTS); // 越往上摆动幅度越大
            segment.x = segment.baseX + Math.sin(time * segment.speed + segment.offset) * waveAmount;
        });
    }

    draw() {
        ctx.beginPath();
        ctx.moveTo(this.segments[0].x, this.segments[0].y);
        
        // 使用贝塞尔曲线绘制平滑的水草
        for (let i = 1; i < this.segments.length; i++) {
            const curr = this.segments[i];
            const prev = this.segments[i - 1];
            const width = curr.width * (1 - i / SEAWEED_SEGMENTS); // 越往上越细
            
            // 绘制水草主体
            ctx.lineTo(curr.x, curr.y);
            
            // 绘制水草的宽度
            if (i === this.segments.length - 1) {
                ctx.lineTo(curr.x + width/2, curr.y);
                for (let j = this.segments.length - 1; j >= 0; j--) {
                    const segment = this.segments[j];
                    const segWidth = segment.width * (1 - j / SEAWEED_SEGMENTS);
                    ctx.lineTo(segment.x + segWidth/2, segment.y);
                }
            }
        }

        // 设置水草渐变色
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - 120);
        gradient.addColorStop(0, '#2d5a27');    // 底部深绿色
        gradient.addColorStop(1, '#3d7a34');    // 顶部浅绿色
        
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.closePath();
    }
}

// 添加水泡类（在游戏主要变量后添加）
class Bubble {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = canvas.height + 10;
        this.speed = Math.random() * 2 + 1;
        this.radius = Math.random() * 8 + 2;
        this.opacity = Math.random() * 0.5 + 0.1;
    }

    update() {
        this.y -= this.speed;
        // 水泡摆动效果
        this.x += Math.sin(this.y / 30) * 0.5;
    }

    draw() {
        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
    }
}

// 游戏循环
function gameLoop() {
    if (gameState === 'playing') {
        // 清空画布
        ctx.fillStyle = '#4ba3c3';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 更新和绘制水草（在水泡之前绘制）
        const time = Date.now() / 1000;
        seaweeds.forEach(seaweed => {
            seaweed.update(time);
            seaweed.draw();
        });
        
        // 绘制水泡背景
        drawBubbles();
        
        if (!gameOver) {
            // 更新河豚位置
            updatePuffer();
            // 更新障碍物
            updateObstacles();
        }
        
        // 绘制河豚
        drawPuffer();
        // 绘制障碍物
        drawObstacles();
        // 绘制分数
        drawScore();
        
        // 碰撞检测
        checkCollision();
        
        if (!gameOver) {
            requestAnimationFrame(gameLoop);
        } else {
            gameState = 'gameOver';
            drawGameOver();
        }
    } else if (gameState === 'menu') {
        // 清空画布并绘制背景
        ctx.fillStyle = '#4ba3c3';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 更新和绘制水草
        const time = Date.now() / 1000;
        seaweeds.forEach(seaweed => {
            seaweed.update(time);
            seaweed.draw();
        });
        
        // 更新和绘制水泡
        drawBubbles();
        
        // 绘制菜单界面
        drawMenu();
        
        // 继续动画循环
        requestAnimationFrame(gameLoop);
    } else if (gameState === 'gameOver') {
        // 在游戏结束状态下继续更新背景动画
        ctx.fillStyle = '#4ba3c3';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 更新和绘制水草
        const time = Date.now() / 1000;
        seaweeds.forEach(seaweed => {
            seaweed.update(time);
            seaweed.draw();
        });
        
        // 更新和绘制水泡
        drawBubbles();
        
        // 绘制游戏结束界面
        drawGameOver();
        
        requestAnimationFrame(gameLoop);
    }
}

// 更新河豚绘制函数
function drawPuffer() {
    const currentRadius = puffer.radius * puffer.inflateScale;
    
    // 尾巴
    ctx.beginPath();
    ctx.fillStyle = '#ffd700';
    ctx.moveTo(puffer.x - currentRadius, puffer.y);
    // 上尾鳍
    ctx.quadraticCurveTo(
        puffer.x - currentRadius - 20, puffer.y - 15, 
        puffer.x - currentRadius - 25, puffer.y - 5
    );
    // 下尾鳍
    ctx.quadraticCurveTo(
        puffer.x - currentRadius - 20, puffer.y + 15,
        puffer.x - currentRadius, puffer.y
    );
    ctx.fill();
    ctx.closePath();
    
    // 身体
    ctx.beginPath();
    ctx.fillStyle = '#ffd700';
    ctx.arc(puffer.x, puffer.y, currentRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
    
    // 添加身体纹理（小圆点）
    if (puffer.inflateScale > 1.1) {
        const spots = 8;
        for (let i = 0; i < spots; i++) {
            const angle = (i / spots) * Math.PI * 2;
            const spotX = puffer.x + Math.cos(angle) * (currentRadius * 0.6);
            const spotY = puffer.y + Math.sin(angle) * (currentRadius * 0.6);
            
            ctx.beginPath();
            ctx.fillStyle = '#ffb700';
            ctx.arc(spotX, spotY, 3 * puffer.inflateScale, 0, Math.PI * 2);
            ctx.fill();
            ctx.closePath();
        }
    }
    
    // 添加刺效果（膨胀时才显示）
    if (puffer.inflateScale > 1.1) {
        const spikes = 12;
        const spikeLength = 8 * (puffer.inflateScale - 1);
        for (let i = 0; i < spikes; i++) {
            const angle = (i / spikes) * Math.PI * 2;
            // 不在尾巴位置添加刺
            if (angle < Math.PI * 1.7 && angle > Math.PI * 0.3) {
                const startX = puffer.x + Math.cos(angle) * currentRadius;
                const startY = puffer.y + Math.sin(angle) * currentRadius;
                const endX = puffer.x + Math.cos(angle) * (currentRadius + spikeLength);
                const endY = puffer.y + Math.sin(angle) * (currentRadius + spikeLength);
                
                ctx.beginPath();
                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth = 2;
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        }
    }
    
    // 眼睛（随膨胀稍微变大）
    const eyeScale = 1 + (puffer.inflateScale - 1) * 0.5;
    
    // 眼睛外圈
    ctx.beginPath();
    ctx.fillStyle = '#000';
    ctx.arc(puffer.x + 8 * puffer.inflateScale, puffer.y - 5 * puffer.inflateScale, 
        5 * eyeScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
    
    // 眼睛内部（白色部分）
    ctx.beginPath();
    ctx.fillStyle = '#fff';
    ctx.arc(puffer.x + 8 * puffer.inflateScale, puffer.y - 5 * puffer.inflateScale, 
        4 * eyeScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
    
    // 眼球
    ctx.beginPath();
    ctx.fillStyle = '#000';
    ctx.arc(puffer.x + 9 * puffer.inflateScale, puffer.y - 5 * puffer.inflateScale, 
        2 * eyeScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
    
    // 眼睛高光
    ctx.beginPath();
    ctx.fillStyle = '#fff';
    ctx.arc(puffer.x + 10 * puffer.inflateScale, puffer.y - 6 * puffer.inflateScale, 
        1 * eyeScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
    
    // 嘴巴
    ctx.beginPath();
    ctx.strokeStyle = '#ff9999';
    ctx.lineWidth = 2;
    const mouthWidth = 8 * puffer.inflateScale;
    ctx.arc(puffer.x + currentRadius * 0.5, puffer.y + 2, 
        mouthWidth, 0.1, Math.PI * 0.9, false);
    ctx.stroke();
    
    // 腹鳍
    ctx.beginPath();
    ctx.fillStyle = '#ffd700';
    ctx.moveTo(puffer.x, puffer.y + currentRadius * 0.5);
    ctx.quadraticCurveTo(
        puffer.x - 5, puffer.y + currentRadius + 10,
        puffer.x + 10, puffer.y + currentRadius * 0.5
    );
    ctx.fill();
    ctx.closePath();
}

// 更新河豚位置
function updatePuffer() {
    puffer.velocity += puffer.gravity;
    puffer.y += puffer.velocity;
    
    // 更新膨胀状态
    if (puffer.isInflated) {
        if (puffer.inflateScale < puffer.maxInflateScale) {
            puffer.inflateScale += puffer.inflateSpeed;
        }
    } else {
        if (puffer.inflateScale > 1) {
            puffer.inflateScale -= puffer.deflateSpeed;
        }
    }
    
    // 确保膨胀比例在有效范围内
    puffer.inflateScale = Math.max(1, Math.min(puffer.maxInflateScale, puffer.inflateScale));
    
    // 边界检查
    if (puffer.y + puffer.radius * puffer.inflateScale > canvas.height) {
        puffer.y = canvas.height - puffer.radius * puffer.inflateScale;
        puffer.velocity = 0;
    }
    if (puffer.y - puffer.radius * puffer.inflateScale < 0) {
        puffer.y = puffer.radius * puffer.inflateScale;
        puffer.velocity = 0;
    }
}

// 初始化游戏
function init() {
    // 添加点击/触摸事件监听
    canvas.addEventListener('click', handleClick);
    
    // 初始化水草
    for (let i = 0; i < SEAWEED_COUNT; i++) {
        const x = (canvas.width / (SEAWEED_COUNT - 1)) * i;
        seaweeds.push(new Seaweed(x));
    }
    
    // 开始游戏循环
    gameLoop();
}

// 添加点击处理函数
function handleClick(event) {
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    
    if (gameState === 'menu') {
        // 检查是否点击了难度按钮
        const buttonY = canvas.height / 2;
        const buttonWidth = 100;
        const buttonHeight = 40;
        const buttonSpacing = 120;
        
        const difficulties = ['easy', 'normal', 'hard'];
        difficulties.forEach((difficulty, index) => {
            const buttonX = canvas.width/2 + (index - 1) * buttonSpacing;
            if (clickX > buttonX - buttonWidth/2 && 
                clickX < buttonX + buttonWidth/2 && 
                clickY > buttonY - buttonHeight/2 && 
                clickY < buttonY + buttonHeight/2) {
                startGame(difficulty);
            }
        });
    } else if (gameState === 'playing') {
        puffer.velocity = DIFFICULTY_SETTINGS[currentDifficulty].jumpForce;
        puffer.isInflated = true;
        setTimeout(() => {
            puffer.isInflated = false;
        }, 200);
    } else if (gameState === 'gameOver') {
        gameState = 'menu';
        // 重置游戏状态
        puffer.y = canvas.height / 2;
        puffer.velocity = 0;
        puffer.inflateScale = 1;
        puffer.isInflated = false;
        obstacles = [];
        score = 0;
        gameOver = false;
        
        // 重新开始游戏循环
        requestAnimationFrame(gameLoop);
    }
}

// 添加开始菜单绘制函数
function drawMenu() {
    // 绘制标题
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('河豚历险记', canvas.width/2, canvas.height/3);
    
    // 绘制难度选择按钮
    const buttonY = canvas.height / 2;
    const difficulties = ['easy', 'normal', 'hard'];
    difficulties.forEach((difficulty, index) => {
        const buttonX = canvas.width/2 + (index - 1) * 120;
        
        // 绘制按钮背景
        ctx.fillStyle = '#2c3e50';
        roundRect(ctx, buttonX - 50, buttonY - 20, 100, 40, 10, true);
        
        // 绘制按钮文字
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Arial';
        ctx.fillText(DIFFICULTY_SETTINGS[difficulty].name, buttonX, buttonY + 7);
    });
    
    // 绘制说明文字
    ctx.font = '16px Arial';
    ctx.fillText('点击选择难度开始游戏', canvas.width/2, canvas.height * 2/3);
}

// 添加圆角矩形绘制函数
function roundRect(ctx, x, y, width, height, radius, fill) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) {
        ctx.fill();
    } else {
        ctx.stroke();
    }
}

// 添加游戏开始函数
function startGame(difficulty) {
    currentDifficulty = difficulty;
    gameState = 'playing';
    
    // 应用难度设置
    const settings = DIFFICULTY_SETTINGS[difficulty];
    puffer.gravity = settings.gravity;
    puffer.jumpForce = settings.jumpForce;
    OBSTACLE_SPEED = settings.obstacleSpeed;
    OBSTACLE_GAP = settings.obstacleGap;
    
    // 重置游戏状态
    resetGame();
}

// 重置游戏
function resetGame() {
    puffer.y = canvas.height / 2;
    puffer.velocity = 0;
    puffer.inflateScale = 1;
    puffer.isInflated = false;
    obstacles = [];
    score = 0;
    gameOver = false;
    
    // 重新初始化水草
    seaweeds.length = 0;
    for (let i = 0; i < SEAWEED_COUNT; i++) {
        const x = (canvas.width / (SEAWEED_COUNT - 1)) * i;
        seaweeds.push(new Seaweed(x));
    }
    
    gameLoop();
}

// 启动游戏
init();

// 更新水泡背景函数
function drawBubbles() {
    // 随机添加新水泡
    if (Math.random() < 0.05) {
        bubbles.push(new Bubble());
    }
    
    // 更新和绘制所有水泡
    bubbles = bubbles.filter(bubble => {
        bubble.update();
        bubble.draw();
        return bubble.y > -10;
    });
}

// 添加障碍物生成和更新函数
function updateObstacles() {
    // 生成新障碍物，修改障碍物生成间隔
    if (obstacles.length === 0 || 
        canvas.width - obstacles[obstacles.length - 1].x >= DIFFICULTY_SETTINGS[currentDifficulty].obstacleInterval) {
        const gapPosition = Math.random() * (canvas.height - OBSTACLE_GAP - 120) + 60; // 调整障碍物出现的位置范围
        obstacles.push({
            x: canvas.width,
            gapTop: gapPosition,
            gapBottom: gapPosition + OBSTACLE_GAP,
            passed: false
        });
    }

    // 更新障碍物位置
    obstacles = obstacles.filter(obstacle => {
        obstacle.x -= OBSTACLE_SPEED;
        
        // 检查是否通过障碍物（加分）
        if (!obstacle.passed && obstacle.x + OBSTACLE_WIDTH < puffer.x) {
            score++;
            obstacle.passed = true;
        }
        
        return obstacle.x > -OBSTACLE_WIDTH;
    });
}

// 绘制障碍物函数
function drawObstacles() {
    obstacles.forEach(obstacle => {
        // 绘制上方珊瑚
        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(obstacle.x, 0, OBSTACLE_WIDTH, obstacle.gapTop);
        drawCoral(obstacle.x, obstacle.gapTop, true);
        
        // 绘制下方珊瑚
        ctx.fillRect(obstacle.x, obstacle.gapBottom, OBSTACLE_WIDTH, canvas.height - obstacle.gapBottom);
        drawCoral(obstacle.x, obstacle.gapBottom, false);
    });
}

// 绘制珊瑚装饰
function drawCoral(x, y, isTop) {
    ctx.fillStyle = '#ff8787';
    const coralHeight = 20;
    if (isTop) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + OBSTACLE_WIDTH/2, y + coralHeight);
        ctx.lineTo(x + OBSTACLE_WIDTH, y);
        ctx.fill();
    } else {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + OBSTACLE_WIDTH/2, y - coralHeight);
        ctx.lineTo(x + OBSTACLE_WIDTH, y);
        ctx.fill();
    }
}

// 碰撞检测函数
function checkCollision() {
    for (let obstacle of obstacles) {
        if (puffer.x + puffer.radius * puffer.inflateScale > obstacle.x && 
            puffer.x - puffer.radius * puffer.inflateScale < obstacle.x + OBSTACLE_WIDTH) {
            if (puffer.y - puffer.radius * puffer.inflateScale < obstacle.gapTop || 
                puffer.y + puffer.radius * puffer.inflateScale > obstacle.gapBottom) {
                gameOver = true;
            }
        }
    }
}

// 绘制分数
function drawScore() {
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Arial';
    ctx.fillText(`分数: ${score}`, 10, 30);
}

// 绘制游戏结束界面
function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束', canvas.width/2, canvas.height/2 - 50);
    ctx.font = '20px Arial';
    ctx.fillText(`难度: ${DIFFICULTY_SETTINGS[currentDifficulty].name}`, canvas.width/2, canvas.height/2 - 10);
    ctx.fillText(`最终得分: ${score}`, canvas.width/2, canvas.height/2 + 20);
    ctx.fillText('点击返回主菜单', canvas.width/2, canvas.height/2 + 60);
    ctx.textAlign = 'left';
} 