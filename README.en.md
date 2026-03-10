# ytxt

[中文](./README.md) | [English](./README.en.md)

Serverless YouTube transcript extractor w/ easy HTTP GET API

Use Now: https://ytxt.jerryshell.workers.dev

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/jerryshell/ytxt)

## Usage

### Install dependencies

```bash
bun install
```

### Development

```bash
bun run dev
```

### Build for production

```bash
bun run build
```

## API

```
GET /api/transcript?input=<YouTube URL or VideoId>&lang=<language code (optional)>
```

Example:

```bash
curl "http://localhost:3000/api/transcript?input=UF8uR6Z6KLc&lang=en"
```
