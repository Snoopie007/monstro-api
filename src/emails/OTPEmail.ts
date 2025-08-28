export const OTPEmailTemplate = `
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
                    <td align="right" style="padding-top:20px; text-align:right; font-family:Helvetica,Arial,sans-serif; font-size:10px; color:#6F7782;">
                      <a style="color:#6F7782; text-decoration:underline;" href="#">View in browser</a>
                    </td>
                  </tr>
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
                      <p>An invite to setup an Monstro account was made by {{location.name}}. We've send you this email to verify that it is indeed you who are setting up the account. To continue, enter the code below on the verification page:</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0; font-family:Helvetica,Arial,sans-serif; font-size:20px; font-weight:bold;">
                      {{opt.token}}
                    </td>
                  </tr>
                  <tr>
                    <td style="font-family:Helvetica,Arial,sans-serif; font-size:16px; line-height:1.6; color:#000000; padding:10px 0;">
                      <p>If you didn't make this change or you believe an unauthorized person has attempted to access your account, you can simply ignore this email or contact {{location.email}}.</p>
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
                    <td style="font-family:Helvetica,Arial,sans-serif; font-size:14px; line-height:1.25; color:#1F2937; padding:  0 ;">
                      <p>{{monstro.fullAddress}}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0 30px 0;">
                      <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;">
                        <tbody>
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
                        </tbody>
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