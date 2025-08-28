export const InviteEmailTemplate = `
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
    </style>
  </head>
  <body style="word-spacing:normal; background-color:#FFFFFF;">
    <div style="max-width:600px; margin:0 auto; background-color:#ffffff;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;">
        <tbody>
          <tr>
            <td>
              <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;">
                <tbody>
                  <tr>
                    <td style="padding:10px 0;">
                      <a href="https://mymonstro.com/" target="_blank">
                        <img alt="Monstro" height="29" src="https://www.mymonstro.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo.5ee5f89f.png&amp;w=96&amp;q=75" style="border:0; display:block; height:29px; width:100px;">
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td style="font-family:Helvetica,Arial,sans-serif; font-size:16px; line-height:1.5; color:#000000; padding:10px 0;">
                      <p>Hi {{member.firstName}}</p>
                      <p>Great news! {{location.name}} invites you to join their classes. Let's get you all set up and ready to go. First, please complete your account setup by clicking the Accept Invite button below.</p>
                    </td>
                  </tr>
                  <tr>
                    <td align="left" style="padding:10px 0 20px 0;">
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
                    <td style="padding: 0; border-top:1px solid #b5b5b5;"></td>
                  </tr>
                  <tr>
                    <td style="font-family:Helvetica,Arial,sans-serif; font-size:14px; line-height:1.5; color:#1F2937; padding: 10px 0 0 0;">
                      <p>You can opt out of receiving future emails by clicking <a target="_blank" href="{{monstro.unsubscribeUrl}}" style="font-weight:bold;">unsubscribe</a>. For more information about how we process data, please see our <a target="_blank" href="{{monstro.privacyUrl}}" style="font-weight:bold;">Privacy Policy</a>.</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="font-family:Helvetica,Arial,sans-serif; font-size:14px; line-height:1.25; color:#1F2937; padding:0;">
                      <p>{{monstro.fullAddress}}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0 30px 0;">
                      <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;">
                        <tr>
                          <td>
                            <a href="{{monstro.xUrl}}" style="display:inline-block; margin-right:10px;">
                              <img width="32" height="32" src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/669d5713-9b6a-46bb-bd7e-c542cff6dd6a/8cb45ebcfb7c4c8189af4a5ff6ca1a98/twitter_icon-circle.png" alt="Twitter">
                            </a>
                            <a href="{{monstro.linkedinUrl}}" style="display:inline-block; margin-right:10px;">
                              <img width="32" height="32" src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/669d5713-9b6a-46bb-bd7e-c542cff6dd6a/8cb45ebcfb7c4c8189af4a5ff6ca1a98/linkedin_icon-circle_1.png" alt="LinkedIn">
                            </a>
                            <a href="{{monstro.instagramUrl}}" style="display:inline-block; margin-right:10px;">
                              <img width="32" height="32" src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/669d5713-9b6a-46bb-bd7e-c542cff6dd6a/8cb45ebcfb7c4c8189af4a5ff6ca1a98/instagram_icon-circle_1.png" alt="Instagram">
                            </a>
                            <a href="{{monstro.facebookUrl}}" style="display:inline-block; margin-right:10px;">
                              <img width="32" height="32" src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/669d5713-9b6a-46bb-bd7e-c542cff6dd6a/8cb45ebcfb7c4c8189af4a5ff6ca1a98/facebook_icon-circle_1.png" alt="Facebook">
                            </a>
                            <a href="{{monstro.youtubeUrl}}" style="display:inline-block;">
                              <img width="32" height="32" src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/669d5713-9b6a-46bb-bd7e-c542cff6dd6a/8cb45ebcfb7c4c8189af4a5ff6ca1a98/youtube_icon-circle_1.png" alt="YouTube">
                            </a>
                          </td>
                        </tr>
                      </table>
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