(() => {
  if (window.__hackemosPage) return;
  window.__hackemosPage = true;
  if (window.bootbox && /^\/(?:grammar|verb|vocabulary)\/quiz\/\d+$/.test(location.pathname)) {
    const old = bootbox.alert;
    bootbox.alert = (text, callback) => {
      if (text && text.toString().includes("switch windows")) return;
      return old(text, callback);
    };
  }
})();
