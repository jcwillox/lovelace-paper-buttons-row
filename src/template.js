import { hasTemplate, subscribeRenderTemplate } from "card-tools/src/templates";

export function renderTemplateObjects(templates, hass) {
  templates.forEach((item) => {
    item.callback(renderTemplateObject(item.template, hass));
  });
}

export function renderTemplateObject(template, hass) {
  let state = hass.states[template.entity];

  if (template.attribute) {
    state = state.attributes[template.attribute];
  } else {
    state = state.state;
  }

  let result = (template.prefix || "") + state + (template.postfix || "");

  if (template.case) {
    result = handleCase(result, template.case);
  }

  return result;
}

function handleCase(text, text_case) {
  switch (text_case) {
    case "upper":
      return text.toUpperCase();
    case "lower":
      return text.toLowerCase();
    case "first":
      return text[0].toUpperCase() + text.slice(1);
  }
}

export function subscribeTemplate(config, object, key) {
  let option = object[key];

  if (typeof option === "object") {
    if (!option.entity) option.entity = config.entity;

    if (option.entity !== config.entity) this._entities.push(option.entity);

    this._templates.push({
      template: option,
      callback: (res) => (object[key] = res),
    });
  } else if (hasTemplate(option)) {
    subscribeRenderTemplate(
      null,
      (res) => {
        object[key] = res;
        this.requestUpdate();
      },
      {
        template: option,
        variables: { config: config },
      }
    );
    object[key] = "";
  }
}