export function generateContractHtml(data: {
  contract: Record<string, any>;
  memberName: string;
  date: string;
  contractId: string;
}): string {
  const member = data.contract.variables.contact;
  const location = data.contract.variables.location;

  return `<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Contract Agreement #${data.contractId}</title>
      <style>
          body{font-family:Arial,sans-serif;line-height:1.6;color:#333;padding:20px;max-width:800px;margin:0 auto}
          .header{text-align:center;margin-bottom:30px;border-bottom:2px solid #eee;padding-bottom:20px}
          .contract-title{font-size:24px;font-weight:bold;margin-bottom:10px}
          .contract-id{color:#666;font-size:16px}
          .section{margin-bottom:20px}
          .section-title{font-weight:bold;font-size:18px;margin-bottom:10px;border-bottom:1px solid #eee;padding-bottom:5px}
          .signature-area{margin-top:50px}
          .signature-line{width:300px;border-top:1px solid #000;margin-top:50px;margin-bottom:5px}
          .footer{margin-top:50px;font-size:12px;color:#666;text-align:center}
          .party-info{display:flex;justify-content:space-between;margin-top:20px}
          .party{width:48%}
          .signature-container{display:flex;justify-content:space-between;margin-top:30px}
          .signature-box{width:45%}
          .member-signature{margin-top:20px;text-align:center}
          .member-signature img{max-width:200px;max-height:80px}
      </style>
  </head>
  <body>
      <div class="header">
          <div class="contract-title">CONTRACT AGREEMENT</div>
          <div class="contract-id">Contract #${data.contractId}</div>
      </div>

      <div class="section">
          <div class="section-title">PARTIES</div>
          <p>This agreement is made between:</p>
          
          <div class="party-info">
              <div class="party">
                  <strong>Provider:</strong><br>
                  ${location.name}<br>
                  ${location.address}<br>
                  ${location.city}, ${location.state} ${location.postalCode}<br>
                  Phone: ${location.phone}
              </div>
              <div class="party">
                  <strong>Member:</strong><br>
                  ${member.firstName} ${member.lastName}<br>
                  Email: ${member.email}<br>
                  Phone: ${member.phone}
              </div>
          </div>
      </div>

      <div class="section">
          <div class="section-title">TERMS AND CONDITIONS</div>
          <p>By signing this agreement, the Member agrees to all terms and conditions set forth by ${location.name}.</p>
          <p>This agreement constitutes the entire understanding between the parties and supersedes all prior agreements.</p>
      </div>

      <div class="section">
          <div class="section-title">EFFECTIVE DATE</div>
          <p>This agreement becomes effective on ${data.date}.</p>
      </div>

      <div class="signature-area">
          <p>Agreed and accepted by:</p>
          
          <div class="signature-container">
              <div class="signature-box">
                  <div>${location.name} Representative</div>
                  <div class="signature-line"></div>
                  <div>Signature</div>
                  <div>Date: ${data.date}</div>
              </div>
              
              <div class="signature-box">
                  <div>Member: ${member.firstName} ${member.lastName}</div>
                  <div class="signature-line"></div>
                  <div class="member-signature">
                      <img src="${data.contract.signature}" alt="Member Signature">
                  </div>
                  <div>Date: ${data.date}</div>
              </div>
          </div>
      </div>

      <div class="footer">
          <p>This document was electronically signed and is valid without handwritten signatures.</p>
          <p>Generated on ${data.date}</p>
      </div>
  </body>
  </html>`;
}
