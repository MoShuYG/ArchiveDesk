import {
  MAX_PDF_CANVAS_DIMENSION,
  MAX_PDF_CANVAS_PIXELS,
  calculatePdfRenderScales,
} from "../../frontend/src/utils/pdfPreviewSizing";

describe("PDF preview render sizing", () => {
  test("keeps ordinary pages sharp at the available width", () => {
    const scales = calculatePdfRenderScales({
      pageWidth: 595,
      pageHeight: 842,
      availableWidth: 800,
      devicePixelRatio: 2,
    });

    expect(scales).not.toBeNull();
    expect(scales?.displayScale).toBeCloseTo(800 / 595);
    expect(scales?.renderScale).toBeCloseTo((800 / 595) * 2);
  });

  test("caps pathological page dimensions before allocating a canvas", () => {
    const scales = calculatePdfRenderScales({
      pageWidth: 1,
      pageHeight: 1_000_000_000,
      availableWidth: 1200,
      devicePixelRatio: 2,
    });

    expect(scales).not.toBeNull();
    const canvasWidth = 1 * (scales?.renderScale ?? 0);
    const canvasHeight = 1_000_000_000 * (scales?.renderScale ?? 0);
    expect(Math.max(canvasWidth, canvasHeight)).toBeLessThanOrEqual(MAX_PDF_CANVAS_DIMENSION);
    expect(canvasWidth * canvasHeight).toBeLessThanOrEqual(MAX_PDF_CANVAS_PIXELS);
  });

  test("rejects invalid PDF viewport dimensions", () => {
    expect(
      calculatePdfRenderScales({
        pageWidth: Number.POSITIVE_INFINITY,
        pageHeight: 842,
        availableWidth: 800,
        devicePixelRatio: 1,
      }),
    ).toBeNull();
  });
});
