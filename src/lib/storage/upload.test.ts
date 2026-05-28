import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fs and sharp before importing the module
vi.mock("fs/promises", () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("sharp", () => {
  const chain = {
    resize: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from("fake-image-data")),
  };
  return { default: vi.fn().mockReturnValue(chain) };
});

// import AFTER mocks
const { saveUploadedPhoto, deletePhoto } = await import("./upload");

function makeFile(type: string, sizeBytes: number): File {
  const content = new Uint8Array(sizeBytes);
  return new File([content], "test.jpg", { type });
}

describe("saveUploadedPhoto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid MIME types", async () => {
    const file = makeFile("image/gif", 100);
    await expect(saveUploadedPhoto(file)).rejects.toThrow("Invalid file type");
  });

  it("rejects files over 8 MB", async () => {
    const file = makeFile("image/jpeg", 9 * 1024 * 1024);
    await expect(saveUploadedPhoto(file)).rejects.toThrow("File too large");
  });

  it("accepts valid JPEG and returns a hex filename", async () => {
    const file = makeFile("image/jpeg", 1024);
    const filename = await saveUploadedPhoto(file);
    expect(filename).toMatch(/^[a-f0-9]{32}\.jpg$/);
  });

  it("accepts PNG and WebP", async () => {
    for (const type of ["image/png", "image/webp"]) {
      const file = makeFile(type, 1024);
      const filename = await saveUploadedPhoto(file);
      expect(filename).toMatch(/\.jpg$/);
    }
  });
});

describe("deletePhoto", () => {
  it("ignores path traversal attempts", async () => {
    const fs = await import("fs/promises");
    await deletePhoto("../../etc/passwd");
    expect(fs.default.unlink).not.toHaveBeenCalled();
  });

  it("ignores empty filename", async () => {
    const fs = await import("fs/promises");
    await deletePhoto("");
    expect(fs.default.unlink).not.toHaveBeenCalled();
  });

  it("calls unlink for valid filename", async () => {
    const fs = await import("fs/promises");
    vi.mocked(fs.default.unlink).mockResolvedValue(undefined);
    await deletePhoto("abc123.jpg");
    expect(fs.default.unlink).toHaveBeenCalledOnce();
  });
});
