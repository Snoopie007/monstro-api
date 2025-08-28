export const UpdateEmailOTP = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="en" dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style type="text/css">
      body { margin:0; padding:0; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
      table, td { border-collapse:collapse; }
      img { border:0; height:auto; line-height:100%; outline:none; text-decoration:none; }
      p { display:block; margin:12px 0; }
      @media only screen and (max-width:480px) {
        .mj-full-width-mobile { width: 100% !important; }
        .mj-small-device-hidden-element { display:none !important; }
      }
    </style>
  </head>
  <body style="word-spacing:normal; background-color:#FFFFFF;">
    <div style="max-width:600px; margin:0 auto; background-color:#ffffff;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;">
        <tbody>
          <tr>
            <td >
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;">
                <tbody>
              
                  <tr>
                    <td style="font-family:Helvetica,Arial,sans-serif; font-size:16px; line-height:1.5; color:#000000; padding:10px 0;">
                      <p>Dear {{member.firstName}} {{member.lastName}},</p>
                       <p>A request to update your current account email to {{update.email}} was made. To complete this request, click the button below, your request link will expire in 24 hours.</p>
                    </td>
                  </tr>
                  <tr>
                    <td align="left" style="padding:0;">
                      <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;line-height:100%">
                        <tr>
                          <td align="center" bgcolor="#8708c7" role="presentation" style="border:1px solid #600469;border-radius:3px;background:#8708c7" valign="middle">
                            <a href="{{ui.btnUrl}}" style="display:inline-block;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;line-height:1.25;margin:0;text-decoration:none;padding:10px 25px;border-radius:3px" target="_blank">
                            {{ui.btnText}}
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="font-family:Helvetica,Arial,sans-serif; font-size:16px; line-height:1.6; color:#000000; padding:10px 0;">
                      <p>If you didn't make this change or you believe an unauthorized person has attempted to access your account, you can simply ignore this email.</p>
                    </td>
                  </tr>
                  
                  <tr>
                    <td style="font-family:Helvetica,Arial,sans-serif; font-size:14px; line-height:1.25; color:#1F2937; padding:  0 ;">
                      <p>{{monstro.fullAddress}}</p>
                    </td>
                  </tr>
                  
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </body>
</html>
`