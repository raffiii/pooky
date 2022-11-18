current_id = 0;

function boxed(b = [0, 0, 0, 0]) {
    let box = {};
    box.x0 = b.x0 || b['0'] || b[0] || 0;
    box.y0 = b.y0 || b['1'] || b[2] || 0;
    box.x1 = b.x1 || b['2'] || b[1] || 0;
    box.y1 = b.y1 || b['3'] || b[3] || 0;
    return box; 
}

const erase_defaults = {
    color: "#FFFFFF",
    box: boxed(),
};

class Erase {
    constructor(erase = {}) {
        this.__name__ = "Erase";
        this.color = erase.color || erase_defaults.color;
        this.box = erase.box || erase_defaults.box;
    }
}

const clip_src_defaults = {
    doc: "",
    pno: 0,
    box: boxed(),
    erase: [],
};

class ClipSrc {
    constructor(src = {}) {
        this.__name__ = "ClipSrc";
        this.doc = src.doc || clip_src_defaults.doc;
        this.pno = src.pno || clip_src_defaults.pno;
        this.box = boxed (src.box || clip_src_defaults.box);
        this.erase = src.erase || clip_src_defaults.erase;
    }
}

const clip_dst_defaults = {
    src: {},
    box: boxed(),
};

class ClipDst {
    constructor(dst = {}) {
        this.__name__ = "ClipDst";
        this.src = dst.src || clip_dst_defaults.src;
        this.box = boxed(dst.box || clip_dst_defaults.box);
    }
}

const image_defaults = {
    src: "",
    box: boxed(),
};

class ImageBox {
    constructor(image = {}) {
        this.__name__ = "ImageBox";
        this.src = image.src || image_defaults.src;
        this.box = boxed(image.box || image_defaults.box);
    }
}

const text_defaults = {
    box: boxed(),
    text: "",
    font: "",
    size: 0,
    color: "black",
    align: "left",
    insertions: [],
};

class TextBox {
    constructor(text = {}) {
        this.__name__ = "TextBox";
        this.box = boxed(text.box || text_defaults.box);
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
        this.__name__ = "Line";
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
        this.__name__ = "Font";
        this.name = font.name || font_defaults.name;
        this.filename = font.filename || font_defaults.filename;
    }
}

const page_defaults = {
    template: [],
    inner: boxed(),
    content: [],
};

class Page {
    constructor(page = {}, clear_content = false) {
        this.__name__ = "Page";
        this.template = page.template || page_defaults.template;
        this.inner = boxed(page.inner || page_defaults.inner);
        this.content = clear_content ? [] : page.content || page_defaults.content;

    }

    copy() {
        return new Page(this, true);
    }

    convert_list(list) {
        return list.map((e) => {
            switch (e.name) {
                case "Erase":
                    return new Erase(e);
                case "ClipDst":
                    return new ClipDst(e);
                case "Line":
                    return new Line(e);
                case "Text":
                    return new TextBox(e);
                case "Image":
                    return new ImageBox(e);
            }
        });
    }

    insert_box(src, force = false) {
        let width = src.box.x1 - src.box.x0;
        let height = src.box.y1 - src.box.y0;
        if (height <= this.inner.y1 - this.inner.y0 || force) {
            let dst_box = boxed([
                this.inner.x0,
                this.inner.y0,
                this.inner.x0 + width,
                this.inner.y0 + height,
            ]);
            let dst = new ClipDst({ src: src, box: dst_box });
            this.content.push(dst);
            this.inner.y0 += height;
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
        this.__name__ = "Part";
        this.page = new Page(part.page || part_defaults.page);
        this.first = new Page(part.first || part_defaults.first);
        this.content_pages = (
            part.content_pages || part_defaults.content_pages
        ).map((e) => new Page(e));
        this.name = part.name || part_defaults.name;
    }

    insert_box(src) {
        if (this.content_pages.length == 0) {
            this.content_pages.push(this.first.copy());
        }
        let success =
            this.content_pages[this.content_pages.length - 1].insert_box(src);
        if (!success) {
            let page = this.page.copy();
            this.content_pages.push(page);
            page.insert_box(src, true);
        }
    }
}

const info_defaults = {
    parts: [],
    fonts: {},
    replaced: {},
    clips: [],
};

class Info {
    constructor(info = {}) {
        this.__name__ = "Info";
        this.parts = (info.parts || info_defaults.parts).map((e) => new Part(e));
        this.fonts = info.fonts || info_defaults.fonts;
        this.replaced = info.replaced || info_defaults.replaced;
        this.clips = (info.clips || info_defaults.clips).map((e) => new ClipSrc(e));
    }
}

const doc_defaults = {
    info: {},
    files: {},
};

class Doc {
    constructor(doc = {}) {
        this.__name__ = "Doc";
        this.info = new Info(doc.info || doc_defaults.info);
        this.files = doc.files || doc_defaults.files;

    }
}

/**[<logic.structure.Text object at 0x7fd89091e3e0>, <logic.structure.Text object at 0x7fd89091f9a0>, <logic.structure.Text object at 0x7fd89091f580>, <logic.structure.Text object at 0x7fd89091dba0>, <logic.structure.Text object at 0x7fd89091f4f0>, <logic.structure.Text object at 0x7fd89091e8c0>, <logic.structure.Text object at 0x7fd89091f940>, <logic.structure.Text object at 0x7fd89091f2b0>, <logic.structure.Text object at 0x7fd89091f8b0>, <logic.structure.Text object at 0x7fd89091e170>, <logic.structure.Text object at 0x7fd89091e7a0>, <logic.structure.Text object at 0x7fd89091e110>, <logic.structure.Text object at 0x7fd89091e7d0>, <logic.structure.Text object at 0x7fd89091eb30>, <logic.structure.Text object at 0x7fd89091f370>, <logic.structure.Text object at 0x7fd89091ed70>, <logic.structure.Text object at 0x7fd89091f010>, <logic.structure.Text object at 0x7fd89091dc90>, <logic.structure.Text object at 0x7fd89091c070>, <logic.structure.Text object at 0x7fd89091e1a0>] */