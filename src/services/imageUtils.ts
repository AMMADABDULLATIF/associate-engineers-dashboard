function fallbackCompress(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number
): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(null);
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result !== 'string') {
        resolve(null);
        return;
      }
      const img = new Image();
      img.onerror = () => resolve(null);
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}

export function compressImageFile(
  file: File,
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 0.75
): Promise<string | null> {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) {
      resolve(null);
      return;
    }

    if (typeof window.createImageBitmap === 'function') {
      window
        .createImageBitmap(file)
        .then((bitmap) => {
          let width = bitmap.width;
          let height = bitmap.height;
          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            if (typeof bitmap.close === 'function') bitmap.close();
            resolve(null);
            return;
          }
          ctx.drawImage(bitmap, 0, 0, width, height);
          if (typeof bitmap.close === 'function') bitmap.close();
          resolve(canvas.toDataURL('image/jpeg', quality));
        })
        .catch(() => {
          fallbackCompress(file, maxWidth, maxHeight, quality).then(resolve);
        });
    } else {
      fallbackCompress(file, maxWidth, maxHeight, quality).then(resolve);
    }
  });
}
