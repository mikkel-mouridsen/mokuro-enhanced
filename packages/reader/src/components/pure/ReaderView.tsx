import React, { useEffect, useRef, useState } from 'react';
import { Box, IconButton, Paper, Typography, CircularProgress, useTheme, Tooltip } from '@mui/material';
import {
  NavigateBefore,
  NavigateNext,
  ZoomIn,
  ZoomOut,
  FitScreen,
  ArrowBack,
  Settings,
} from '@mui/icons-material';
import panzoom, { PanZoom } from 'panzoom';
import { MangaPage, TextBlock, ReaderSettings } from '../../store/models';

export interface ReaderViewProps {
  pages: MangaPage[];
  currentPageIndex: number;
  onPageChange: (pageIndex: number) => void;
  loading?: boolean;
  title?: string;
  onBackToLibrary?: () => void;
  onSettingsClick?: () => void;
  settings?: ReaderSettings;
}

// Separate component for individual text blocks to handle hover state
interface OCRTextBlockProps {
  block: TextBlock;
  index: number;
  settings?: ReaderSettings;
}

const OCRTextBlock: React.FC<OCRTextBlockProps> = ({ block, index, settings }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [x1, y1, x2, y2] = block.box;
  
  // Use absolute pixel positioning like mokuro does
  const left = x1;
  const top = y1;
  const width = x2 - x1;
  const height = y2 - y1;

  // Get font size from settings or block
  const useCustomFontSize = settings?.fontSize && settings.fontSize !== 'auto';
  
  // In auto mode: Use the actual detected font size (no clipping)
  // The OCR detector provides accurate font sizes that should be preserved
  // Only use a minimum of 12px to ensure readability
  const blockFontSize = block.fontSize ? Math.max(12, block.fontSize) : 16;
  
  // Container always uses the block's detected font size for proper layout (in px)
  // In auto mode, <p> elements inherit this
  // In custom mode, <p> elements override with the selected font size (in pt)
  const textFontSize = useCustomFontSize ? `${settings.fontSize}pt` : undefined;
  
  // Debug: Log font sizes for first few blocks to verify variation
  if (index < 5) {
    console.log(`Block ${index}: fontSize=${block.fontSize}px → using ${blockFontSize}px (auto) or ${settings?.fontSize}pt (custom)`);
  }

  // Determine visibility based on settings
  const showOnHover = settings?.displayOCR !== false;
  const showBorders = settings?.textBoxBorders || false;
  const isEditable = settings?.editableText || false;
  const toggleOnClick = settings?.toggleOCRTextBoxes || false;

  const handleClick = () => {
    if (toggleOnClick) {
      setIsClicked(!isClicked);
    }
  };

  const shouldShowText = toggleOnClick ? isClicked : isHovered;

  return (
    <div
      key={index}
      className="ocr-text-box"
      style={{
        position: 'absolute',
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
        padding: 0,
        fontSize: `${blockFontSize}px`, // Always use block's detected size for container
        lineHeight: '1.1em',
        whiteSpace: 'nowrap',
        border: showBorders ? '1px solid rgba(255, 0, 0, 0.5)' : '1px solid rgba(0, 0, 0, 0)',
        cursor: toggleOnClick ? 'pointer' : 'text',
        zIndex: shouldShowText ? 999 : 1,
        pointerEvents: showOnHover ? 'auto' : 'none',
        backgroundColor: shouldShowText ? 'rgb(255, 255, 255)' : 'transparent',
        writingMode: block.vertical ? 'vertical-rl' : undefined,
        fontFamily: '"Noto Sans JP", "Meiryo", "MS Gothic", sans-serif',
      }}
      onMouseEnter={() => !toggleOnClick && setIsHovered(true)}
      onMouseLeave={() => !toggleOnClick && setIsHovered(false)}
      onClick={handleClick}
    >
      {block.lines.map((line, lineIndex) => (
        <p
          key={lineIndex}
          contentEditable={isEditable && shouldShowText}
          style={{
            display: shouldShowText ? 'table' : 'none',
            margin: 0,
            padding: 0,
            whiteSpace: 'nowrap',
            letterSpacing: '0.1em',
            lineHeight: '1.1em',
            backgroundColor: 'rgb(255, 255, 255)',
            color: '#000',
            userSelect: isEditable ? 'text' : 'auto',
            outline: isEditable ? '1px dashed #ccc' : 'none',
            // When custom font size is set, override with pt units like mokuro
            fontSize: useCustomFontSize ? textFontSize : undefined,
          }}
        >
          {line}
        </p>
      ))}
    </div>
  );
};

const ReaderView: React.FC<ReaderViewProps> = ({
  pages,
  currentPageIndex,
  onPageChange,
  loading = false,
  title,
  onBackToLibrary,
  onSettingsClick,
  settings,
}) => {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const pagesContainerRef = useRef<HTMLDivElement>(null);
  const panzoomInstance = useRef<PanZoom | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const isDoublePageMode = settings?.pageLayout === 'double';
  const isRTL = settings?.readingDirection === 'rtl';

  // Set up Yomitan event listeners
  useEffect(() => {
    // Only set up listeners if running in Electron
    if (!window.electronAPI || typeof window.electronAPI.sendYomitanEvent !== 'function') {
      return;
    }

    const handlePopupShown = () => {
      console.log('Yomitan popup shown');
      window.electronAPI.sendYomitanEvent(true);
    };

    const handlePopupHidden = () => {
      console.log('Yomitan popup hidden');
      window.electronAPI.sendYomitanEvent(false);
    };

    // Add event listeners for Yomitan popup events
    window.addEventListener('yomitan-popup-shown', handlePopupShown);
    window.addEventListener('yomitan-popup-hidden', handlePopupHidden);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('yomitan-popup-shown', handlePopupShown);
      window.removeEventListener('yomitan-popup-hidden', handlePopupHidden);
    };
  }, []);
  
  // Get the pages to display
  const getPagesToDisplay = () => {
    const hasCover = settings?.hasCover ?? false;
    
    if (!isDoublePageMode) {
      return [pages[currentPageIndex]];
    }
    
    // In double page mode with cover:
    // - First page (index 0) should be shown alone as it's the cover
    // - Subsequent pages should be paired starting from page 2
    if (hasCover && currentPageIndex === 0) {
      // Show cover page alone
      return [pages[0]];
    }
    
    // In double page mode, show current and next page
    const pagesToShow = [pages[currentPageIndex]];
    if (currentPageIndex + 1 < pages.length) {
      pagesToShow.push(pages[currentPageIndex + 1]);
    }
    
    // In RTL mode, reverse the order so second page appears on the left
    return isRTL ? pagesToShow.reverse() : pagesToShow;
  };

  const displayPages = getPagesToDisplay();
  const currentPage = pages[currentPageIndex];
  
  // Debug: Log page data structure to verify textBlocks
  React.useEffect(() => {
    if (currentPage?.textBlocks && currentPage.textBlocks.length > 0) {
      console.log('Current page textBlocks sample:', {
        totalBlocks: currentPage.textBlocks.length,
        firstBlock: currentPage.textBlocks[0],
        secondBlock: currentPage.textBlocks[1],
        thirdBlock: currentPage.textBlocks[2],
      });
    }
  }, [currentPageIndex]);

  // Reset image loaded state when page changes
  useEffect(() => {
    setImageLoaded(false);
  }, [currentPageIndex]);

  // Initialize panzoom once on mount
  useEffect(() => {
    if (!pagesContainerRef.current) {
      return;
    }

    // Initialize panzoom
    panzoomInstance.current = panzoom(pagesContainerRef.current, {
      bounds: true,
      boundsPadding: 0.1,
      maxZoom: 10,
      minZoom: 0.1,
      zoomDoubleClickSpeed: 1,
      smoothScroll: false,
      zoomSpeed: 0.1,
      beforeMouseDown: (e) => {
        // Allow text selection for text boxes
        const target = e.target as HTMLElement;
        if (target.closest('.ocr-text-box')) {
          return true; // Disable panning when clicking on text boxes
        }
        return false;
      },
      beforeWheel: (e) => {
        // Don't zoom when hovering over text boxes
        const target = e.target as HTMLElement;
        if (target.closest('.ocr-text-box')) {
          return true;
        }
        return false;
      },
      onTouch: (e) => {
        // Allow multi-touch for zooming
        if (e.touches.length > 1) {
          return true;
        }
        return false;
      },
    });

    return () => {
      if (panzoomInstance.current) {
        panzoomInstance.current.dispose();
        panzoomInstance.current = null;
      }
    };
  }, []);

  // Apply zoom based on settings when image loads
  useEffect(() => {
    if (!imageLoaded || !panzoomInstance.current || !containerRef.current || !pagesContainerRef.current) {
      return;
    }

    const zoomMode = settings?.defaultZoomMode || 'fit-to-screen';
    
    // If keep-level, don't change zoom
    if (zoomMode === 'keep-level') {
      return;
    }

    // Use requestAnimationFrame to ensure DOM is fully updated
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!panzoomInstance.current || !containerRef.current || !pagesContainerRef.current) {
          return;
        }

        const containerRect = containerRef.current.getBoundingClientRect();
        const pcWidth = pagesContainerRef.current.offsetWidth;
        const pcHeight = pagesContainerRef.current.offsetHeight;
        
        if (pcWidth === 0 || pcHeight === 0) {
          console.warn('Container has no dimensions:', { pcWidth, pcHeight });
          return;
        }

        const screenWidth = containerRect.width;
        const screenHeight = containerRect.height;
        
        let targetScale = 1;
        
        switch (zoomMode) {
          case 'fit-to-screen': {
            // Calculate scale to fit both width and height (with slight padding)
            const scaleX = (screenWidth * 0.95) / pcWidth;
            const scaleY = (screenHeight * 0.95) / pcHeight;
            targetScale = Math.min(scaleX, scaleY);
            break;
          }
          case 'fit-to-width': {
            // Fit width only
            targetScale = (screenWidth * 0.95) / pcWidth;
            break;
          }
          case 'original': {
            // Original size (1:1)
            targetScale = 1;
            break;
          }
        }

        console.log('Applying zoom mode:', zoomMode, 'scale:', targetScale);

        // Reset to identity transform first
        panzoomInstance.current.zoomAbs(0, 0, 1);
        panzoomInstance.current.moveTo(0, 0);
        
        // Apply target scale
        panzoomInstance.current.zoomAbs(0, 0, targetScale);
        
        // Center the image
        const x = (screenWidth - pcWidth * targetScale) / 2;
        const y = (screenHeight - pcHeight * targetScale) / 2;
        
        panzoomInstance.current.moveTo(x, y);
      });
    });

    return () => cancelAnimationFrame(rafId);
  }, [imageLoaded, settings?.defaultZoomMode]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isRTL = settings?.readingDirection === 'rtl';
      
      switch (e.key) {
        case 'ArrowLeft':
        case 'PageUp':
          // In RTL, left arrow goes forward; in LTR, it goes back
          if (isRTL) {
            handleNextPage();
          } else {
            handlePreviousPage();
          }
          break;
        case 'ArrowRight':
        case 'PageDown':
        case ' ':
          e.preventDefault();
          // In RTL, right arrow goes back; in LTR, it goes forward
          if (isRTL) {
            handlePreviousPage();
          } else {
            handleNextPage();
          }
          break;
        case 'Home':
          onPageChange(isRTL ? pages.length - 1 : 0);
          break;
        case 'End':
          onPageChange(isRTL ? 0 : pages.length - 1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPageIndex, pages.length, settings?.readingDirection, settings?.pageLayout, settings?.hasCover]);

  // Reset image loaded state when page changes
  useEffect(() => {
    setImageLoaded(false);
  }, [currentPageIndex]);

  const handlePreviousPage = () => {
    const isRTL = settings?.readingDirection === 'rtl';
    const isDouble = settings?.pageLayout === 'double';
    const hasCover = settings?.hasCover ?? false;
    
    // Calculate step based on current position and cover setting
    let step = isDouble ? 2 : 1;
    
    // Special handling for cover page in double page mode
    if (isDouble && hasCover) {
      if (currentPageIndex === 1) {
        // Going back from page 1 to cover (page 0)
        step = 1;
      } else if (currentPageIndex === 0) {
        // Already at cover, can't go back
        step = 0;
      }
    }
    
    if (isRTL) {
      // In RTL, previous means going forward (right to left reading)
      const nextIndex = currentPageIndex + step;
      if (nextIndex < pages.length) {
        onPageChange(nextIndex);
      }
    } else {
      // In LTR, previous means going backward
      const prevIndex = currentPageIndex - step;
      if (prevIndex >= 0) {
        onPageChange(prevIndex);
      }
    }
  };

  const handleNextPage = () => {
    const isRTL = settings?.readingDirection === 'rtl';
    const isDouble = settings?.pageLayout === 'double';
    const hasCover = settings?.hasCover ?? false;
    
    // Calculate step based on current position and cover setting
    let step = isDouble ? 2 : 1;
    
    // Special handling for cover page in double page mode
    if (isDouble && hasCover && currentPageIndex === 0) {
      // Going from cover (page 0) to page 1
      step = 1;
    }
    
    if (isRTL) {
      // In RTL, next means going backward (right to left reading)
      const prevIndex = currentPageIndex - step;
      if (prevIndex >= 0) {
        onPageChange(prevIndex);
      }
    } else {
      // In LTR, next means going forward
      const nextIndex = currentPageIndex + step;
      if (nextIndex < pages.length) {
        onPageChange(nextIndex);
      }
    }
  };

  const handleZoomIn = () => {
    if (panzoomInstance.current) {
      const transform = panzoomInstance.current.getTransform();
      panzoomInstance.current.zoomTo(0, 0, transform.scale * 1.2);
    }
  };

  const handleZoomOut = () => {
    if (panzoomInstance.current) {
      const transform = panzoomInstance.current.getTransform();
      panzoomInstance.current.zoomTo(0, 0, transform.scale / 1.2);
    }
  };

  const handleFitToScreen = () => {
    if (!panzoomInstance.current || !containerRef.current || !pagesContainerRef.current) {
      return;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const pcWidth = pagesContainerRef.current.offsetWidth;
    const pcHeight = pagesContainerRef.current.offsetHeight;
    
    if (pcWidth === 0 || pcHeight === 0) {
      return;
    }

    const screenWidth = containerRect.width;
    const screenHeight = containerRect.height;
    
    // Calculate scale to fit (with slight padding)
    const scaleX = (screenWidth * 0.95) / pcWidth;
    const scaleY = (screenHeight * 0.95) / pcHeight;
    const targetScale = Math.min(scaleX, scaleY);

    // Reset to identity transform first
    panzoomInstance.current.zoomAbs(0, 0, 1);
    panzoomInstance.current.moveTo(0, 0);
    
    // Apply target scale
    panzoomInstance.current.zoomAbs(0, 0, targetScale);
    
    // Center the image
    const x = (screenWidth - pcWidth * targetScale) / 2;
    const y = (screenHeight - pcHeight * targetScale) / 2;
    
    panzoomInstance.current.moveTo(x, y);
  };

  // Helper to check if we can navigate
  const canNavigateNext = () => {
    const isRTL = settings?.readingDirection === 'rtl';
    const hasCover = settings?.hasCover ?? false;
    
    let step = isDoublePageMode ? 2 : 1;
    if (isDoublePageMode && hasCover && currentPageIndex === 0) {
      step = 1;
    }
    
    if (isRTL) {
      return currentPageIndex - step >= 0;
    } else {
      return currentPageIndex + step < pages.length;
    }
  };

  const canNavigatePrevious = () => {
    const isRTL = settings?.readingDirection === 'rtl';
    const hasCover = settings?.hasCover ?? false;
    
    let step = isDoublePageMode ? 2 : 1;
    if (isDoublePageMode && hasCover && (currentPageIndex === 0 || currentPageIndex === 1)) {
      step = currentPageIndex === 0 ? 0 : 1;
    }
    
    if (isRTL) {
      return currentPageIndex + step < pages.length;
    } else {
      return currentPageIndex - step >= 0;
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: 2,
        }}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" color="text.secondary">
          Loading manga...
        </Typography>
      </Box>
    );
  }

  if (!currentPage) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
        }}
      >
        <Typography variant="h5" color="text.secondary">
          No page selected
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        backgroundColor: settings?.backgroundColor || 'background.default',
        overflow: 'hidden',
      }}
    >
      {/* Top Controls */}
      <Paper
        elevation={3}
        sx={{
          position: 'fixed',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          px: 2,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          backgroundColor: theme.palette.mode === 'dark' 
            ? 'rgba(30, 30, 30, 0.95)' 
            : 'rgba(255, 255, 255, 0.95)',
        }}
      >
        {/* Back to Library Button */}
        {onBackToLibrary && (
          <>
            <Tooltip title="Back to Library">
              <IconButton onClick={onBackToLibrary} size="small">
                <ArrowBack />
              </IconButton>
            </Tooltip>
            <Box sx={{ borderLeft: '1px solid #ccc', height: 24, mx: 1 }} />
          </>
        )}

        <Typography variant="body2" sx={{ minWidth: 100, textAlign: 'center' }}>
          {isDoublePageMode && currentPageIndex + 1 < pages.length
            ? `${currentPageIndex + 1}-${currentPageIndex + 2} / ${pages.length}`
            : `${currentPageIndex + 1} / ${pages.length}`}
        </Typography>
        
        <IconButton onClick={handlePreviousPage} disabled={!canNavigatePrevious()} size="small">
          <NavigateBefore />
        </IconButton>
        
        <IconButton
          onClick={handleNextPage}
          disabled={!canNavigateNext()}
          size="small"
        >
          <NavigateNext />
        </IconButton>

        <Box sx={{ borderLeft: '1px solid #ccc', height: 24, mx: 1 }} />

        <IconButton onClick={handleZoomIn} size="small">
          <ZoomIn />
        </IconButton>
        
        <IconButton onClick={handleZoomOut} size="small">
          <ZoomOut />
        </IconButton>
        
        <IconButton onClick={handleFitToScreen} size="small">
          <FitScreen />
        </IconButton>

        {onSettingsClick && (
          <>
            <Box sx={{ borderLeft: '1px solid #ccc', height: 24, mx: 1 }} />
            <Tooltip title="Settings">
              <IconButton onClick={onSettingsClick} size="small">
                <Settings />
              </IconButton>
            </Tooltip>
          </>
        )}

        {title && (
          <>
            <Box sx={{ borderLeft: '1px solid #ccc', height: 24, mx: 1 }} />
            <Typography variant="body2" sx={{ maxWidth: 300 }} noWrap>
              {title}
            </Typography>
          </>
        )}
      </Paper>

      {/* Page Container */}
      <Box
        ref={containerRef}
        sx={{
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div 
          ref={pagesContainerRef} 
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            display: 'flex',
            flexDirection: 'row',
            gap: '0px',
            touchAction: 'none',
          }}
        >
          {displayPages.map((page, idx) => {
            const pageIndex = pages.findIndex(p => p.id === page.id);
            return (
              <div
                key={page.id}
                style={{
                  position: 'relative',
                  display: 'inline-block',
                }}
              >
                <img
                  src={page.path}
                  alt={`Page ${pageIndex + 1}`}
                  onLoad={() => {
                    if (idx === displayPages.length - 1) {
                      setImageLoaded(true);
                    }
                  }}
                  onError={() => {
                    console.error('Failed to load image:', page.path);
                    if (idx === displayPages.length - 1) {
                      setImageLoaded(true);
                    }
                  }}
                  style={{
                    display: 'block',
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}
                  draggable={false}
                />
                {imageLoaded && page.textBlocks && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'none',
                    }}
                  >
                    {settings?.displayOCR !== false && page.textBlocks.map((block, blockIndex) => (
                      <OCRTextBlock 
                        key={`${page.id}-${blockIndex}`} 
                        block={block} 
                        index={blockIndex}
                        settings={settings}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Box>

      {/* Navigation Areas (left and right click zones) */}
      <Box
        onClick={handlePreviousPage}
        sx={{
          position: 'fixed',
          left: 0,
          top: '10vh',
          width: '15vw',
          height: '80vh',
          cursor: currentPageIndex > 0 ? 'pointer' : 'default',
          zIndex: 1,
          '&:hover': {
            backgroundColor: currentPageIndex > 0 
              ? theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.05)' 
                : 'rgba(0, 0, 0, 0.05)' 
              : 'transparent',
          },
        }}
      />
      <Box
        onClick={handleNextPage}
        sx={{
          position: 'fixed',
          right: 0,
          top: '10vh',
          width: '15vw',
          height: '80vh',
          cursor: currentPageIndex < pages.length - 1 ? 'pointer' : 'default',
          zIndex: 1,
          '&:hover': {
            backgroundColor: currentPageIndex < pages.length - 1 
              ? theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.05)' 
                : 'rgba(0, 0, 0, 0.05)' 
              : 'transparent',
          },
        }}
      />
    </Box>
  );
};

export default ReaderView;

