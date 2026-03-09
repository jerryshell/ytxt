[中文](./README.md) | [English](./README.en.md)

# ytxt

https://ytxt.jerryshell.workers.dev

YouTube 字幕提取工具。

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/jerryshell/ytxt)

## 功能

- 提取 YouTube 视频字幕
- 支持指定语言
- 提供 REST API
- 多语言支持（中文/英文）
- 暗色/亮色主题

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

### 预览生产版本

```bash
bun run preview
```

## API

```
GET /api/transcript?input=<YouTube链接或VideoId>&lang=<语言代码(可选)>
```

示例：

```bash
curl "http://localhost:3000/api/transcript?input=UF8uR6Z6KLc&lang=en"
```
