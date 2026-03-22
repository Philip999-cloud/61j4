export const getDiagnosticInfo = () => {
  return `
    User Agent: ${navigator.userAgent}
    Screen: ${window.screen.width}x${window.screen.height}
    OS: ${navigator.platform}
    App Version: 1.0.0
    Time: ${new Date().toISOString()}
  `;
};
