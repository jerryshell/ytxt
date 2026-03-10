# ytxt

[中文](./README.md) | [English](./README.en.md)

无服务器 YouTube 字幕提取器附带简单 HTTP GET API

立刻体验：https://ytxt.jerryshell.workers.dev

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/jerryshell/ytxt)

## 使用方法

### 安装依赖

```bash
bun install
```

### 开发模式

```bash
bun run dev
```

### 构建生产版本

```bash
bun run build
```

## API

```
GET /api/transcript?input=<YouTube链接或VideoId>&lang=<语言代码(可选)>
```

示例：

```bash
curl "http://localhost:3000/api/transcript?input=UF8uR6Z6KLc&lang=en"
```
