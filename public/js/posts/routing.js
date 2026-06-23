    // ============ Init ============
    // Handle direct URL: /<ID> (numeric) - 支持任意位数的数字
    (function() {
        // 检查是否有刷新后需要恢复的状态
        var refreshState = sessionStorage.getItem('refresh_state');
        sessionStorage.removeItem('refresh_state'); // 清除状态，只使用一次
        
        if (refreshState) {
            try {
                var state = JSON.parse(refreshState);
                currentView = state.view || 'home';
                currentSlug = state.slug || null;
                currentTag = state.tag || null;
                currentPage = state.page || 1;
                return; // 已恢复状态，不需要再解析 URL
            } catch (e) {
                console.error('恢复刷新状态失败:', e);
            }
        }
        
        // 正常解析 URL
        var pathMatch = window.location.pathname.match(/^\/(\d+)\/?$/);
        if (pathMatch) {
            currentView = 'post';
            currentSlug = pathMatch[1];
        } else {
            // 解析查询参数
            var params = new URLSearchParams(window.location.search);
            var view = params.get('view');
            var tag = params.get('tag');
            if (view === 'tags') {
                currentView = 'tags';
            } else if (view === 'tag' && tag) {
                currentView = 'tag';
                currentTag = decodeURIComponent(tag);
            } else if (view === 'admin') {
                currentView = 'admin';
            } else {
                currentView = 'home';
            }
        }
    })();

    // 初始化时恢复已解锁的文章密码
    (function() {
        try {
            var stored = sessionStorage.getItem('unlocked_posts');
            if (stored) {
                unlockedPosts = JSON.parse(stored);
            }
        } catch (e) {}
    })();

    // 页面加载完成后调用 render
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(function() {
            render();
        }, 100);
    });

    // ============ 全局代码复制按钮事件监听 ============
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('copy-btn')) {
            var btn = e.target;
            var code = decodeURIComponent(escape(atob(btn.getAttribute('data-code'))));

            copyTextToClipboard(code).then(function() {
                btn.textContent = '已复制';
                btn.classList.add('copied');
                setTimeout(function() {
                    btn.textContent = '复制';
                    btn.classList.remove('copied');
                }, 1500);
            }).catch(function() {
                btn.textContent = '复制失败';
                setTimeout(function() {
                    btn.textContent = '复制';
                }, 1500);
            });
        }
    });

    // ============ 作者信息弹窗 ============
    function showAuthorModal() {
        var overlay = document.createElement('div');
        overlay.className = 'preview-overlay';
        overlay.id = 'authorModal';
        overlay.innerHTML = `
            <div class="terminal author-terminal">
                <div class="title-bar">
                    <div class="dot red" onclick="closeAuthorModal()"></div>
                    <div class="dot yellow"></div>
                    <div class="dot green"></div>
                    <div class="title">~/author/info.sh</div>
                    <span class="author-close-btn" onclick="closeAuthorModal()">✕ 关闭</span>
                </div>
                <div class="term-body author-body">
                    <div class="author-header">
                        <div class="author-ascii">
  ╔═════════════════════════════════════╗
  ║   TerminalBlog Author Information   ║
  ║   ════════════════════════════════  ║
  ╚═════════════════════════════════════╝</div>
                    </div>
                    
                    <div class="author-content">
                        <div class="author-prompt">$ cat author.txt</div>
                        <div class="author-info">
                            <div class="info-line">
                                <span class="info-key">author</span>
                                <span class="info-sep">:</span>
                                <span class="info-value highlight">TSE</span>
                            </div>
                            <div class="info-line">
                                <span class="info-key">role</span>
                                <span class="info-sep">:</span>
                                <span class="info-value">Full-Stack Developer</span>
                            </div>
                            <div class="info-line">
                                <span class="info-key">blog</span>
                                <span class="info-sep">:</span>
                                <span class="info-value">Terminal Blog Creator</span>
                            </div>
                        </div>
                        
                        <div class="author-prompt" style="margin-top: 20px;">$ cat contact.txt</div>
                        <div class="author-info">
                            <div class="info-line">
                                <span class="info-key">email</span>
                                <span class="info-sep">:</span>
                                <span class="info-value link" onclick="window.open('mailto:9724370@qq.com', '_blank')">9724370@qq.com</span>
                            </div>
                            <div class="info-line">
                                <span class="info-key">wechat</span>
                                <span class="info-sep">:</span>
                                <span class="info-value">9724370</span>
                            </div>
                        </div>
                        
                        <div class="author-prompt" style="margin-top: 20px;">$ uptime</div>
                        <div class="author-info">
                            <div class="info-line">
                                <span class="info-key">status</span>
                                <span class="info-sep">:</span>
                                <span class="info-value online">● Online</span>
                            </div>
                            <div class="info-line">
                                <span class="info-key">lang</span>
                                <span class="info-sep">:</span>
                                <span class="info-value">Node.js</span>
                            </div>
                        </div>
                        
                        <div class="author-prompt" style="margin-top: 20px;">$ cat project.txt</div>
                        <div class="author-info">
                            <div class="info-line">
                                <span class="info-key">github</span>
                                <span class="info-sep">:</span>
                                <span class="info-value link" onclick="window.open('https://github.com/ieiian/TerminalBlog', '_blank')">TerminalBlog</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="author-footer">
                        <span class="cursor-blink">_</span>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.scrollTop = 0;
        
        // 防止底层页面滚动
        document.body.style.overflow = 'hidden';
    }

    function closeAuthorModal() {
        var overlay = document.getElementById('authorModal');
        if (overlay) overlay.remove();
        // 恢复页面滚动
        document.body.style.overflow = '';
    }

    // ============ Renderers ============
    function setTitle(text) {
        document.getElementById('titleBar').textContent = text;
        document.title = text.split(' ~ ')[0] + ' - Terminal Blog';
    }

    function prompt(user, path, cmd) {
        return `<div class="prompt">
            <span class="user">${user}</span><span class="symbol">@</span><span class="path">${path}</span><span class="symbol">:~$</span> <span class="cmd">${cmd}</span>
        </div>`;
    }

    function separator(text) {
        if (text) return `<div class="sep"># ─── ${text} ${'─'.repeat(Math.max(1, 20 - text.length))}</div>`;
        return `<div class="sep"># ${'─'.repeat(28)}</div>`;
    }

    async function render() {
        const body = document.getElementById('termBody');
        body.innerHTML = '<div class="loading"></div>';

        try {
            switch (currentView) {
                case 'home': await renderHome(body); break;
                case 'post': await renderPost(body); break;
                case 'tag': await renderTagPosts(body); break;
                case 'tags': await renderTags(body); break;
                case 'admin': await renderAdmin(body); break;
            }
        } catch (err) {
            body.innerHTML = `
                ${prompt('hacker', 'blog', 'cat ./error.log')}
                <div class="output">
                    <p class="error-text">[ERROR] ${escapeHtml(err.message)}</p>
                    <p style="color: var(--gray); margin-top: 12px;">Try refreshing or <a href="#" onclick="navigate('home'); return false;" style="color: var(--cyan);">return home</a></p>
                </div>
            `;
        }

        // 页面渲染完成后初始化页脚
        initFooter();
        
        // 检查重复文章 ID
        checkDuplicateIds();
    }

    async function renderHome(body) {
        // 主页标签云参数化限制行数（从 config.js 读取，默认 4/8 行）
        var HOME_TAGS_MAX_ROWS_DESKTOP = (SITE_CONFIG && SITE_CONFIG.homeTagsMaxRowsDesktop !== undefined) ? SITE_CONFIG.homeTagsMaxRowsDesktop : 4;
        var HOME_TAGS_MAX_ROWS_MOBILE = (SITE_CONFIG && SITE_CONFIG.homeTagsMaxRowsMobile !== undefined) ? SITE_CONFIG.homeTagsMaxRowsMobile : 8;
        
        // 根据设备类型选择限制行数
        var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
        var HOME_TAGS_MAX_ROWS = isMobile ? HOME_TAGS_MAX_ROWS_MOBILE : HOME_TAGS_MAX_ROWS_DESKTOP;
        
        // 去除 ~ zsh 后缀
        setTitle(SITE_CONFIG ? SITE_CONFIG.siteTitle : 'TerminalBlog');
        document.getElementById('statusMode').textContent = 'NORMAL';

        const stats = await apiGet('/stats');
        const posts = await apiGet(`/posts?page=1&limit=${Math.max(stats.totalPosts, 1)}`);
        const homeTotalPages = Math.max(1, Math.ceil(posts.totalPosts / POSTS_PER_PAGE));
        if (currentPage > homeTotalPages) currentPage = homeTotalPages;
        if (currentPage < 1) currentPage = 1;

        body.innerHTML = `
            <div class="ascii-art glow">
 _____ _____ ____  __  __ ___ _   _    _    _
|_   _| ____|  _ \\|  \\/  |_ _| \\ | |  / \\  | |
  | | |  _| | |_) | |\\/| || ||  \\| | / _ \\ | |
  | | | |___|  _ <| |  | || || |\\  |/ ___ \\| |___
  |_| |_____|_| \\_\\_|  |_|___|_| \\_/_/   \\_\\_____|
            </div>

            <div class="sysinfo">
                <p><span class="highlight">$</span> uname -a</p>
                <p>TerminalBlog 1.0.0 GNU/Linux UTF-8</p>
            </div>

            ${separator()}

            ${prompt('hacker', 'blog', 'cat ./welcome.txt')}
            <div class="output">
                <p style="color: var(--green);">${SITE_CONFIG ? SITE_CONFIG.welcomeMessage : '欢迎来到我的终端博客。这里用代码记录世界，用键盘书写思考。'}</p>
                <p style="color: var(--gray);">共 ${stats.totalPosts} 篇文章 · 上次更新: ${stats.lastUpdate || 'N/A'} · 运行天数: ${stats.uptime} 天</p>
            </div>

            <div class="nav-links">
                <a onclick="navigate('home')" class="active">[首页]</a>
                <a onclick="navigate('tags')">[标签]</a>
                <a onclick="openGuestUploadModal()">[上传]</a>
                <a onclick="navigate('admin')">[管理]</a>
            </div>

            ${separator('文章列表')}

            ${prompt('hacker', 'blog', 'ls -la ./posts/')}
            
            ${renderPostsScrollContainer({
                containerId: 'postsScrollContainer',
                viewportId: 'postsScrollViewport',
                viewportClass: 'home-posts-scroll-viewport',
                trackId: 'postsScrollTrack',
                progressBarId: 'progressBar',
                headerHtml: renderHomePostsHeader(),
                rowsHtml: renderPostList(posts.posts),
                paginationHtml: homeTotalPages > 1 ? renderPagination(currentPage, homeTotalPages) : ''
            })}

            ${separator('标签云')}

            ${prompt('hacker', 'blog', 'cat ./tags.json | head -n ' + HOME_TAGS_MAX_ROWS)}
            <div id="homeTags" class="tags-section">
                <span class="loading"></span>
            </div>

            ${separator('我的信息')}

            ${prompt('hacker', 'blog', 'whoami')}
            <div class="sysinfo">
                <p><span class="highlight">User:</span> <span id="clientUser">guest</span></p>
                <p id="clientIPRow" style="display:none;"><span class="highlight">IP:</span> <span id="clientIP">Loading...</span></p>
                <p id="clientBrowserRow" style="display:none;"><span class="highlight">Browser:</span> <span id="clientBrowser">Loading...</span></p>
                <p><span class="highlight">Time:</span> <span id="clientTime">Loading...</span></p>
            </div>

            ${separator('系统信息')}

            ${prompt('hacker', 'blog', 'neofetch')}
            <div class="sysinfo">
                <p><span class="warn">Storage:</span> FS</p>
                <p><span class="warn">Articles:</span> ${stats.totalPosts} posts</p>
            </div>

            ${separator()}

            <div class="prompt" style="margin-top: 16px;">
                <span class="user">hacker</span><span class="symbol">@</span><span class="path">blog</span><span class="symbol">:~$</span> <span class="cursor"></span>
            </div>
        `;

        window.totalPosts = posts.totalPosts;
        window.totalPages = homeTotalPages;
        window.homeStableViewportHeight = 0;

        // 初始化连续滚动分页
        initPostsScroll('home', currentPage, homeTotalPages);

        // Load tags asynchronously
        try {
            const tagsData = await apiGet('/tags');
            const tagsEl = document.getElementById('homeTags');
            if (tagsEl) {
                // 先渲染所有标签，然后动态计算精确行数
                tagsEl.innerHTML = tagsData.tags.map(function(t) {
                    return TagEffects.createTagDOM(t.fullTag || t.name, t.count);
                }).join('');
                
                // 使用 requestAnimationFrame 确保 DOM 已渲染，然后精确计算行数
                if (HOME_TAGS_MAX_ROWS > 0) {
                    requestAnimationFrame(function() {
                        requestAnimationFrame(function() {
                            limitHomeTagsRows(tagsEl, HOME_TAGS_MAX_ROWS);
                        });
                    });
                }
            }
        } catch (e) {
            const tagsEl = document.getElementById('homeTags');
            if (tagsEl) tagsEl.innerHTML = '<p class="error-text">标签加载失败</p>';
        }

        // Load client info asynchronously
        try {
            const clientInfo = await apiGet('/client-info');
            const userEl = document.getElementById('clientUser');
            const ipEl = document.getElementById('clientIP');
            const ipRow = document.getElementById('clientIPRow');
            const timeEl = document.getElementById('clientTime');
            const browserEl = document.getElementById('clientBrowser');
            const browserRow = document.getElementById('clientBrowserRow');

            if (userEl) userEl.textContent = clientInfo.username || 'guest';

            if (ipEl && ipRow) {
                if (clientInfo.ip) {
                    ipEl.textContent = clientInfo.ip;
                    ipRow.style.display = '';
                } else {
                    ipRow.style.display = 'none';
                }
            }

            if (timeEl) timeEl.textContent = clientInfo.time || 'N/A';

            if (browserEl && browserRow) {
                const ua = navigator.userAgent;
                if (ua) {
                    let browser = 'Unknown';
                    if (ua.includes('Firefox')) {
                        browser = 'Firefox ' + (ua.match(/Firefox\/(\d+)/) || ['', ''])[1];
                    } else if (ua.includes('Edg/')) {
                        browser = 'Edge ' + (ua.match(/Edg\/(\d+)/) || ['', ''])[1];
                    } else if (ua.includes('Chrome')) {
                        browser = 'Chrome ' + (ua.match(/Chrome\/(\d+)/) || ['', ''])[1];
                    } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
                        browser = 'Safari ' + (ua.match(/Version\/(\d+)/) || ['', ''])[1];
                    } else if (ua.includes('Opera') || ua.includes('OPR')) {
                        browser = 'Opera';
                    }
                    browserEl.textContent = browser;
                    browserRow.style.display = '';
                } else {
                    browserRow.style.display = 'none';
                }
            }
        } catch (e) {
            const ipRow = document.getElementById('clientIPRow');
            const timeEl = document.getElementById('clientTime');
            const browserRow = document.getElementById('clientBrowserRow');
            if (ipRow) ipRow.style.display = 'none';
            if (timeEl) timeEl.textContent = 'N/A';
            if (browserRow) browserRow.style.display = 'none';
        }
    }

    /**
     * 精确限制主页标签显示行数
     * @param {HTMLElement} container - 标签容器
     * @param {number} maxRows - 最大行数
     */
    function limitHomeTagsRows(container, maxRows) {
        var tagItems = container.querySelectorAll('.tag-item');
        if (!tagItems || tagItems.length === 0) return;
        
        var containerTop = container.getBoundingClientRect().top;
        var maxTop = containerTop + (maxRows * 30);  // 每行约 30px 高度
        
        for (var i = 0; i < tagItems.length; i++) {
            var itemTop = tagItems[i].getBoundingClientRect().top;
            
            // 当前标签已超出限制行数：隐藏它及之后所有标签
            if (itemTop >= maxTop) {
                for (var j = i; j < tagItems.length; j++) {
                    tagItems[j].style.display = 'none';
                }
                break;
            }
        }
    }

    // 格式化文章日期，如果是最近 N 天内则显示彩色流动效果
    function formatPostDate(dateStr) {
        if (!dateStr) return '<span style="color: var(--gray);">--</span>';
        
        // 从 SITE_CONFIG 读取配置天数，默认 7 天
        const recentDays = (typeof SITE_CONFIG !== 'undefined' && SITE_CONFIG.recentPostDays) ? SITE_CONFIG.recentPostDays : 7;
        
        try {
            // 解析文章日期（格式：YYYY/MM/DD 或 YYYY-MM-DD）
            const postDate = new Date(dateStr.replace(/\//g, '-'));
            const now = new Date();
            
            // 计算相差天数
            const diffTime = now - postDate;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays >= 0 && diffDays <= recentDays) {
                // 最近 N 天内：显示彩色流动文字效果
                return `<span class="recent-post-date">${dateStr}</span>`;
            }
        } catch (e) {}
        
        // 普通日期：灰色显示
        return `<span style="color: var(--gray);">${dateStr}</span>`;
    }

    function renderPostList(posts, options) {
        options = options || {};
        const isAdmin = options.isAdmin || false;

        if (!posts || posts.length === 0) {
            return '<div class="output"><p style="color: var(--gray);">暂无文章</p></div>';
        }

        let html = '';
        posts.forEach(post => {
            const lockIcon = post.locked ? '🔒 ' : '';
            if (isAdmin) {
                // 管理页：包含操作按钮
                const btnLabel = post.hidden ? '显示' : '隐藏';
                const btnColor = post.hidden ? 'var(--red)' : 'var(--green)';
                const lockBtnColor = post.locked ? 'var(--orange)' : 'var(--gray)';
                const lockLabel = post.locked ? '🔓' : '🔒';
                const hiddenTag = post.hidden ? '<span style="color: var(--yellow); font-size: 0.75em;">[隐藏]</span> ' : '';
                html += `<div class="ls-row posts-scroll-list-row">
                    <span class="admin-post-info-span">
                        ${hiddenTag}
                        <span class="admin-post-id">#${post.id}</span>
                        ${post.locked ? '<span class="admin-post-lock" style="color: var(--orange); font-size: 0.75em;"> 🔒</span>' : ''}
                        <a onclick="viewPost('${post.id}')">${escapeHtml(post.title)}</a>
                        <span class="admin-post-date">${formatPostDate(post.date)}</span>
                    </span>
                    <span class="admin-post-actions-span">
                        <button class="admin-btn admin-post-btn" onclick="editPost('${post.id}')" title="编辑" style="padding: 3px 6px; font-size: 0.8em;">✏️</button>
                        <button class="admin-btn admin-post-btn" onclick="toggleVisibility('${post.id}')" title="${btnLabel}" style="color: ${btnColor}; border-color: ${btnColor}; padding: 3px 6px; font-size: 0.8em;">${post.hidden ? '👁' : '👁️'}</button>
                        <button class="admin-btn admin-post-btn" onclick="showLockDialog('${post.id}', ${post.locked})" title="${post.locked ? '解锁' : '上锁'}" style="color: ${lockBtnColor}; border-color: ${lockBtnColor}; padding: 3px 6px; font-size: 0.8em;">${lockLabel}</button>
                    </span>
                </div>`;
            } else {
                // 主页：标准行
                html += `<div class="ls-row posts-scroll-list-row">
                    <span class="perm">${post.locked ? '🔒' : '-rw-r--r--'}</span>
                    <span class="size">${post.size || '---'}</span>
                    <span class="name"><a onclick="viewPost('${post.id}')">${lockIcon}${escapeHtml(post.title)}.md</a></span>
                    <span class="date-col">${formatPostDate(post.date)}</span>
                </div>`;
            }
        });

        return html;
    }

    // 首页/管理页共用的连续滚动列表外壳
    function renderPostsScrollContainer(config) {
        const headerBlock = config.headerHtml || '';
        const paginationBlock = config.paginationHtml || '';
        return `
            <div class="posts-scroll-container" id="${config.containerId}">
                ${headerBlock}
                <div class="posts-scroll-viewport ${config.viewportClass || ''}" id="${config.viewportId}">
                    <div class="posts-scroll-track" id="${config.trackId}">
                        ${config.rowsHtml}
                    </div>
                </div>
                <div class="posts-scroll-progress">
                    <div class="progress-bar" id="${config.progressBarId}"></div>
                </div>
            </div>
            ${paginationBlock}
        `;
    }

    function renderHomePostsHeader() {
        return `
            <div class="ls-output">
                <div class="ls-row header">
                    <span>权限</span>
                    <span>大小</span>
                    <span>文件名</span>
                    <span>日期</span>
                </div>
            </div>
        `;
    }

    function renderPagination(page, totalPages) {
        let html = '<div class="pagination">';
        html += `<div class="pagination-arrow ${page <= 1 ? 'disabled' : ''}" onclick="goPage(${page - 1})">◀</div>`;
        html += '<div class="pagination-scroll-container">';
        html += '<div class="pagination-track">';
        
        for (let i = 1; i <= totalPages; i++) {
            html += `<div class="pagination-page ${i === page ? 'active' : ''}" onclick="goPage(${i})">${i}</div>`;
        }
        
        html += '</div></div>';
        html += `<div class="pagination-arrow ${page >= totalPages ? 'disabled' : ''}" onclick="goPage(${page + 1})">▶</div>`;
        html += '</div>';
        
        // 页码渲染完成后，滚动到当前页
        setTimeout(() => scrollToActivePage(page), 50);
        
        return html;
    }
    
    function scrollToActivePage(page) {
        const track = document.querySelector('.pagination-track');
        const activePage = track?.querySelector('.pagination-page.active');
        if (track && activePage) {
            const trackWidth = track.offsetWidth;
            const pageLeft = activePage.offsetLeft;
            const pageWidth = activePage.offsetWidth;
            const scrollLeft = pageLeft - (trackWidth / 2) + (pageWidth / 2);
            track.style.scrollBehavior = 'smooth';
            track.scrollLeft = scrollLeft;
        }
    }
    
    // 初始化分页滑动功能（鼠标拖拽 + 滚轮支持）
    // 在 render 和 loadPostsPage 后调用
    function initPaginationScroll() {
        const track = document.querySelector('.pagination-track');
        if (!track) return;
        
        let isDown = false;
        let startX;
        let scrollLeft;
        
        // 鼠标拖拽支持
        track.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('pagination-page')) return; // 点击页码时不拖拽
            isDown = true;
            track.style.cursor = 'grabbing';
            startX = e.pageX - track.offsetLeft;
            scrollLeft = track.scrollLeft;
        });
        
        track.addEventListener('mouseleave', () => {
            isDown = false;
            track.style.cursor = 'grab';
        });
        
        track.addEventListener('mouseup', () => {
            isDown = false;
            track.style.cursor = 'grab';
        });
        
        track.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - track.offsetLeft;
            const walk = (x - startX) * 2; // 拖拽速度
            track.scrollLeft = scrollLeft - walk;
        });
        
        // 滚轮支持（将垂直滚轮转换为水平滚动）
        track.addEventListener('wheel', (e) => {
            if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
                e.preventDefault();
                track.scrollLeft += e.deltaY;
            }
        }, { passive: false });
        
        // 设置默认光标
        track.style.cursor = 'grab';
    }

    // 连续滚动分页相关变量
    window.postRowHeight = 0;
    window.postsScrollAnimating = false;
    window.adminRowHeight = 0;
    window.adminScrollAnimating = false;
    window.homeStableViewportHeight = 0;

    // 末行 border-bottom 预留缓冲，避免亚像素裁切导致分割线闪烁
    // 使用 Math.ceil 确保内容完全可见，不向下截断
    // 1px 缓冲可补偿亚像素渲染中 border-bottom 的潜在裁切
    const SCROLL_VIEWPORT_BORDER_BUFFER = 1;

    // 获取首页/管理页连续滚动上下文
    function getScrollContext(type) {
        if (type === 'admin') {
            return {
                viewportId: 'adminPostsScrollViewport',
                trackId: 'adminPostsScrollTrack',
                progressBarId: 'adminProgressBar',
                rowSelector: '.ls-row',
                useStableViewport: true,
                getPage: function() { return adminPage; },
                setPage: function(p) { adminPage = p; },
                getTotalPages: function() { return window.adminTotalPages || 1; },
                getTotalPosts: function() { return window.adminTotalPosts || 0; },
                getRowHeight: function() { return window.adminRowHeight || 0; },
                setRowHeight: function(h) { window.adminRowHeight = h; },
                isAnimating: function() { return window.adminScrollAnimating; },
                setAnimating: function(v) { window.adminScrollAnimating = v; },
                getStableViewportHeight: function() { return window.adminStableViewportHeight || 0; },
                setStableViewportHeight: function(h) { window.adminStableViewportHeight = h; },
                invalidateStableViewport: function() { window.adminStableViewportHeight = 0; },
                pageHandler: 'goAdminPage',
                updateUrl: false
            };
        }
        return {
            viewportId: 'postsScrollViewport',
            trackId: 'postsScrollTrack',
            progressBarId: 'progressBar',
            rowSelector: '.ls-row',
            useStableViewport: true,
            getPage: function() { return currentPage; },
            setPage: function(p) { currentPage = p; },
            getTotalPages: function() { return window.totalPages || 1; },
            getTotalPosts: function() { return window.totalPosts || 0; },
            getRowHeight: function() { return window.postRowHeight || 0; },
            setRowHeight: function(h) { window.postRowHeight = h; },
            isAnimating: function() { return window.postsScrollAnimating; },
            setAnimating: function(v) { window.postsScrollAnimating = v; },
            getStableViewportHeight: function() { return window.homeStableViewportHeight || 0; },
            setStableViewportHeight: function(h) { window.homeStableViewportHeight = h; },
            invalidateStableViewport: function() { window.homeStableViewportHeight = 0; },
            pageHandler: 'goPage',
            updateUrl: true
        };
    }

    // 获取每行在轨道内的布局度量（top + height，支持换行后的可变行高）
    function getRowLayoutMetrics(ctx) {
        const scrollTrack = document.getElementById(ctx.trackId);
        if (!scrollTrack) return [];

        return Array.from(scrollTrack.querySelectorAll(ctx.rowSelector)).map(function(row) {
            return {
                top: row.offsetTop,
                height: row.offsetHeight
            };
        });
    }

    // 计算指定页在视窗中应显示的行数
    function getPageRowCount(page, totalPosts) {
        if (totalPosts <= 0) return 1;
        const start = (page - 1) * POSTS_PER_PAGE;
        return Math.min(POSTS_PER_PAGE, Math.max(0, totalPosts - start));
    }

    // 计算指定页起始偏移量（向下取整，与视窗高度取整策略一致）
    function getPageRowOffset(page, metrics) {
        const start = (page - 1) * POSTS_PER_PAGE;
        if (!metrics.length || start >= metrics.length) return 0;
        return Math.floor(metrics[start].top);
    }

    // 计算指定页视窗内容高度（首尾行 DOM 位置差 + 末行边框缓冲）
    function getPageViewportHeight(page, metrics, totalPosts) {
        const start = (page - 1) * POSTS_PER_PAGE;
        const count = getPageRowCount(page, totalPosts);
        if (!metrics.length || count === 0) return 36;

        const end = Math.min(start + count, metrics.length) - 1;
        if (start > end) return 36;

        const first = metrics[start];
        const last = metrics[end];
        // 使用 Math.ceil 确保视窗高度足够容纳所有内容
        // 避免因亚像素向下取整（Math.round）导致底部被裁切
        return Math.ceil(last.top + last.height - first.top) + SCROLL_VIEWPORT_BORDER_BUFFER;
    }

    // 判断是否为满页（10 篇）
    function isFullPage(page, totalPosts) {
        return getPageRowCount(page, totalPosts) === POSTS_PER_PAGE;
    }

    // 按页码解析视窗高度：精确计算当前页所需高度
    // 不跨页取最大值，避免窗口压缩后行高差异导致显示超出设定行数
    function resolveViewportHeight(ctx, page, metrics) {
        const totalPosts = ctx.getTotalPosts();
        // 满页使用缓存高度（当前页精确值），消除满页之间切换时的高度跳动
        if (ctx.useStableViewport && isFullPage(page, totalPosts)) {
            if (!ctx.getStableViewportHeight()) {
                const h = getPageViewportHeight(page, metrics, totalPosts);
                if (h > 0) ctx.setStableViewportHeight(h);
            }
            if (ctx.getStableViewportHeight()) {
                return ctx.getStableViewportHeight();
            }
        }
        return getPageViewportHeight(page, metrics, totalPosts);
    }

    // 测量行高并设置视窗高度
    function measureScrollLayout(ctx, page, options) {
        options = options || {};
        const viewport = document.getElementById(ctx.viewportId);
        const metrics = getRowLayoutMetrics(ctx);
        if (!viewport || metrics.length === 0) return metrics;

        const targetPage = page !== undefined ? page : ctx.getPage();
        const avgHeight = metrics.reduce(function(sum, m) { return sum + m.height; }, 0) / metrics.length;
        ctx.setRowHeight(avgHeight);

        const height = resolveViewportHeight(ctx, targetPage, metrics);
        if (options.animateHeight) {
            viewport.style.transition = 'height ' + (options.duration || 0.3) + 's ease';
        } else {
            viewport.style.transition = 'none';
        }
        viewport.style.height = height + 'px';
        return metrics;
    }

    // 将文章轨道滚动到指定页（可选动画）
    function applyScrollPosition(ctx, page, animate, metrics) {
        const scrollTrack = document.getElementById(ctx.trackId);
        if (!scrollTrack) return;

        const layoutMetrics = metrics || getRowLayoutMetrics(ctx);
        if (layoutMetrics.length === 0) return;

        const offset = getPageRowOffset(page, layoutMetrics);
        scrollTrack.style.transition = animate
            ? 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
            : 'none';
        scrollTrack.style.transform = 'translateY(-' + offset + 'px)';
    }

    // 统一布局：测量视窗并定位到指定页
    function layoutScrollViewport(ctx, page, animate) {
        const metrics = measureScrollLayout(ctx, page);
        if (!metrics.length) return metrics;
        applyScrollPosition(ctx, page, animate, metrics);
        return metrics;
    }

    // 监听轨道尺寸变化（换行、缩放等），自动重新校准视窗
    function bindScrollResizeObserver(ctx) {
        const track = document.getElementById(ctx.trackId);
        if (!track || track._scrollResizeObserver) return;

        let observerTimer;
        const observer = new ResizeObserver(function() {
            if (ctx.isAnimating()) return;
            clearTimeout(observerTimer);
            observerTimer = setTimeout(function() {
                ctx.invalidateStableViewport();
                layoutScrollViewport(ctx, ctx.getPage(), false);
            }, 16);
        });
        observer.observe(track);
        track._scrollResizeObserver = observer;
    }

    // 更新进度条
    function updateProgressBar(page, total, progressBarId) {
        const progressBar = document.getElementById(progressBarId || 'progressBar');
        if (progressBar) {
            progressBar.style.width = ((page / total) * 100) + '%';
        }
    }

    // 更新分页箭头的禁用状态
    function updatePaginationArrows(page, totalPages, pageHandler) {
        const handler = pageHandler || 'goPage';
        const arrows = document.querySelectorAll('.pagination-arrow');
        if (arrows.length >= 2) {
            arrows[0].classList.toggle('disabled', page <= 1);
            arrows[0].setAttribute('onclick', handler + '(' + (page - 1) + ')');
            arrows[1].classList.toggle('disabled', page >= totalPages);
            arrows[1].setAttribute('onclick', handler + '(' + (page + 1) + ')');
        }
    }

    // 初始化连续滚动分页
    function initContinuousScroll(ctx, page, totalPages) {
        updateProgressBar(page, totalPages, ctx.progressBarId);
        initPaginationScroll();

        function doLayout() {
            layoutScrollViewport(ctx, page, false);
            bindScrollResizeObserver(ctx);
        }
        requestAnimationFrame(function() {
            requestAnimationFrame(doLayout);
        });
        // 字体与换行布局稳定后再次校准，消除部分页码半行裁切
        setTimeout(doLayout, 100);
    }

    function initPostsScroll(type, page, totalPages) {
        initContinuousScroll(getScrollContext(type), page, totalPages);
    }

    // 连续滚动切换到指定页（全量 DOM，仅移动视窗）
    function scrollToContinuousPage(ctx, targetPage) {
        const scrollTrack = document.getElementById(ctx.trackId);
        if (!scrollTrack) return;

        const total = ctx.getTotalPages();
        const current = ctx.getPage();
        if (targetPage < 1 || targetPage > total || targetPage === current) return;
        if (ctx.isAnimating()) return;

        const metrics = getRowLayoutMetrics(ctx);
        if (!metrics.length) return;

        const pageDiff = Math.abs(targetPage - current);
        const duration = Math.min(0.4 + pageDiff * 0.12, 1.0);
        const totalPosts = ctx.getTotalPosts();
        const viewport = document.getElementById(ctx.viewportId);
        const fromFull = isFullPage(current, totalPosts);
        const toFull = isFullPage(targetPage, totalPosts);

        ctx.setAnimating(true);

        if (ctx.updateUrl) {
            const url = new URL(window.location);
            url.searchParams.delete('view');
            url.searchParams.delete('tag');
            url.searchParams.set('page', targetPage);
            window.history.pushState({}, '', url);
        }

        // 满页 ↔ 满页：精确重新计算高度但禁用动画，避免跳动的同时保证内容正确
        // 涉及末页时平滑压缩/展开（带过渡动画）
        if (viewport) {
            ctx.invalidateStableViewport();
            const toHeight = resolveViewportHeight(ctx, targetPage, metrics);
            if (fromFull && toFull) {
                // 满页之间：无动画，高度瞬切（差异极小，肉眼不可见）
                viewport.style.transition = 'none';
            } else {
                // 涉及末页：平滑过渡
                viewport.style.transition = 'height ' + duration + 's cubic-bezier(0.4, 0, 0.2, 1)';
            }
            viewport.style.height = toHeight + 'px';
        }

        const offset = getPageRowOffset(targetPage, metrics);
        scrollTrack.style.transition = 'transform ' + duration + 's cubic-bezier(0.4, 0, 0.2, 1)';
        scrollTrack.style.transform = 'translateY(-' + offset + 'px)';

        ctx.setPage(targetPage);

        updateProgressBar(targetPage, total, ctx.progressBarId);

        const pageEls = document.querySelectorAll('.pagination-page');
        pageEls.forEach(function(el) { el.classList.remove('active'); });
        if (pageEls[targetPage - 1]) {
            pageEls[targetPage - 1].classList.add('active');
        }

        updatePaginationArrows(targetPage, total, ctx.pageHandler);
        scrollToActivePage(targetPage);

        let scrollFinished = false;
        function finishScroll() {
            if (scrollFinished) return;
            scrollFinished = true;
            scrollTrack.removeEventListener('transitionend', onTransitionEnd);
            layoutScrollViewport(ctx, targetPage, false);
            ctx.setAnimating(false);
        }
        function onTransitionEnd(e) {
            if (e.target !== scrollTrack || e.propertyName !== 'transform') return;
            finishScroll();
        }
        scrollTrack.addEventListener('transitionend', onTransitionEnd);
        setTimeout(finishScroll, duration * 1000 + 50);
    }

    // 窗口尺寸变化时重新测量行高与视窗
    if (!window._postsScrollResizeBound) {
        window._postsScrollResizeBound = true;
        let resizeTimer;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function() {
                if (document.getElementById('postsScrollTrack')) {
                    const homeCtx = getScrollContext('home');
                    homeCtx.invalidateStableViewport();
                    layoutScrollViewport(homeCtx, homeCtx.getPage(), false);
                }
                if (document.getElementById('adminPostsScrollTrack')) {
                    layoutScrollViewport(getScrollContext('admin'), getScrollContext('admin').getPage(), false);
                }
            }, 150);
        });
    }

    function scrollToPage(targetPage) {
        scrollToContinuousPage(getScrollContext('home'), targetPage);
    }

    function scrollToAdminPage(targetPage) {
        scrollToContinuousPage(getScrollContext('admin'), targetPage);
    }
    
    // 跳转到指定页码（带边界校验）
    function goPage(page) {
        scrollToPage(page);
    }

    function goAdminPage(page) {
        scrollToAdminPage(page);
    }

    async function loadAdminPosts() {
        const listEl = document.getElementById('adminPostList');
        if (!listEl) return;
        listEl.innerHTML = '<span class="loading"></span>';
        try {
            const meta = await apiGet('/posts?page=1&limit=1&admin=true');
            const posts = await apiGet(`/posts?page=1&limit=${Math.max(meta.totalPosts, 1)}&admin=true`);
            const adminTotalPages = Math.max(1, Math.ceil(posts.totalPosts / POSTS_PER_PAGE));
            if (adminPage > adminTotalPages) adminPage = adminTotalPages;
            if (adminPage < 1) adminPage = 1;

            window.adminTotalPosts = posts.totalPosts;
            window.adminTotalPages = adminTotalPages;
            window.adminRowHeight = 0;
            window.adminStableViewportHeight = 0;

            if (posts.posts.length === 0) {
                listEl.innerHTML = '<p style="color: var(--gray);">暂无文章</p>';
                return;
            }

            listEl.innerHTML = renderPostsScrollContainer({
                containerId: 'adminPostsScrollContainer',
                viewportId: 'adminPostsScrollViewport',
                viewportClass: 'admin-posts-scroll-viewport',
                trackId: 'adminPostsScrollTrack',
                progressBarId: 'adminProgressBar',
                rowsHtml: renderPostList(posts.posts, { isAdmin: true }),
                paginationHtml: adminTotalPages > 1
                    ? renderPagination(adminPage, adminTotalPages).replace(/goPage/g, 'goAdminPage')
                    : ''
            });

            initPostsScroll('admin', adminPage, adminTotalPages);
        } catch (e) {
            listEl.innerHTML = `<p class="error-text">加载失败: ${escapeHtml(e.message)}</p>`;
        }
    }

    async function renderPost(body) {
        // 检查重复文章 ID
        checkDuplicateIds();
        
        // currentSlug now always contains the post ID
        var post;
        try {
            // If post was previously unlocked, pass password to get full content
            var unlockPassword = unlockedPosts[currentSlug];
            if (unlockPassword) {
                post = await apiGet('/post/' + currentSlug, {
                    headers: { 'X-Unlock-Password': unlockPassword }
                });
            } else {
                post = await apiGet('/post/' + currentSlug);
            }
        } catch (err) {
            // Post not found, redirect to home
            showToast('文章不存在或已被删除', 'error');
            navigate('home');
            return;
        }

        // 已上锁且服务端未返回正文：弹出密码框（直接访问 /文章ID 也生效）
        if (post.locked && !post.content) {
            // setTitle(`${post.title} ~ blog`);
            // 去除 ~ blog 后缀
            setTitle(post.title);
            updatePostUrl(post.id || currentSlug);
            showLockPasswordPrompt(currentSlug, post.title);
            body.innerHTML = `
                ${prompt('hacker', 'blog', `cat ./posts/${currentSlug}.md`)}
                <div class="nav-links">
                    <a onclick="goBack()">[◀ 返回]</a>
                </div>
                <div class="post-detail" style="padding: 32px; text-align: center;">
                    <p style="color: var(--orange); font-size: 1.1em;">🔒 此文已上锁</p>
                    <p style="color: var(--gray); margin-top: 12px;">请输入解锁密码后查看正文。</p>
                </div>
            `;
            return;
        }

        // setTitle(`${post.title} ~ blog`);
        // 去除 ~ blog 后缀
        setTitle(post.title);
        document.getElementById('statusMode').textContent = 'INSERT';

        // 使用标签特效模块渲染标签
        const tags = (post.tags || []).map(t => TagEffects.createPostTagDOM(t)).join(' · ');
        const postId = post.id || '';
        const shareUrl = postId ? `${window.location.origin}/${postId}` : '';

        // Update browser URL to /<ID>/
        updatePostUrl(postId);

        body.innerHTML = `
            ${prompt('hacker', 'blog', `cat ./posts/${postId}.md`)}

            <div class="nav-links">
                <a onclick="goBack()">[◀ 返回]</a>
                <a onclick="navigate('tags')">[标签]</a>
                ${shareUrl ? `<a onclick="var self=this; copyTextToClipboard('${shareUrl}').then(function(){ self.textContent='[✓ 已复制链接]'; setTimeout(function(){ self.textContent='[📋 复制分享链接]' }, 1500); }).catch(function(){ showToast('复制失败', 'error'); });" style="color: var(--yellow);">[📋 复制分享链接]</a>` : ''}
            </div>

            <div class="post-detail">
                <div class="file-header">
                    <span class="filename">${postId}.md</span>
                    <span class="lang">ID: ${postId}${post.locked ? ' 🔒' : ''}</span>
                </div>
                <div class="file-body">
                    <h2 class="glow"># ${escapeHtml(post.title)}</h2>
                    <div class="meta-line">
                        ${tags}${tags ? ' · ' : ''}发表于 <span class="date-highlight">${post.date || 'N/A'}</span> · 阅读约 ${post.readTime || '?'} 分钟
                        ${shareUrl ? ` · <span style="color: var(--purple);">🔗 ${shareUrl}</span>` : ''}
                    </div>
                    <div class="post-content">
                        ${parseMarkdown(post.content || '')}
                    </div>
                </div>
            </div>

            ${separator()}

            <div class="prompt" style="margin-top: 16px;">
                <span class="user">hacker</span><span class="symbol">@</span><span class="path">blog</span><span class="symbol">:~$</span> <span class="cursor"></span>
            </div>
        `;
    }

    async function renderTagPosts(body) {
        // setTitle(`${currentTag || '全部标签'} ~ blog`);
        // 去除 ~ blog 后缀
        setTitle(currentTag || '全部标签');
        document.getElementById('statusMode').textContent = 'NORMAL';

        const posts = await apiGet(`/posts?tag=${encodeURIComponent(currentTag || '')}&page=${currentPage}&limit=${POSTS_PER_PAGE}`);

        body.innerHTML = `
            ${prompt('hacker', 'blog', `grep -r "${escapeHtml(currentTag)}" ./posts/`)}

            <div class="nav-links">
                <a onclick="navigate('home')">[首页]</a>
                <a onclick="navigate('tags')" class="active">[标签]</a>
                <a onclick="openGuestUploadModal()">[上传]</a>
                <a onclick="navigate('admin')">[管理]</a>
            </div>

            ${separator(`标签: ${currentTag}`)}

            ${renderPostList(posts.posts)}

            ${posts.totalPages > 1 ? renderPagination(posts.page, posts.totalPages) : ''}

            ${separator()}

            <div class="prompt" style="margin-top: 16px;">
                <span class="user">hacker</span><span class="symbol">@</span><span class="path">blog</span><span class="symbol">:~$</span> <span class="cursor"></span>
            </div>
        `;
    }

    async function renderTags(body) {
        // setTitle('tags ~ blog');
        // 去除 ~ blog 后缀
        setTitle('tags');
        document.getElementById('statusMode').textContent = 'NORMAL';

        const tagsData = await apiGet('/tags');

        // 将标签数据存储到全局变量，供搜索功能使用
        window.tagsData = tagsData.tags;

        // 构建三层隔离结构的标签 HTML
        // 结构: .tag-layout-box (动画层) > .tag-effect-hub (特效层) > .tag-item (原始标签)
        let tagsHtml = tagsData.tags.map((t, index) => {
            const fullTag = t.fullTag || t.name;
            const cleanName = TagEffects.getCleanTagName(fullTag);
            const tagDOM = TagEffects.createTagDOM(fullTag, t.count);
            // 三层隔离结构，确保动画层不影响特效层
            return `<div class="tag-layout-box" data-tag="${escapeHtml(fullTag)}" data-tag-name="${cleanName.toLowerCase()}">
                        <div class="tag-effect-hub">${tagDOM}</div>
                    </div>`;
        }).join('');

        body.innerHTML = `
            ${prompt('hacker', 'blog', 'cat ./tags.json')}

            <div class="nav-links">
                <a onclick="navigate('home')">[首页]</a>
                <a onclick="navigate('tags')" class="active">[标签]</a>
                <a onclick="openGuestUploadModal()">[上传]</a>
                <a onclick="navigate('admin')">[管理]</a>
            </div>

            ${separator('全部标签')}

            <div class="tag-search-wrapper">
                <input type="text" 
                       class="tag-search-input" 
                       id="tagSearchInput"
                       placeholder="搜索标签..."
                       autocomplete="off" />
            </div>

            <div class="tags-section terminal-tags-container tags-active" id="tagsContainer">
                ${tagsHtml || '<p style="color: var(--gray);">暂无标签</p>'}
            </div>

            ${separator()}

            <div class="prompt" style="margin-top: 16px;">
                <span class="user">hacker</span><span class="symbol">@</span><span class="path">blog</span><span class="symbol">:~$</span> <span class="cursor"></span>
            </div>
        `;

        // 初始化标签搜索功能
        initTagSearch();
    }

    // 标签搜索功能初始化 - 使用 requestAnimationFrame 节流
    function initTagSearch() {
        const input = document.getElementById('tagSearchInput');
        const container = document.getElementById('tagsContainer');
        
        if (!input || !container || !window.tagsData) return;

        let searchTimer = null;
        
        // 使用 rAF 节流，确保每帧只计算一次过滤
        input.addEventListener('input', function(e) {
            if (searchTimer) cancelAnimationFrame(searchTimer);
            
            searchTimer = requestAnimationFrame(function() {
                doLiveTagSearch(e.target.value, container);
            });
        });

        // 动态添加/移除 will-change 优化性能
        input.addEventListener('focus', function() {
            container.classList.add('tags-active');
        });

        let willChangeTimeout;
        input.addEventListener('blur', function() {
            // 延迟移除 will-change，让动画完成后再移除
            clearTimeout(willChangeTimeout);
            willChangeTimeout = setTimeout(function() {
                container.classList.remove('tags-active');
            }, 2000);
        });
    }

    /**
     * 实时索引过滤核心函数 - 读写分离优化版本
     * @param {string} keyword - 搜索关键字
     * @param {HTMLElement} container - 标签父容器
     */
    function doLiveTagSearch(keyword, container) {
        const items = Array.from(container.querySelectorAll('.tag-layout-box'));
        if (items.length === 0) return;

        const cleanKeyword = keyword.toLowerCase().trim();

        // ----------------------------------------------------
        // STEP 1: FIRST - 批量读取当前可见标签的位置 (避免读写交替引发重排)
        // ----------------------------------------------------
        const firstStates = items.map(function(item) {
            const isVisible = !item.classList.contains('is-hidden');
            return {
                element: item,
                isVisible: isVisible,
                rect: isVisible ? item.getBoundingClientRect() : null
            };
        });

        // ----------------------------------------------------
        // STEP 2: STATE CHANGE - 批量写入变更状态
        // ----------------------------------------------------
        items.forEach(function(item) {
            const rawTagData = item.getAttribute('data-tag') || '';
            const tagName = rawTagData.split('::')[0].toLowerCase();

            if (tagName.includes(cleanKeyword) || cleanKeyword === '') {
                // 匹配成功：确保可见
                item.classList.remove('is-hidden', 'is-exiting');
            } else {
                // 匹配失败：立即脱离布局
                item.classList.add('is-hidden');
            }
        });

        // ----------------------------------------------------
        // STEP 3: 处理空结果提示 - 黑客风格
        // ----------------------------------------------------
        let visibleCount = items.filter(function(item) {
            return !item.classList.contains('is-hidden');
        }).length;

        let noResultMsg = container.querySelector('.terminal-no-results');
        if (visibleCount === 0 && cleanKeyword !== '') {
            if (!noResultMsg) {
                noResultMsg = document.createElement('div');
                noResultMsg.className = 'terminal-no-results';
                noResultMsg.innerHTML = `<span class="error-bracket">[ERROR]</span> Keyword "<span class="search-keyword">${escapeHtml(cleanKeyword)}</span>" not found in core database.<span class="blink-cursor">_</span>`;
                container.appendChild(noResultMsg);
            } else {
                noResultMsg.querySelector('.search-keyword').textContent = cleanKeyword;
            }
        } else if (noResultMsg) {
            noResultMsg.remove();
        }

        // ----------------------------------------------------
        // STEP 4: LAST & INVERT - 批量读取新位置，并计算差值进行"瞬移反转"
        // ----------------------------------------------------
        // 关闭所有过渡动画，确保读取的是干净的最后一帧物理坐标
        items.forEach(function(item) {
            item.style.transition = 'none';
            item.style.transform = '';
        });

        // 强制浏览器重绘
        container.offsetHeight;

        firstStates.forEach(function(first) {
            // 如果之前不可见，或者现在被隐藏了，不需要参与平滑移动
            if (!first.isVisible || first.element.classList.contains('is-hidden')) return;

            const lastRect = first.element.getBoundingClientRect();
            const deltaX = first.rect.left - lastRect.left;
            const deltaY = first.rect.top - lastRect.top;

            if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
                // 瞬移回起点（Invert）
                first.element.style.transform = 'translate(' + deltaX + 'px, ' + deltaY + 'px)';
            }
        });

        // ----------------------------------------------------
        // STEP 5: PLAY - 使用 double rAF 确保浏览器已经渲染了 Invert 状态
        // ----------------------------------------------------
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                firstStates.forEach(function(first) {
                    const item = first.element;
                    if (item.classList.contains('is-hidden')) return;

                    // 恢复 CSS 中的标准弹性过渡动画
                    item.style.transition = '';
                    // 清空 transform，使其平滑地滑行到 Flex 布局计算出的新终点
                    item.style.transform = '';
                });
            });
        });
    }

    async function renderAdmin(body) {
        // setTitle('admin ~ blog');
        // 去除 ~ blog 后缀
        setTitle('admin');
        document.getElementById('statusMode').textContent = 'ADMIN';

        // Check if logged in
        const authenticated = await checkAuth();

        if (!authenticated) {
            // Show login form
            body.innerHTML = `
                ${prompt('hacker', 'blog', 'sudo ./admin-panel')}

                <div class="nav-links">
                    <a onclick="navigate('home')">[首页]</a>
                    <a onclick="navigate('tags')">[标签]</a>
                    <a onclick="navigate('admin')" class="active">[管理]</a>
                </div>

                ${separator('身份验证')}

                <div class="ascii-art" style="font-size: 0.6em; line-height: 1.3;">
 ╔╗ ╦  ╔═╗╔═╗   ╔╦╗╔═╗╔╗╔╔═╗╔═╗╔═╗
 ╠╩╗║  ║ ║║ ╦   ║║║╠═╣║║║╠═╣║ ╦║╣
 ╚═╝╩═╝╚═╝╚═╝   ╩ ╩╩ ╩╝╚╝╩ ╩╚═╝╚═╝
                </div>

                <div class="output">
                    <p style="color: var(--yellow);">⚠ 需要管理员身份验证才能访问管理面板</p>
                    <p style="color: var(--gray); font-size: 0.8em;">请输入管理员帐号和密码以继续</p>
                </div>

                <div class="admin-section" style="max-width: 400px;">
                    <label>用户名</label>
                    <input type="text" id="loginUser" placeholder="admin"
                           onkeydown="if(event.key==='Enter') document.getElementById('loginPass').focus()" />

                    <label>密码</label>
                    <input type="password" id="loginPass" placeholder="••••••••"
                           onkeydown="if(event.key==='Enter') doLogin()" />

                    <div style="margin-top: 12px;">
                        <button class="admin-btn" onclick="doLogin()">🔑 登录</button>
                    </div>
                </div>

                ${separator()}

                <div class="prompt" style="margin-top: 16px;">
                    <span class="user">hacker</span><span class="symbol">@</span><span class="path">blog</span><span class="symbol">:~$</span> <span class="cursor"></span>
                </div>
            `;
            return;
        }

        // Show admin panel (authenticated)
        body.innerHTML = `
            ${prompt('hacker', 'blog', 'sudo ./admin-panel')}

            <div class="nav-links">
                <a onclick="navigate('home')">[首页]</a>
                <a onclick="navigate('tags')">[标签]</a>
                <a onclick="openFileManager()">[文件管理]</a>
                <a onclick="openGitSyncModal()">[远程仓库]</a>
                <a onclick="doLogout()" style="color: var(--red);" class="nav-break">[退出登录]</a>
            </div>

            ${separator('博客管理面板')}

            <div class="output">
                <p style="color: var(--green);">✅ 已登录为: <span style="color: var(--cyan);">${escapeHtml(authUser || 'admin')}</span></p>
            </div>

            <div class="admin-section">
                <input type="hidden" id="adminId" />

                <label>标题</label>
                <input type="text" id="adminTitle" placeholder="文章标题" />

                <label>标签 (逗号分隔，如: 技术,教程,Linux)</label>
                <input type="text" id="adminTags" placeholder="技术, 教程" />

                <label style="position: relative;">内容 (Markdown 格式)
                    <span id="fullscreenBtn" onclick="toggleFullscreen()" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); cursor: pointer; color: var(--gray); font-size: 1.2em; padding: 4px;" onmouseover="this.style.color='var(--green)'" onmouseout="this.style.color='var(--gray)'">⛶</span>
                </label>
                <textarea id="adminContent" placeholder="# 我的文章标题\n\n文章内容..." style="padding-right: 40px;"></textarea>

                <div style="margin-top: 12px; display: flex; gap: 12px;">
                    <button class="admin-btn cyan" onclick="previewPost()">👁️ 预览</button>
                    <button class="admin-btn" onclick="savePost()">💾 发布</button>
                    <button class="admin-btn danger" onclick="deletePost()">🗑️ 删除</button>
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin: 16px 0;">
                <div style="color: var(--gray-dim); font-size: 0.85em;"># ${'─'.repeat(4)} 已有文章 ${'─'.repeat(15)}</div>
                <div style="display: flex; gap: 8px;">
                    <button class="admin-btn" style="padding: 4px 10px; font-size: 0.75em; color: var(--cyan); border-color: var(--cyan);" onclick="document.getElementById('importFile').click()" title="导入">↙️</button>
                    <button class="admin-btn" style="padding: 4px 10px; font-size: 0.75em;" onclick="exportPosts()" title="导出">↗️</button>
                    <input type="file" id="importFile" accept=".zip,.md,.tar,.gz" style="display:none;" onchange="importPosts(event)" />
                </div>
            </div>

            <div id="adminPostList">
                <span class="loading"></span>
            </div>

            ${separator()}

            <div class="prompt" style="margin-top: 16px;">
                <span class="user">hacker</span><span class="symbol">@</span><span class="path">blog</span><span class="symbol">:~$</span> <span class="cursor"></span>
            </div>
        `;

        // Load posts for admin (paginated)
        loadAdminPosts();
    }

    async function savePost() {
        const title = document.getElementById('adminTitle').value.trim();
        const tags = document.getElementById('adminTags').value.trim();
        const content = document.getElementById('adminContent').value;
        const id = document.getElementById('adminId').value.trim();

        if (!title || !content) {
            showToast('[ERROR] 标题和内容不能为空', 'error');
            return;
        }

        const postData = {
            title,
            tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
            content
        };

        try {
            let result;
            if (id) {
                // Update existing post
                result = await apiPut('/post/' + id, postData);
                showToast('✅ ' + (result.message || '更新成功'), 'success');
            } else {
                // Create new post
                result = await apiPost('/post', postData);
                showToast('✅ ' + (result.message || '保存成功') + ' (ID: ' + result.id + ')', 'success');
            }
            // Refresh admin post list
            navigate('admin');
        } catch (err) {
            showToast('[ERROR] ' + escapeHtml(err.message), 'error');
        }
    }

    async function deletePost() {
        const id = document.getElementById('adminId').value.trim();

        if (!id) {
            showToast('[ERROR] 请先在列表中选择要删除的文章', 'error');
            return;
        }

        showToast('确认删除文章 ID "' + id + '"？', 'info', [
            { label: '确认', confirm: true, action: function() { doDeletePost(id); } },
            { label: '取消', action: function() {} }
        ]);
    }

    async function doDeletePost(id) {
        try {
            const result = await apiDelete('/post/' + id);
            showToast('✅ ' + (result.message || '删除成功'), 'success');
            // Clear form and refresh
            document.getElementById('adminId').value = '';
            document.getElementById('adminTitle').value = '';
            document.getElementById('adminTags').value = '';
            document.getElementById('adminContent').value = '';
            navigate('admin');
        } catch (err) {
            showToast('[ERROR] ' + escapeHtml(err.message), 'error');
        }
    }

    // View post - check if locked first, show password prompt if needed
    async function viewPost(id) {
        try {
            const post = await apiGet('/post/' + id);
            if (post.locked) {
                showLockPasswordPrompt(id, post.title);
            } else {
                navigate('post', id);
            }
        } catch (err) {
            showToast('[ERROR] ' + escapeHtml(err.message), 'error');
        }
    }

    // Lock password prompt overlay
    function showLockPasswordPrompt(id, title) {
        var overlay = document.createElement('div');
        overlay.className = 'preview-overlay';
        overlay.id = 'lockOverlay';
        overlay.innerHTML =
            '<div class="terminal" style="margin: 30px auto; max-width: 400px;">' +
                '<div class="title-bar">' +
                    '<div class="dot red"></div>' +
                    '<div class="dot yellow"></div>' +
                    '<div class="dot green"></div>' +
                    '<div class="title">🔒 文章已锁定</div>' +
                '</div>' +
                '<div class="term-body">' +
                    '<p style="color: var(--yellow); margin-bottom: 16px;">🔒 <strong>' + escapeHtml(title) + '</strong> 已锁定</p>' +
                    '<p style="color: var(--gray); margin-bottom: 16px;">请输入解锁密码</p>' +
                    '<input type="text" id="lockPasswordInput" placeholder="输入密码..." ' +
                        'style="width: 100%; background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 8px 12px; border-radius: 4px; font-family: inherit; margin-bottom: 12px;" ' +
                        'onfocus="this.removeAttribute(\'readonly\'); this.value = \'\'; this.type = \'password\'" readonly ' +
                        'onkeydown="if(event.key===\'Enter\') verifyLockPassword()" />' +
                    '<div style="display: flex; gap: 8px;">' +
                        '<button onclick="verifyLockPassword()" style="background: var(--bg-header); color: var(--green); border: 1px solid var(--green); padding: 8px 16px; border-radius: 4px; font-family: inherit; cursor: pointer;">解锁</button>' +
                        '<button onclick="closeLockPrompt()" style="background: var(--bg-header); color: var(--gray); border: 1px solid var(--border); padding: 8px 16px; border-radius: 4px; font-family: inherit; cursor: pointer;">取消</button>' +
                    '</div>' +
                '</div>' +
            '</div>';
        document.body.appendChild(overlay);
        window.lockPostId = id;
        // Focus and clear
        setTimeout(function() {
            var input = document.getElementById('lockPasswordInput');
            if (input) {
                input.removeAttribute('readonly');
                input.value = '';
                input.type = 'password';
                input.focus();
            }
        }, 100);
    }

    function closeLockPrompt() {
        var overlay = document.getElementById('lockOverlay');
        if (overlay) overlay.remove();
        window.lockPostId = null;
    }

    async function verifyLockPassword() {
        var password = document.getElementById('lockPasswordInput').value;
        var id = window.lockPostId;
        if (!id || !password) return;

        try {
            var res = await fetch('/api/post/' + id + '/verify-lock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: password })
            });
            var data = await res.json();
            if (data.valid) {
                // Mark post as unlocked in session storage
                unlockedPosts[id] = password;
                sessionStorage.setItem('unlocked_posts', JSON.stringify(unlockedPosts));
                closeLockPrompt();
                navigate('post', id);
            } else {
                showToast('❌ 密码错误', 'error');
            }
        } catch (err) {
            showToast('[ERROR] ' + err.message, 'error');
        }
    }

    // Show lock dialog or directly unlock
    function showLockDialog(id, isLocked) {
        if (isLocked) {
            // Directly unlock without confirmation
            unlockPost(id);
        } else {
            // Show lock password input
            var overlay = document.createElement('div');
            overlay.className = 'preview-overlay';
            overlay.id = 'lockDialogOverlay';
            overlay.innerHTML =
                '<div class="terminal" style="margin: 30px auto; max-width: 400px;">' +
                    '<div class="title-bar">' +
                        '<div class="dot red"></div>' +
                        '<div class="dot yellow"></div>' +
                        '<div class="dot green"></div>' +
                        '<div class="title">🔒 设置文章密码</div>' +
                    '</div>' +
                    '<div class="term-body">' +
                        '<p style="color: var(--yellow); margin-bottom: 16px;">设置解锁密码</p>' +
                        '<input type="text" id="lockNewPassword" placeholder="输入密码..." ' +
                            'style="width: 100%; background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 8px 12px; border-radius: 4px; font-family: inherit; margin-bottom: 12px;" ' +
                            'onfocus="this.removeAttribute(\'readonly\'); this.value = \'\'; this.type = \'password\'" readonly />' +
                        '<input type="text" id="lockNewPasswordConfirm" placeholder="确认密码..." ' +
                            'style="width: 100%; background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 8px 12px; border-radius: 4px; font-family: inherit; margin-bottom: 12px;" ' +
                            'onfocus="this.removeAttribute(\'readonly\'); this.value = \'\'; this.type = \'password\'" readonly />' +
                        '<div style="display: flex; gap: 8px;">' +
                            '<button onclick="lockPost(' + id + ')" style="background: var(--bg-header); color: var(--orange); border: 1px solid var(--orange); padding: 8px 16px; border-radius: 4px; font-family: inherit; cursor: pointer;">上锁</button>' +
                            '<button onclick="closeLockDialog()" style="background: var(--bg-header); color: var(--gray); border: 1px solid var(--border); padding: 8px 16px; border-radius: 4px; font-family: inherit; cursor: pointer;">取消</button>' +
                        '</div>' +
                    '</div>' +
                '</div>';
            document.body.appendChild(overlay);
            // Focus first input
            setTimeout(function() {
                var input = document.getElementById('lockNewPassword');
                if (input) {
                    input.removeAttribute('readonly');
                    input.value = '';
                    input.type = 'password';
                    input.focus();
                }
            }, 100);
        }
    }

    function closeLockDialog() {
        var overlay = document.getElementById('lockDialogOverlay');
        if (overlay) overlay.remove();
    }

    async function lockPost(id) {
        var password = document.getElementById('lockNewPassword').value;
        var confirm = document.getElementById('lockNewPasswordConfirm').value;

        if (!password) {
            showToast('请输入密码', 'error');
            return;
        }
        if (password !== confirm) {
            showToast('两次密码不一致', 'error');
            return;
        }

        try {
            var res = await apiPost('/post/' + id + '/lock', { password: password });
            showToast('✅ 文章已上锁', 'success');
            closeLockDialog();
            loadAdminPosts();
        } catch (err) {
            showToast('[ERROR] ' + err.message, 'error');
        }
    }

    async function unlockPost(id) {
        try {
            var res = await apiPost('/post/' + id + '/unlock', {});
            showToast('✅ 文章已解锁', 'success');
            loadAdminPosts();
        } catch (err) {
            showToast('[ERROR] ' + err.message, 'error');
        }
    }

    async function editPost(id) {
        try {
            // For admin users, fetch full content even for locked posts
            const post = await apiGet('/post/' + id, {
                headers: authToken ? { 'Authorization': 'Bearer ' + authToken } : {}
            });
            document.getElementById('adminId').value = post.id || '';
            document.getElementById('adminTitle').value = post.title || '';
            document.getElementById('adminTags').value = (post.tags || []).join(', ');
            document.getElementById('adminContent').value = post.content || '';
            showToast('📝 已加载文章: ' + escapeHtml(post.title), 'info');
            window.scrollTo(0, 0);
        } catch (err) {
            showToast('[ERROR] ' + escapeHtml(err.message), 'error');
        }
    }

    // ============ Preview Post ============
    function previewPost() {
        var id = document.getElementById('adminId').value.trim();
        var title = document.getElementById('adminTitle').value.trim() || '未命名文章';
        var tagsStr = document.getElementById('adminTags').value.trim();
        var content = document.getElementById('adminContent').value || '';
        var tags = tagsStr ? tagsStr.split(',').map(function(t) { return t.trim(); }).filter(Boolean) : [];
        var htmlContent = parseMarkdown(content);
        var today = new Date().toISOString().split('T')[0];
        var readTime = Math.max(1, Math.ceil(content.length / 500));
        // 预览页使用无点击的标签渲染
        var tagsHtml = tags.map(function(t) { return TagEffects.createPostTagDOMPreview(t); }).join(' · ');
        var displayId = id || 'new';

        var overlay = document.createElement('div');
        overlay.className = 'preview-overlay';
        overlay.id = 'previewOverlay';
        overlay.innerHTML =
            '<div class="terminal" style="margin: 0 auto;">' +
                '<div class="title-bar">' +
                    '<div class="dot red"></div>' +
                    '<div class="dot yellow"></div>' +
                    '<div class="dot green"></div>' +
                    '<div class="title">预览模式 ~ ' + escapeHtml(title) + '</div>' +
                '</div>' +
                '<div class="term-body">' +
                    prompt('hacker', 'blog', 'cat ./posts/' + displayId + '.md') +
                    '<div class="nav-links">' +
                        '<a onclick="closePreview()" style="color: var(--cyan);">[◀ 返回编辑]</a>' +
                        '<span style="color: var(--yellow); font-size: 0.85em;">⬆ 这是预览模式，文章尚未发布</span>' +
                    '</div>' +
                    '<div class="post-detail">' +
                        '<div class="file-header">' +
                            '<span class="filename">' + displayId + '.md</span>' +
                            '<span class="lang">预览</span>' +
                        '</div>' +
                        '<div class="file-body">' +
                            '<h2 class="glow"># ' + escapeHtml(title) + '</h2>' +
                            '<div class="meta-line">' +
                                tagsHtml + (tagsHtml ? ' · ' : '') +
                                '发表于 <span class="date-highlight">' + today + '</span>' +
                                ' · 阅读约 ' + readTime + ' 分钟' +
                            '</div>' +
                            '<div class="post-content">' +
                                (htmlContent || '<p style="color: var(--gray);">暂无内容</p>') +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    separator() +
                    '<div class="prompt" style="margin-top: 16px;">' +
                        '<span class="user">hacker</span><span class="symbol">@</span><span class="path">blog</span><span class="symbol">:~$</span> <span class="cursor"></span>' +
                    '</div>' +
                '</div>' +
                '<div class="status-bar">' +
                    '<div><span class="branch">⎇ main</span> · TerminalBlog</div>' +
                    '<div><span class="mode" style="color: var(--yellow);">PREVIEW</span> · utf-8 · markdown</div>' +
                '</div>' +
            '</div>';

        document.body.appendChild(overlay);
        overlay.scrollTop = 0;
    }

    function closePreview() {
        var overlay = document.getElementById('previewOverlay');
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
    }

    // ============ Fullscreen Editor ============
    function toggleFullscreen() {
        var existingOverlay = document.getElementById('fullscreenOverlay');
        if (existingOverlay) {
            // Exit fullscreen - restore content
            var textarea = document.getElementById('adminContent');
            var fullscreenTextarea = document.getElementById('fullscreenTextarea');
            if (textarea && fullscreenTextarea) {
                textarea.value = fullscreenTextarea.value;
            }
            document.body.removeChild(existingOverlay);
            return;
        }

        // Enter fullscreen
        var textarea = document.getElementById('adminContent');
        var content = textarea ? textarea.value : '';

        var overlay = document.createElement('div');
        overlay.className = 'fullscreen-overlay';
        overlay.id = 'fullscreenOverlay';
        overlay.innerHTML =
            '<div class="fullscreen-container">' +
                '<div class="fullscreen-header">' +
                    '<span>📝 全屏编辑模式 - 按 Esc 或点击退出</span>' +
                    '<button onclick="toggleFullscreen()">✕ 退出</button>' +
                '</div>' +
                '<textarea id="fullscreenTextarea" placeholder="# 文章内容...">' + escapeHtml(content) + '</textarea>' +
            '</div>';

        document.body.appendChild(overlay);

        // Focus textarea
        setTimeout(function() {
            var ta = document.getElementById('fullscreenTextarea');
            if (ta) {
                ta.focus();
                // Move cursor to end
                ta.selectionStart = ta.selectionEnd = ta.value.length;
            }
        }, 100);

        // Handle Escape key
        document.addEventListener('keydown', exitFullscreenOnEscape);
    }

    function exitFullscreenOnEscape(e) {
        if (e.key === 'Escape') {
            toggleFullscreen();
            document.removeEventListener('keydown', exitFullscreenOnEscape);
        }
    }

    // ============ Toggle Visibility ============
    async function toggleVisibility(id) {
        try {
            const result = await apiPost('/post/' + id + '/toggle', {});
            showToast('✅ 状态已切换', 'success');
            loadAdminPosts();
        } catch (err) {
            showToast('[ERROR] ' + err.message, 'error');
        }
    }

