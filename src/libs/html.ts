
export function NotFoundPageTemplate() {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>404 Not Found</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body {
        min-height: 100vh;
        margin: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Segoe UI', Arial, sans-serif;
        background: #fff;
        color: #222;
      }
      .error-simple {
        text-align: center;
      }
      .error-simple h1 {
        font-size: 2rem;
        margin-bottom: 0.5em;
      }
      .error-simple p {
        font-size: 1.1rem;
        color: #666;
      }
    </style>
  </head>
  <body>
    <div class="error-simple">
      <h1>404 Not Found</h1>
      <p>The page you are looking for does not exist.</p>
    </div>
  </body>
</html>`;
}

const css = `
  [data-theme="light"] {
    --headline-color: #000;
    --content-color: #4b5563;
    --bg-color: transparent;
  }

  [data-theme="dark"] {
    --headline-color: #fff;
    --content-color: #cbd5e1; /* muted white */
    --bg-color: transparent;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: var(--content-color);
    background: var(--bg-color);
    margin: 0;
    padding: 0px 6px;
  }
  
  .content {
    color: var(--content-color);
  }
  .content h1,
  .content h2,
  .content h3,
  .content h4,
  .content h5,
  .content h6 {
    margin-top: 0;
    color: var(--headline-color);
    margin-bottom: 10px;
  }
  .content h1 {
    font-size: 24px;
  }
  .content h2 {
    font-size: 22px;
  }
  .content h3 {
    font-size: 20px;
  }
  .content h4 {
    font-size: 18px;
  }
  .content h5 {
    font-size: 17px;
  }
  .content h6 {
    font-size: 16px;
  }
  .content p {
    font-size: 16px;
    margin-bottom: 16px;
    line-height: 1.8;
  }
  .content ul, .content ol {
    margin-bottom: 16px;
    padding-left: 24px;
  }
  .content li {
    margin-bottom: 8px;
  }
`


/**
 * Build a responsive, styled document page using lit-html template literal tag.
 * "Builtified" for readability, extensibility, and future reusability!
 */
export function DocumentPageTemplate(
  title: string,
  content: string,
  theme: string = "light"
) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          ${css}
        </style>
      </head>
      <body data-theme="${theme}">
        <main class="container">
      
          <section class="content">
            ${(content)}
          </section>
        </main>
      </body>
    </html>
  `;
}

