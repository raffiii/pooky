current_id = 0;

const erase_defaults = {
    color: "#FFFFFF",
    box: [0, 0, 0, 0],
};

class Erase {
    constructor(erase) {
        this.color = erase.color || erase_defaults.color;
        this.box = erase.box || erase_defaults.box;
    }
}

const clip_src_defaults = {
    doc: "",
    pno: 0,
    box: [0, 0, 0, 0],
    erase: [],
};

class ClipSrc {
    constructor(src) {
        this.doc = src.doc || clip_src_defaults.doc;
        this.pno = src.pno || clip_src_defaults.pno;
        this.box = src.box || clip_src_defaults.box;
        this.erase = src.erase || clip_src_defaults.erase;
    }
}

const clip_dst_defaults = {
    src: {},
    box: [0, 0, 0, 0],
};

class ClipDst {
    constructor(dst) {
        this.src = dst.src || clip_dst_defaults.src;
        this.box = dst.box || clip_dst_defaults.box;
    }
}

const image_defaults = {
    src: "",
    box: [0, 0, 0, 0],
};

class Image {
    constructor(image) {
        this.src = image.src || image_defaults.src;
        this.box = image.box || image_defaults.box;
    }
}

const text_defaults = {
    box: [0, 0, 0, 0],
    text: "",
    font: "",
    size: 0,
    color: "black",
    align: "left",
    insertions: [],
};

class Text {
    constructor(text) {
        this.box = text.box || text_defaults.box;
        this.text = text.text || text_defaults.text;
        this.font = text.font || text_defaults.font;
        this.size = text.size || text_defaults.size;
        this.color = text.color || text_defaults.color;
        this.align = text.align || text_defaults.align;
        this.insertions = text.insertions || text_defaults.insertions;
    }
}

const line_defaults = {
    p: [0, 0],
    q: [0, 0],
};

class Line {
    constructor(line) {
        this.p = line.p || line_defaults.p;
        this.q = line.q || line_defaults.q;
    }
}

const font_defaults = {
    name: "",
    filename: "",
};

class Font {
    constructor(font) {
        this.name = font.name || font_defaults.name;
        this.filename = font.filename || font_defaults.filename;
    }
}

const page_defaults = {
    template: [],
    inner: [0, 0, 0, 0],
};

class Page {
    constructor(page) {
        this.template = page.template || page_defaults.template;
        this.inner = page.inner || page_defaults.inner;
    }
}

const part_defaults = {
    page: {},
    first: {},
    content: [],
    name: "",
};

class Part {
    constructor(part) {
        this.page = part.page || part_defaults.page;
        this.first = part.first || part_defaults.first;
        this.content = part.content || part_defaults.content;
        this.name = part.name || part_defaults.name;
    }
}

const info_defaults = {
    parts: [],
    fonts: {},
    replaced: {},
    clips: {},
};

class Info {
    constructor(info) {
        this.parts = info.parts || info_defaults.parts;
        this.fonts = info.fonts || info_defaults.fonts;
        this.replaced = info.replaced || info_defaults.replaced;
        this.clips = info.clips || info_defaults.clips;
    }
}

const doc_defaults = {
    info: {},
    files: {},
};

class Doc {
    constructor(doc) {
        this.info = new Info(doc.info || doc_defaults.info);
        this.files = doc.files || doc_defaults.files;
    }
}