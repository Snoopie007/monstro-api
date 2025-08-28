export const ResetSuccessEmail = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="en" dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body { font-family: Arial, sans-serif; font-size: 16px; color: #333; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 20px auto; padding: 20px; }
      p { margin: 0 0 16px; line-height: 1.5; }
      strong { color: #000; }
      .otp { font-size: 24px; font-weight: bold; color: #000; margin: 20px 0;  }
      a { color: #007bff; text-decoration: none; }
      .footer { font-size: 12px; color: #888; margin-top: 20px;  }
    </style>
  </head>
  <body>
    <div class="container">
      <p>Dear {{member.firstName}} {{member.lastName}},</p>
      <p>The password for your Apple Monstro ({{member.email}}) has been successfully reset.</p>
      <p>If you didn’t make this change or if you believe an unauthorized person has accessed your account, go to your Monstro App to reset your password immediately.</p>
      <p>If you need additional help, contact support@mymonstro.com</p>
      <p>Monstro Support</p>
      <div class="footer">{{monstro.fullAddress}}</div>
    </div>
    
  </body>
</html>
`