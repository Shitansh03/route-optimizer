const ffmpeg = require('fluent-ffmpeg');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { createWorker } = require('tesseract.js');
const { cleanAddressesWithAI } = require('./aiCleaner');
const { validatePIN } = require('./geocoder');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function extractFrames(videoPath, outputDir) {
  await fs.mkdir(outputDir, { recursive: true });

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions([
        '-vf', 'fps=3,scale=1280:-1',
        '-q:v', '2'
      ])
      .output(path.join(outputDir, 'frame_%04d.png'))
      .on('end', async () => {
        const files = (await fs.readdir(outputDir))
          .filter(f => f.startsWith('frame_'))
          .sort()
          .map(f => path.join(outputDir, f));
        resolve(files);
      })
      .on('error', reject)
      .run();
  });
}


async function getImageHash(imagePath) {
  const { data } = await sharp(imagePath)
    .resize(16, 16, { fit: 'fill' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const avg = data.reduce((sum, val) => sum + val, 0) / data.length;
  return Array.from(data).map(val => (val > avg ? 1 : 0));
}

function hammingDistance(hash1, hash2) {
  return hash1.reduce((count, bit, i) => count + (bit !== hash2[i] ? 1 : 0), 0);
}


async function selectStableFrames(allFrames, socketEmit) {
  const stableFrames = [];
  let prevHash = null;

  for (let i = 0; i < allFrames.length; i++) {
    const hash = await getImageHash(allFrames[i]);


    if (prevHash === null || hammingDistance(hash, prevHash) > 8) {
      stableFrames.push(allFrames[i]);
      prevHash = hash;
    }

    if (i % 10 === 0) {
      socketEmit('progress', {
        step: 'dedup',
        message: `Filtering frames: ${i + 1}/${allFrames.length}`,
        pct: 15 + Math.round((i / allFrames.length) * 10)
      });
    }
  }

  return stableFrames;
}


async function enhanceFrame(inputPath, outputPath) {
  await sharp(inputPath)
    .normalise()
    .sharpen({ sigma: 1.5 })
    .modulate({ brightness: 1.05 })
    .png({ quality: 100 })
    .toFile(outputPath);

  return outputPath;
}


async function ocrFrame(imagePath) {
  const worker = await createWorker('eng', 1, {
    logger: () => {}
  });

  await worker.setParameters({
    tessedit_pageseg_mode: '6',
    tessedit_char_whitelist:
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ,.-/#&()',
    preserve_interword_spaces: '1'
  });

  const { data: { text } } = await worker.recognize(imagePath);
  await worker.terminate();

  return text.trim();
}


async function processScreenRecording(videoPath, sessionId, socketEmit) {
  const workDir = path.join('./temp', sessionId);
  const enhancedDir = path.join(workDir, 'enhanced');

  try {
    socketEmit('progress', {
      step: 'extract',
      message: 'Extracting frames from video...',
      pct: 5
    });
    const allFrames = await extractFrames(videoPath, workDir);
    console.log(`Extracted ${allFrames.length} raw frames`);

    socketEmit('progress', {
      step: 'dedup',
      message: `${allFrames.length} frames extracted. Removing duplicates...`,
      pct: 15
    });
    const stableFrames = await selectStableFrames(allFrames, socketEmit);
    console.log(`Reduced to ${stableFrames.length} stable frames`);

    socketEmit('progress', {
      step: 'dedup',
      message: `Kept ${stableFrames.length} unique frames (${allFrames.length - stableFrames.length} duplicates removed)`,
      pct: 25
    });

    await fs.mkdir(enhancedDir, { recursive: true });
    socketEmit('progress', {
      step: 'enhance',
      message: 'Enhancing image quality for OCR...',
      pct: 28
    });

    const enhancedFrames = [];
    for (let i = 0; i < stableFrames.length; i++) {
      const outPath = path.join(enhancedDir, `enhanced_${String(i).padStart(4, '0')}.png`);
      await enhanceFrame(stableFrames[i], outPath);
      enhancedFrames.push(outPath);
    }

    socketEmit('progress', {
      step: 'ocr',
      message: `Running OCR on ${enhancedFrames.length} frames...`,
      pct: 32
    });

    const allTexts = [];
    for (let i = 0; i < enhancedFrames.length; i++) {
      const text = await ocrFrame(enhancedFrames[i]);

      if (text && text.length > 20) {
        allTexts.push(text);
      }

      const pct = 32 + Math.round((i / enhancedFrames.length) * 35);
      socketEmit('progress', {
        step: 'ocr',
        message: `OCR: frame ${i + 1} of ${enhancedFrames.length}`,
        pct
      });
    }

    const uniqueTexts = [...new Set(allTexts)];
    const combinedText = uniqueTexts.join('\n--- NEW FRAME ---\n');
    console.log(`Combined OCR text: ${combinedText.length} characters from ${uniqueTexts.length} unique frames`);

    socketEmit('progress', {
      step: 'ai',
      message: 'AI is extracting delivery addresses...',
      pct: 70
    });
    const extracted = await cleanAddressesWithAI(combinedText);
    console.log(`AI extracted ${extracted.length} addresses`);

    socketEmit('progress', {
      step: 'validate',
      message: 'Validating PIN codes...',
      pct: 82
    });

    const validated = [];
    for (const addr of extracted) {
      const pinMatch = addr.cleaned && addr.cleaned.match(/\b\d{6}\b/);
      if (pinMatch) {
        const pinResult = await validatePIN(pinMatch[0]);
        if (pinResult.valid === false) {
          addr.confidence = 'low';
          addr.issues = (addr.issues || '') + ' Invalid PIN code.';
        }
        if (pinResult.valid && pinResult.district) {
          addr.suggestedCity = pinResult.district;
        }
      }
      validated.push(addr);
    }

    const autoApproved = validated.filter(a => a.confidence === 'high');
    const needsReview = validated.filter(a => a.confidence !== 'high');

    socketEmit('progress', {
      step: 'done',
      message: `Complete! Found ${validated.length} addresses (${autoApproved.length} auto-approved, ${needsReview.length} need review)`,
      pct: 100
    });

    await fs.rm(workDir, { recursive: true, force: true });

    return {
      success: true,
      totalFound: validated.length,
      autoApproved,
      needsReview
    };

  } catch (err) {
    console.error('Video processing error:', err);
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
    throw err;
  }
}

module.exports = { processScreenRecording };