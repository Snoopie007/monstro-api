export const SimpleOTPEmail = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="en" dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body { font-family: Arial, sans-serif; font-size: 16px; color: #333; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #fafafa; }
      p { margin: 0 0 16px; line-height: 1.5; }
      strong { color: #000; }
      .otp { font-size: 24px; font-weight: bold; color: #000; margin: 20px 0;  }
      a { color: #007bff; text-decoration: none; }
      .footer { font-size: 12px; color: #888; margin-top: 20px; text-align: center; }
    </style>
  </head>
  <body>
    <div class="container">
      <p>Hi <strong>{{member.firstName}}</strong>,</p>
      <p>An invite to set up a Monstro account was made by <strong>{{location.name}}</strong>. To continue, enter the code below on the verification page:</p>
      <div class="otp">{{otp.token}}</div>
      <p>If you didn't make this change, ignore this email or contact <a href="mailto:{{location.email}}">{{location.email}}</a>.</p>
      <p>You can opt out by clicking <a href="#">unsubscribe</a>. See our <a href="#">Privacy Policy</a> for details.</p>
      <div class="footer">{{monstro.fullAddress}}</div>
    </div>
  </body>
</html>
`
