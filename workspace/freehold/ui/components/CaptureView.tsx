import React from 'react';
import { FileDropZone } from './FileDropZone';
import { CaptureList } from './CaptureList';

export function CaptureView() {
  return (
    <>
      <FileDropZone />
      <CaptureList />
    </>
  );
}
