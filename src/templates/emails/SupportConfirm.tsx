export const SupportConfirmation = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="en" dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
 <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-ticket-id" content="{{case.id}}">
  <title>Support Ticket</title>
    <style type="text/css">
      body { 
        margin: 0;
        padding: 0;
        -webkit-text-size-adjust: 100%;
        -ms-text-size-adjust: 100%;
        font-family: Helvetica, Arial, sans-serif;
        font-size: 16px;
        line-height: 1.6;
        color: #333333;
      }
      table, td { border-collapse:collapse; }
      img { border:0; height:auto; line-height:100%; outline:none; text-decoration:none; }
      p { 
        display: block;
        margin: 16px 0;
      }
      strong {
        font-weight: 600;
      }
    </style>
</head>
<body style="padding: 20px;">
  <p>Hi {{vendor.firstName}},</p>

  <p>We've received your support request and created a case:</p>

  <p>
    <strong>Case ID:</strong> #{{case.id}}<br>
    <strong>Subject:</strong> {{case.subject}}<br>
    <strong>Status:</strong> {{case.status}}
  </p>

  <p>Our support team will get back to you shortly, typically within <strong>24–48 business hours</strong>.</p>

  <p>Expect respond times to be vary based on your support package. We are available <strong>Monday to Friday, 9:00 AM – 6:00 PM EST</strong>, and are closed on weekends and public holidays.</p>

  <p>Feel free to reply to this message if you have any updates or additional details to provide.</p>

  <p>
    Best regards,<br>
    Monstro Support Team<br>
    support@mymonstro.com
  </p>

  <p style="color: #666666; font-size: 14px; margin-top: 30px;">
    This is an automated message. Please do not reply directly to this email.
  </p>
</body>
</html>
`