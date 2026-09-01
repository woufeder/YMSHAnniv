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

  function appendText(parent, tagName, value, className = "") {
    const element = document.createElement(tagName);

    if (className) {
      element.className = className;
    }

    element.textContent = value || "未標示";
    parent.append(element);

    return element;
  }

  function createDetail(label, value) {
    const detail = document.createElement("div");

    appendText(detail, "small", label, "label");
    appendText(detail, "span", value, "value");

    return detail;
  }

  function createSource(item) {
    const source = document.createElement("div");

    appendText(source, "small", "來源", "label");

    if (item.url) {
      const link = document.createElement("a");

      link.className = "value";
      link.href = item.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = item.source || item.url;

      source.append(link);

      return source;
    }

    appendText(source, "span", item.source, "value");

    return source;
  }

  function createRecord(item) {
    const record = document.createElement("article");
    record.className = "credits-record";

    const name = document.createElement("div");
    appendText(name, "span", item.type, "type");

    appendText(name, "strong", item.name, "value");

    record.append(name, createDetail("作者", item.creator), createSource(item));

    if (item.note) {
      record.append(createDetail("使用範圍", item.note));
    }

    return record;
  }

  function createContactLink(contactBlock, contactItem) {
    if (!contactItem?.value || !contactItem?.url) {
      return;
    }

    const link = document.createElement("a");

    link.className = "value";
    link.href = contactItem.url;
    link.textContent = contactItem.value;

    if (!contactItem.url.startsWith("mailto:")) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }

    contactBlock.append(link);
  }

  function createNotice(section) {
    const notice = document.createElement("div");
    notice.className = "credits-notice";

    const statements = document.createElement("div");

    appendText(statements, "small", "使用聲明", "label");

    const statementList = section.notice?.statements || [];

    statementList.forEach((statement) => {
      appendText(statements, "p", statement, "value");
    });

    notice.append(statements);

    const contact = section.notice?.contact;

    if (contact) {
      const contactBlock = document.createElement("div");

      appendText(contactBlock, "small", contact.label || "聯絡方式", "label");
      // appendText(contactBlock, "p", contact.creator || "本站作者", "creator");
      if (contact.description) {
        appendText(contactBlock, "p", contact.description, "value");
      }

      createContactLink(contactBlock, contact.plurk);
      createContactLink(contactBlock, contact.email);

      notice.append(contactBlock);
    }

    return notice;
  }

  function activateSection(sectionId) {
    const buttons = document.querySelectorAll(".credits-filter");

    buttons.forEach((button) => {
      const isActive = button.dataset.section === sectionId;

      button.classList.toggle("is-active", isActive);

      button.setAttribute("aria-pressed", String(isActive));
    });

    const sections = document.querySelectorAll(".credits-section");

    sections.forEach((section) => {
      const isActive = section.dataset.section === sectionId;

      section.classList.toggle("is-active", isActive);
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

    filter.addEventListener("click", () => {
      activateSection(section.id);
    });

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

    if (section.description) {
      appendText(copy, "p", section.description);
    }

    header.append(icon, copy);

    if (section.notice) {
      sectionElement.append(header, createNotice(section));

      list.append(sectionElement);

      return;
    }

    const records = document.createElement("div");

    records.className = "credits-records";

    if (section.items?.length) {
      section.items.forEach((item) => {
        records.append(createRecord(item));
      });
    } else {
      appendText(records, "p", "尚未加入資料。", "credits-empty");
    }

    sectionElement.append(header, records);

    list.append(sectionElement);
  }

  async function loadCredits() {
    try {
      const response = await fetch(DATA_PATH);

      if (!response.ok) {
        throw new Error(`Unable to load ${DATA_PATH}`);
      }

      const data = await response.json();

      // intro.textContent = data.intro || "";

      const sections = data.sections || [];

      sections.forEach((section, index) => {
        renderSection(section, index);
      });

      if (!sections.length) {
        appendText(list, "p", "尚未加入素材資料。", "credits-empty");
      }
    } catch (error) {
      console.error("Unable to render credits:", error);

      appendText(list, "p", "素材資料目前無法讀取。", "credits-error");
    }
  }

  loadCredits();
});
