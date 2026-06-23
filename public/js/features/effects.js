// ============ AI 按钮首次加载 — 高科技线性光晕/星芒效果 ============
(function initTechLensEffect() {
    // 检查配置开关：是否启用首次访问光晕特效
    if (AI_CONFIG && AI_CONFIG.showFirstVisitGlow === false) return;

    // 使用 localStorage 存储标记，只要缓存不被清理则之后不会再次触发
    var STORAGE_KEY = 'ai_corona_shown';
    if (localStorage.getItem(STORAGE_KEY)) return;
    localStorage.setItem(STORAGE_KEY, '1');

    // 延迟执行，等待 DOM 布局完成
    setTimeout(function() {
        var aiBtn = document.getElementById('aiBtn');
        var canvas = document.getElementById('ai-ripple-canvas');
        if (!aiBtn || !canvas) return;

        var ctx = canvas.getContext('2d');
        var dpr = window.devicePixelRatio || 1;

        // 高分辨率屏幕适配
        canvas.width  = window.innerWidth  * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width  = window.innerWidth  + 'px';
        canvas.style.height = window.innerHeight + 'px';
        ctx.scale(dpr, dpr);

        var W = window.innerWidth;
        var H = window.innerHeight;

        // 以 AI 按钮中心为光晕原点（动态更新以跟随滚动）
        function updateButtonPosition() {
            var btnRect = aiBtn.getBoundingClientRect();
            var newCx = btnRect.left + btnRect.width  / 2;
            var newCy = btnRect.top  + btnRect.height / 2;
            
            // 动态更新最大扩散半径
            maxDist = Math.sqrt(
                Math.pow(Math.max(newCx, W - newCx), 2) +
                Math.pow(Math.max(newCy, H - newCy), 2)
            ) * 1.15;
            
            return { cx: newCx, cy: newCy };
        }
        
        var maxDist = 0;
        var btnPos = updateButtonPosition();
        var cx = btnPos.cx;
        var cy = btnPos.cy;

        // 参数配置
        var TOTAL_DURATION = 4800;  // 总动画时长 ms
        var FADE_OUT_AT    = 3600;  // 从此刻开始全局淡出

        // 六边形顶点计算（几何幽灵影）
        function getHexagonPoints(cx, cy, radius, rotation) {
            var points = [];
            for (var i = 0; i < 6; i++) {
                var angle = (Math.PI / 3) * i + rotation - Math.PI / 2;
                points.push({
                    x: cx + radius * Math.cos(angle),
                    y: cy + radius * Math.sin(angle)
                });
            }
            return points;
        }

        function drawHexagon(cx, cy, radius, rotation) {
            var points = getHexagonPoints(cx, cy, radius, rotation);
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (var i = 1; i < 6; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.closePath();
        }

        // 绘制星芒光线
        function drawStarBurst(cx, cy, count, innerRadius, outerRadius, alpha, rotation, colorRGB) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(rotation);

            for (var i = 0; i < count; i++) {
                var angle = (Math.PI * 2 / count) * i;
                var pulseOffset = Math.sin(i * 0.7 + Date.now() * 0.003) * 0.15;

                // 光线渐变
                var rayLen = outerRadius * (0.8 + pulseOffset);
                var rayGrad = ctx.createLinearGradient(
                    Math.cos(angle) * innerRadius,
                    Math.sin(angle) * innerRadius,
                    Math.cos(angle) * rayLen,
                    Math.sin(angle) * rayLen
                );
                rayGrad.addColorStop(0, 'rgba(' + colorRGB[0] + ',' + colorRGB[1] + ',' + colorRGB[2] + ',' + (alpha * 0.9) + ')');
                rayGrad.addColorStop(0.3, 'rgba(' + colorRGB[0] + ',' + colorRGB[1] + ',' + colorRGB[2] + ',' + (alpha * 0.6) + ')');
                rayGrad.addColorStop(0.7, 'rgba(' + colorRGB[0] + ',' + colorRGB[1] + ',' + colorRGB[2] + ',' + (alpha * 0.2) + ')');
                rayGrad.addColorStop(1, 'rgba(' + colorRGB[0] + ',' + colorRGB[1] + ',' + colorRGB[2] + ',0)');

                // 主光线
                ctx.beginPath();
                ctx.moveTo(Math.cos(angle) * innerRadius, Math.sin(angle) * innerRadius);
                ctx.lineTo(Math.cos(angle) * rayLen, Math.sin(angle) * rayLen);
                ctx.strokeStyle = rayGrad;
                ctx.lineWidth = 2.5 * (1 - i / count * 0.3);
                ctx.lineCap = 'round';
                ctx.stroke();

                // 光线外缘发光
                ctx.beginPath();
                ctx.moveTo(Math.cos(angle) * innerRadius, Math.sin(angle) * innerRadius);
                ctx.lineTo(Math.cos(angle) * rayLen, Math.sin(angle) * rayLen);
                ctx.strokeStyle = 'rgba(' + colorRGB[0] + ',' + colorRGB[1] + ',' + colorRGB[2] + ',' + (alpha * 0.15) + ')';
                ctx.lineWidth = 8;
                ctx.stroke();
            }

            ctx.restore();
        }

        var startTime = null;

        function draw(ts) {
            if (!startTime) startTime = ts;
            var elapsed = ts - startTime;

            // 动画结束 — 清理画布并隐藏
            if (elapsed >= TOTAL_DURATION) {
                ctx.clearRect(0, 0, W, H);
                canvas.style.display = 'none';
                return;
            }

            // 动态更新 AI 按钮位置（跟随滚动）
            var btnPos = updateButtonPosition();
            cx = btnPos.cx;
            cy = btnPos.cy;

            ctx.clearRect(0, 0, W, H);

            // 全局淡出系数
            var gFade = elapsed > FADE_OUT_AT
                ? 1 - (elapsed - FADE_OUT_AT) / (TOTAL_DURATION - FADE_OUT_AT)
                : 1;

            // 轻微呼吸效果
            var breathe = Math.sin(elapsed * 0.003) * 0.5 + 0.5;
            var hexRotation = elapsed * 0.0003;  // 六边形缓慢旋转
            var burstRotation = elapsed * 0.0008;  // 星芒旋转

            // ======== 内层六边形（实线）=======
            {
                var innerAlpha = Math.min(1, elapsed / 400) * 0.4 * gFade;
                // 从 3000ms 开始渐隐（不再突然消失）
                if (elapsed > 3000) {
                    innerAlpha = innerAlpha * Math.max(0, 1 - (elapsed - 3000) / 1200);
                }
                if (innerAlpha > 0.005) {
                    var innerRadius = 40 + Math.min(elapsed, 3000) * 0.015;
                    drawHexagon(cx, cy, innerRadius, hexRotation * 1.5);
                    ctx.strokeStyle = 'rgba(210, 168, 255,' + innerAlpha + ')';
                    ctx.lineWidth = 2;
                    ctx.stroke();

                    // 内层六边形填充
                    var innerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, innerRadius);
                    innerGrad.addColorStop(0, 'rgba(210, 168, 255,' + (innerAlpha * 0.3) + ')');
                    innerGrad.addColorStop(1, 'rgba(210, 168, 255,0)');
                    ctx.fillStyle = innerGrad;
                    ctx.fill();
                }
            }

            // ======== 强星光芒（12方向） ========
            if (elapsed > 200) {
                var burstAlpha = Math.min(1, (elapsed - 200) / 600) * 0.35 * gFade;
                var burstRadius = maxDist * (0.25 + elapsed * 0.0008);
                // 青色星芒
                drawStarBurst(cx, cy, 12, 20, burstRadius * 1.2, burstAlpha * 0.7, burstRotation, [0, 229, 255]);
            }

            // ======== 二次星芒（6方向，长光线） ========
            if (elapsed > 400) {
                var burst2Alpha = Math.min(1, (elapsed - 400) / 500) * 0.25 * gFade;
                var burst2Radius = maxDist * (0.4 + elapsed * 0.001);
                // 绿色星芒
                drawStarBurst(cx, cy, 6, 30, burst2Radius, burst2Alpha, -burstRotation * 0.6, [0, 255, 65]);
            }

            // ======== 太阳核心 — 明亮但不刺眼 ========
            if (elapsed < 3500) {
                // 核心亮度曲线：快速亮起 → 轻微呼吸 → 平滑消散
                var coreT;
                if (elapsed < 300) {
                    coreT = elapsed / 300;  // 快速亮起
                } else if (elapsed < 2200) {
                    coreT = 0.9 + Math.sin((elapsed - 300) * 0.004) * 0.1;  // 轻微呼吸
                } else {
                    coreT = Math.max(0, 0.85 - (elapsed - 2200) / 1300);  // 缓慢消散
                }

                var coreA = coreT * 0.9 * gFade;
                var coreR = 18 + coreT * 12;

                // 最内核 — 纯白光（高科技镜头质感）
                var innerCore = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
                innerCore.addColorStop(0,   'rgba(255, 255, 255, ' + (coreA * 0.95) + ')');
                innerCore.addColorStop(0.2, 'rgba(240, 250, 255, ' + (coreA * 0.8) + ')');
                innerCore.addColorStop(0.5, 'rgba(200, 230, 255, ' + (coreA * 0.5) + ')');
                innerCore.addColorStop(1,   'rgba(150, 200, 255, 0)');
                ctx.fillStyle = innerCore;
                ctx.beginPath();
                ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
                ctx.fill();

                // 第二层 — 青色光晕（高科技蓝色调）
                var techHalo = ctx.createRadialGradient(cx, cy, coreR * 0.4, cx, cy, coreR * 2.5);
                techHalo.addColorStop(0,   'rgba(0, 229, 255, ' + (coreA * 0.4) + ')');
                techHalo.addColorStop(0.4, 'rgba(0, 200, 255, ' + (coreA * 0.2) + ')');
                techHalo.addColorStop(1,   'rgba(0, 150, 200, 0)');
                ctx.fillStyle = techHalo;
                ctx.beginPath();
                ctx.arc(cx, cy, coreR * 2.5, 0, Math.PI * 2);
                ctx.fill();

                // 十字星芒（中心高光）
                var crossAlpha = coreA * 0.5;
                var crossLen = coreR * 3;
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(burstRotation * 0.5);

                // 横线
                var crossGradH = ctx.createLinearGradient(-crossLen, 0, crossLen, 0);
                crossGradH.addColorStop(0, 'rgba(255,255,255,0)');
                crossGradH.addColorStop(0.4, 'rgba(255,255,255,' + (crossAlpha * 0.3) + ')');
                crossGradH.addColorStop(0.5, 'rgba(255,255,255,' + crossAlpha + ')');
                crossGradH.addColorStop(0.6, 'rgba(255,255,255,' + (crossAlpha * 0.3) + ')');
                crossGradH.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.beginPath();
                ctx.moveTo(-crossLen, 0);
                ctx.lineTo(crossLen, 0);
                ctx.strokeStyle = crossGradH;
                ctx.lineWidth = 3;
                ctx.stroke();

                // 竖线
                var crossGradV = ctx.createLinearGradient(0, -crossLen, 0, crossLen);
                crossGradV.addColorStop(0, 'rgba(255,255,255,0)');
                crossGradV.addColorStop(0.4, 'rgba(255,255,255,' + (crossAlpha * 0.3) + ')');
                crossGradV.addColorStop(0.5, 'rgba(255,255,255,' + crossAlpha + ')');
                crossGradV.addColorStop(0.6, 'rgba(255,255,255,' + (crossAlpha * 0.3) + ')');
                crossGradV.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.beginPath();
                ctx.moveTo(0, -crossLen);
                ctx.lineTo(0, crossLen);
                ctx.strokeStyle = crossGradV;
                ctx.lineWidth = 3;
                ctx.stroke();

                ctx.restore();
            }

            // ======== 线性光晕边缘（高科技扫描线效果） ========
            if (elapsed > 100 && elapsed < 4000) {
                var lineAlpha = Math.min(1, (elapsed - 100) / 300) * 0.15 * gFade;
                var lineCount = 24;
                ctx.save();
                ctx.globalCompositeOperation = 'screen';

                for (var i = 0; i < lineCount; i++) {
                    var lineAngle = (Math.PI * 2 / lineCount) * i + hexRotation;
                    var lineLen = maxDist * (0.6 + Math.sin(i * 0.8 + elapsed * 0.002) * 0.2);
                    var lineAlphaMod = lineAlpha * (0.5 + Math.sin(i * 1.2 + elapsed * 0.003) * 0.5);

                    var lineGrad = ctx.createLinearGradient(
                        cx, cy,
                        cx + Math.cos(lineAngle) * lineLen,
                        cy + Math.sin(lineAngle) * lineLen
                    );
                    lineGrad.addColorStop(0, 'rgba(0, 229, 255,' + (lineAlphaMod * 0.8) + ')');
                    lineGrad.addColorStop(0.5, 'rgba(0, 255, 65,' + (lineAlphaMod * 0.4) + ')');
                    lineGrad.addColorStop(1, 'rgba(0, 229, 255,0)');

                    ctx.beginPath();
                    ctx.moveTo(cx, cy);
                    ctx.lineTo(
                        cx + Math.cos(lineAngle) * lineLen,
                        cy + Math.sin(lineAngle) * lineLen
                    );
                    ctx.strokeStyle = lineGrad;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }

                ctx.restore();
            }

            requestAnimationFrame(draw);
        }

        requestAnimationFrame(draw);
    }, 1200); // 延迟 1.2 秒，让页面内容先渲染
})();/// ============ 时空虫特效 - 完整动画闭环 ============
(function() {
    var container = null;
    var wormholeContainer = null;
    var clickArea = null;  // 专门的可点击区域
    var segments = [];
    var segmentCount = 13;
    var terminalTop = 0;

    // ========== 时空虫星期颜色配置 ==========
    // 周日银灰蓝添加 1px 发光效果
    var WEEKLY_COLORS = {
        0: { body: '#BFC7D5', head: '#D4D9E3', glow: true  }, // 周日 - 银灰蓝
        1: { body: '#E89A9A', head: '#F0B5B5', glow: false }, // 周一 - 淡珊瑚红
        2: { body: '#E8B58A', head: '#F0CBAD', glow: false }, // 周二 - 淡杏橙
        3: { body: '#E8D38A', head: '#F0E0A8', glow: false }, // 周三 - 柔和金黄
        4: { body: '#A8D5A2', head: '#C2E4BF', glow: false }, // 周四 - 鼠尾草绿
        5: { body: '#8FC3E8', head: '#ABD3F5', glow: false }, // 周五 - 天空蓝
        6: { body: '#B8A4E3', head: '#CCBDEF', glow: false }  // 周六 - 薰衣草紫
    };

    // 获取当前星期几的颜色配置（使用与主页面一致的 Asia/Shanghai 时区）
    function getWormColors() {
        // 使用 Asia/Shanghai 时区获取当前星期几（0=周日, 1=周一, ..., 6=周六）
        var now = new Date();
        var dayStr = now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai', weekday: 'short' });
        var dayMap = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
        var day = dayMap[dayStr] !== undefined ? dayMap[dayStr] : 0;
        return WEEKLY_COLORS[day] || WEEKLY_COLORS[0];
    }

    // HEX 转 RGB
    function hexToRgb(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    // 获取头部光波的 RGB 值（比身体颜色稍亮）
    function getPulseColor() {
        var colors = getWormColors();
        var rgb = hexToRgb(colors.head);
        return rgb.r + ',' + rgb.g + ',' + rgb.b;
    }
    
    // 位置参数
    var headX = 0;
    var direction = 1;
    var boundLeft = 0;
    var boundRight = 0;
    var segmentSize = 3;
    var groundY = 18;
    
    // 蠕动参数
    var wavePhase = 0;
    var waveSpeed = 0.055;
    var archMax = 6;
    var spacing = 1.6;
    
    // 边界缓冲区
    var edgeBuffer = 25;
    var turnCooldown = 0;
    var minTurnInterval = 40;
    
    // 节段位置
    var segX = [];
    var segY = [];
    var segOffset = [];
    
    // ========== 状态机 ==========
    // 完整动画闭环：
    // hidden → wormhole_appear → worm_emerge (直线) → waking (直线→蠕动) → active → sleeping (蠕动→直线) → worm_retract (直线收缩) → wormhole_close → hidden
    var wormState = 'hidden';
    
    // 冻结状态（最小化时使用）
    var isFrozen = false;
    
    // 显示/隐藏状态（最小化动画时使用）
    var isHidden = false;
    
    // 提供给外部的接口
    window.freezeWorm = function() { isFrozen = true; };
    window.unfreezeWorm = function() { isFrozen = false; };
    window.hideWorm = function() { 
        isHidden = true;
        container.style.display = 'none';
    };
    window.showWorm = function(delay) { 
        isHidden = false;
        container.style.opacity = '0';
        container.style.display = '';
        var fadeDelay = delay || 500;
        setTimeout(function() {
            container.style.transition = 'opacity 0.3s ease';
            container.style.opacity = '1';
            setTimeout(function() {
                container.style.transition = '';
            }, 300);
        }, fadeDelay);
    };
    
    // 虫洞参数
    var wormholeX = 0;
    var wormholeY = 0;
    var wormholeRotation = 0;
    var wormholeTimer = 0;
    
    // 动画参数（毫秒）
    // ========== 时空虫时间参数（毫秒）==========
    var appearDelayMin = 10000;   // 虫子出现前的最小延迟（10秒）
    var appearDelayMax = 30000;   // 虫子出现前的最大延迟（30秒）
    var wormholeAppearDur = 1000;   // 虫洞展开
    var wormEmergeDur = 800;       // 虫子直线出现
    var wakingDur = 400;           // 苏醒过渡（直线→蠕动）
    var stayMin = 30000;         // 虫子停留的最小时间（30秒）
    var stayMax = 300000;        // 虫子停留的最大时间（300秒 = 5分钟）
    
    var stayDuration = 0;
    var stayTimer = 0;
    var sleepingDur = 300;         // 沉睡过渡（蠕动→直线）- 加长使过渡更平滑
    var wormRetractDur = 1000;      // 虫子直线收缩
    var wormholeCloseDur = 1200;    // 虫洞关闭
    
    // 静态/动态状态参数
    var isAwake = false; // 是否已苏醒（用于插值计算）
    var wakeProgress = 0; // 0=完全直线, 1=完全蠕动
    
    // 虫洞样式参数
    var isAppearing = true;
    
    // SVG 命名空间
    var SVG_NS = 'http://www.w3.org/2000/svg';
    
    // 头部光波参数
    var pulseWave = null;
    var pulseX = 0;
    var pulseY = 0;
    var pulseTimer = 0;
    var pulseInterval = 1200; // 光波触发间隔（毫秒）- 更频繁
    var pulseActive = false;
    var pulseProgress = 0;
    
    // 鼠标悬停状态
    var isHovering = false;
    var savedDirection = 1;
    var savedHeadX = 0;
    var mousePos = { x: -1000, y: -1000 }; // 初始位置远离虫子
    
    // 阻止消失的条件计数（悬停或调头时）
    var preventDisappear = 0;
    
    // 边界检测计时器（每 1200ms 检测一次）
    var boundaryCheckTimer = 0;
    var boundaryCheckInterval = 1200; // 与蠕动状态频率一致
    
    // 跟踪鼠标位置
    document.addEventListener('mousemove', function(e) {
        mousePos.x = e.clientX;
        mousePos.y = e.clientY;
    });
    
    // 鼠标离开窗口时重置位置
    document.addEventListener('mouseleave', function() {
        mousePos.x = -1000;
        mousePos.y = -1000;
    });
    
    // 创建终端风格弹窗
    function showWormModal(message) {
        var existingModal = document.getElementById('wormModal');
        if (existingModal) existingModal.remove();
        
        var modal = document.createElement('div');
        modal.id = 'wormModal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;display:flex;align-items:flex-start;justify-content:center;padding-top:120px;z-index:100000;background:rgba(0,0,0,0.7);';
        
        var box = document.createElement('div');
        box.style.cssText = 'background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:20px 30px;max-width:320px;text-align:center;box-shadow:0 0 30px rgba(100,200,255,0.2);';
        
        var btn = document.createElement('button');
        btn.textContent = '关闭';
        btn.style.cssText = 'background:#238636;border:none;color:#fff;padding:8px 20px;border-radius:6px;cursor:pointer;font-size:13px;';
        btn.onclick = function() { modal.remove(); };
        
        box.innerHTML = '<div style="color:#58a6ff;font-size:24px;margin-bottom:15px;">🔮</div>' +
            '<div style="color:#c9d1d9;font-size:14px;line-height:1.6;margin-bottom:20px;">' + message + '</div>';
        box.appendChild(btn);
        
        modal.appendChild(box);
        modal.addEventListener('click', function(e) {
            if (e.target === modal) modal.remove();
        });
        document.body.appendChild(modal);
    }
    
    function init() {
        container = document.createElement('div');
        container.style.cssText = 'position:fixed;pointer-events:none;z-index:9999;left:0;top:0;width:100%;height:30px;';
        
        // 创建专门的点击区域 - 仅覆盖虫子本身
        clickArea = document.createElement('div');
        clickArea.style.cssText = 'position:absolute;pointer-events:none;cursor:pointer;opacity:0;background:transparent;';
        
        // 点击事件 - 弹出神秘空间提示
        clickArea.onclick = function(e) {
            e.stopPropagation();
            showWormModal('神秘空间未开放');
        };
        
        wormholeContainer = document.createElement('div');
        wormholeContainer.style.cssText = 'position:absolute;pointer-events:none;opacity:0;transition:none;';
        
        // 创建头部光波元素
        pulseWave = document.createElement('div');
        pulseWave.style.cssText = 'position:absolute;pointer-events:none;border-radius:50%;opacity:0;transform:scale(0);';
        container.appendChild(pulseWave);
        
        for (var i = 0; i < segmentCount; i++) {
            var isHead = (i === 0);
            var colors = getWormColors();
            var headRgb = hexToRgb(colors.head);
            var bodyRgb = hexToRgb(colors.body);
            // 身体的颜色比头部稍暗一点
            var bodyBrightness = 0.75;
            var bodyR = Math.round(bodyRgb.r * bodyBrightness);
            var bodyG = Math.round(bodyRgb.g * bodyBrightness);
            var bodyB = Math.round(bodyRgb.b * bodyBrightness);
            // 周日头部添加发光效果（使用filter不影响大小，增强发光）
            var glowStyle = colors.glow && isHead ? ';filter:drop-shadow(0 0 2px ' + colors.head + ') drop-shadow(0 0 5px ' + colors.head + ') drop-shadow(0 0 8px ' + colors.body + ')' : '';
            var dot = document.createElement('div');
            dot.style.cssText = 'position:absolute;width:' + segmentSize + 'px;height:' + segmentSize + 'px;background:radial-gradient(circle,' + (isHead ? colors.head + ',' + colors.body : 'rgb(' + bodyR + ',' + bodyG + ',' + bodyB + '),rgb(' + Math.round(bodyR * 0.85) + ',' + Math.round(bodyG * 0.85) + ',' + Math.round(bodyB * 0.85) + ')') + ');border-radius:50%;box-shadow:0 0 ' + (isHead ? '2px' : '1px') + ' rgba(' + (isHead ? (headRgb.r + ',' + headRgb.g + ',' + headRgb.b) : (bodyR + ',' + bodyG + ',' + bodyB)) + ',0.4)' + glowStyle + ';opacity:0;transform:scale(0);';
            container.appendChild(dot);
            segments.push({ el: dot });
        }
        
        container.appendChild(wormholeContainer);
        container.appendChild(clickArea);
        document.body.appendChild(container);
        
        setTimeout(function() {
            positionContainer();
            console.log('[时空虫] 已启动（完整动画闭环）');
            scheduleNextAppearance();
            animate();
        }, 800);
    }
    
    // 更新点击区域位置 - 精准覆盖虫子
    function updateClickArea() {
        if (!clickArea) return;
        
        // 计算虫子的边界（考虑蠕动时的波动）
        var minX = segX[0], maxX = segX[0];
        var minY = segY[0], maxY = segY[0];
        var wobbleAmount = isAwake ? 0.3 * wakeProgress : 0;
        
        for (var i = 1; i < segmentCount; i++) {
            if (segX[i] < minX) minX = segX[i];
            if (segX[i] > maxX) maxX = segX[i];
            var segYWithWobble = segY[i] + Math.sin(wavePhase * 1.8 + i * 0.5) * wobbleAmount;
            if (segYWithWobble < minY) minY = segYWithWobble;
            if (segYWithWobble > maxY) maxY = segYWithWobble;
        }
        
        // 添加适当的内边距，使点击区域稍微大于可见区域
        var padding = 3;
        var left = minX - padding;
        var top = minY - padding;
        var width = maxX - minX + segmentSize + padding * 2;
        var height = maxY - minY + segmentSize + padding * 2;
        
        clickArea.style.left = left + 'px';
        clickArea.style.top = top + 'px';
        clickArea.style.width = width + 'px';
        clickArea.style.height = height + 'px';
    }
    
    function scheduleNextAppearance() {
        var delay = appearDelayMin + Math.random() * (appearDelayMax - appearDelayMin);
        setTimeout(startAppear, delay);
    }
    
    function startAppear() {
        if (wormState !== 'hidden') return;
        
        var safeMargin = 50;
        wormholeX = boundLeft + safeMargin + Math.random() * (boundRight - boundLeft - safeMargin * 2);
        wormholeY = groundY;
        
        headX = wormholeX;
        for (var i = 0; i < segmentCount; i++) {
            segX[i] = wormholeX;
            segY[i] = groundY; // 初始直线状态
        }
        direction = Math.random() > 0.5 ? 1 : -1;
        
        wormState = 'wormhole_appear';
        wormholeTimer = 0;
        wormholeRotation = 0;
        isAppearing = true;
        isAwake = false;
        wakeProgress = 0;
        
        for (var j = 0; j < segmentCount; j++) {
            segOffset[j] = j * 0.55;
        }
    }
    
    function startDisappear() {
        if (wormState !== 'active') return;
        wormState = 'wormhole_appear'; // 虫洞先出现在虫子头部位置
        wormholeTimer = 0;
        wormholeRotation = 0;
        wormholeX = headX; // 虫洞定位在虫子头部
        wormholeY = groundY;
        isAppearing = false; // 切换为消失色调
        isAwake = true;
        // 保存当前移动方向，以便继续移动
        disappearDirection = direction;
    }
    
    // 计算虫子位置（直线模式）
    function getStaticY(i) {
        return groundY; // 完全直线
    }
    
    // 计算虫子位置（蠕动模式）
    function getWormY(i, phase) {
        var localPhase = phase - segOffset[i];
        while (localPhase < 0) localPhase += Math.PI * 2;
        while (localPhase > Math.PI * 2) localPhase -= Math.PI * 2;
        
        var sinVal = Math.sin(localPhase);
        var arch = 0;
        if (sinVal > 0) arch = archMax * sinVal;
        
        var waveDim = 1 - (i / segmentCount) * 0.45;
        arch *= Math.max(0.35, waveDim);
        
        if (i < segmentCount / 2) {
            var frontBoost = 1 + (segmentCount / 2 - i) / (segmentCount / 2) * 0.25;
            arch *= frontBoost;
        }
        
        return groundY - arch;
    }
    
    // 通用位置更新函数
    function updateWormPositions() {
        for (var i = 0; i < segmentCount; i++) {
            var targetX = headX - i * spacing * direction;
            var followSpeed = 0.12 - i * 0.007;
            followSpeed = Math.max(0.05, followSpeed);
            segX[i] += (targetX - segX[i]) * followSpeed;
            
            // 根据唤醒进度插值
            var staticY = getStaticY(i);
            var wormY = getWormY(i, wavePhase);
            segY[i] = staticY + (wormY - staticY) * wakeProgress;
        }
    }
    
    // 渲染虫子
    function renderWorm(opacity) {
        var colors = getWormColors();
        var headRgb = hexToRgb(colors.head);
        var bodyRgb = hexToRgb(colors.body);
        var bodyBrightness = 0.75;
        var bodyR = Math.round(bodyRgb.r * bodyBrightness);
        var bodyG = Math.round(bodyRgb.g * bodyBrightness);
        var bodyB = Math.round(bodyRgb.b * bodyBrightness);

        for (var i = 0; i < segmentCount; i++) {
            var wobble = isAwake ? Math.sin(wavePhase * 1.8 + i * 0.5) * 0.3 * wakeProgress : 0;
            segments[i].el.style.left = segX[i] + 'px';
            segments[i].el.style.top = (segY[i] + wobble) + 'px';
            segments[i].el.style.transform = 'scale(1)';
            segments[i].el.style.opacity = ((i === 0 ? 0.7 : 0.55) * opacity).toString();

            // 周日头部添加发光效果（使用filter不影响大小，增强发光）
            if (i === 0 && colors.glow) {
                segments[i].el.style.filter = 'drop-shadow(0 0 2px ' + colors.head + ') drop-shadow(0 0 5px ' + colors.head + ') drop-shadow(0 0 8px ' + colors.body + ')';
            } else if (i === 0) {
                segments[i].el.style.boxShadow = '0 0 2px rgba(' + headRgb.r + ',' + headRgb.g + ',' + headRgb.b + ',0.4)';
            } else {
                segments[i].el.style.boxShadow = '0 0 1px rgba(' + bodyR + ',' + bodyG + ',' + bodyB + ',0.4)';
            }
        }
        
        // 更新点击区域位置并控制可见性
        // 只有在虫子可见且处于活动状态时才显示点击区域
        var showClickArea = (wormState === 'active' || wormState === 'waking');
        if (clickArea) {
            if (showClickArea && opacity > 0.1) {
                updateClickArea();
                clickArea.style.pointerEvents = 'auto';
            } else {
                clickArea.style.pointerEvents = 'none';
            }
        }
    }
    
    // 绘制漩涡虫洞效果 🌀 - 更神秘、更像圆形的虫洞
    function drawWormhole(intensity, rotation) {
        wormholeContainer.innerHTML = '';
        
        var size = 50;
        var cx = size / 2;
        var cy = size / 2;
        
        // 更神秘的深紫色/靛蓝色调
        var ringColor = isAppearing ? 'rgba(100,80,200,' : 'rgba(80,60,140,';
        var coreColor = isAppearing ? 'rgba(180,140,255,' : 'rgba(120,100,180,';
        var glowColor = isAppearing ? 'rgba(60,40,120,' : 'rgba(40,30,100,';
        var auraColor = isAppearing ? 'rgba(140,100,255,' : 'rgba(100,70,180,';
        
        var svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('width', size);
        svg.setAttribute('height', size);
        svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
        svg.style.position = 'absolute';
        svg.style.left = '0';
        svg.style.top = '0';
        svg.style.transform = 'rotate(' + rotation + 'deg)';
        svg.style.transition = 'none';
        
        // === 外层神秘光环 - 多层圆环 ===
        // 最外层淡光环
        var outerAura = document.createElementNS(SVG_NS, 'circle');
        outerAura.setAttribute('cx', cx);
        outerAura.setAttribute('cy', cy);
        outerAura.setAttribute('r', '24');
        outerAura.setAttribute('fill', 'none');
        outerAura.setAttribute('stroke', glowColor + (intensity * 0.15) + ')');
        outerAura.setAttribute('stroke-width', '4');
        svg.appendChild(outerAura);
        
        // 外层神秘圆环 - 虚线效果
        var outerRing = document.createElementNS(SVG_NS, 'circle');
        outerRing.setAttribute('cx', cx);
        outerRing.setAttribute('cy', cy);
        outerRing.setAttribute('r', '21');
        outerRing.setAttribute('fill', 'none');
        outerRing.setAttribute('stroke', ringColor + (intensity * 0.6) + ')');
        outerRing.setAttribute('stroke-width', '1.5');
        outerRing.setAttribute('stroke-dasharray', '3 2');
        svg.appendChild(outerRing);
        
        // 中层实线圆环
        var midRing = document.createElementNS(SVG_NS, 'circle');
        midRing.setAttribute('cx', cx);
        midRing.setAttribute('cy', cy);
        midRing.setAttribute('r', '17');
        midRing.setAttribute('fill', 'none');
        midRing.setAttribute('stroke', ringColor + (intensity * 0.8) + ')');
        midRing.setAttribute('stroke-width', '1');
        svg.appendChild(midRing);
        
        // 内层细圆环
        var innerRing = document.createElementNS(SVG_NS, 'circle');
        innerRing.setAttribute('cx', cx);
        innerRing.setAttribute('cy', cy);
        innerRing.setAttribute('r', '13');
        innerRing.setAttribute('fill', 'none');
        innerRing.setAttribute('stroke', coreColor + (intensity * 0.7) + ')');
        innerRing.setAttribute('stroke-width', '0.8');
        svg.appendChild(innerRing);
        
        // === 漩涡螺旋线 - 两臂向中心收敛 ===
        var spiralPath = document.createElementNS(SVG_NS, 'path');
        var spiralData = '';
        var spiralArms = 2;
        for (var arm = 0; arm < spiralArms; arm++) {
            var startAngle = (Math.PI * 2 / spiralArms) * arm;
            for (var angle = 0; angle < Math.PI * 1.5; angle += 0.08) {
                var r = 18 - (angle / (Math.PI * 1.5)) * 14; // 从外圈向内圈
                var x = cx + Math.cos(startAngle + angle) * r;
                var y = cy + Math.sin(startAngle + angle) * r;
                if (angle === 0 && arm === 0) {
                    spiralData = 'M ' + x.toFixed(1) + ' ' + y.toFixed(1);
                } else {
                    spiralData += ' L ' + x.toFixed(1) + ' ' + y.toFixed(1);
                }
            }
        }
        spiralPath.setAttribute('d', spiralData);
        spiralPath.setAttribute('fill', 'none');
        spiralPath.setAttribute('stroke', auraColor + (intensity * 0.5) + ')');
        spiralPath.setAttribute('stroke-width', '1.2');
        spiralPath.setAttribute('stroke-linecap', 'round');
        svg.appendChild(spiralPath);
        
        // === 中心深渊效果 ===
        // 深渊外层光晕
        var abyssOuter = document.createElementNS(SVG_NS, 'circle');
        abyssOuter.setAttribute('cx', cx);
        abyssOuter.setAttribute('cy', cy);
        abyssOuter.setAttribute('r', '10');
        abyssOuter.setAttribute('fill', coreColor + (intensity * 0.25) + ')');
        svg.appendChild(abyssOuter);
        
        // 深渊中层光晕
        var abyssMid = document.createElementNS(SVG_NS, 'circle');
        abyssMid.setAttribute('cx', cx);
        abyssMid.setAttribute('cy', cy);
        abyssMid.setAttribute('r', '6');
        abyssMid.setAttribute('fill', auraColor + (intensity * 0.4) + ')');
        svg.appendChild(abyssMid);
        
        // 深渊核心 - 最亮
        var abyssCore = document.createElementNS(SVG_NS, 'circle');
        abyssCore.setAttribute('cx', cx);
        abyssCore.setAttribute('cy', cy);
        abyssCore.setAttribute('r', '3');
        abyssCore.setAttribute('fill', 'rgba(220,200,255,' + (intensity * 0.95) + ')');
        svg.appendChild(abyssCore);
        
        // === 神秘符文/刻度标记 - 8个等距点 ===
        for (var i = 0; i < 8; i++) {
            var angle = (Math.PI * 2 / 8) * i + rotation * 0.02;
            var markerR = 20;
            var x1 = cx + Math.cos(angle) * (markerR - 2);
            var y1 = cy + Math.sin(angle) * (markerR - 2);
            var x2 = cx + Math.cos(angle) * markerR;
            var y2 = cy + Math.sin(angle) * markerR;
            
            var marker = document.createElementNS(SVG_NS, 'line');
            marker.setAttribute('x1', x1.toFixed(1));
            marker.setAttribute('y1', y1.toFixed(1));
            marker.setAttribute('x2', x2.toFixed(1));
            marker.setAttribute('y2', y2.toFixed(1));
            marker.setAttribute('stroke', ringColor + (intensity * 0.7) + ')');
            marker.setAttribute('stroke-width', '1.5');
            marker.setAttribute('stroke-linecap', 'round');
            svg.appendChild(marker);
        }
        
        // === 能量射线 - 从中心向外辐射 ===
        for (var ray = 0; ray < 4; ray++) {
            var rayAngle = (Math.PI * 2 / 4) * ray - rotation * 0.015;
            var rayX = cx + Math.cos(rayAngle) * 14;
            var rayY = cy + Math.sin(rayAngle) * 14;
            var rayEndX = cx + Math.cos(rayAngle) * 18;
            var rayEndY = cy + Math.sin(rayAngle) * 18;
            
            var energyRay = document.createElementNS(SVG_NS, 'line');
            energyRay.setAttribute('x1', rayX.toFixed(1));
            energyRay.setAttribute('y1', rayY.toFixed(1));
            energyRay.setAttribute('x2', rayEndX.toFixed(1));
            energyRay.setAttribute('y2', rayEndY.toFixed(1));
            energyRay.setAttribute('stroke', auraColor + (intensity * 0.5) + ')');
            energyRay.setAttribute('stroke-width', '1');
            energyRay.setAttribute('stroke-linecap', 'round');
            svg.appendChild(energyRay);
        }
        
        wormholeContainer.appendChild(svg);
    }
    
    function positionContainer() {
        var terminal = document.querySelector('.terminal');
        if (!terminal) return;
        
        var rect = terminal.getBoundingClientRect();
        terminalTop = rect.top;
        
        container.style.left = rect.left + 'px';
        container.style.top = (terminalTop - 20) + 'px';
        container.style.width = rect.width + 'px';
        
        boundLeft = 15 + edgeBuffer;
        boundRight = rect.width - 15 - edgeBuffer;
        
        headX = boundLeft + Math.random() * (boundRight - boundLeft);
        direction = Math.random() > 0.5 ? 1 : -1;
        
        for (var i = 0; i < segmentCount; i++) {
            segX[i] = headX - i * spacing * direction;
            segY[i] = groundY;
            segOffset[i] = i * 0.55;
        }
    }
    
    // 缓动函数
    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }
    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    function easeOutQuad(t) {
        return 1 - Math.pow(1 - t, 2);
    }
    
    function animate() {
        var dt = 16;
        
        // 冻结时不执行任何动画，保持当前状态
        if (isFrozen) {
            requestAnimationFrame(animate);
            return;
        }
        
        if (wormState === 'hidden') {
            wormholeContainer.style.opacity = '0';
            for (var i = 0; i < segmentCount; i++) {
                segments[i].el.style.opacity = '0';
            }
        }
        else if (wormState === 'wormhole_appear') {
            // ========== 1/5. 虫洞展开（出现和消失共用）==========
            wormholeTimer += dt;
            var progress = Math.min(1, wormholeTimer / wormholeAppearDur);
            var ease = easeOutCubic(progress);
            
            // 虫洞旋转：出现时顺时针，消失时逆时针
            if (isAppearing) {
                wormholeRotation += 2 + (1 - progress) * 3; // 顺时针
            } else {
                wormholeRotation -= 2 + (1 - progress) * 3; // 逆时针
            }
            drawWormhole(0.4 + ease * 0.5, wormholeRotation);
            wormholeContainer.style.opacity = ease.toString();
            wormholeContainer.style.left = (wormholeX - 25) + 'px';
            wormholeContainer.style.top = (wormholeY - 25) + 'px';
            
            if (progress >= 1) {
                if (isAppearing) {
                    // 出现流程：虫洞展开后，虫子出现
                    wormState = 'worm_emerge';
                } else {
                    // 消失流程：虫洞展开后，虫子开始沉睡过渡
                    wormState = 'sleeping';
                }
                wormholeTimer = 0;
            }
        }
        else if (wormState === 'worm_emerge') {
            // ========== 2. 虫子直线出现 ==========
            wormholeTimer += dt;
            var progress = Math.min(1, wormholeTimer / wormEmergeDur);
            
            // 虫洞持续旋转（匀速）
            wormholeRotation += 2;
            
            // 绘制虫洞（持续旋转）
            var wormholeIntensity = 0.9 - progress * 0.3;
            drawWormhole(wormholeIntensity, wormholeRotation);
            wormholeContainer.style.opacity = (1 - progress * 0.3).toString();
            wormholeContainer.style.left = (wormholeX - 25) + 'px';
            wormholeContainer.style.top = (wormholeY - 25) + 'px';
            
            // 虫子从头部向尾部延伸
            for (var i = 0; i < segmentCount; i++) {
                var segProgress = Math.min(1, progress * segmentCount - i * 0.8);
                if (segProgress > 0) {
                    var segEase = easeOutCubic(segProgress);
                    var targetX = wormholeX - i * spacing * direction;
                    segX[i] = targetX;
                    segY[i] = groundY; // 直线状态
                    
                    segments[i].el.style.left = segX[i] + 'px';
                    segments[i].el.style.top = groundY + 'px';
                    segments[i].el.style.transform = 'scale(' + (0.3 + segEase * 0.7) + ')';
                    segments[i].el.style.opacity = (segEase * (i === 0 ? 0.7 : 0.55)).toString();
                } else {
                    segments[i].el.style.opacity = '0';
                    segments[i].el.style.transform = 'scale(0)';
                }
            }
            
            headX = wormholeX;
            
            if (progress >= 1) {
                wormState = 'waking';
                wormholeTimer = 0;
                wakeProgress = 0;
                isAwake = false;
                wavePhase = 0;
                console.log('[时空虫] 直线形态完成，开始苏醒...');
            }
        }
        else if (wormState === 'waking') {
            // ========== 3. 苏醒过渡（直线 → 蠕动）==========
            wormholeTimer += dt;
            var progress = Math.min(1, wormholeTimer / wakingDur);
            
            wakeProgress = progress;
            isAwake = true;
            
            // 波的相位推进（慢速启动）
            wavePhase += waveSpeed * (0.3 + progress * 0.7);
            if (wavePhase > Math.PI * 2) wavePhase -= Math.PI * 2;
            
            // 边界处理和移动
            if (turnCooldown > 0) turnCooldown--;
            headX += direction * 0.015; // 慢速移动
            
            var lookAhead = 15;
            var predictedX = headX + direction * lookAhead;
            if (turnCooldown <= 0) {
                if (direction > 0 && predictedX >= boundRight) {
                    direction *= -1;
                    turnCooldown = minTurnInterval;
                } else if (direction < 0 && predictedX <= boundLeft) {
                    direction *= -1;
                    turnCooldown = minTurnInterval;
                }
            }
            
            if (headX > boundRight) headX = boundRight;
            else if (headX < boundLeft) headX = boundLeft;
            
            updateWormPositions();
            renderWorm(1);
            
            // 虫洞持续旋转并平滑淡出（从 0.7 开始降到 0）
            var wormholeFade = 0.7 * (1 - progress);
            if (wormholeFade > 0.01) {
                wormholeRotation += 2;
                drawWormhole(0.3 + wormholeFade * 0.5, wormholeRotation);
                wormholeContainer.style.opacity = wormholeFade.toString();
            } else {
                wormholeContainer.style.opacity = '0';
            }
            
            if (progress >= 1) {
                wormState = 'active';
                stayDuration = stayMin + Math.random() * (stayMax - stayMin);
                stayTimer = 0;
                wakeProgress = 1;
                console.log('[时空虫] 苏醒完成，开始蠕动！');
            }
        }
        else if (wormState === 'active') {
            // ========== 4. 正常蠕动 ==========
            stayTimer += dt;
            
            // 检测鼠标是否悬停在虫子上（使用更稳定的检测方法）
            var containerRect = container.getBoundingClientRect();
            var mouseX = mousePos.x - containerRect.left;
            var mouseY = mousePos.y - containerRect.top;
            
            // 使用稳定的垂直范围（基于 groundY + 最大拱高），避免上边界抖动
            var hoverPadding = 5;  // 水平方向扩展 1px
            var minX = segX[0], maxX = segX[0];
            for (var hi = 1; hi < segmentCount; hi++) {
                if (segX[hi] < minX) minX = segX[hi];
                if (segX[hi] > maxX) maxX = segX[hi];
            }
            
            // 垂直范围基于 groundY（最稳定），上下各扩展一个最大拱高（约 6px）+ padding
            var verticalExtend = 10;  // 垂直方向扩展（上下各 10px，基于 groundY）
            var hoverTop = groundY - verticalExtend;
            var hoverBottom = groundY + verticalExtend;
            var hoverLeft = minX - hoverPadding;
            var hoverRight = maxX + segmentSize + hoverPadding;
            
            // 矩形边界检测
            isHovering = (mouseX >= hoverLeft && mouseX <= hoverRight && mouseY >= hoverTop && mouseY <= hoverBottom);
            
            if (isHovering) {
                if (savedHeadX === 0) {
                    savedDirection = direction;
                    savedHeadX = headX;
                }
            } else if (savedHeadX !== 0) {
                headX = savedHeadX;
                savedHeadX = 0;
            }
            
            // 检测是否在调头（刚调头后短暂阻止消失）
            var isTurning = turnCooldown > minTurnInterval - 10;
            
            // 设置阻止消失条件
            preventDisappear = (isHovering || isTurning) ? 1 : 0;
            
            // 悬停时虫子完全静止
            if (!isHovering) {
                wavePhase += waveSpeed;
                if (wavePhase > Math.PI * 2) wavePhase -= Math.PI * 2;
                
                if (turnCooldown > 0) turnCooldown--;
                headX += direction * 0.028;
                
                var lookAhead = 15;
                var predictedX = headX + direction * lookAhead;
                var shouldTurn = false;
                
                if (turnCooldown <= 0) {
                    if (direction > 0 && predictedX >= boundRight) shouldTurn = true;
                    else if (direction < 0 && predictedX <= boundLeft) shouldTurn = true;
                }
                
                if (shouldTurn) {
                    direction *= -1;
                    turnCooldown = minTurnInterval;
                }
                
                if (headX > boundRight) {
                    headX = boundRight;
                    direction = -1;
                    turnCooldown = minTurnInterval;
                } else if (headX < boundLeft) {
                    headX = boundLeft;
                    direction = 1;
                    turnCooldown = minTurnInterval;
                }
            }
            
            // 悬停时虫子变成直线静止
            wakeProgress = isHovering ? 0 : 1;
            
            updateWormPositions();
            renderWorm(1);
            
            wormholeContainer.style.opacity = '0';
            
            // 头部光波动画（悬停时频率提高一倍）
            if (!pulseActive) {
                pulseTimer += dt;
                pulseX = segX[0];
                pulseY = segY[0];
                
                // 悬停时光波频率提高到 4 倍（间隔 300ms）
                var currentPulseInterval = isHovering ? 300 : pulseInterval;
                
                if (pulseTimer >= currentPulseInterval) {
                    pulseActive = true;
                    pulseProgress = 0;
                    pulseTimer = 0;
                }
            }
            
            if (pulseActive) {
                pulseProgress += dt;
                var pulseDur = 500;
                var progress = Math.min(1, pulseProgress / pulseDur);
                var ease = easeOutQuad(progress);
                
                var waveRadius = 6 + ease * 20;
                var waveOpacity = 0.6 * (1 - ease);
                var waveSize = waveRadius * 2;
                var pulseColor = getPulseColor();

                pulseWave.style.left = (pulseX - waveRadius) + 'px';
                pulseWave.style.top = (pulseY - waveRadius) + 'px';
                pulseWave.style.width = waveSize + 'px';
                pulseWave.style.height = waveSize + 'px';
                pulseWave.style.border = '2px solid rgba(' + pulseColor + ',' + waveOpacity + ')';
                pulseWave.style.boxShadow = '0 0 ' + (waveRadius * 0.8) + 'px rgba(' + pulseColor + ',' + (waveOpacity * 0.7) + '), inset 0 0 ' + (waveRadius * 0.4) + 'px rgba(' + pulseColor + ',' + (waveOpacity * 0.3) + ')';
                pulseWave.style.opacity = waveOpacity.toString();
                pulseWave.style.transform = 'scale(1)';
                
                if (progress >= 1) {
                    pulseActive = false;
                    pulseWave.style.opacity = '0';
                    pulseWave.style.transform = 'scale(0)';
                }
            }
            
            // 边界检测（每 1200ms 检测一次，悬浮时不检测）
            if (!isHovering) {
                boundaryCheckTimer += dt;
                if (boundaryCheckTimer >= boundaryCheckInterval) {
                    boundaryCheckTimer = 0;
                    // segX[0] 是相对于 container 的坐标，boundLeft/boundRight 也是
                    var headRelativeX = segX[0];
                    // 检查头部是否超出有效区域（留 10px 缓冲）
                    if (headRelativeX < boundLeft - 10 || headRelativeX > boundRight + 10) {
                        console.log('[时空虫] 超出边界，触发消失...', { headX: headRelativeX, boundLeft: boundLeft, boundRight: boundRight });
                        startDisappear();
                    }
                }
            } else {
                boundaryCheckTimer = 0; // 悬浮时重置计时器
            }
            
            // 只有在不阻止消失时才检查消失
            if (stayTimer >= stayDuration && preventDisappear === 0) {
                startDisappear();
            }
        }
        else if (wormState === 'sleeping') {
            // ========== 5. 沉睡过渡（蠕动 → 直线）==========
            wormholeTimer += dt;
            var progress = Math.min(1, wormholeTimer / sleepingDur);
            var ease = easeInOutCubic(progress);
            
            // 重置光波动画（防止光波残留）
            pulseActive = false;
            pulseWave.style.opacity = '0';
            pulseWave.style.transform = 'scale(0)';
            
            wakeProgress = 1 - ease;
            isAwake = wakeProgress > 0;
            
            // 虫洞持续旋转（逆时针）
            wormholeRotation -= 2;
            // 平滑过渡：从 1（wormhole_appear 结束时）降到 0.85
            var wormholeOpacity = 1 - ease * 0.15;
            var wormholeIntensity = 0.4 + wormholeOpacity * 0.5;
            drawWormhole(wormholeIntensity, wormholeRotation);
            wormholeContainer.style.opacity = wormholeOpacity.toString();
            
            // 虫子继续蠕动，但波幅逐渐减小直到变成直线
            wavePhase += waveSpeed;
            if (wavePhase > Math.PI * 2) wavePhase -= Math.PI * 2;
            
            // 虫子持续移动（不受边界限制）
            headX += direction * 0.025;
            
            // 更新位置
            updateWormPositions();
            renderWorm(1);
            
            if (progress >= 1) {
                wormState = 'worm_retract';
                wormholeTimer = 0;
                for (var i = 0; i < segmentCount; i++) {
                    segY[i] = groundY; // 虫子完全停在地面
                }
                console.log('[时空虫] 进入沉睡状态，准备收缩...');
            }
        }
        else if (wormState === 'worm_retract') {
            // ========== 6. 虫子直线收缩进虫洞 ==========
            wormholeTimer += dt;
            var progress = Math.min(1, wormholeTimer / wormRetractDur);
            var ease = easeOutCubic(progress);
            
            // 虫洞持续旋转并平滑渐隐
            wormholeRotation -= 2;
            var wormholeOpacity = 0.85 * (1 - ease * 0.4); // 从 0.85 线性降到约 0.51
            var wormholeIntensity = 0.5 + wormholeOpacity * 0.4;
            drawWormhole(wormholeIntensity, wormholeRotation);
            wormholeContainer.style.opacity = wormholeOpacity.toString();
            
            // 虫子从尾部到头部依次收缩
            for (var i = segmentCount - 1; i >= 0; i--) {
                var segDelay = i * 0.04;
                var segProgress = Math.max(0, Math.min(1, (progress - segDelay) / 0.6));
                if (segProgress > 0) {
                    var segEase = easeInOutCubic(segProgress);
                    var collapseFactor = segEase;
                    var targetX = wormholeX - i * spacing * direction * (1 - collapseFactor);
                    
                    segX[i] = targetX;
                    segY[i] = groundY; // 保持直线
                    
                    segments[i].el.style.left = segX[i] + 'px';
                    segments[i].el.style.top = groundY + 'px';
                    segments[i].el.style.transform = 'scale(' + (1 - segEase) + ')';
                    segments[i].el.style.opacity = ((1 - segEase) * (i === 0 ? 0.7 : 0.55)).toString();
                } else {
                    segments[i].el.style.left = segX[i] + 'px';
                    segments[i].el.style.top = groundY + 'px';
                    segments[i].el.style.transform = 'scale(1)';
                    segments[i].el.style.opacity = (i === 0 ? 0.7 : 0.55).toString();
                }
            }
            
            if (progress >= 1) {
                wormState = 'wormhole_close';
                wormholeTimer = 0;
            }
        }
        else if (wormState === 'wormhole_close') {
            // ========== 7. 虫洞关闭 ==========
            wormholeTimer += dt;
            var progress = Math.min(1, wormholeTimer / wormholeCloseDur);
            var ease = easeOutCubic(progress);
            
            wormholeRotation -= 1;
            drawWormhole(0.5 * (1 - ease), wormholeRotation);
            wormholeContainer.style.opacity = (0.5 * (1 - ease)).toString();
            
            for (var i = 0; i < segmentCount; i++) {
                segments[i].el.style.opacity = '0';
                segments[i].el.style.transform = 'scale(0)';
            }
            
            if (progress >= 1) {
                wormState = 'hidden';
                console.log('[时空虫] 已消失，休息中...');
                scheduleNextAppearance();
            }
        }
        
        // 跟随 terminal 位置变化（移动或缩放）
        var terminal = document.querySelector('.terminal');
        if (terminal) {
            var rect = terminal.getBoundingClientRect();
            var newTop = rect.top;
            var newLeft = rect.left;
            var newWidth = rect.width;
            
            // 如果位置或大小发生变化，更新所有相关值
            if (Math.abs(newTop - terminalTop) > 1 || 
                Math.abs(newLeft - parseFloat(container.style.left || '0')) > 1 ||
                Math.abs(newWidth - parseFloat(container.style.width || '0')) > 1) {
                
                terminalTop = newTop;
                container.style.left = newLeft + 'px';
                container.style.top = (terminalTop - 20) + 'px';
                container.style.width = newWidth + 'px';
                
                // 更新边界值
                var safeMargin = 50;
                boundLeft = 15 + edgeBuffer;
                boundRight = newWidth - 15 - edgeBuffer;
            }
        }
        
        requestAnimationFrame(animate);
    }
    
    init();
})();

// ============ Matrix Rain Background ============
(function() {
    var canvas = document.getElementById('matrix-bg');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    
    var cols, drops;
    var fontSize = 11;
    var hue = 140; // 经典的黑客绿

    // 检测是否为移动端
    var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    var clearAlpha = isMobile ? 0.03 : 0.005;

    /**
     * 已知存在代码雨尾迹重叠（canvas 半透明淡出失效）的环境：
     * - WebKit Safari（macOS）
     * - iOS 全系（内核均为 WebKit）
     * - Firefox / Gecko
     * - Windows 下的 Chromium 系（Chrome、Edge 等；macOS Chrome 正常）
     */
    function isKnownMatrixRainBuggyEnv() {
        var ua = navigator.userAgent;

        var isWebKitSafari = /Safari/i.test(ua) &&
            !/Chromium|Chrome|CriOS|Edg|OPR|FxiOS/i.test(ua);

        var isIOS = /iPhone|iPad|iPod/i.test(ua);

        var isFirefox = /Firefox/i.test(ua) || /FxiOS/i.test(ua);

        var isWindows = /Windows/i.test(ua);
        var isChromium = /Chrome|Chromium|Edg|OPR/i.test(ua) && !/Firefox/i.test(ua);
        var isWindowsChromium = isWindows && isChromium;

        return isWebKitSafari || isIOS || isFirefox || isWindowsChromium;
    }

    /**
     * 运行时探测：模拟代码雨的半透明背景覆盖淡出是否生效。
     * 正常环境多次覆盖后亮色应接近背景 #0d1117；异常环境绿色残留偏高。
     */
    function probeMatrixFadeWorks() {
        try {
            var probe = document.createElement('canvas');
            probe.width = 8;
            probe.height = 8;
            var pctx = probe.getContext('2d', { willReadFrequently: true });
            if (!pctx) return true;

            pctx.fillStyle = 'hsla(140, 100%, 70%, 0.85)';
            pctx.fillRect(0, 0, 8, 8);

            pctx.fillStyle = 'rgba(13, 17, 23, 0.005)';
            pctx.fillRect(0, 0, 8, 8);
            var afterOne = pctx.getImageData(4, 4, 1, 1).data[1];

            for (var fi = 0; fi < 199; fi++) {
                pctx.fillStyle = 'rgba(13, 17, 23, 0.005)';
                pctx.fillRect(0, 0, 8, 8);
            }
            var afterMany = pctx.getImageData(4, 4, 1, 1).data[1];

            var fadeDelta = afterOne - afterMany;
            return fadeDelta > 15 && afterMany < 40;
        } catch (e) {
            return true;
        }
    }

    function resolveSnowEffect() {
        var knownBuggy = isKnownMatrixRainBuggyEnv();

        try {
            var cached = sessionStorage.getItem('matrix_rain_use_snow');
            if (cached === '1') {
                console.log('代码雨渲染模式: 风雪效果（session 缓存）| 已知问题环境:', knownBuggy);
                return true;
            }
            if (cached === '0') {
                console.log('代码雨渲染模式: Matrix 代码雨（session 缓存）| 已知问题环境:', knownBuggy);
                return false;
            }
        } catch (e) {}

        var fadeWorks = probeMatrixFadeWorks();
        var useSnow = knownBuggy || !fadeWorks;

        try {
            sessionStorage.setItem('matrix_rain_use_snow', useSnow ? '1' : '0');
        } catch (e) {}

        console.log(
            '代码雨渲染模式:',
            useSnow ? '风雪效果（canvas 淡出异常或已知问题环境）' : 'Matrix 代码雨',
            '| 已知问题环境:', knownBuggy,
            '| 淡出探测通过:', fadeWorks
        );
        return useSnow;
    }

    var needsSnowEffect = resolveSnowEffect();

    // 映射基础字符集
    var BASE_SETS = {
        '1': 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン',
        '2': '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        '3': '01',
        '4': '一二三四五六七八九十零甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥临兵斗者皆阵列在前天地神佛'
    };

    // 获取全局配置
    var config = window.SITE_CONFIG || {};
    var isStartupRandom = config.matrixRainStartupRandom === true || config.matrixRainStartupRandom === 'true';
    var fixedMode = String(config.matrixRainFixedMode || '1');

    // 【新增参数控制】随机算法模式: 'average'(等概率) / 'decay'(指数递减概率)
    var randomAlgorithm = config.matrixRainRandomAlgorithm || 'average';

    // 默认兜底数组（为了体现梯度递减，默认池子可以配置更长，供算法筛选）
    var rainRandomPool = ['1', '2', '3', '4', '2+3', '1+4', '1+2+3+4']; 

    // 九字真言，作为特殊符号单独处理，增加辨识度和趣味性
    var spellChars = '临兵斗者皆阵列在前';

    // 佛字单独成一档，触发特殊效果
    var buddhaChar = '佛';
    var enableBuddhaEffect = config.matrixRainEnableBuddhaEffect === true || config.matrixRainEnableBuddhaEffect === 'true'; 

    if (config.matrixRainRandomPool) {
        if (Array.isArray(config.matrixRainRandomPool)) {
            rainRandomPool = config.matrixRainRandomPool;
        } else if (typeof config.matrixRainRandomPool === 'string') {
            rainRandomPool = config.matrixRainRandomPool.split(',');
        }
    }
    var activeMode = '1'; 

    if (!isStartupRandom) {
        activeMode = fixedMode;
    } else {
        var lastMode = sessionStorage.getItem('matrix_rain_last_mode');
        
        var filteredPool = rainRandomPool.filter(function(mode) {
            var modeStr = typeof mode === 'string' ? mode.trim() : String(mode);
            var lastModeStr = lastMode ? lastMode.trim() : '';
            return modeStr !== lastModeStr;
        });
        
        if (filteredPool.length === 0) {
            filteredPool = rainRandomPool;
        }

        // 核心算法分流层
        var chosenMode = filteredPool[0]; // 默认兜底选第一个

        if (randomAlgorithm === 'decay' && filteredPool.length > 1) {
            var index = 0;
            var maxIndex = filteredPool.length - 1;
            
            while (Math.random() < 0.50 && index < maxIndex) {
                index++;
            }
            chosenMode = filteredPool[index];
        } else {
            chosenMode = filteredPool[Math.floor(Math.random() * filteredPool.length)];
        }

        activeMode = typeof chosenMode === 'string' ? chosenMode.trim() : String(chosenMode);
        sessionStorage.setItem('matrix_rain_last_mode', activeMode);
    }
    console.log('当前雨幕运行模式确定为:', activeMode, '【使用的是 ' + randomAlgorithm + ' 随机算法】');

    function getMixedChars(modeString) {
        var parts = modeString.split('+');
        var combined = '';
        for (var i = 0; i < parts.length; i++) {
            var key = parts[i].trim();
            if (BASE_SETS[key]) {
                combined += BASE_SETS[key];
            }
        }
        return combined || BASE_SETS['1'];
    }
    var cachedCharPool = getMixedChars(activeMode);

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        var newCols = Math.floor(canvas.width / fontSize);
        var oldDrops = drops || [];
        drops = [];
        for (var i = 0; i < newCols; i++) {
            if (oldDrops[i]) {
                drops[i] = oldDrops[i];
            } else {
                drops[i] = {
                    y: Math.random() * -100,
                    speed: 0.12 + Math.random() * 0.22,
                    currentChar: cachedCharPool[Math.floor(Math.random() * cachedCharPool.length)],
                    lastRow: -1,
                    brightness: 0.35
                };
            }
        }
        cols = newCols;
    }
    resize();
    window.addEventListener('resize', resize);

    // Safari 风雪效果 - 持久化雪花数组（在 draw 函数外部初始化）
    var snowChars = ['❄', '❅', '❆', '•', '·'];
    var snowflakes = [];
    var maxSnowflakes = 0;

    function initSnowflakes() {
        maxSnowflakes = Math.max(60, Math.floor(canvas.width / 8)); // 增加雪花数量
        snowflakes = [];
        for (var si = 0; si < maxSnowflakes; si++) {
            snowflakes[si] = {
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: 12 + Math.random() * 10, // 稍大的雪花
                speed: 1.0 + Math.random() * 1.5, // 稍快的速度
                wind: (Math.random() - 0.5) * 0.5,
                char: snowChars[Math.floor(Math.random() * snowChars.length)],
                opacity: 0.6 + Math.random() * 0.3, // 更明显的透明度
                wobble: Math.random() * Math.PI * 2
            };
        }
    }
    initSnowflakes();

    function draw() {
        ctx.font = fontSize + 'px "JetBrains Mono", monospace';
        
        // 风雪飘落 + 终端窗口凝霜（用于 canvas 半透明淡出异常的环境）
        if (needsSnowEffect) {
            // 每帧完全清除背景
            ctx.fillStyle = '#0d1117';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // ============ 风雪飘落效果（有序下落，不闪烁）===========
            var fadeStart = canvas.height * 0.75;
            for (var si = 0; si < snowflakes.length; si++) {
                var sf = snowflakes[si];
                
                // 更新位置
                sf.wobble += 0.02;
                sf.y += sf.speed;
                sf.x += sf.wind + Math.sin(sf.wobble) * 0.3;
                
                // 边界处理
                if (sf.y > canvas.height + 20) {
                    sf.y = -20;
                    sf.x = Math.random() * canvas.width;
                }
                if (sf.x < -20) sf.x = canvas.width + 20;
                if (sf.x > canvas.width + 20) sf.x = -20;
                
                // 根据位置调整透明度（底部渐隐）
                var adjustedOpacity = sf.opacity;
                if (sf.y > fadeStart) {
                    adjustedOpacity = sf.opacity * (1 - (sf.y - fadeStart) / (canvas.height - fadeStart + 50));
                }
                if (adjustedOpacity > 0.02) {
                    ctx.font = sf.size + 'px serif';
                    ctx.fillStyle = 'rgba(255, 255, 255, ' + adjustedOpacity + ')';
                    ctx.fillText(sf.char, sf.x, sf.y);
                }
            }
            
            // ============ 边缘凝霜效果 ============
            var frostThickness = 80; // 霜冻厚度
            var frostOpacity = 0.15; // 基础透明度
            
            // 创建霜冻渐变 - 顶部
            var topGrad = ctx.createLinearGradient(0, 0, 0, frostThickness);
            topGrad.addColorStop(0, 'rgba(200, 220, 255, ' + frostOpacity + ')');
            topGrad.addColorStop(0.5, 'rgba(180, 200, 240, ' + (frostOpacity * 0.5) + ')');
            topGrad.addColorStop(1, 'rgba(150, 180, 220, 0)');
            ctx.fillStyle = topGrad;
            ctx.fillRect(0, 0, canvas.width, frostThickness);
            
            // 底部霜冻
            var bottomGrad = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - frostThickness);
            bottomGrad.addColorStop(0, 'rgba(200, 220, 255, ' + frostOpacity + ')');
            bottomGrad.addColorStop(0.5, 'rgba(180, 200, 240, ' + (frostOpacity * 0.5) + ')');
            bottomGrad.addColorStop(1, 'rgba(150, 180, 220, 0)');
            ctx.fillStyle = bottomGrad;
            ctx.fillRect(0, canvas.height - frostThickness, canvas.width, frostThickness);
            
            // 左侧霜冻
            var leftGrad = ctx.createLinearGradient(0, 0, frostThickness, 0);
            leftGrad.addColorStop(0, 'rgba(200, 220, 255, ' + frostOpacity + ')');
            leftGrad.addColorStop(0.5, 'rgba(180, 200, 240, ' + (frostOpacity * 0.5) + ')');
            leftGrad.addColorStop(1, 'rgba(150, 180, 220, 0)');
            ctx.fillStyle = leftGrad;
            ctx.fillRect(0, 0, frostThickness, canvas.height);
            
            // 右侧霜冻
            var rightGrad = ctx.createLinearGradient(canvas.width, 0, canvas.width - frostThickness, 0);
            rightGrad.addColorStop(0, 'rgba(200, 220, 255, ' + frostOpacity + ')');
            rightGrad.addColorStop(0.5, 'rgba(180, 200, 240, ' + (frostOpacity * 0.5) + ')');
            rightGrad.addColorStop(1, 'rgba(150, 180, 220, 0)');
            ctx.fillStyle = rightGrad;
            ctx.fillRect(canvas.width - frostThickness, 0, frostThickness, canvas.height);
            
            // 角落霜冻叠加（增强角落效果）
            var cornerSize = frostThickness * 0.7;
            
            // 左上角
            var tlGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, cornerSize);
            tlGrad.addColorStop(0, 'rgba(220, 235, 255, 0.2)');
            tlGrad.addColorStop(1, 'rgba(200, 220, 255, 0)');
            ctx.fillStyle = tlGrad;
            ctx.fillRect(0, 0, cornerSize, cornerSize);
            
            // 右上角
            var trGrad = ctx.createRadialGradient(canvas.width, 0, 0, canvas.width, 0, cornerSize);
            trGrad.addColorStop(0, 'rgba(220, 235, 255, 0.2)');
            trGrad.addColorStop(1, 'rgba(200, 220, 255, 0)');
            ctx.fillStyle = trGrad;
            ctx.fillRect(canvas.width - cornerSize, 0, cornerSize, cornerSize);
            
            // 左下角
            var blGrad = ctx.createRadialGradient(0, canvas.height, 0, 0, canvas.height, cornerSize);
            blGrad.addColorStop(0, 'rgba(220, 235, 255, 0.2)');
            blGrad.addColorStop(1, 'rgba(200, 220, 255, 0)');
            ctx.fillStyle = blGrad;
            ctx.fillRect(0, canvas.height - cornerSize, cornerSize, cornerSize);
            
            // 右下角
            var brGrad = ctx.createRadialGradient(canvas.width, canvas.height, 0, canvas.width, canvas.height, cornerSize);
            brGrad.addColorStop(0, 'rgba(220, 235, 255, 0.2)');
            brGrad.addColorStop(1, 'rgba(200, 220, 255, 0)');
            ctx.fillStyle = brGrad;
            ctx.fillRect(canvas.width - cornerSize, canvas.height - cornerSize, cornerSize, cornerSize);
        } else {
            // Chrome 使用 rgba 覆盖方案（原始效果）
            ctx.fillStyle = 'rgba(13, 17, 23, ' + clearAlpha + ')';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            for (var i = 0; i < cols; i++) {
                var drop = drops[i];
                drop.y += drop.speed;
                var row = Math.floor(drop.y);
                if (row !== drop.lastRow) {
                    drop.lastRow = row;
                    drop.currentChar = cachedCharPool[Math.floor(Math.random() * cachedCharPool.length)];
                }
                if (Math.random() > 0.90) {
                    drop.brightness = 1.0; 
                } else {
                    drop.brightness += (0.35 - drop.brightness) * 0.08; 
                }

                var isSpell = spellChars.indexOf(drop.currentChar) !== -1;
                var isBuddha = enableBuddhaEffect && drop.currentChar === buddhaChar;

                if (isBuddha) {
                    ctx.save();
                    ctx.fillStyle = '#FFFFFF';
                    ctx.shadowColor = 'rgba(255, 215, 0, 1)';
                    ctx.shadowBlur = 15;
                    ctx.font = 'bold ' + (fontSize + 1) + 'px monospace';
                    ctx.fillText(drop.currentChar, i * fontSize, row * fontSize);
                    ctx.restore();
                } else if (isSpell) {
                    ctx.fillStyle = 'hsla(45, 100%, 70%, 1)';
                    ctx.fillText(drop.currentChar, i * fontSize, row * fontSize);
                } else {
                    var lightness = 45 + drop.brightness * 55;
                    var alpha = drop.brightness * 0.85;
                    ctx.fillStyle = 'hsla(' + hue + ', 100%, ' + lightness + '%, ' + alpha + ')';
                    ctx.fillText(drop.currentChar, i * fontSize, row * fontSize);
                }

                if (drop.y * fontSize > canvas.height && Math.random() > 0.975) {
                    drop.y = 0;
                    drop.lastRow = -1;
                    drop.speed = 0.12 + Math.random() * 0.22;
                    drop.brightness = 0.35;
                }
            }
        }
    }
    function tick() {
        draw();
        requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    
    // 存在 canvas 淡出问题的环境：自动为终端窗口添加凝霜效果
    if (needsSnowEffect) {
        // 等待 DOM 加载完成后添加凝霜 class
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(function() {
                var terminal = document.querySelector('.terminal');
                if (terminal) {
                    terminal.classList.add('safari-frost');
                    
                    // 添加角落霜冻元素（轻微效果）
                    var corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
                    corners.forEach(function(pos) {
                        var corner = document.createElement('div');
                        corner.className = 'frost-corner ' + pos;
                        terminal.appendChild(corner);
                    });
                }
            }, 100);
        });
    }
})();