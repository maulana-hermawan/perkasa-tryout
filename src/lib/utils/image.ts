/**
 * Downscales an uploaded image (e.g. a transfer receipt) to a JPEG data URL so
 * it stays small enough for the localStorage-backed mock backend.
 */
export async function compressImage(file: File, maxWidth = 800, quality = 0.72): Promise<string> {
  const dataUrl = await readAsDataUrl(file);

  if (typeof window === "undefined" || !file.type.startsWith("image/")) return dataUrl;

  try {
    const image = await loadImage(dataUrl);
    const scale = Math.min(1, maxWidth / image.width);
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return dataUrl;
    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return dataUrl;
  }
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image decode failed"));
    image.src = src;
  });
}
