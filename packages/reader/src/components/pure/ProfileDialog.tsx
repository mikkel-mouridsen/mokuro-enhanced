import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Avatar,
  Typography,
  IconButton,
  Alert,
  Divider,
  InputAdornment,
} from '@mui/material';
import { PhotoCamera, Visibility, VisibilityOff } from '@mui/icons-material';
import type { User } from '../../api/auth.api';

interface ProfileDialogProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  onUpdatePassword: (newPassword: string) => Promise<void>;
  onUploadProfilePicture: (file: File) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const ProfileDialog: React.FC<ProfileDialogProps> = ({
  open,
  onClose,
  user,
  onUpdatePassword,
  onUploadProfilePicture,
  isLoading,
  error,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePasswordUpdate = async () => {
    setLocalError(null);
    setSuccess(null);

    if (!newPassword) {
      setLocalError('Password is required');
      return;
    }

    if (newPassword.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    try {
      await onUpdatePassword(newPassword);
      setSuccess('Password updated successfully');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      // Error handled by Redux
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.match(/^image\/(jpeg|jpg|png|gif|webp)$/)) {
      setLocalError('Please select a valid image file (jpg, png, gif, webp)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setLocalError('File size must be less than 5MB');
      return;
    }

    setLocalError(null);
    setSuccess(null);

    try {
      await onUploadProfilePicture(file);
      setSuccess('Profile picture updated successfully');
    } catch (err) {
      // Error handled by Redux
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    setNewPassword('');
    setConfirmPassword('');
    setLocalError(null);
    setSuccess(null);
    onClose();
  };

  const displayError = error || localError;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Profile Settings</DialogTitle>
      <DialogContent>
        {displayError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {displayError}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {/* Profile Picture Section */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Box sx={{ position: 'relative', mb: 2 }}>
            <Avatar
              src={user?.profilePicture || undefined}
              sx={{ width: 120, height: 120 }}
            >
              {user?.username?.[0]?.toUpperCase()}
            </Avatar>
            <IconButton
              sx={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                bgcolor: 'primary.main',
                '&:hover': { bgcolor: 'primary.dark' },
              }}
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <PhotoCamera />
            </IconButton>
          </Box>
          <Typography variant="h6">{user?.username}</Typography>
          <Typography variant="caption" color="text.secondary">
            Member since {new Date(user?.createdAt || '').toLocaleDateString()}
          </Typography>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Change Password Section */}
        <Typography variant="h6" gutterBottom>
          Change Password
        </Typography>

        <TextField
          margin="normal"
          fullWidth
          name="newPassword"
          label="New Password"
          type={showPassword ? 'text' : 'password'}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={isLoading}
          helperText="Minimum 6 characters"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <TextField
          margin="normal"
          fullWidth
          name="confirmPassword"
          label="Confirm Password"
          type={showConfirmPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isLoading}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  edge="end"
                >
                  {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <Button
          variant="contained"
          onClick={handlePasswordUpdate}
          disabled={isLoading || !newPassword || !confirmPassword}
          sx={{ mt: 2 }}
        >
          Update Password
        </Button>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProfileDialog;

