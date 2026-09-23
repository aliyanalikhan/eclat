# Phase 10: Interactive Overlays & Global Chrome Refinement — Discussion Log

**Date:** 2026-09-23  
**Participants:** Pair programming agent & User  
**Phase:** 10-interactive-overlays-global-chrome-refinement  

---

## Areas Discussed

### Area 1: Magazine Preview Flipbook Ergonomics (OVERLAY-01)
- **Question 1:** How should page flipping and layout controls behave on mobile & touch devices?
  - **Options:**
    1. *(Selected)* Native Touch Swiping + Floating Bottom Glass Bar: Enable horizontal touch swipe gestures directly on the magazine page to turn pages, with a floating compact pill (Prev / N of M / Next) at the bottom so the image gets maximum screen height.
    2. Touch Swiping + Stacked Controls: Enable touch swipe on the image, but keep controls strictly stacked below the image within a unified scroll-free frame.
    3. Buttons-Only with Enlarged Touch Targets: Keep page turning driven exclusively by tap buttons.
  - **Outcome:** Selected Option 1. Touch swipe gestures directly on the image with floating compact glass pill nav controls.

- **Question 2:** How should page transitions and image preloading behave when flipping pages?
  - **Options:**
    1. Subtle Fade Transition + Adjacent Preloading
    2. Instant Swap (Zero Animation) + Adjacent Preloading
    3. *(Selected)* Horizontal Slide/Flip Keyframe: 200ms slide-in keyframe animation matching swipe direction.
  - **Outcome:** Selected Option 3. 200ms slide-in keyframe animation matching navigation direction, with adjacent page preloading to eliminate flashes.

### Area 2: Lightbox & Video Modal Scroll-Locking & Safe Areas (OVERLAY-02)
- **Question 1:** How should scroll-locking, safe areas, and mobile dismiss gestures be handled?
  - **Options:**
    1. *(Selected)* Hardened iOS Scroll-Lock + Safe-Area Insets + Tap/Swipe Dismiss: Prevent background scroll bleed on iOS Safari (using overscroll-behavior: contain and touch-action: none on backdrop), calibrate close button to notch safe areas (env(safe-area-inset-top)), and allow tap backdrop or swipe down to dismiss.
    2. Scroll-Lock & Safe-Area Only: Apply robust iOS scroll-locking and safe-area insets for the close button, keeping dismissal strictly to backdrop tap and close button.
    3. Full Pinch-to-Zoom & Pan Gesture Support.
  - **Outcome:** Selected Option 1. Hardened iOS scroll lock with `overscroll-behavior: contain` and `touch-action: none`, notch safe-area insets on close buttons, and swipe-down/tap dismiss.

### Area 3: Global Header Drawer & Footer Refinement (OVERLAY-03)
- **Question 1:** What styling and interaction model should we apply to the mobile navigation drawer and footer?
  - **Options:**
    1. *(Selected)* Dimmed Backdrop Overlay + Slide-Down Animation for Nav Drawer; 2-Column Balanced Footer Links with Safe-Area Insets: Nav drawer slides down smoothly with a soft darkened backdrop overlay and body scroll-lock; footer links reflow into a clean 2-column grid on phones with safe-area padding for home bars.
    2. Full-Screen Luxury Editorial Overlay for Nav Drawer; Stacked Footer.
    3. Minimal Dropdown (No Backdrop Dimming); Stacked Footer.
  - **Outcome:** Selected Option 1. Slide-down navigation drawer with darkened backdrop overlay and scroll lock; 2-column balanced footer links with safe-area bottom padding.

---

## Summary of Decisions
- Native touch swipe support on `MagazinePreview` pages with 200ms directional slide animation and floating bottom glass pill bar.
- Preload adjacent magazine preview pages to eliminate white flashes.
- Hardened scroll-locking on modal backdrops (`overscroll-behavior: contain; touch-action: none`) for iOS Safari.
- Notch safe-area inset calibration for close buttons across all modals (`env(safe-area-inset-top)` / `right`).
- Swipe-down dismiss support on touch devices for Lightbox.
- Header mobile navigation drawer equipped with slide-down transition, dimmed backdrop overlay, and scroll-lock.
- Footer navigation links reflowing into a 2-column balanced grid on mobile with safe-area bottom padding.
