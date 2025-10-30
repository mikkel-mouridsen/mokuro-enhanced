import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Switch,
  Box,
  Typography,
  Slider,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Divider,
  TextField,
} from '@mui/material';
import { ReaderSettings } from '../../store/models';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export interface SettingsDialogProps {
  open: boolean;
  settings: ReaderSettings;
  onClose: () => void;
  onSettingsChange: (settings: Partial<ReaderSettings>) => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({
  open,
  settings,
  onClose,
  onSettingsChange,
}) => {
  const [currentTab, setCurrentTab] = React.useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleChange = (key: keyof ReaderSettings, value: any) => {
    onSettingsChange({ [key]: value });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Reader Settings</DialogTitle>
      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab label="Display" />
            <Tab label="Reading" />
            <Tab label="OCR" />
          </Tabs>
        </Box>

        {/* Display Settings */}
        <TabPanel value={currentTab} index={0}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Dark Mode */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography>Dark Mode</Typography>
              <Switch
                checked={settings.darkMode}
                onChange={(e) => handleChange('darkMode', e.target.checked)}
              />
            </Box>

            {/* Background Color */}
            <Box>
              <Typography gutterBottom>Background Color</Typography>
              <TextField
                type="color"
                value={settings.backgroundColor}
                onChange={(e) => handleChange('backgroundColor', e.target.value)}
                fullWidth
              />
            </Box>

            {/* E-ink Mode */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography>E-ink Mode</Typography>
                <Typography variant="caption" color="text.secondary">
                  Optimized for e-ink displays
                </Typography>
              </Box>
              <Switch
                checked={settings.eInkMode}
                onChange={(e) => handleChange('eInkMode', e.target.checked)}
              />
            </Box>

            {/* Auto Fullscreen */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography>Auto Fullscreen on Load</Typography>
              <Switch
                checked={settings.autoFullscreen}
                onChange={(e) => handleChange('autoFullscreen', e.target.checked)}
              />
            </Box>
          </Box>
        </TabPanel>

        {/* Reading Settings */}
        <TabPanel value={currentTab} index={1}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Page Layout */}
            <FormControl component="fieldset">
              <FormLabel component="legend">Page Layout</FormLabel>
              <RadioGroup
                value={settings.pageLayout}
                onChange={(e) => handleChange('pageLayout', e.target.value)}
              >
                <FormControlLabel value="single" control={<Radio />} label="Single Page" />
                <FormControlLabel value="double" control={<Radio />} label="Double Page" />
              </RadioGroup>
            </FormControl>

            <Divider />

            {/* Reading Direction */}
            <FormControl component="fieldset">
              <FormLabel component="legend">Reading Direction</FormLabel>
              <RadioGroup
                value={settings.readingDirection}
                onChange={(e) => handleChange('readingDirection', e.target.value)}
              >
                <FormControlLabel value="rtl" control={<Radio />} label="Right to Left (Manga)" />
                <FormControlLabel value="ltr" control={<Radio />} label="Left to Right" />
              </RadioGroup>
            </FormControl>

            <Divider />

            {/* First Page is Cover */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography>First Page is Cover</Typography>
              <Switch
                checked={settings.hasCover}
                onChange={(e) => handleChange('hasCover', e.target.checked)}
              />
            </Box>

            <Divider />

            {/* Default Zoom Mode */}
            <FormControl fullWidth>
              <FormLabel>On Page Turn</FormLabel>
              <Select
                value={settings.defaultZoomMode}
                onChange={(e) => handleChange('defaultZoomMode', e.target.value)}
              >
                <MenuItem value="fit-to-screen">Fit to Screen</MenuItem>
                <MenuItem value="fit-to-width">Fit to Width</MenuItem>
                <MenuItem value="original">Original Size</MenuItem>
                <MenuItem value="keep-level">Keep Zoom Level</MenuItem>
              </Select>
            </FormControl>

            <Divider />

            {/* Ctrl to Pan */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography>Ctrl + Mouse to Move</Typography>
                <Typography variant="caption" color="text.secondary">
                  Hold Ctrl while dragging to pan
                </Typography>
              </Box>
              <Switch
                checked={settings.ctrlToPan}
                onChange={(e) => handleChange('ctrlToPan', e.target.checked)}
              />
            </Box>
          </Box>
        </TabPanel>

        {/* OCR Settings */}
        <TabPanel value={currentTab} index={2}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Display OCR */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography>OCR Enabled</Typography>
                <Typography variant="caption" color="text.secondary">
                  Show text overlay on pages
                </Typography>
              </Box>
              <Switch
                checked={settings.displayOCR}
                onChange={(e) => handleChange('displayOCR', e.target.checked)}
              />
            </Box>

            <Divider />

            {/* Text Box Borders */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography>Display Text Box Outlines</Typography>
              <Switch
                checked={settings.textBoxBorders}
                onChange={(e) => handleChange('textBoxBorders', e.target.checked)}
              />
            </Box>

            <Divider />

            {/* Editable Text */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography>Editable Text</Typography>
              <Switch
                checked={settings.editableText}
                onChange={(e) => handleChange('editableText', e.target.checked)}
              />
            </Box>

            <Divider />

            {/* Toggle OCR on Click */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography>Toggle OCR Text Boxes on Click</Typography>
                <Typography variant="caption" color="text.secondary">
                  Click text boxes to toggle visibility
                </Typography>
              </Box>
              <Switch
                checked={settings.toggleOCRTextBoxes}
                onChange={(e) => handleChange('toggleOCRTextBoxes', e.target.checked)}
              />
            </Box>

            <Divider />

            {/* Font Size */}
            <FormControl fullWidth>
              <FormLabel>Font Size</FormLabel>
              <Select
                value={settings.fontSize}
                onChange={(e) => handleChange('fontSize', e.target.value)}
              >
                <MenuItem value="auto">Auto</MenuItem>
                <MenuItem value={9}>9px</MenuItem>
                <MenuItem value={10}>10px</MenuItem>
                <MenuItem value={11}>11px</MenuItem>
                <MenuItem value={12}>12px</MenuItem>
                <MenuItem value={14}>14px</MenuItem>
                <MenuItem value={16}>16px</MenuItem>
                <MenuItem value={18}>18px</MenuItem>
                <MenuItem value={20}>20px</MenuItem>
                <MenuItem value={24}>24px</MenuItem>
                <MenuItem value={32}>32px</MenuItem>
                <MenuItem value={40}>40px</MenuItem>
                <MenuItem value={48}>48px</MenuItem>
                <MenuItem value={60}>60px</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </TabPanel>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SettingsDialog;

