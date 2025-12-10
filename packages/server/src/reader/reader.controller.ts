import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';

// Use empty path with exclude to bypass global prefix
@Controller({ path: 'reader' })
export class ReaderController {
  private readonly readerPath: string;

  constructor() {
    // Path to the built web reader
    // __dirname is /app/dist/reader, so we go up 2 levels to /app, then into reader/dist/web
    // In production Docker: /app/reader/dist/web
    // In local dev: packages/server/dist/reader -> go up to packages/server, then ../reader/dist/web
    this.readerPath = join(__dirname, '../..', 'reader', 'dist', 'web');
  }

  /**
   * Serve the web reader app
   * This allows users to access the reader through the browser
   */
  @Get('*')
  serveReader(@Res() res: Response) {
    // Check if the reader build exists
    if (!existsSync(this.readerPath)) {
      return res.status(404).send(`
        <html>
          <head>
            <title>Reader Not Built</title>
            <style>
              body {
                font-family: system-ui, -apple-system, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background: #1a1a1a;
                color: #fff;
              }
              .container {
                text-align: center;
                padding: 2rem;
                max-width: 600px;
              }
              h1 { color: #f44336; }
              code {
                background: #2a2a2a;
                padding: 0.2rem 0.5rem;
                border-radius: 4px;
                font-family: monospace;
              }
              pre {
                background: #2a2a2a;
                padding: 1rem;
                border-radius: 8px;
                text-align: left;
                overflow-x: auto;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>⚠️ Web Reader Not Built</h1>
              <p>The web reader frontend is not available at the expected location.</p>
              <p><strong>For Docker deployment:</strong> Rebuild the Docker image using:</p>
              <pre>docker compose build server
docker compose up server</pre>
              <p><strong>For local development:</strong> Build the web reader manually:</p>
              <pre>cd packages/reader
npm run build:web</pre>
              <p>Expected path: <code>${this.readerPath}</code></p>
            </div>
          </body>
        </html>
      `);
    }

    // Serve the index.html from the reader build
    // This handles all routes under /reader/* for client-side routing
    return res.sendFile(join(this.readerPath, 'index.html'));
  }
}

