// HTML templates for public routes

export const errorPageTemplate = (title: string, message: string) => `<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; text-align: center; padding: 20px 0px; }
    .error { color: #dc3545; font-size: 24px; }
  </style>
</head>
<body>
  <div class="error">${message}</div>
</body>
</html>`;

export const documentPageTemplate = (title: string, content: string) => `<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #374151;
      margin: 0;
      padding: 20px 0px;
    }
    .header {
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .title {
      font-size: 24px;
      font-weight: bold;
      color: #111827;
      margin: 0;
    }
    .content {
      color: #4b5563;
    }
    .content h1, .content h2, .content h3 {
      color: #111827;
      margin-top: 32px;
      margin-bottom: 16px;
    }
    .content h1 { font-size: 28px; }
    .content h2 { font-size: 24px; }
    .content h3 { font-size: 20px; }
    .content p {
      margin-bottom: 16px;
    }
    .content ul, .content ol {
      margin-bottom: 16px;
      padding-left: 24px;
    }
    .content li {
      margin-bottom: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">${title}</h1>
    </div>
    <div class="content">
      ${content}
    </div>
  </div>
</body>
</html>`;

export const waiverPageTemplate = (title: string, content: string) => `<!DOCTYPE html>
<html>
<head>
    <title>${title}</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #374151;
            margin: 0;
            padding: 20px 0px;
        }
        .header {
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 16px;
            margin-bottom: 24px;
        }
        .title {
            font-size: 24px;
            font-weight: bold;
            color: #111827;
            margin: 0;
        }
        .content {
            color: #4b5563;
        }
        .content h1, .content h2, .content h3 {
            color: #111827;
            margin-top: 32px;
            margin-bottom: 16px;
        }
        .content h1 { font-size: 28px; }
        .content h2 { font-size: 24px; }
        .content h3 { font-size: 20px; }
        .content p {
            margin-bottom: 16px;
        }
        .content ul, .content ol {
            margin-bottom: 16px;
            padding-left: 24px;
        }
        .content li {
            margin-bottom: 8px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">${title}</h1>
        </div>
        <div class="content">
            ${content}
        </div>
    </div>
</body>
</html>`;
