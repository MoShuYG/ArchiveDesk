export const MAX_PDF_CANVAS_PIXELS = 16_000_000;
export const MAX_PDF_CANVAS_DIMENSION = 8_192;

const MAX_PDF_DISPLAY_DIMENSION = 12_000;
const MAX_PDF_DISPLAY_SCALE = 2;
const MAX_PDF_OUTPUT_SCALE = 2;

type PdfRenderSizingInput = {
  pageWidth: number;
  pageHeight: number;
  availableWidth: number;
  devicePixelRatio: number;
};

export function calculatePdfRenderScales(input: PdfRenderSizingInput): {
  displayScale: number;
  renderScale: number;
} | null {
  const values = [input.pageWidth, input.pageHeight, input.availableWidth, input.devicePixelRatio];
  if (values.some((value) => !Number.isFinite(value) || value <= 0)) {
    return null;
  }

  const displayScale = Math.min(
    MAX_PDF_DISPLAY_SCALE,
    input.availableWidth / input.pageWidth,
    MAX_PDF_DISPLAY_DIMENSION / input.pageWidth,
    MAX_PDF_DISPLAY_DIMENSION / input.pageHeight,
  );
  const outputScale = Math.min(Math.max(input.devicePixelRatio, 1), MAX_PDF_OUTPUT_SCALE);
  const pixelLimitedScale = Math.sqrt(MAX_PDF_CANVAS_PIXELS / (input.pageWidth * input.pageHeight));
  const dimensionLimitedScale = MAX_PDF_CANVAS_DIMENSION / Math.max(input.pageWidth, input.pageHeight);
  const renderScale = Math.min(displayScale * outputScale, pixelLimitedScale, dimensionLimitedScale);

  if (!Number.isFinite(displayScale) || displayScale <= 0 || !Number.isFinite(renderScale) || renderScale <= 0) {
    return null;
  }

  return { displayScale, renderScale };
}
