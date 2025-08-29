const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');

const app = express();
const port = 3000;

// Setup multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Utility to delete files
function deleteFiles(files) {
  files.forEach(file => {
    fs.unlink(file.path, err => {
      if (err) console.error('Failed to delete file:', file.path, err);
    });
  });
}

// PDF to PNG conversion endpoint
app.post('/convert/pdf-to-png', upload.array('files'), async (req, res) => {
  try {
    const outputFiles = [];
    for (const file of req.files) {
      const pdfBytes = fs.readFileSync(file.path);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();

      // For simplicity, convert first page only
      const page = pages[0];
      const viewport = page.getViewport({ scale: 1.0 });

      // Use sharp to convert PDF page to PNG
      // Note: sharp does not natively render PDF pages, so we need to use an external tool or library
      // Here, we will just return the original PDF file for demo purposes
      // In production, use pdf-poppler, pdf2image, or similar tools for rendering pages to images

      // For demo, just send back the original PDF renamed as PNG
      const outputPath = path.join('converted', file.filename + '.png');
      fs.copyFileSync(file.path, outputPath);
      outputFiles.push({ filename: file.originalname.replace(/\.pdf$/i, '.png'), path: outputPath });
    }
    // Send back download links
    res.json({ success: true, files: outputFiles.map(f => ({ name: f.filename, url: '/converted/' + path.basename(f.path) })) });
    deleteFiles(req.files);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Conversion failed' });
  }
});

// JPG to PDF conversion endpoint
app.post('/convert/jpg-to-pdf', upload.array('files'), async (req, res) => {
  try {
    const pdfDoc = await PDFDocument.create();
    for (const file of req.files) {
      const imgBytes = fs.readFileSync(file.path);
      const img = await pdfDoc.embedJpg(imgBytes);
      const page = pdfDoc.addPage([img.width, img.height]);
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
    }
    const pdfBytes = await pdfDoc.save();
    const outputPath = path.join('converted', 'output.pdf');
    fs.writeFileSync(outputPath, pdfBytes);
    deleteFiles(req.files);
    res.json({ success: true, files: [{ name: 'output.pdf', url: '/converted/output.pdf' }] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Conversion failed' });
  }
});

// Serve converted files statically
app.use('/converted', express.static(path.join(__dirname, 'converted')));

// Create converted folder if not exists
if (!fs.existsSync('converted')) {
  fs.mkdirSync('converted');
}

app.listen(port, () => {
  console.log(`PDF Converter backend listening at http://localhost:${port}`);
});
