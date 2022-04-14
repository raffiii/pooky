use strict;

current_id = 0;

function Erase(box,color){
    return {
    type: "erase",
        box
        color: color,
        id: ++current_id
    };
}

function ClipSrc(docname,pno,box,erase) {
    return {
        type: "clip_src",
        box: box,
        id: ++current_id
    };
}

function ClipDst(src_id,placing) {
    return {
        type: "clip_dst",
        src_id: src_id,
        placing: placing,
        id: ++current_id
    };
}

function Image(docname,box) {
    return {
        type: "image",
        docname: docname,
        box: box,
        id: ++current_id
    };
}

function Text(text,box,font,size,color,align,insertions) {
    return {
        type: "text",
        text: text,
        box: box,
        font: font,
        size: size,
        color: color,
        align: align,
        insertions: insertions,
        id: ++current_id
    };
}

function Line(p,q) {
    return {
        type: "line",
        p: p,
        q: q,
        id: ++current_id
    };
}

function Font(name,filename) {
    return {
        type: "font",
        name: name,
        filename: filename,
        id: ++current_id
    };
}

function Page(template,inner){
    return {
        type: "page",
        template: template,
        inner: inner,
        id: ++current_id
    };
}

function Part(page,first,content,name){
    return {
        type: "part",
        page: page,
        first: first,
        content: content,
        name: name,
        id: ++current_id
    };
}

function info(parts,fonts,replaced,clips) {
    return {
        type: "info",
        parts: parts,
        fonts: fonts,
        replaced: replaced,
        clips: clips,
        id: ++current_id
    };
}

function doc(info,files) {
    return {
        type: "doc",
        info: info,
        files: files,
        id: ++current_id
    };
}