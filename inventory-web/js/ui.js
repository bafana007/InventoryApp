/* Small rendering helpers shared by every view. */
window.UI = (function () {
  const FLASH_KEY = "inventory-flashes-v1";

  function escape(value) {
    return String(value === null || value === undefined ? "" : value).replace(
      /[&<>"']/g,
      function (char) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
      }
    );
  }

  function money(value) {
    return Number(value || 0).toFixed(2);
  }

  function datetime(iso) {
    const date = new Date(iso);
    const pad = function (n) {
      return String(n).padStart(2, "0");
    };
    return (
      date.getFullYear() +
      "-" +
      pad(date.getMonth() + 1) +
      "-" +
      pad(date.getDate()) +
      " " +
      pad(date.getHours()) +
      ":" +
      pad(date.getMinutes())
    );
  }

  function day(iso) {
    return datetime(iso).slice(0, 10);
  }

  function flash(message, category) {
    const flashes = JSON.parse(sessionStorage.getItem(FLASH_KEY) || "[]");
    flashes.push({ message: message, category: category || "info" });
    sessionStorage.setItem(FLASH_KEY, JSON.stringify(flashes));
  }

  function popFlashes() {
    const flashes = JSON.parse(sessionStorage.getItem(FLASH_KEY) || "[]");
    sessionStorage.removeItem(FLASH_KEY);
    return flashes;
  }

  function flashesHtml() {
    const flashes = popFlashes();
    if (!flashes.length) return "";
    return (
      '<div class="flashes">' +
      flashes
        .map(function (f) {
          return '<div class="flash ' + escape(f.category) + '">' + escape(f.message) + "</div>";
        })
        .join("") +
      "</div>"
    );
  }

  function pageHead(title, subtitle, actionHtml) {
    return (
      '<div class="page-head"><div><h1>' +
      escape(title) +
      "</h1>" +
      (subtitle ? '<p class="muted">' + escape(subtitle) + "</p>" : "") +
      "</div>" +
      (actionHtml || "") +
      "</div>"
    );
  }

  function stat(value, label, inverted) {
    return (
      '<div class="card' +
      (inverted ? " inverted" : "") +
      '"><div class="stat">' +
      escape(value) +
      '</div><div class="stat-label">' +
      escape(label) +
      "</div></div>"
    );
  }

  function empty(message) {
    return '<div class="empty">' + escape(message) + "</div>";
  }

  function badge(text, solid) {
    return '<span class="badge' + (solid ? " solid" : "") + '">' + escape(text) + "</span>";
  }

  function table(headers, rows) {
    if (!rows.length) {
      return (
        '<div class="table-wrap"><table><thead><tr>' +
        headers
          .map(function (h) {
            return "<th>" + escape(h) + "</th>";
          })
          .join("") +
        "</tr></thead><tbody><tr><td colspan=\"" +
        headers.length +
        '">' +
        empty("Nothing to show.") +
        "</td></tr></tbody></table></div>"
      );
    }
    return (
      '<div class="table-wrap"><table><thead><tr>' +
      headers
        .map(function (h) {
          return "<th>" + escape(h) + "</th>";
        })
        .join("") +
      "</tr></thead><tbody>" +
      rows
        .map(function (cells) {
          return (
            "<tr>" +
            cells
              .map(function (cell) {
                return "<td>" + cell + "</td>";
              })
              .join("") +
            "</tr>"
          );
        })
        .join("") +
      "</tbody></table></div>"
    );
  }

  function selectOptions(values, selected) {
    return values
      .map(function (value) {
        const option = typeof value === "object" ? value : { value: value, label: value };
        return (
          '<option value="' +
          escape(option.value) +
          '"' +
          (String(option.value) === String(selected) ? " selected" : "") +
          ">" +
          escape(option.label) +
          "</option>"
        );
      })
      .join("");
  }

  function formData(form) {
    const data = {};
    new FormData(form).forEach(function (value, key) {
      data[key] = typeof value === "string" ? value.trim() : value;
    });
    return data;
  }

  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 1200;
      gain.gain.value = 0.1;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.15);
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.warn("Beep failed", e);
    }
  }

  return {
    escape: escape,
    money: money,
    datetime: datetime,
    day: day,
    flash: flash,
    flashesHtml: flashesHtml,
    pageHead: pageHead,
    stat: stat,
    empty: empty,
    badge: badge,
    table: table,
    selectOptions: selectOptions,
    formData: formData,
    beep: beep,
  };
})();
