/* Template loader: fetches and caches HTML view files. */
window.Templates = (function () {
  const cache = {};

  function load(name) {
    if (cache[name]) {
      return Promise.resolve(cache[name]);
    }
    return fetch("html/" + name + ".html")
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Failed to load template: " + name);
        }
        return response.text();
      })
      .then(function (html) {
        cache[name] = html;
        return html;
      });
  }

  function render(name, data) {
    data = data || {};
    return load(name).then(function (html) {
      let result = html;
      Object.keys(data).forEach(function (key) {
        const pattern = new RegExp("\\{\\{" + key + "\\}\\}", "g");
        result = result.replace(pattern, data[key]);
      });
      return result;
    });
  }

  return { load: load, render: render };
})();
