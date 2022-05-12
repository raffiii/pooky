current_id = 0;

const erase_defaults = {
    color: "#FFFFFF",
    box: { x0: 0, y0: 0, x1: 0, y1: 0 },
};

class Erase {
    constructor(erase = {}) {
        this.color = erase.color || erase_defaults.color;
        this.box = erase.box || erase_defaults.box;
    }
}

const clip_src_defaults = {
    doc: "",
    pno: 0,
    box: { x0: 0, y0: 0, x1: 0, y1: 0 },
    erase: [],
};

class ClipSrc {
    constructor(src = {}) {
        this.doc = src.doc || clip_src_defaults.doc;
        this.pno = src.pno || clip_src_defaults.pno;
        this.box = src.box || clip_src_defaults.box;
        this.erase = src.erase || clip_src_defaults.erase;
    }
}

const clip_dst_defaults = {
    src: {},
    box: { x0: 0, y0: 0, x1: 0, y1: 0 },
};

class ClipDst {
    constructor(dst = {}) {
        this.src = dst.src || clip_dst_defaults.src;
        this.box = dst.box || clip_dst_defaults.box;
    }
}

const image_defaults = {
    src: "",
    box: { x0: 0, y0: 0, x1: 0, y1: 0 },
};

class Image {
    constructor(image = {}) {
        this.src = image.src || image_defaults.src;
        this.box = image.box || image_defaults.box;
    }
}

const text_defaults = {
    box: { x0: 0, y0: 0, x1: 0, y1: 0 },
    text: "",
    font: "",
    size: 0,
    color: "black",
    align: "left",
    insertions: [],
};

class Text {
    constructor(text = {}) {
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
    constructor(line = {}) {
        this.p = line.p || line_defaults.p;
        this.q = line.q || line_defaults.q;
    }
}

const font_defaults = {
    name: "",
    filename: "",
};

class Font {
    constructor(font = {}) {
        this.name = font.name || font_defaults.name;
        this.filename = font.filename || font_defaults.filename;
    }
}

const page_defaults = {
    template: [],
    inner: { x0: 0, y0: 0, x1: 0, y1: 0 },
    content: []
};

class Page {
    constructor(page = {}) {
        this.template = page.template || page_defaults.template;
        this.inner = page.inner || page_defaults.inner;
        this.content = page.content || page_defaults.content;
    }

    insert_box(src, force = false) {
        let width = src.box[2] - src.box[0];
        let height = src.box[3] - src.box[1];
        if (height > this.inner[3] - this.inner[1] || force) {
            let dst_box = [this.inner[0], this.inner[1], this.inner[0] + width, this.inner[1] + height];
            let dst = new ClipDst({ src: src, box: dst_box });
            this.content.push(dst);
            this.inner[1] += height;
            return true;
        }
        return false;
    }
}

const part_defaults = {
    page: {},
    first: {},
    content_pages: [],
    name: "",
};

class Part {
    constructor(part = {}) {
        this.page = part.page || part_defaults.page;
        this.first = part.first || part_defaults.first;
        this.content_pages = part.content_pages || part_defaults.content_pages;
        this.name = part.name || part_defaults.name;
    }

    insert_box(src) {
        if (this.content_pages.length == 0) {
            this.content_pages.push(new Page(this.first));
        }
        let success = this.content_pages[this.content_pages.length - 1].insert_box(src);
        if (!success) {
            let page = new Page(this.page);
            this.content_pages.push(page);
            page.insert_box(src, force = true);
        }
    }

}

const info_defaults = {
    parts: [],
    fonts: {},
    replaced: {},
    clips: []
};

class Info {
    constructor(info = {}) {
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
    constructor(doc = {}) {
        this.info = new Info(doc.info || doc_defaults.info);
        this.files = doc.files || doc_defaults.files;
    }
}

/**[<logic.structure.Text object at 0x7fd89091e3e0>, <logic.structure.Text object at 0x7fd89091f9a0>, <logic.structure.Text object at 0x7fd89091f580>, <logic.structure.Text object at 0x7fd89091dba0>, <logic.structure.Text object at 0x7fd89091f4f0>, <logic.structure.Text object at 0x7fd89091e8c0>, <logic.structure.Text object at 0x7fd89091f940>, <logic.structure.Text object at 0x7fd89091f2b0>, <logic.structure.Text object at 0x7fd89091f8b0>, <logic.structure.Text object at 0x7fd89091e170>, <logic.structure.Text object at 0x7fd89091e7a0>, <logic.structure.Text object at 0x7fd89091e110>, <logic.structure.Text object at 0x7fd89091e7d0>, <logic.structure.Text object at 0x7fd89091eb30>, <logic.structure.Text object at 0x7fd89091f370>, <logic.structure.Text object at 0x7fd89091ed70>, <logic.structure.Text object at 0x7fd89091f010>, <logic.structure.Text object at 0x7fd89091dc90>, <logic.structure.Text object at 0x7fd89091c070>, <logic.structure.Text object at 0x7fd89091e1a0>] */