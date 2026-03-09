# Phase 1 Update: Secret Word Visibility Toggle - Frontend

## 🎯 Goal
Implement a UI toggle for the `insider` (and optionally the `host`) to hide or reveal the secret word during the `playing` phase. This prevents `common` players from cheating by glancing at the insider's screen.

## 🚀 Implementation Steps

### 1. Update Game Session UI (`app/src/app/[roomId]/page.tsx`)
*   **State Management:**
    *   Add a local state variable to track the visibility of the secret word: `const [isWordVisible, setIsWordVisible] = useState(false);`
*   **Render Logic:**
    *   Locate the section of the UI where the secret word is displayed for the `host` and `insider` (typically in the `roomState?.status === 'playing'` block).
    *   Instead of rendering `{roomState?.secretWord}` directly, conditionally render it based on `isWordVisible`.
    *   If `!isWordVisible`, display a placeholder text like `[TAP TO REVEAL]` or `••••••••`.
*   **Interaction:**
    *   Wrap the secret word display in a clickable element (e.g., a button or a span with `onClick` handler).
    *   When clicked, toggle the `isWordVisible` state (`setIsWordVisible(!isWordVisible)`).
    *   Add clear visual affordances (like an eye icon, distinct border, or hover effect) so the user understands the element is interactive.
    *   **Optional Polish:** Add a timeout effect where the word automatically hides itself again after a few seconds of being revealed, ensuring it doesn't accidentally stay exposed.

## 🛠 Design Adherence
*   Ensure the toggle mechanism feels native to the Pixel Art aesthetic (e.g., using a pixelated lock/unlock icon, or a stylized button).
