import React, { useState } from 'react';
import { Button } from '@mui/material';
import { FolderOpen } from '@mui/icons-material';
import BulkImportDialog from './BulkImportDialog';
import { getPlatformAPI } from '../../platform';

export interface BulkImportButtonProps {
  onImportComplete?: () => void;
  variant?: 'text' | 'outlined' | 'contained';
  size?: 'small' | 'medium' | 'large';
}

export const BulkImportButton: React.FC<BulkImportButtonProps> = ({
  onImportComplete,
  variant = 'contained',
  size = 'medium',
}) => {
  const platformAPI = getPlatformAPI();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleImportComplete = () => {
    onImportComplete?.();
    setDialogOpen(false);
  };

  // Only show bulk import on desktop
  if (!platformAPI.isElectron) {
    return null;
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        startIcon={<FolderOpen />}
        onClick={() => setDialogOpen(true)}
      >
        Bulk Import
      </Button>
      <BulkImportDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onImportComplete={handleImportComplete}
      />
    </>
  );
};

export default BulkImportButton;

