const DOCX_PREVIEW_CSP = [
  "default-src 'none'",
  "img-src data:",
  "style-src 'unsafe-inline'",
  "font-src 'none'",
  "connect-src 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

export const DOCX_IFRAME_SANDBOX = '';

export function buildDocxSandboxDocument(sanitizedHtml: string): string {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="Content-Security-Policy" content="${DOCX_PREVIEW_CSP}" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root { color-scheme: light; font-family: "Microsoft YaHei", "PingFang SC", system-ui, sans-serif; }
      * { box-sizing: border-box; }
      body { margin: 0; padding: 28px 20px 56px; color: #1e293b; background: #e2e8f0; line-height: 1.75; }
      main { width: min(100%, 850px); min-height: 1060px; margin: 0 auto; padding: 64px 72px; background: #fff; box-shadow: 0 1px 4px rgb(15 23 42 / 0.14); }
      h1, h2, h3, h4, h5, h6 { margin: 1.4em 0 0.55em; color: #0f172a; line-height: 1.3; }
      h1:first-child, h2:first-child, h3:first-child { margin-top: 0; }
      p { margin: 0 0 0.9em; overflow-wrap: anywhere; }
      ul, ol { margin: 0 0 1em; padding-left: 1.8em; }
      table { width: 100%; margin: 1em 0; border-collapse: collapse; }
      th, td { padding: 0.55em 0.7em; border: 1px solid #cbd5e1; vertical-align: top; }
      th { background: #f1f5f9; font-weight: 600; }
      img { display: block; max-width: 100%; height: auto; margin: 1em auto; }
      a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
      blockquote { margin: 1em 0; padding-left: 1em; border-left: 3px solid #94a3b8; color: #475569; }
      @media (max-width: 640px) {
        body { padding: 0; background: #fff; }
        main { min-height: 100vh; padding: 28px 22px 48px; box-shadow: none; }
      }
    </style>
  </head>
  <body><main>${sanitizedHtml}</main></body>
</html>`;
}
