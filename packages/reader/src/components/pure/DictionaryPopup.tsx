/**
 * Dictionary Popup Component
 * 
 * Displays dictionary lookup results in a beautiful, mobile-optimized popup.
 * Inspired by Yomitan's UI but adapted for React and mobile-first design.
 * 
 * Production features:
 * - Responsive design (mobile & desktop)
 * - Touch-friendly interactions
 * - Smooth animations
 * - Audio pronunciation support (future)
 * - Anki integration ready
 * - Accessibility compliant
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Divider,
  Chip,
  useTheme,
  useMediaQuery,
  Fade,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  VolumeUp as AudioIcon,
  AddCircleOutline as AddToAnkiIcon,
  ArrowForward as NextIcon,
  ArrowBack as PrevIcon,
} from '@mui/icons-material';

interface DictionaryDefinition {
  dictionary: string;
  glossary: (string | { type: string; content: string } | any)[];
  tags?: string;
  score: number;
}

interface DictionaryEntry {
  expression: string;
  reading: string;
  definitions: DictionaryDefinition[];
  deinflectionSource?: string;
  deinflectionRule?: string;
}

export interface DictionaryPopupProps {
  entries: DictionaryEntry[];
  position: { x: number; y: number };
  onClose: () => void;
  onAddToAnki?: (entry: DictionaryEntry, definitionIndex: number) => void;
  onPlayAudio?: (expression: string, reading: string) => void;
  maxWidth?: number;
  maxHeight?: number;
}

/**
 * Render Yomitan structured content with proper formatting
 * This preserves the nice formatting that Yomitan has
 */
const renderStructuredContent = (content: any, key?: string | number): React.ReactNode => {
  if (content == null) {
    return null;
  }

  // Plain string
  if (typeof content === 'string') {
    return content;
  }

  // Array of content
  if (Array.isArray(content)) {
    return content.map((item, i) => (
      <React.Fragment key={`${key}-${i}`}>
        {renderStructuredContent(item, `${key}-${i}`)}
      </React.Fragment>
    ));
  }

  // Structured object with tag
  if (typeof content === 'object' && 'tag' in content) {
    const { tag, content: innerContent, style, data, lang } = content;
    const reactKey = key || Math.random().toString();

    // Apply styles
    const inlineStyle: React.CSSProperties = {};
    if (style) {
      Object.assign(inlineStyle, style);
    }

    switch (tag) {
      case 'br':
        return <br key={reactKey} />;

      case 'ruby':
        return (
          <ruby key={reactKey} style={inlineStyle}>
            {renderStructuredContent(innerContent, reactKey)}
          </ruby>
        );

      case 'rt':
        return (
          <rt key={reactKey} style={inlineStyle}>
            {renderStructuredContent(innerContent, reactKey)}
          </rt>
        );

      case 'span':
        return (
          <span key={reactKey} style={inlineStyle} lang={lang}>
            {renderStructuredContent(innerContent, reactKey)}
          </span>
        );

      case 'div':
        // Special handling for example sentences
        if (data?.content === 'example-sentence') {
          return (
            <Box
              key={reactKey}
              sx={{
                my: 1,
                p: 1.5,
                backgroundColor: 'action.hover',
                borderRadius: 1,
                borderLeft: '3px solid',
                borderColor: 'primary.main',
              }}
            >
              {renderStructuredContent(innerContent, reactKey)}
            </Box>
          );
        }

        // Example sentence parts
        if (data?.content === 'example-sentence-a') {
          return (
            <Box key={reactKey} sx={{ mb: 0.5, fontSize: '0.95rem', fontWeight: 500 }}>
              {renderStructuredContent(innerContent, reactKey)}
            </Box>
          );
        }

        if (data?.content === 'example-sentence-b') {
          return (
            <Box key={reactKey} sx={{ fontSize: '0.9rem', color: 'text.secondary', fontStyle: 'italic' }}>
              {renderStructuredContent(innerContent, reactKey)}
            </Box>
          );
        }

        // Extra info boxes (notes, etc.)
        if (data?.content === 'extra-info') {
          return (
            <Box
              key={reactKey}
              sx={{
                my: 0.5,
                p: 1,
                backgroundColor: 'info.main',
                color: 'info.contrastText',
                borderRadius: 0.5,
                fontSize: '0.85rem',
                opacity: 0.9,
              }}
            >
              {renderStructuredContent(innerContent, reactKey)}
            </Box>
          );
        }

        // Note labels
        if (data?.content === 'sense-note-label') {
          return (
            <strong key={reactKey} style={{ marginRight: 4 }}>
              {renderStructuredContent(innerContent, reactKey)}:
            </strong>
          );
        }

        // Regular div
        return (
          <div key={reactKey} style={inlineStyle}>
            {renderStructuredContent(innerContent, reactKey)}
          </div>
        );

      case 'ul':
        return (
          <ul key={reactKey} style={{ margin: 0, paddingLeft: '1.5em', ...inlineStyle }}>
            {renderStructuredContent(innerContent, reactKey)}
          </ul>
        );

      case 'ol':
        return (
          <ol key={reactKey} style={{ margin: 0, paddingLeft: '1.5em', ...inlineStyle }}>
            {renderStructuredContent(innerContent, reactKey)}
          </ol>
        );

      case 'li':
        return (
          <li key={reactKey} style={inlineStyle}>
            {renderStructuredContent(innerContent, reactKey)}
          </li>
        );

      case 'a':
        return (
          <a
            key={reactKey}
            href={content.href}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'underline', ...inlineStyle }}
          >
            {renderStructuredContent(innerContent, reactKey)}
          </a>
        );

      case 'strong':
      case 'b':
        return (
          <strong key={reactKey} style={inlineStyle}>
            {renderStructuredContent(innerContent, reactKey)}
          </strong>
        );

      case 'em':
      case 'i':
        return (
          <em key={reactKey} style={inlineStyle}>
            {renderStructuredContent(innerContent, reactKey)}
          </em>
        );

      default:
        // Unknown tag - just render content
        return renderStructuredContent(innerContent, reactKey);
    }
  }

  // Object with just 'content' property
  if (typeof content === 'object' && 'content' in content) {
    return renderStructuredContent(content.content, key);
  }

  // Fallback
  return null;
};

/**
 * Helper function to render glossary content
 * Handles both plain strings and structured Yomitan content
 */
const renderGlossaryContent = (meaning: any): React.ReactNode => {
  return renderStructuredContent(meaning);
};

const DictionaryPopup: React.FC<DictionaryPopupProps> = ({
  entries,
  position,
  onClose,
  onAddToAnki,
  onPlayAudio,
  maxWidth = 400,
  maxHeight = 500,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const popupRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  const currentEntry = entries[currentIndex];

  // Adjust popup position to stay within viewport
  useEffect(() => {
    if (!popupRef.current) return;

    const popup = popupRef.current;
    const rect = popup.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let { x, y } = position;

    // Adjust horizontal position
    if (x + rect.width > viewportWidth - 20) {
      x = viewportWidth - rect.width - 20;
    }
    if (x < 20) {
      x = 20;
    }

    // Adjust vertical position
    // Try to position below the clicked point first
    const spaceBelow = viewportHeight - y - 20;
    const spaceAbove = y - 20;

    if (rect.height > spaceBelow && spaceAbove > spaceBelow) {
      // Position above if more space available
      y = y - rect.height - 10;
    } else {
      // Position below
      y = y + 20;
    }

    // Ensure popup stays within vertical bounds
    if (y + rect.height > viewportHeight - 20) {
      y = viewportHeight - rect.height - 20;
    }
    if (y < 20) {
      y = 20;
    }

    setAdjustedPosition({ x, y });
  }, [position, currentEntry]);

  // Handle navigation
  const handlePrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(entries.length - 1, prev + 1));
  };

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!currentEntry) return null;

  return (
    <>
      {/* Backdrop - click to close */}
      <Fade in>
        <Box
          onClick={onClose}
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9998,
            backgroundColor: 'transparent',
          }}
        />
      </Fade>

      {/* Popup */}
      <Fade in>
        <Paper
          ref={popupRef}
          elevation={8}
          onClick={(e) => e.stopPropagation()}
          sx={{
            position: 'fixed',
            // Mobile: full width at bottom
            ...(isMobile ? {
              left: 0,
              right: 0,
              bottom: 0,
              top: 'auto',
              maxHeight: '70vh',
              borderRadius: '16px 16px 0 0',
            } : {
              // Desktop: positioned near click
              left: adjustedPosition.x,
              top: adjustedPosition.y,
              width: maxWidth,
              maxWidth: maxWidth,
              maxHeight: maxHeight,
              borderRadius: 2,
            }),
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9999,
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(30, 30, 30, 0.98)'
              : 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          {/* Header */}
          <Box
            sx={{
              px: 2,
              py: 1.5,
              backgroundColor: theme.palette.mode === 'dark'
                ? 'rgba(40, 40, 40, 0.8)'
                : 'rgba(240, 240, 240, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" flex={1}>
              {/* Expression */}
              <Typography
                variant="h5"
                component="span"
                sx={{
                  fontFamily: '"Noto Sans JP", sans-serif',
                  fontWeight: 500,
                  color: theme.palette.primary.main,
                }}
              >
                {currentEntry.expression}
              </Typography>

              {/* Reading */}
              {currentEntry.reading && currentEntry.reading !== currentEntry.expression && (
                <Typography
                  variant="body1"
                  component="span"
                  sx={{
                    color: theme.palette.text.secondary,
                    fontFamily: '"Noto Sans JP", sans-serif',
                  }}
                >
                  【{currentEntry.reading}】
                </Typography>
              )}

              {/* Audio button */}
              {onPlayAudio && (
                <Tooltip title="Play pronunciation">
                  <IconButton
                    size="small"
                    onClick={() => onPlayAudio(currentEntry.expression, currentEntry.reading)}
                    sx={{ ml: 0.5 }}
                  >
                    <AudioIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>

            {/* Navigation and close */}
            <Stack direction="row" spacing={0.5} alignItems="center">
              {entries.length > 1 && (
                <>
                  <IconButton
                    size="small"
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                  >
                    <PrevIcon fontSize="small" />
                  </IconButton>
                  <Typography variant="caption" sx={{ mx: 0.5, minWidth: 40, textAlign: 'center' }}>
                    {currentIndex + 1} / {entries.length}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={handleNext}
                    disabled={currentIndex === entries.length - 1}
                  >
                    <NextIcon fontSize="small" />
                  </IconButton>
                  <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                </>
              )}
              <IconButton size="small" onClick={onClose}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Box>

          {/* Deinflection info */}
          {currentEntry.deinflectionSource && (
            <Box
              sx={{
                px: 2,
                py: 1,
                backgroundColor: theme.palette.info.main + '20',
                borderBottom: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Typography variant="caption" color="info.main">
                <strong>{currentEntry.deinflectionSource}</strong> → {currentEntry.expression}{' '}
                ({currentEntry.deinflectionRule})
              </Typography>
            </Box>
          )}

          {/* Definitions */}
          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              px: 2,
              py: 2,
            }}
          >
            {currentEntry.definitions.map((def, defIndex) => (
              <Box key={defIndex} sx={{ mb: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                  {/* Dictionary name */}
                  <Typography
                    variant="caption"
                    sx={{
                      color: theme.palette.text.secondary,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      fontWeight: 600,
                    }}
                  >
                    {def.dictionary}
                  </Typography>

                  {/* Add to Anki button */}
                  {onAddToAnki && (
                    <Tooltip title="Add to Anki">
                      <IconButton
                        size="small"
                        onClick={() => onAddToAnki(currentEntry, defIndex)}
                        sx={{ mt: -0.5, mr: -0.5 }}
                      >
                        <AddToAnkiIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>

                {/* Tags */}
                {def.tags && (
                  <Box sx={{ mb: 1 }}>
                    {def.tags.split(' ').map((tag, tagIndex) => (
                      <Chip
                        key={tagIndex}
                        label={tag}
                        size="small"
                        sx={{
                          mr: 0.5,
                          mb: 0.5,
                          height: 20,
                          fontSize: '0.7rem',
                        }}
                      />
                    ))}
                  </Box>
                )}

                {/* Glossary */}
                <Box sx={{ my: 1 }}>
                  {def.glossary.map((meaning, meaningIndex) => {
                    const displayContent = renderGlossaryContent(meaning);
                    
                    // Skip empty content
                    if (!displayContent) {
                      return null;
                    }
                    
                    return (
                      <Box
                        key={meaningIndex}
                        sx={{
                          mb: 1,
                          '&:last-child': { mb: 0 },
                        }}
                      >
                        {displayContent}
                      </Box>
                    );
                  })}
                </Box>

                {defIndex < currentEntry.definitions.length - 1 && (
                  <Divider sx={{ mt: 2 }} />
                )}
              </Box>
            ))}
          </Box>

          {/* Footer with hints (mobile) */}
          {isMobile && (
            <Box
              sx={{
                px: 2,
                py: 1,
                backgroundColor: theme.palette.mode === 'dark'
                  ? 'rgba(40, 40, 40, 0.8)'
                  : 'rgba(240, 240, 240, 0.8)',
                borderTop: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Typography variant="caption" color="text.secondary" align="center" display="block">
                Tap outside to close
              </Typography>
            </Box>
          )}
        </Paper>
      </Fade>
    </>
  );
};

export default DictionaryPopup;

