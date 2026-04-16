import React, { useCallback, useState } from 'react';
import { useCrannActions } from '../hooks';

export function FileDropZone() {
  const { dropFile } = useCrannActions();
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        dropFile({ dataUrl, originalName: file.name });
      };
      reader.readAsDataURL(file);
    }
  }, [dropFile]);

  const className = `fh-dropzone${isDragOver ? ' fh-dropzone--active' : ''}`;

  return (
    <div
      className={className}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver ? 'Drop image to capture' : 'Or drag & drop an image here'}
    </div>
  );
}
