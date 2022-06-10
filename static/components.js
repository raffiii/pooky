// clone template button and add parameters
function new_text_field(id, label, value, hint, onchange) {
    let template = document.getElementById("tpl_text");
    let text_field = document.importNode(template.content, true);
    let input = text_field.querySelector("input");
    let label_elem = text_field.querySelector("label");
    input.id = id;
    input.placeholder = hint;
    input.value = value;
    input.addEventListener("change", onchange);
    label_elem.setAttribute("for", id);
    label_elem.innerText = label;
    return text_field;
}