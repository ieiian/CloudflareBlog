#!/usr/bin/env node
// ============================================================
// Terminal Blog - local Node.js server with MySQL storage
// ============================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const mysql = require('mysql2/promise');

const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const htmlPath = path.join(publicDir, 'index.html');
const apiPath = path.join(publicDir, '_worker.api.js');
const envPath = path.join(rootDir, '.env');

function loadEnv(filePath) {
    if (!fs.existsSync(filePath)) return;
    const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const idx = trimmed.indexOf('=');
        if (idx < 0) continue;
        const key = trimmed.slice(0, idx).trim();
        let value = trimmed.slice(idx + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = value;
    }
}

loadEnv(envPath);

const port = parseInt(process.env.PORT || '8788', 10);
const host = process.env.HOST || '0.0.0.0';
const firstPostId = parseInt(process.env.MYSQL_FIRST_POST_ID || '10001', 10);

function readHtml() {
    return fs.readFileSync(htmlPath, 'utf-8');
}

function toDateString(value) {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString().split('T')[0];
    return String(value).split('T')[0];
}

class MySQLBlogDB {
    constructor(pool) {
        this.pool = pool;
    }

    async init() {
        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS posts (
                id INT NOT NULL AUTO_INCREMENT,
                title VARCHAR(255) NOT NULL,
                content LONGTEXT NOT NULL,
                html_content LONGTEXT NOT NULL,
                post_date DATE NOT NULL,
                read_time INT NOT NULL DEFAULT 1,
                size VARCHAR(32) NOT NULL DEFAULT '0.0 KB',
                content_length INT NOT NULL DEFAULT 0,
                hidden TINYINT(1) NOT NULL DEFAULT 1,
                locked TINYINT(1) NOT NULL DEFAULT 0,
                lock_password VARCHAR(255) NOT NULL DEFAULT '',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                INDEX idx_posts_date (post_date),
                INDEX idx_posts_hidden (hidden)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=${firstPostId}
        `);
        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS post_tags (
                post_id INT NOT NULL,
                tag VARCHAR(128) NOT NULL,
                PRIMARY KEY (post_id, tag),
                INDEX idx_post_tags_tag (tag),
                CONSTRAINT fk_post_tags_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS sessions (
                token VARCHAR(128) NOT NULL,
                username VARCHAR(128) NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME NOT NULL,
                PRIMARY KEY (token),
                INDEX idx_sessions_expires (expires_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
    }

    async pruneSessions() {
        await this.pool.execute('DELETE FROM sessions WHERE expires_at <= NOW()');
    }

    rowToPost(row, tags) {
        return {
            id: row.id,
            title: row.title,
            tags: tags || [],
            content: row.content,
            htmlContent: row.html_content,
            date: toDateString(row.post_date),
            readTime: row.read_time,
            size: row.size,
            contentLength: row.content_length,
            hidden: !!row.hidden,
            locked: !!row.locked,
            lockPassword: row.lock_password || '',
            createdAt: row.created_at
        };
    }

    async getTagsForPosts(ids) {
        if (!ids.length) return new Map();
        const placeholders = ids.map(() => '?').join(',');
        const [rows] = await this.pool.execute(`SELECT post_id, tag FROM post_tags WHERE post_id IN (${placeholders}) ORDER BY tag`, ids);
        const map = new Map();
        for (const id of ids) map.set(id, []);
        for (const row of rows) map.get(row.post_id).push(row.tag);
        return map;
    }

    async setTags(conn, postId, tags) {
        await conn.execute('DELETE FROM post_tags WHERE post_id = ?', [postId]);
        const cleanTags = [...new Set((tags || []).map(String).map(t => t.trim()).filter(Boolean))];
        for (const tag of cleanTags) {
            await conn.execute('INSERT INTO post_tags (post_id, tag) VALUES (?, ?)', [postId, tag]);
        }
    }

    async getStats() {
        const [rows] = await this.pool.execute('SELECT COUNT(*) AS totalPosts, MAX(post_date) AS lastUpdate, MIN(post_date) AS startDate FROM posts');
        const row = rows[0] || {};
        const startDate = row.startDate ? new Date(row.startDate) : new Date('2026-01-01');
        const uptime = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        return {
            totalPosts: Number(row.totalPosts || 0),
            lastUpdate: toDateString(row.lastUpdate) || new Date().toISOString().split('T')[0],
            uptime: Math.max(1, uptime)
        };
    }

    async listPosts({ page, limit, tag, admin }) {
        const where = [];
        const params = [];
        let join = '';
        if (!admin) where.push('p.hidden = 0');
        if (tag) {
            join = 'INNER JOIN post_tags pt_filter ON pt_filter.post_id = p.id';
            where.push('pt_filter.tag = ?');
            params.push(tag);
        }
        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const [[countRow]] = await this.pool.execute(`SELECT COUNT(DISTINCT p.id) AS total FROM posts p ${join} ${whereSql}`, params);
        const totalPosts = Number(countRow.total || 0);
        const safeLimit = Math.max(1, Math.min(100, Number.parseInt(limit, 10) || 10));
        const totalPages = Math.max(1, Math.ceil(totalPosts / safeLimit));
        const safePage = Math.max(1, Math.min(Number.parseInt(page, 10) || 1, totalPages));
        const offset = (safePage - 1) * safeLimit;
        const [rows] = await this.pool.execute(
            `SELECT DISTINCT p.* FROM posts p ${join} ${whereSql} ORDER BY p.id DESC LIMIT ${safeLimit} OFFSET ${offset}`,
            params
        );
        const tagsMap = await this.getTagsForPosts(rows.map(r => r.id));
        const posts = rows.map(row => {
            const post = this.rowToPost(row, tagsMap.get(row.id) || []);
            return {
                id: post.id,
                title: post.title,
                date: post.date,
                size: post.size,
                tags: post.tags,
                hidden: post.hidden,
                locked: post.locked
            };
        });
        return { posts, page: safePage, totalPages, totalPosts };
    }

    async listTags() {
        const [rows] = await this.pool.execute(`
            SELECT pt.tag AS name, COUNT(*) AS count
            FROM post_tags pt
            INNER JOIN posts p ON p.id = pt.post_id
            WHERE p.hidden = 0
            GROUP BY pt.tag
            ORDER BY count DESC, name ASC
        `);
        return rows.map(row => ({ name: row.name, count: Number(row.count) }));
    }

    async getPost(id) {
        const [rows] = await this.pool.execute('SELECT * FROM posts WHERE id = ?', [id]);
        if (!rows.length) return null;
        const tagsMap = await this.getTagsForPosts([id]);
        return this.rowToPost(rows[0], tagsMap.get(id) || []);
    }

    async createPost(post) {
        const conn = await this.pool.getConnection();
        try {
            await conn.beginTransaction();
            const [result] = await conn.execute(
                `INSERT INTO posts (title, content, html_content, post_date, read_time, size, content_length, hidden, locked, lock_password)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [post.title, post.content, post.htmlContent, post.date, post.readTime, post.size, post.contentLength, post.hidden ? 1 : 0, post.locked ? 1 : 0, post.lockPassword || '']
            );
            await this.setTags(conn, result.insertId, post.tags);
            await conn.commit();
            return result.insertId;
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    }

    async updatePost(id, post) {
        const conn = await this.pool.getConnection();
        try {
            await conn.beginTransaction();
            await conn.execute(
                `UPDATE posts SET title = ?, content = ?, html_content = ?, post_date = ?, read_time = ?, size = ?, content_length = ?, hidden = ?, locked = ?, lock_password = ? WHERE id = ?`,
                [post.title, post.content, post.htmlContent, post.date, post.readTime, post.size, post.contentLength, post.hidden ? 1 : 0, post.locked ? 1 : 0, post.lockPassword || '', id]
            );
            await this.setTags(conn, id, post.tags);
            await conn.commit();
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    }

    async deletePost(id) {
        const [result] = await this.pool.execute('DELETE FROM posts WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }

    async toggleVisibility(id) {
        const post = await this.getPost(id);
        if (!post) return null;
        const hidden = !post.hidden;
        await this.pool.execute('UPDATE posts SET hidden = ? WHERE id = ?', [hidden ? 1 : 0, id]);
        return { message: post.hidden ? '文章已公开' : '文章已隐藏', id, hidden };
    }

    async setPostLock(id, locked, password) {
        const [result] = await this.pool.execute('UPDATE posts SET locked = ?, lock_password = ? WHERE id = ?', [locked ? 1 : 0, password || '', id]);
        return result.affectedRows > 0;
    }

    async createSession(token, username, ttlSeconds) {
        await this.pruneSessions();
        await this.pool.execute(
            'INSERT INTO sessions (token, username, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))',
            [token, username, ttlSeconds]
        );
    }

    async getSession(token) {
        await this.pruneSessions();
        const [rows] = await this.pool.execute('SELECT username, created_at AS createdAt FROM sessions WHERE token = ? AND expires_at > NOW()', [token]);
        return rows[0] || null;
    }

    async deleteSession(token) {
        await this.pool.execute('DELETE FROM sessions WHERE token = ?', [token]);
    }

    async exportPosts() {
        const [rows] = await this.pool.execute('SELECT * FROM posts ORDER BY id ASC');
        const tagsMap = await this.getTagsForPosts(rows.map(r => r.id));
        return rows.map(row => {
            const post = this.rowToPost(row, tagsMap.get(row.id) || []);
            return {
                id: post.id,
                title: post.title,
                tags: post.tags,
                content: post.content,
                date: post.date,
                hidden: post.hidden
            };
        });
    }

    async resetData() {
        await this.pool.query('SET FOREIGN_KEY_CHECKS = 0');
        await this.pool.query('TRUNCATE TABLE post_tags');
        await this.pool.query('TRUNCATE TABLE posts');
        await this.pool.query('TRUNCATE TABLE sessions');
        await this.pool.query(`ALTER TABLE posts AUTO_INCREMENT = ${firstPostId}`);
        await this.pool.query('SET FOREIGN_KEY_CHECKS = 1');
    }

    async resetAutoIncrement() {
        const [[row]] = await this.pool.execute('SELECT COALESCE(MAX(id), 0) AS maxId FROM posts');
        const nextId = Math.max(firstPostId, Number(row.maxId || 0) + 1);
        await this.pool.query(`ALTER TABLE posts AUTO_INCREMENT = ${nextId}`);
    }
}

function loadApi() {
    const apiCode = fs.readFileSync(apiPath, 'utf-8');
    const sandbox = {
        console,
        URL,
        Response,
        Request,
        Headers,
        Blob,
        crypto: globalThis.crypto,
        btoa: (value) => Buffer.from(value, 'binary').toString('base64'),
        atob: (value) => Buffer.from(value, 'base64').toString('binary')
    };
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(`${apiCode}\n;globalThis.__terminalBlogApi = { handleAPI, jsonResponse };`, sandbox, { filename: apiPath });
    return sandbox.__terminalBlogApi;
}

function collectBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

function nodeHeaders(headers) {
    const output = {};
    headers.forEach((value, key) => { output[key] = value; });
    return output;
}

async function sendWebResponse(res, webResponse) {
    res.writeHead(webResponse.status, nodeHeaders(webResponse.headers));
    const body = Buffer.from(await webResponse.arrayBuffer());
    res.end(body);
}

async function main() {
    const pool = mysql.createPool({
        host: process.env.MYSQL_HOST || '127.0.0.1',
        port: parseInt(process.env.MYSQL_PORT || '3306', 10),
        user: process.env.MYSQL_USER || 'blog_user',
        password: process.env.MYSQL_PASSWORD || 'CHANGE_ME_PASSWORD',
        database: process.env.MYSQL_DATABASE || 'terminal_blog',
        waitForConnections: true,
        connectionLimit: parseInt(process.env.MYSQL_CONNECTION_LIMIT || '10', 10),
        charset: 'utf8mb4'
    });

    const db = new MySQLBlogDB(pool);
    await db.init();

    const { handleAPI, jsonResponse } = loadApi();
    const env = {
        DB: db,
        ADMIN_USER: process.env.ADMIN_USER || 'admin',
        ADMIN_PASS: process.env.ADMIN_PASS || 'admin123'
    };

    const server = http.createServer(async (req, res) => {
        try {
            const url = new URL(req.url, `http://${req.headers.host || `localhost:${port}`}`);
            const pathname = url.pathname;

            if (pathname.startsWith('/api/')) {
                const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await collectBody(req);
                const request = new Request(url.href, { method: req.method, headers: req.headers, body });
                const response = await handleAPI(request, env, pathname);
                await sendWebResponse(res, response);
                return;
            }

            if (req.method !== 'GET' && req.method !== 'HEAD') {
                await sendWebResponse(res, jsonResponse({ error: 'Method Not Allowed' }, 405));
                return;
            }

            res.writeHead(200, { 'Content-Type': 'text/html;charset=UTF-8' });
            res.end(req.method === 'HEAD' ? undefined : readHtml());
        } catch (err) {
            console.error(err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        }
    });

    server.listen(port, host, () => {
        console.log(`Terminal Blog running at http://localhost:${port}`);
        console.log(`MySQL: ${process.env.MYSQL_HOST || '127.0.0.1'}:${process.env.MYSQL_PORT || '3306'}/${process.env.MYSQL_DATABASE || 'terminal_blog'}`);
        console.log(`Admin user: ${env.ADMIN_USER}`);
    });
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
