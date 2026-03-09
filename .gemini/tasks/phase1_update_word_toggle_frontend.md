# Phase 1 Update: Secret Word Visibility Toggle - Frontend

## 🎯 Goal
Implement a UI toggle for the `insider` (and optionally the `host`) to hide or reveal the secret word during the `playing` phase. This prevents `common` players from cheating by glancing at the insider's screen.

## 🚀 Implementation Steps

### 1. Update Game Session UI (`app/src/app/[roomId]/page.tsx`)
*   **State Management:**
    *   Add a local state variable to track the visibility of the secret word: `const [isWordVisible, setIsWordVisible] = useState(false);`
*   **Render Logic (Anti-Screen Cheating):**
    *   The "Secret Word" UI block must be rendered for **ALL** players so the screen layout looks identical from a distance.
    *   For `host` and `insider`, the word is conditionally rendered based on `isWordVisible` (showing `••••••••` when hidden).
    *   For `common` players, hardcode the display to `••••••••` and disable the button/toggle interaction entirely.
*   **Interaction (Host & Insider Only):**
    *   Wrap the secret word display in a clickable element.
    *   When clicked, toggle the `isWordVisible` state (`setIsWordVisible(!isWordVisible)`).
    *   Add clear visual affordances (like an eye icon, distinct border, or hover effect).
    *   **Optional Polish:** Add a timeout effect where the word automatically hides itself again after 3 seconds of being revealed.

## 🛠 Design Adherence
*   Ensure the toggle mechanism feels native to the Pixel Art aesthetic (e.g., using a pixelated lock/unlock icon, or a stylized button).
