const QRCode = require('qrcode');
const fs = require('fs');
const url = '/send.html?box=NOELL';

QRCode.toString(url, { 
  type: 'svg', 
  width: 512, 
  margin: 2, 
  errorCorrectionLevel: 'H',
  color: { dark: '#c04660', light: '#fffdfb' }
}, (err, svg) => {
  if (err) { console.error(err); return; }
  
  // Heart SVG path
  const heart = '<g transform="translate(226, 226) scale(0.8)"><path d="M0 -10 C-10 -10 -10 0 0 10 C0 0 10 -10 10 -10 C10 -10 10 0 0 10 C0 0 -10 -10 0 -10" fill="#c04660"/></g>';
  
  // Insert heart before closing svg tag
  const svgWithHeart = svg.replace('</svg>', heart + '</svg>');
  
  fs.writeFileSync('public/qr-code.svg', svgWithHeart);
  console.log('QR code SVG with heart generated');
  
  // Also generate PNG
  QRCode.toFile('public/qr-code.png', url, { 
    width: 512, 
    margin: 2, 
    errorCorrectionLevel: 'H',
    color: { dark: '#c04660', light: '#fffdfb' }
  }, (err) => {
    if (err) console.error(err);
    else console.log('QR code PNG generated');
  });
});