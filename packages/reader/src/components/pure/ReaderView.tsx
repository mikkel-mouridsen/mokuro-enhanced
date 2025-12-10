import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, IconButton, Paper, Typography, CircularProgress, useTheme, Tooltip, Fab, useMediaQuery, Slide, Menu, MenuItem, ListItemIcon, ListItemText, Alert, Snackbar } from '@mui/material';
import {
  NavigateBefore,
  NavigateNext,
  ZoomIn,
  ZoomOut,
  FitScreen,
  ArrowBack,
  Settings,
  Image as ImageIcon,
  MoreVert,
} from '@mui/icons-material';
import panzoom, { PanZoom } from 'panzoom';
import { MangaPage, TextBlock, ReaderSettings } from '../../store/models';
import { useAnkiScreenshot } from '../../hooks/useAnkiScreenshot';
import { useDictionaryLookup } from '../../hooks/useDictionaryLookup';
import { ankiConnectService } from '../../services/anki-connect.service';
import { getAbsoluteImageUrl } from '../../utils/image-url';
import DictionaryPopup from './DictionaryPopup';

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
  onTextInteraction?: (event: React.MouseEvent | React.TouchEvent) => void;
}

const OCRTextBlock: React.FC<OCRTextBlockProps> = ({ block, index, settings, onTextInteraction }) => {
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
      onClick={(e) => {
        if (toggleOnClick) {
          handleClick();
        }
        // Pass click event to dictionary lookup handler
        if (onTextInteraction) {
          onTextInteraction(e);
        }
      }}
      onTouchEnd={(e) => {
        // Only pass touchend for dictionary lookup (single tap)
        if (onTextInteraction) {
          onTextInteraction(e);
        }
      }}
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
  const currentPageImageRef = useRef<HTMLImageElement | null>(null);
  const [ankiSnackbar, setAnkiSnackbar] = useState<{open: boolean; message: string; severity: 'success' | 'error'}>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [topBarVisible, setTopBarVisible] = useState(true);
  const [moreMenuAnchor, setMoreMenuAnchor] = useState<null | HTMLElement>(null);
  const [mouseNearTop, setMouseNearTop] = useState(false);
  
  // Detect small screens (mobile/tablet)
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

  // Dictionary lookup integration
  const {
    popupState: dictionaryPopup,
    isLoading: isDictionaryLoading,
    error: dictionaryError,
    hasActiveDictionaries,
    handleTextInteraction,
    closePopup: closeDictionaryPopup,
    clearError: clearDictionaryError,
  } = useDictionaryLookup({
    enabled: settings?.displayOCR !== false,
    enableDeinflection: true,
  });

  const isDoublePageMode = settings?.pageLayout === 'double';
  const isRTL = settings?.readingDirection === 'rtl';

  // Configure AnkiConnect service
  useEffect(() => {
    if (settings?.ankiConnectUrl) {
      ankiConnectService.configure({
        url: settings.ankiConnectUrl,
        apiKey: settings.ankiConnectApiKey,
      });
    }
  }, [settings?.ankiConnectUrl, settings?.ankiConnectApiKey]);

  // Set up Anki screenshot functionality
  const { captureAndAddToLastCard, isProcessing } = useAnkiScreenshot({
    enabled: settings?.ankiScreenshotEnabled ?? false,
    fieldName: settings?.ankiScreenshotField ?? 'Picture',
    imageFormat: settings?.ankiScreenshotFormat ?? 'jpeg',
    imageQuality: settings?.ankiScreenshotQuality ?? 0.8,
  });

  // Handle manual Anki screenshot button click
  const handleAnkiScreenshot = async () => {
    if (!currentPageImageRef.current) {
      setAnkiSnackbar({
        open: true,
        message: 'Page not loaded yet',
        severity: 'error'
      });
      return;
    }

    try {
      await captureAndAddToLastCard(currentPageImageRef.current);
      setAnkiSnackbar({
        open: true,
        message: 'Screenshot added to last Anki card!',
        severity: 'success'
      });
    } catch (error) {
      setAnkiSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to add screenshot',
        severity: 'error'
      });
    }
  };

  // Set up Yomitan event listeners
  useEffect(() => {
    let cleanup: (() => void) | null = null;

    // Import platform API dynamically to avoid issues
    import('../../platform').then(({ getPlatformAPI }) => {
      const platformAPI = getPlatformAPI();
      
      // Only set up listeners if running in Electron
      if (!platformAPI.isElectron || !platformAPI.sendYomitanEvent) {
        return;
      }

      const handlePopupShown = () => {
        console.log('Yomitan popup shown');
        platformAPI.sendYomitanEvent!(true);
      };

      const handlePopupHidden = () => {
        console.log('Yomitan popup hidden');
        platformAPI.sendYomitanEvent!(false);
      };

      // Add event listeners for Yomitan popup events
      window.addEventListener('yomitan-popup-shown', handlePopupShown);
      window.addEventListener('yomitan-popup-hidden', handlePopupHidden);

      // Store cleanup function
      cleanup = () => {
        window.removeEventListener('yomitan-popup-shown', handlePopupShown);
        window.removeEventListener('yomitan-popup-hidden', handlePopupHidden);
      };
    });

    // Return cleanup function
    return () => {
      if (cleanup) {
        cleanup();
      }
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
    // - Subsequent pages should be paired as: 1+2, 3+4, 5+6, etc.
    if (hasCover && currentPageIndex === 0) {
      // Show cover page alone
      return [pages[0]];
    }
    
    // If hasCover is enabled, we need to ensure proper pairing after the cover
    // Cover = page 0 (alone)
    // Spreads: 1+2, 3+4, 5+6, etc.
    // In manga reading (RTL with cover):
    //   - Cover is like the back cover in Western terms (page 0)
    //   - Page 1 is the actual first content page (shown on RIGHT in RTL physical book)
    //   - Page 2 is second content page (shown on LEFT in RTL physical book)
    if (hasCover && currentPageIndex > 0) {
      // For proper manga pairing with cover:
      // Page 1 pairs with page 2 (1 is odd, start of spread)
      // Page 3 pairs with page 4 (3 is odd, start of spread)
      // etc.
      const isOddPage = currentPageIndex % 2 === 1;
      
      let leftPageIndex: number, rightPageIndex: number | null;
      
      if (isOddPage) {
        // Odd page (1, 3, 5...) - start of a spread
        // In LTR: odd page on left, even page on right
        // In RTL: odd page on RIGHT, even page on LEFT (will be reversed)
        leftPageIndex = currentPageIndex;
        rightPageIndex = currentPageIndex + 1 < pages.length ? currentPageIndex + 1 : null;
      } else {
        // Even page (2, 4, 6...) - end of a spread
        // Show it with its pair (the previous odd page)
        leftPageIndex = currentPageIndex - 1;
        rightPageIndex = currentPageIndex;
      }
      
      const pagesToShow = [pages[leftPageIndex]];
      if (rightPageIndex !== null && pages[rightPageIndex]) {
        pagesToShow.push(pages[rightPageIndex]);
      }
      
      // In RTL mode, reverse the array so the visual order is correct
      // For page pair [1, 2]: RTL shows as [2, 1] on screen (2 on left, 1 on right)
      return isRTL ? pagesToShow.reverse() : pagesToShow;
    }
    
    // In double page mode without cover, show current and next page
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

  // Reset image loaded state when display settings change
  // This ensures the page re-renders properly when switching hasCover/pageLayout/readingDirection
  useEffect(() => {
    setImageLoaded(false);
  }, [settings?.hasCover, settings?.pageLayout, settings?.readingDirection]);

  // Initialize panzoom - reinitialize when layout settings change OR when pages change
  useEffect(() => {
    if (!pagesContainerRef.current) {
      return;
    }

    // Dispose existing instance if it exists
    if (panzoomInstance.current) {
      panzoomInstance.current.dispose();
      panzoomInstance.current = null;
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
  }, [settings?.pageLayout, settings?.readingDirection, settings?.hasCover, pages.length]);

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

  // Raw navigation functions that don't consider reading direction
  // These navigate in the actual page order (lower index = backward, higher index = forward)
  const navigateBackward = useCallback(() => {
    const isDouble = settings?.pageLayout === 'double';
    const hasCover = settings?.hasCover ?? false;
    
    // Calculate step based on current position and cover setting
    let step = isDouble ? 2 : 1;
    
    // Special handling for cover page in double page mode with cover
    if (isDouble && hasCover) {
      if (currentPageIndex === 0) {
        // Already at the beginning
        return;
      } else if (currentPageIndex === 1 || currentPageIndex === 2) {
        // Going back from first spread (pages 1+2) to cover (page 0)
        onPageChange(0);
        return;
      }
      // For other pages, step by 2 to maintain spread pairs
      step = 2;
    }
    
    const prevIndex = currentPageIndex - step;
    if (prevIndex >= 0) {
      onPageChange(prevIndex);
    }
  }, [currentPageIndex, pages.length, settings?.pageLayout, settings?.hasCover, onPageChange]);

  const navigateForward = useCallback(() => {
    const isDouble = settings?.pageLayout === 'double';
    const hasCover = settings?.hasCover ?? false;
    
    // Calculate step based on current position and cover setting
    let step = isDouble ? 2 : 1;
    
    // Special handling for cover page in double page mode with cover
    if (isDouble && hasCover) {
      if (currentPageIndex === 0) {
        // Go from cover to first spread
        if (pages.length > 1) {
          onPageChange(1);
        }
        return;
      }
      // For other pages, step by 2 to maintain spread pairs (1+2 -> 3+4 -> 5+6)
      step = 2;
    }
    
    const nextIndex = currentPageIndex + step;
    if (nextIndex < pages.length) {
      onPageChange(nextIndex);
    }
  }, [currentPageIndex, pages.length, settings?.pageLayout, settings?.hasCover, onPageChange]);

  // UI-oriented handlers that consider reading direction for button clicks
  const handlePreviousPage = useCallback(() => {
    const isRTL = settings?.readingDirection === 'rtl';
    
    if (isRTL) {
      // In RTL, "previous" button should go forward in page order
      navigateForward();
    } else {
      // In LTR, "previous" button should go backward in page order
      navigateBackward();
    }
  }, [settings?.readingDirection, navigateForward, navigateBackward]);

  const handleNextPage = useCallback(() => {
    const isRTL = settings?.readingDirection === 'rtl';
    
    if (isRTL) {
      // In RTL, "next" button should go backward in page order
      navigateBackward();
    } else {
      // In LTR, "next" button should go forward in page order
      navigateForward();
    }
  }, [settings?.readingDirection, navigateForward, navigateBackward]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isRTL = settings?.readingDirection === 'rtl';
      
      switch (e.key) {
        case 'ArrowLeft':
        case 'PageUp':
          // In RTL, left arrow goes forward in page order; in LTR, it goes back
          if (isRTL) {
            navigateForward();
          } else {
            navigateBackward();
          }
          break;
        case 'ArrowRight':
        case 'PageDown':
        case ' ':
          e.preventDefault();
          // In RTL, right arrow goes back in page order; in LTR, it goes forward
          if (isRTL) {
            navigateBackward();
          } else {
            navigateForward();
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
  }, [settings?.readingDirection, pages.length, navigateForward, navigateBackward, onPageChange]);

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
  // These work with the UI handlers (handlePreviousPage/handleNextPage) which already apply RTL logic
  const canNavigateNext = useCallback(() => {
    const isRTL = settings?.readingDirection === 'rtl';
    const hasCover = settings?.hasCover ?? false;
    const isDouble = settings?.pageLayout === 'double';
    
    // In RTL, "next" means going backward in page order (toward page 0)
    // In LTR, "next" means going forward in page order (toward last page)
    
    if (isRTL) {
      // Check if we can go backward (toward page 0)
      if (isDouble && hasCover) {
        // Special case: at pages 1-2, we can still go back to cover (page 0)
        if (currentPageIndex === 1 || currentPageIndex === 2) {
          return true;
        }
        // At cover (page 0), we can't go "next" (which would be negative)
        if (currentPageIndex === 0) {
          return false;
        }
        // Otherwise, check if we can step back by 2
        return currentPageIndex - 2 >= 0;
      }
      // Without cover or in single page mode, just check if we can go back
      const step = isDouble ? 2 : 1;
      return currentPageIndex - step >= 0;
    } else {
      // LTR: Check if we can go forward
      if (isDouble && hasCover) {
        // At cover, can go to page 1
        if (currentPageIndex === 0) {
          return pages.length > 1;
        }
        // Otherwise check if we can step forward by 2
        return currentPageIndex + 2 < pages.length;
      }
      // Without cover or in single page mode, just check if we can go forward
      const step = isDouble ? 2 : 1;
      return currentPageIndex + step < pages.length;
    }
  }, [currentPageIndex, pages.length, settings?.readingDirection, settings?.pageLayout, settings?.hasCover]);

  const canNavigatePrevious = useCallback(() => {
    const isRTL = settings?.readingDirection === 'rtl';
    const hasCover = settings?.hasCover ?? false;
    const isDouble = settings?.pageLayout === 'double';
    
    // In RTL, "previous" means going forward in page order (toward last page)
    // In LTR, "previous" means going backward in page order (toward page 0)
    
    if (isRTL) {
      // Check if we can go forward (toward last page)
      if (isDouble && hasCover) {
        // At cover (page 0), can go to page 1
        if (currentPageIndex === 0) {
          return pages.length > 1;
        }
        // Otherwise check if we can step forward by 2
        return currentPageIndex + 2 < pages.length;
      }
      // Without cover or in single page mode, just check if we can go forward
      const step = isDouble ? 2 : 1;
      return currentPageIndex + step < pages.length;
    } else {
      // LTR: Check if we can go backward
      if (isDouble && hasCover) {
        // Special case: at pages 1-2, we can still go back to cover (page 0)
        if (currentPageIndex === 1 || currentPageIndex === 2) {
          return true;
        }
        // At cover (page 0), we can't go "previous" (which would be negative)
        if (currentPageIndex === 0) {
          return false;
        }
        // Otherwise, check if we can step back by 2
        return currentPageIndex - 2 >= 0;
      }
      // Without cover or in single page mode, just check if we can go back
      const step = isDouble ? 2 : 1;
      return currentPageIndex - step >= 0;
    }
  }, [currentPageIndex, pages.length, settings?.readingDirection, settings?.pageLayout, settings?.hasCover]);

  // Toggle top bar visibility (for mobile)
  const handleToggleTopBar = () => {
    setTopBarVisible(!topBarVisible);
  };

  // Handle more menu
  const handleMoreMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMoreMenuAnchor(event.currentTarget);
  };

  const handleMoreMenuClose = () => {
    setMoreMenuAnchor(null);
  };

  // Track mouse position for desktop hover detection
  useEffect(() => {
    if (isSmallScreen) {
      return; // Don't use hover detection on mobile
    }

    const handleMouseMove = (e: MouseEvent) => {
      // Show controls when mouse is in top 80px of screen
      const isNearTop = e.clientY < 80;
      setMouseNearTop(isNearTop);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isSmallScreen]);

  // Handle tap on manga area to toggle controls (mobile only)
  const handleMangaTap = (e: React.MouseEvent) => {
    if (!isSmallScreen) return;
    
    // Don't toggle if clicking on OCR text boxes, buttons, or the top bar itself
    const target = e.target as HTMLElement;
    if (
      target.closest('.ocr-text-box') ||
      target.closest('button') ||
      target.closest('[role="button"]') ||
      target.closest('.MuiPaper-root') ||
      target.closest('.MuiIconButton-root')
    ) {
      return;
    }

    // Toggle top bar visibility
    handleToggleTopBar();
  };

  // Desktop controls should show when mouse is near top
  const desktopControlsVisible = !isSmallScreen && mouseNearTop;

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
      {isSmallScreen ? (
        /* Mobile/Tablet Top Bar - Compact with collapsible menu */
        <>
          <Slide direction="down" in={topBarVisible}>
            <Paper
              elevation={3}
              sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 1000,
                px: 1,
                py: 0.5,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                backgroundColor: theme.palette.mode === 'dark' 
                  ? 'rgba(30, 30, 30, 0.98)' 
                  : 'rgba(255, 255, 255, 0.98)',
                backdropFilter: 'blur(8px)',
              }}
            >
              {/* Back to Library Button */}
              {onBackToLibrary && (
                <Tooltip title="Back to Library">
                  <IconButton onClick={onBackToLibrary} size="small">
                    <ArrowBack />
                  </IconButton>
                </Tooltip>
              )}

              {/* Page Counter */}
              <Typography variant="body2" sx={{ minWidth: 80, textAlign: 'center', fontSize: '0.85rem' }}>
                {(() => {
                  const hasCover = settings?.hasCover ?? false;
                  if (!isDoublePageMode) {
                    return `${currentPageIndex + 1} / ${pages.length}`;
                  }
                  if (hasCover && currentPageIndex === 0) {
                    return `${currentPageIndex + 1} / ${pages.length}`;
                  }
                  if (hasCover && currentPageIndex > 0) {
                    const isOddPage = currentPageIndex % 2 === 1;
                    const leftPage = isOddPage ? currentPageIndex : currentPageIndex - 1;
                    const rightPage = leftPage + 1;
                    if (rightPage < pages.length) {
                      return `${leftPage + 1}-${rightPage + 1} / ${pages.length}`;
                    }
                    return `${leftPage + 1} / ${pages.length}`;
                  }
                  if (currentPageIndex + 1 < pages.length) {
                    return `${currentPageIndex + 1}-${currentPageIndex + 2} / ${pages.length}`;
                  }
                  return `${currentPageIndex + 1} / ${pages.length}`;
                })()}
              </Typography>
              
              {/* Navigation Buttons */}
              <IconButton onClick={handlePreviousPage} disabled={!canNavigatePrevious()} size="small">
                <NavigateBefore />
              </IconButton>
              <IconButton onClick={handleNextPage} disabled={!canNavigateNext()} size="small">
                <NavigateNext />
              </IconButton>

              <Box sx={{ flexGrow: 1 }} />

              {/* Title (truncated) */}
              {title && (
                <Typography variant="body2" sx={{ maxWidth: 120, fontSize: '0.85rem' }} noWrap>
                  {title}
                </Typography>
              )}

              {/* More Menu Button */}
              <Tooltip title="More">
                <IconButton onClick={handleMoreMenuOpen} size="small">
                  <MoreVert />
                </IconButton>
              </Tooltip>
            </Paper>
          </Slide>

          {/* More Menu for mobile */}
          <Menu
            anchorEl={moreMenuAnchor}
            open={Boolean(moreMenuAnchor)}
            onClose={handleMoreMenuClose}
          >
            <MenuItem onClick={() => { handleZoomIn(); handleMoreMenuClose(); }}>
              <ListItemIcon><ZoomIn fontSize="small" /></ListItemIcon>
              <ListItemText>Zoom In</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => { handleZoomOut(); handleMoreMenuClose(); }}>
              <ListItemIcon><ZoomOut fontSize="small" /></ListItemIcon>
              <ListItemText>Zoom Out</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => { handleFitToScreen(); handleMoreMenuClose(); }}>
              <ListItemIcon><FitScreen fontSize="small" /></ListItemIcon>
              <ListItemText>Fit to Screen</ListItemText>
            </MenuItem>
            {onSettingsClick && (
              <MenuItem onClick={() => { onSettingsClick(); handleMoreMenuClose(); }}>
                <ListItemIcon><Settings fontSize="small" /></ListItemIcon>
                <ListItemText>Settings</ListItemText>
              </MenuItem>
            )}
          </Menu>

          {/* Toggle button to show/hide top bar - Small swipe down indicator */}
          {!topBarVisible && (
            <Box
              onClick={handleToggleTopBar}
              sx={{
                position: 'fixed',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1001,
                width: 60,
                height: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                backgroundColor: theme.palette.mode === 'dark' 
                  ? 'rgba(30, 30, 30, 0.7)' 
                  : 'rgba(255, 255, 255, 0.7)',
                borderBottomLeftRadius: 12,
                borderBottomRightRadius: 12,
                transition: 'all 0.2s ease',
                '&:hover': {
                  height: 24,
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? 'rgba(30, 30, 30, 0.9)' 
                    : 'rgba(255, 255, 255, 0.9)',
                },
              }}
            >
              <Box
                sx={{
                  width: 24,
                  height: 3,
                  backgroundColor: theme.palette.mode === 'dark' ? '#888' : '#666',
                  borderRadius: 2,
                }}
              />
            </Box>
          )}
        </>
      ) : (
        /* Desktop Top Bar - Shows on hover near top of screen */
        <Slide direction="down" in={desktopControlsVisible}>
          <Paper
            elevation={3}
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 1000,
              px: 3,
              py: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              backgroundColor: theme.palette.mode === 'dark' 
                ? 'rgba(30, 30, 30, 0.98)' 
                : 'rgba(255, 255, 255, 0.98)',
              backdropFilter: 'blur(8px)',
              borderBottom: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
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
            {(() => {
              const hasCover = settings?.hasCover ?? false;
              
              // Single page mode - always show single page number
              if (!isDoublePageMode) {
                return `${currentPageIndex + 1} / ${pages.length}`;
              }
              
              // Double page mode with cover
              if (hasCover && currentPageIndex === 0) {
                // Show only cover page
                return `${currentPageIndex + 1} / ${pages.length}`;
              }
              
              // Double page mode with cover - show the spread
              if (hasCover && currentPageIndex > 0) {
                const isOddPage = currentPageIndex % 2 === 1;
                const leftPage = isOddPage ? currentPageIndex : currentPageIndex - 1;
                const rightPage = leftPage + 1;
                
                if (rightPage < pages.length) {
                  return `${leftPage + 1}-${rightPage + 1} / ${pages.length}`;
                }
                return `${leftPage + 1} / ${pages.length}`;
              }
              
              // Double page mode without cover
              if (currentPageIndex + 1 < pages.length) {
                return `${currentPageIndex + 1}-${currentPageIndex + 2} / ${pages.length}`;
              }
              return `${currentPageIndex + 1} / ${pages.length}`;
            })()}
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
        </Slide>
      )}

      {/* Page Container */}
      <Box
        ref={containerRef}
        onClick={handleMangaTap}
        sx={{
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div 
          ref={pagesContainerRef}
          key={`pages-${settings?.pageLayout}-${settings?.readingDirection}-${settings?.hasCover}`}
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
            const isCurrentPage = pageIndex === currentPageIndex;
            return (
              <div
                key={page.id}
                style={{
                  position: 'relative',
                  display: 'inline-block',
                }}
              >
                <img
                  ref={isCurrentPage ? currentPageImageRef : undefined}
                  src={getAbsoluteImageUrl(page.path) || page.path}
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
                  crossOrigin="anonymous"
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
                        onTextInteraction={handleTextInteraction}
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
      {/* Adjusted positioning to avoid corners where text boxes might be */}
      <Box
        onClick={handlePreviousPage}
        sx={{
          position: 'fixed',
          left: 0,
          top: '15vh',
          width: '10vw',
          height: '70vh',
          cursor: canNavigatePrevious() ? 'pointer' : 'default',
          zIndex: 0,
          pointerEvents: canNavigatePrevious() ? 'auto' : 'none',
          '&:hover': {
            backgroundColor: canNavigatePrevious() 
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
          top: '15vh',
          width: '10vw',
          height: '70vh',
          cursor: canNavigateNext() ? 'pointer' : 'default',
          zIndex: 0,
          pointerEvents: canNavigateNext() ? 'auto' : 'none',
          '&:hover': {
            backgroundColor: canNavigateNext() 
              ? theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.05)' 
                : 'rgba(0, 0, 0, 0.05)' 
              : 'transparent',
          },
        }}
      />

      {/* Anki Screenshot Floating Action Button */}
      {settings?.ankiScreenshotEnabled && (
        <Fab
          color="primary"
          onClick={handleAnkiScreenshot}
          disabled={isProcessing}
          size={isSmallScreen ? "small" : "medium"}
          sx={{
            position: 'fixed',
            bottom: isSmallScreen ? 8 : 16,
            right: isSmallScreen ? 8 : 16,
            zIndex: 1000,
          }}
        >
          {isProcessing ? <CircularProgress size={24} color="inherit" /> : <ImageIcon />}
        </Fab>
      )}

      {/* Snackbar for Anki feedback */}
      {ankiSnackbar.open && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 80,
            right: 16,
            zIndex: 1001,
            backgroundColor: ankiSnackbar.severity === 'success' 
              ? theme.palette.success.main 
              : theme.palette.error.main,
            color: 'white',
            padding: 2,
            borderRadius: 1,
            boxShadow: 3,
            maxWidth: 300,
          }}
          onClick={() => setAnkiSnackbar({ ...ankiSnackbar, open: false })}
        >
          <Typography variant="body2">{ankiSnackbar.message}</Typography>
        </Box>
      )}

      {/* Dictionary Popup */}
      {dictionaryPopup.open && (
        <DictionaryPopup
          entries={dictionaryPopup.entries}
          position={dictionaryPopup.position}
          onClose={closeDictionaryPopup}
          onAddToAnki={(entry, defIndex) => {
            // TODO: Integrate with Anki card creation
            console.log('Add to Anki:', entry, defIndex);
            setAnkiSnackbar({
              open: true,
              message: 'Anki integration coming soon!',
              severity: 'success',
            });
          }}
          maxWidth={isSmallScreen ? undefined : 400}
          maxHeight={isSmallScreen ? undefined : 500}
        />
      )}

      {/* Dictionary Error Snackbar */}
      <Snackbar
        open={!!dictionaryError}
        autoHideDuration={6000}
        onClose={clearDictionaryError}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={clearDictionaryError} sx={{ width: '100%' }}>
          {dictionaryError}
        </Alert>
      </Snackbar>

      {/* Dictionary Loading Indicator */}
      {isDictionaryLoading && (
        <Box
          sx={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10000,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            borderRadius: 2,
            padding: 2,
          }}
        >
          <CircularProgress size={40} />
        </Box>
      )}

      {/* No Dictionaries Warning */}
      {!hasActiveDictionaries && settings?.displayOCR !== false && (
        <Snackbar
          open={true}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="info" sx={{ width: '100%' }}>
            No dictionaries installed. Please import dictionaries to enable lookup.
          </Alert>
        </Snackbar>
      )}
    </Box>
  );
};

export default ReaderView;

