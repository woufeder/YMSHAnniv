document.addEventListener("DOMContentLoaded", () => {
  const intro = document.getElementById("creditsIntro");
  const filters = document.getElementById("creditsFilters");
  const list = document.getElementById("creditsList");
  const returnButton = document.querySelector(".return-button");
  const DATA_PATH = "data/credits.json";

  returnButton?.addEventListener("click", (event) => {
    if (window.history.length <= 1) return;
    event.preventDefault();
    window.history.back();
  });

  function appendText(parent, tagName, value, className) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    element.textContent = value || "未標示";
    parent.append(element);
    return element;
  }

  function createDetail(label, value) {
    const detail = document.createElement("div");
    detail.className = "credits-record__detail";
    appendText(detail, "small", label);
    appendText(detail, "span", value);
    return detail;
  }

  function createSource(item) {
    const source = document.createElement("div");
    source.className = "credits-record__source";
    appendText(source, "small", "來源");

    if (item.url) {
      const link = document.createElement("a");
      link.href = item.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = item.source || item.url;
      source.append(link);
      return source;
    }

    appendText(source, "span", item.source);
    return source;
  }

  function createRecord(item) {
    const record = document.createElement("article");
    record.className = "credits-record";

    const name = document.createElement("div");
    name.className = "credits-record__name";
    appendText(name, "strong", item.name);
    appendText(name, "span", item.type);

    record.append(name, createDetail("標示", item.creator), createSource(item));

    if (item.note) {
      const note = document.createElement("div");
      note.className = "credits-record__detail credits-record__note";
      appendText(note, "small", "使用範圍");
      appendText(note, "span", item.note);
      record.append(note);
    }

    return record;
  }

  function createNotice(section) {
    const notice = document.createElement("div");
    notice.className = "credits-notice";
    const contact = section.notice?.contact;

    if (contact) {
      const contactBlock = document.createElement("div");
      contactBlock.className = "credits-notice__contact";
      appendText(contactBlock, "small", contact.label || "聯絡方式");

      if (contact.url && contact.value) {
        const link = document.createElement("a");
        link.href = contact.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = contact.value;
        contactBlock.append(link);
      } else {
        appendText(
          contactBlock,
          "strong",
          contact.value || "尚未公開聯絡方式",
        );
      }

      notice.append(contactBlock);
    }

    const statements = document.createElement("div");
    statements.className = "credits-notice__statements";
    appendText(statements, "small", "使用聲明");
    (section.notice?.statements || []).forEach((statement) => {
      appendText(statements, "p", statement);
    });
    notice.append(statements);
    return notice;
  }

  function activateSection(sectionId) {
    document.querySelectorAll(".credits-filter").forEach((button) => {
      const active = button.dataset.section === sectionId;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    document.querySelectorAll(".credits-section").forEach((section) => {
      section.classList.toggle("is-active", section.dataset.section === sectionId);
    });
  }

  function renderSection(section, index) {
    const filter = document.createElement("button");
    filter.className = "credits-filter";
    filter.type = "button";
    filter.dataset.section = section.id;
    filter.setAttribute("aria-pressed", String(index === 0));

    const filterIcon = document.createElement("i");
    filterIcon.className = `fa-solid ${section.icon || "fa-folder"}`;
    filterIcon.setAttribute("aria-hidden", "true");
    filter.append(filterIcon, document.createTextNode(section.label));
    filter.addEventListener("click", () => activateSection(section.id));
    filters.append(filter);

    const sectionElement = document.createElement("section");
    sectionElement.className = "credits-section";
    sectionElement.dataset.section = section.id;
    sectionElement.classList.toggle("is-active", index === 0);

    const header = document.createElement("header");
    header.className = "credits-section__header";
    const icon = document.createElement("i");
    icon.className = `fa-solid ${section.icon || "fa-folder"}`;
    icon.setAttribute("aria-hidden", "true");
    const copy = document.createElement("div");
    appendText(copy, "h2", section.label);
    if (section.description) appendText(copy, "p", section.description);
    header.append(icon, copy);

    if (section.notice) {
      sectionElement.append(header, createNotice(section));
      list.append(sectionElement);
      return;
    }

    const records = document.createElement("div");
    records.className = "credits-records";
    if (section.items?.length) {
      section.items.forEach((item) => records.append(createRecord(item)));
    } else {
      appendText(records, "p", "尚未加入資料。", "credits-empty");
    }

    sectionElement.append(header, records);
    list.append(sectionElement);
  }

  async function loadCredits() {
    try {
      const response = await fetch(DATA_PATH);
      if (!response.ok) throw new Error(`Unable to load ${DATA_PATH}`);
      const data = await response.json();
      intro.textContent = data.intro || "";
      (data.sections || []).forEach(renderSection);

      if (!data.sections?.length) {
        appendText(list, "p", "尚未加入素材資料。", "credits-empty");
      }
    } catch (error) {
      console.error("Unable to render credits:", error);
      appendText(list, "p", "素材資料目前無法讀取。", "credits-error");
    }
  }

  loadCredits();
});
