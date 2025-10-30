import React, { useState } from 'react';
import { Button } from '@mui/material';
import { CloudUpload } from '@mui/icons-material';
import UploadDialog from './UploadDialog';
import { libraryApi } from '../../api/library.api';

export interface UploadButtonProps {
  onUploadComplete?: () => void;
  variant?: 'text' | 'outlined' | 'contained';
  size?: 'small' | 'medium' | 'large';
}

export const UploadButton: React.FC<UploadButtonProps> = ({
  onUploadComplete,
  variant = 'contained',
  size = 'medium',
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleUpload = async (
    file: File,
    options: { mangaTitle?: string; volumeNumber?: number }
  ) => {
    // Determine if it's a CBZ or pre-processed zip
    const isCbz = file.name.toLowerCase().endsWith('.cbz');

    if (isCbz) {
      await libraryApi.uploadCbz(file, options);
    } else {
      await libraryApi.uploadVolume(file, options);
    }

    onUploadComplete?.();
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        startIcon={<CloudUpload />}
        onClick={() => setDialogOpen(true)}
      >
        Upload
      </Button>
      <UploadDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onUpload={handleUpload}
        allowCbz={true}
      />
    </>
  );
};

export default UploadButton;
