export const ClassReminderEmail = `
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
                      <p>Hi {{user.name}},</p>
                      <p>Just a quick reminder that your class {{program.name}} is coming up on {{schedule.dayTime}}. Don't forget to checkin and before to arrive early.</p>
                    </td>
                  </tr>
              
                  
                  <tr>
                    <td style="font-family:Helvetica,Arial,sans-serif; font-size:14px; line-height:1.25; color:#1F2937; padding:  0 ;">
                      <p>See you soon,</p>
                      <p>{{location.name}}<br/>{{location.address}}</p>
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
`;