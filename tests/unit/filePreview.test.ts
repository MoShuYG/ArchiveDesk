import {
  getPreviewLoadStrategy,
  isDirectPreviewExtension,
  resolvePreviewMode,
} from "../../frontend/src/utils/filePreview";

describe("file preview capabilities", () => {
  test("loads PDF data through the application before rendering", () => {
    expect(resolvePreviewMode("novel", "application/pdf", "pdf")).toBe("pdf");
    expect(getPreviewLoadStrategy("pdf")).toBe("arrayBuffer");
  });

  test("recognizes DOCX files as browser previews", () => {
    expect(
      resolvePreviewMode(
        "other",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "docx",
      ),
    ).toBe("docx");
    expect(isDirectPreviewExtension(".DOCX")).toBe(true);
    expect(getPreviewLoadStrategy("docx")).toBe("arrayBuffer");
  });

  test("keeps media streaming instead of buffering whole files", () => {
    expect(getPreviewLoadStrategy("audio")).toBe("stream");
    expect(getPreviewLoadStrategy("video")).toBe("stream");
  });

  test("does not reuse a loaded preview for unsupported file types", () => {
    expect(resolvePreviewMode("other", "application/octet-stream", "zip")).toBe("unsupported");
    expect(getPreviewLoadStrategy("unsupported")).toBe("none");
  });
});
