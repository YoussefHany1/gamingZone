/**
 * The script injected into the PSN WebView.
 *
 * Sony's ssocookie endpoint answers with a raw JSON body instead of a login
 * form, so we poll the rendered text for it and hand the token back to React
 * Native through the WebView bridge. The probe guards itself with a window
 * flag so re-injecting it after a navigation does not start a second poller.
 */
export function psnInjectedJs(): string {
  return `
    (function () {
      if (window.__gzonePsnProbe) return;
      window.__gzonePsnProbe = true;
      var tries = 0;
      var read = function () {
        try {
          var text = document.body ? document.body.innerText : "";
          if (text.indexOf("npsso") !== -1) {
            var json = JSON.parse(text);
            if (json && json.npsso) {
              window.__gzonePsnProbe = false;
              window.ReactNativeWebView.postMessage(
                JSON.stringify({ type: "npsso", npsso: json.npsso })
              );
              return;
            }
          }
          if (text.indexOf("invalid_grant") !== -1) {
            window.__gzonePsnProbe = false;
            window.ReactNativeWebView.postMessage(
              JSON.stringify({ type: "psn_session_error" })
            );
            return;
          }
          if (tries < 40) { tries++; setTimeout(read, 500); }
        } catch (e) { /* page may not be ready */ }
      };
      read();
    })();
    true;
  `;
}
