window.Views = window.Views || {};
window.Views.landing = (function () {
  async function landing() {
    const html = await Templates.load("landing");
    return html.replace("<div data-insert=\"flashes\"></div>", UI.flashesHtml());
  }

  return { landing: landing };
})();
