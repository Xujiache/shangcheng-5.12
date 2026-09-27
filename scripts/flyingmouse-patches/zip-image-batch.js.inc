    const batches = [];
    let batch = [];
    let batchPixels = 0;
    for (const image of images) {
      const pixels = assertImageMetadata(await inspectImageMetadata(image.inputPath));
      if (batch.length && batchPixels + pixels > LIMITS.maxImagePdfPixels) {
        batches.push(batch);
        batch = [];
        batchPixels = 0;
      }
      batch.push(image);
      batchPixels += pixels;
    }
    batches.push(batch);
    if (batches.length === 1) {
      await convertImagesToPdf(images, outputPath);
    } else {
      assertPdfPages(images.length);
      const pdfFiles = [];
      for (let index = 0; index < batches.length; index++) {
        const partPath = path.join(tempDir, `batch-${index}.pdf`);
        await convertImagesToPdf(batches[index], partPath);
        pdfFiles.push({ inputPath: partPath });
      }
      await mergePdfFiles(pdfFiles, outputPath);
    }
