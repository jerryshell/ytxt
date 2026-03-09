[中文](./README.md) | [English](./README.en.md)

# ytxt

https://ytxt.jerryshell.workers.dev

YouTube transcript extractor.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/jerryshell/ytxt)

## Features

- Extract transcripts from YouTube videos
- Support specifying language
- REST API available
- Multi-language support (Chinese/English)
- Dark/Light theme

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

### Preview production build

```bash
bun run preview
```

## API

```
GET /api/transcript?input=<YouTube URL or VideoId>&lang=<language code (optional)>
```

Example:

```bash
curl "http://localhost:3000/api/transcript?input=UF8uR6Z6KLc&lang=en"
```
